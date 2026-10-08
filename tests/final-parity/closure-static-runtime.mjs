import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSpaStaticServer } from './spa-static-server.mjs';

const DIST = path.resolve('local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui/dist');
const REMOVED = ['/fengshui', '/planetarium', '/astrochart3d', '/astrochart-3d'];
const CHROME = [
	'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].find((item) => fs.existsSync(item));

if (!CHROME) {
	console.error(JSON.stringify({ status: 'FAIL', reason: 'chrome missing' }));
	process.exit(1);
}

const spa = await createSpaStaticServer(DIST, { port: 8012, host: '127.0.0.1' });
const ORIGIN = spa.origin;

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'horosa-static-'));
const debugPort = 9342;
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--disable-gpu', ORIGIN], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Cdp {
	constructor(wsUrl) {
		this.ws = new WebSocket(wsUrl);
		this.seq = 0;
		this.pending = new Map();
		this.ws.addEventListener('message', (ev) => {
			const msg = JSON.parse(ev.data);
			if (msg.id && this.pending.has(msg.id)) {
				const { resolve, reject } = this.pending.get(msg.id);
				this.pending.delete(msg.id);
				if (msg.error) reject(new Error(JSON.stringify(msg.error)));
				else resolve(msg.result);
			}
		});
	}
	ready() {
		return new Promise((resolve, reject) => {
			this.ws.addEventListener('open', resolve);
			this.ws.addEventListener('error', reject);
		});
	}
	send(method, params = {}) {
		const id = ++this.seq;
		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			this.ws.send(JSON.stringify({ id, method, params }));
		});
	}
}

const probe = `(function(){
	window.__bad=window.__bad||[]; window.__err=window.__err||[];
	if(!window.__hook){ window.__hook=1;
		const o=window.fetch;
		window.fetch=function(u){ const s=String(typeof u==='string'?u:u.url||'');
			if(/:9999|:8899|:8892|\\/chart\\b|\\/predict\\/|\\/india\\/|\\/bazi\\/birth|\\/ziwei\\/birth/.test(s)) window.__bad.push(s);
			return o.apply(this,arguments); };
		window.addEventListener('error',e=>window.__err.push(String(e.message)));
		window.addEventListener('unhandledrejection',e=>window.__err.push(String(e.reason&&e.reason.message||e.reason)));
	}
	const text=document.body.innerText||'';
	return {
		path: location.pathname,
		hash: location.hash,
		homeUi: text.includes('星阙') && (text.includes('占星') || text.includes('时间与地点')),
		bad: window.__bad.slice(),
		err: window.__err.slice(),
	};
})()`;

try {
	for (let i = 0; i < 40; i += 1) {
		try {
			if (Array.isArray(await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json())) break;
		} catch (err) {
			await sleep(250);
		}
	}
	const tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
	const page = tabs.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
	const cdp = new Cdp(page.webSocketDebuggerUrl);
	await cdp.ready();
	await cdp.send('Runtime.enable');
	await cdp.send('Page.enable');
	await cdp.send('Page.navigate', { url: ORIGIN });
	let home = { result: { value: {} } };
	for (let i = 0; i < 24; i += 1) {
		await sleep(500);
		home = await cdp.send('Runtime.evaluate', { expression: probe, returnByValue: true });
		if (home.result.value && home.result.value.homeUi) break;
	}
	const removed = [];
	for (const route of REMOVED) {
		await cdp.send('Page.navigate', { url: ORIGIN.replace(/\/$/, '') + route });
		let row = { result: { value: {} } };
		for (let i = 0; i < 24; i += 1) {
			await sleep(500);
			row = await cdp.send('Runtime.evaluate', { expression: probe, returnByValue: true });
			const val = row.result.value || {};
			if ((val.path === '/' || val.path === '') && val.homeUi) break;
		}
		const val = row.result.value || {};
		const pass = (val.path === '/' || val.path === '') && val.homeUi === true && !(val.bad || []).length && !(val.err || []).length;
		removed.push({ route, ...val, pass });
	}
	const out = {
		origin: ORIGIN,
		spaFallback: true,
		home: home.result.value,
		removed,
		status: removed.every((r) => r.pass) && !(home.result.value.bad || []).length && !(home.result.value.err || []).length ? 'PASS' : 'FAIL',
	};
	fs.writeFileSync(path.resolve('tests/final-parity/closure-static-runtime.json'), JSON.stringify(out, null, 2));
	console.log(JSON.stringify({ status: out.status, removed: removed.map((r) => ({ route: r.route, path: r.path, pass: r.pass })) }));
	process.exitCode = out.status === 'PASS' ? 0 : 1;
} catch (err) {
	console.error(JSON.stringify({ status: 'FAIL', reason: String(err) }));
	process.exitCode = 1;
} finally {
	proc.kill();
	await spa.close();
}
