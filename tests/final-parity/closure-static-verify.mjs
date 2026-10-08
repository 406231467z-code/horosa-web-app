import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.HOROSA_STATIC_URL || 'http://127.0.0.1:8010/';
const browserName = process.argv[2] === 'edge' ? 'edge' : 'chrome';
const exe = browserName === 'edge'
	? ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(fs.existsSync)
	: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find(fs.existsSync);
if (!exe) {
	console.error(JSON.stringify({ status: 'FAIL', reason: `${browserName} missing` }));
	process.exit(1);
}

const REMOVED = ['/fengshui', '/planetarium', '/astrochart3d', '/astrochart-3d'];
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'horosa-static-'));
const port = 9342 + (browserName === 'edge' ? 1 : 0);
const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--disable-gpu', BASE], { stdio: 'ignore' });

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function jsonGet(url) { return (await fetch(url)).json(); }

class Cdp {
	constructor(wsUrl) {
		this.ws = new WebSocket(wsUrl);
		this.seq = 0;
		this.pending = new Map();
		this.ws.addEventListener('message', (ev) => {
			const msg = JSON.parse(ev.data);
			if (msg.id && this.pending.has(msg.id)) {
				const item = this.pending.get(msg.id);
				this.pending.delete(msg.id);
				if (msg.error) item.reject(new Error(JSON.stringify(msg.error)));
				else item.resolve(msg.result);
			}
		});
	}
	ready() { return new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve); this.ws.addEventListener('error', reject); }); }
	send(method, params = {}) {
		const id = ++this.seq;
		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			this.ws.send(JSON.stringify({ id, method, params }));
		});
	}
}

try {
	for (let i = 0; i < 40; i += 1) {
		try { if (Array.isArray(await jsonGet(`http://127.0.0.1:${port}/json`))) break; } catch (e) { await sleep(250); }
	}
	const tabs = await jsonGet(`http://127.0.0.1:${port}/json`);
	const page = tabs.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
	if (!page) throw new Error('no page');
	const cdp = new Cdp(page.webSocketDebuggerUrl);
	await cdp.ready();
	await cdp.send('Runtime.enable');
	await cdp.send('Page.navigate', { url: BASE });
	await sleep(3000);

	const hook = `(async () => {
		const bad = []; const errors = [];
		if (!window.__horosaStatic) {
			window.__horosaStatic = true;
			const orig = window.fetch;
			window.fetch = function(input) {
				const url = typeof input === 'string' ? input : (input && input.url) || '';
				if (/:9999|:8899|:8892|127\\.0\\.0\\.1:9999|\\/chart\\b|\\/predict\\/|\\/india\\/chart/.test(String(url))) bad.push(String(url));
				return orig.apply(this, arguments);
			};
			window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason && e.reason.message || e.reason)));
		}
		return { bad, errors, text: (document.body.innerText || '').slice(0, 200), overflow: document.documentElement.scrollWidth - window.innerWidth };
	})()`;

	const home = await cdp.send('Runtime.evaluate', { expression: hook, awaitPromise: true, returnByValue: true });
	const homeVal = home.result.value;

	const removed = [];
	for (const route of REMOVED) {
		await cdp.send('Page.navigate', { url: new URL(route, BASE).href });
		await sleep(2000);
		const ev = await cdp.send('Runtime.evaluate', { expression: `({ path: location.pathname, text: (document.body.innerText||'').slice(0,120) })`, returnByValue: true });
		const v = ev.result.value;
		removed.push({ route, path: v.path, status: (v.path === '/' || v.path === '') ? 'PASS' : 'PARTIAL' });
	}

	const out = { browser: browserName, base: BASE, home: homeVal, removed, status: (homeVal.bad || []).length === 0 && (homeVal.errors || []).length === 0 ? 'PASS' : 'FAIL' };
	fs.writeFileSync(path.resolve(`tests/final-parity/closure-static-${browserName}.json`), JSON.stringify(out, null, 2));
	console.log(JSON.stringify(out));
	if (out.status !== 'PASS') process.exitCode = 1;
} catch (err) {
	console.error(JSON.stringify({ status: 'FAIL', reason: String(err && err.stack || err) }));
	process.exitCode = 1;
} finally {
	proc.kill();
}
