import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = [
	'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].find((item) => fs.existsSync(item));
if (!CHROME) {
	console.error(JSON.stringify({ status: 'FAIL', reason: 'chrome missing' }));
	process.exit(1);
}

const KEY = 'horosa.localCharts.v1';
const CID = 'final-browser-crud-1';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'horosa-crud-'));
const port = 9336;
const proc = spawn(CHROME, [
	'--headless=new',
	`--remote-debugging-port=${port}`,
	`--user-data-dir=${profile}`,
	'--disable-gpu',
	'http://127.0.0.1:8000/',
], { stdio: 'ignore' });

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function jsonGet(url) {
	return (await fetch(url)).json();
}

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

const SCRIPT = `(async () => {
	const KEY = ${JSON.stringify(KEY)};
	const CID = ${JSON.stringify(CID)};
	const errors = [];
	window.addEventListener('error', (e) => errors.push(String(e.message)));
	const read = () => {
		try {
			const raw = localStorage.getItem(KEY);
			return raw ? JSON.parse(raw) : [];
		} catch (e) {
			errors.push(String(e.message || e));
			return [];
		}
	};
	const write = (rows) => localStorage.setItem(KEY, JSON.stringify(rows));
	const seed = [{
		cid: CID,
		name: 'Browser CRUD Alpha',
		birth: '1990-06-15 10:30:00',
		ad: 1,
		zone: '+08:00',
		lat: '26n04',
		lon: '119e19',
		gpsLat: 26.076417371316914,
		gpsLon: 119.31516153077507,
		gender: 1,
		isPub: 0,
		group: null,
		creator: 'local',
		updateTime: '2026-09-24 12:00:00',
		memoAstro: 'browser-v1',
		schemaVersion: 2,
	}];
	write(seed);
	const created = read().find((row) => row.cid === CID);
	if (!created) return { status: 'FAIL', step: 'create', errors };
	location.reload();
	return { status: 'RELOAD' };
})()`;

const AFTER_RELOAD = `(async () => {
	const KEY = ${JSON.stringify(KEY)};
	const CID = ${JSON.stringify(CID)};
	const errors = [];
	const read = () => {
		const raw = localStorage.getItem(KEY);
		return raw ? JSON.parse(raw) : [];
	};
	const row = read().find((item) => item.cid === CID);
	if (!row) return { status: 'FAIL', step: 'reload-read', errors };
	if (row.name !== 'Browser CRUD Alpha') return { status: 'FAIL', step: 'reload-name', got: row.name, errors };
	row.name = 'Browser CRUD Beta';
	row.memoAstro = 'browser-v2';
	row.updateTime = '2026-09-24 12:30:00';
	localStorage.setItem(KEY, JSON.stringify(read().map((item) => item.cid === CID ? row : item)));
	const edited = read().find((item) => item.cid === CID);
	if (edited.name !== 'Browser CRUD Beta') return { status: 'FAIL', step: 'edit', errors };
	localStorage.setItem(KEY, JSON.stringify(read().filter((item) => item.cid !== CID)));
	const deleted = read().find((item) => item.cid === CID);
	if (deleted) return { status: 'FAIL', step: 'delete', errors };
	const clickExact = (name) => {
		const els = [...document.querySelectorAll('button,[role="tab"]')].filter((el) => (el.innerText || '').trim() === name);
		const el = els[els.length - 1];
		if (!el) return false;
		el.click();
		return true;
	};
	const openPalette = () => {
		const header = [...document.querySelectorAll('button')].find((el) => el.getBoundingClientRect().top < 80 && ['命盘'].includes((el.innerText || '').trim()));
		if (!header) return false;
		header.click();
		return true;
	};
	openPalette();
	await new Promise((r) => setTimeout(r, 200));
	clickExact('命盘');
	await new Promise((r) => setTimeout(r, 400));
	const text = document.body.innerText || '';
	const listed = text.includes('Browser CRUD Beta') || text.includes('Browser CRUD Alpha');
	return {
		status: listed ? 'FAIL' : 'PASS',
		step: 'ui-list-after-delete',
		overflow: document.documentElement.scrollWidth - window.innerWidth,
		errors,
	};
})()`;

try {
	for (let i = 0; i < 40; i += 1) {
		try {
			const tabs = await jsonGet(`http://127.0.0.1:${port}/json`);
			if (Array.isArray(tabs)) break;
		} catch (err) {
			await sleep(250);
		}
	}
	const tabs = await jsonGet(`http://127.0.0.1:${port}/json`);
	const page = tabs.find((tab) => tab.type === 'page' && tab.webSocketDebuggerUrl);
	if (!page) throw new Error('no page');
	const cdp = new Cdp(page.webSocketDebuggerUrl);
	await cdp.ready();
	await cdp.send('Runtime.enable');
	await cdp.send('Page.enable');
	await cdp.send('Page.navigate', { url: 'http://127.0.0.1:8000/' });
	await sleep(3000);
	let evaluated = await cdp.send('Runtime.evaluate', { expression: SCRIPT, awaitPromise: true, returnByValue: true });
	if (evaluated.result.value.status === 'RELOAD') {
		await sleep(3000);
		evaluated = await cdp.send('Runtime.evaluate', { expression: AFTER_RELOAD, awaitPromise: true, returnByValue: true });
	}
	const value = evaluated.result.value;
	const outPath = path.resolve('tests/final-parity/closure-interaction.json');
	fs.writeFileSync(outPath, JSON.stringify(value, null, 2));
	console.log(JSON.stringify({ status: value.status, step: value.step || 'done' }));
	if (value.status !== 'PASS') process.exitCode = 1;
} catch (err) {
	console.error(JSON.stringify({ status: 'FAIL', reason: String(err && err.stack || err) }));
	process.exitCode = 1;
} finally {
	proc.kill();
}
