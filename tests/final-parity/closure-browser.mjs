import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EDGE = [
	'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
	'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find((item) => fs.existsSync(item));
const CHROME = [
	'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].find((item) => fs.existsSync(item));

const browserName = process.argv[2] === 'edge' ? 'edge' : 'chrome';
const exe = browserName === 'edge' ? EDGE : CHROME;
if (!exe) {
	console.error(JSON.stringify({ status: 'FAIL', reason: `${browserName} executable missing` }));
	process.exit(1);
}

const VIEWPORTS = [
	{ w: 1920, h: 1080, label: 'desktop' },
	{ w: 768, h: 1024, label: 'tablet-portrait' },
	{ w: 1024, h: 768, label: 'tablet-landscape' },
	{ w: 390, h: 844, label: 'mobile' },
];

const MODULES = ['占星', '星运', '八字', '紫微', '七政', '印占', '六爻', '遁甲', '六壬', '太乙', '三式', '分至', '数算', 'AI分析', '命盘'];
const TABS = ['金口诀', '统摄法', '皇极经世', '五兆', '太玄', '荆诀', '神易数', '地占', '宿盘'];
const REMOVED = ['/fengshui', '/planetarium', '/astrochart3d', '/astrochart-3d'];

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'horosa-closure-'));
const port = 9334 + (browserName === 'edge' ? 1 : 0);
const proc = spawn(exe, [
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
	const rsp = await fetch(url);
	return rsp.json();
}

async function waitForBrowser() {
	for (let i = 0; i < 40; i += 1) {
		try {
			const tabs = await jsonGet(`http://127.0.0.1:${port}/json`);
			if (Array.isArray(tabs)) return;
		} catch (err) {
			await sleep(250);
		}
	}
	throw new Error('browser debug port did not open');
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

const WALK = `(async () => {
	const modules = ${JSON.stringify(MODULES)};
	const tabs = ${JSON.stringify(TABS)};
	const bad = [];
	const errors = [];
	if (!window.__horosaClosure) {
		window.__horosaClosure = true;
		const orig = window.fetch;
		window.fetch = function(input, init) {
			const url = typeof input === 'string' ? input : (input && input.url) || '';
			if (/:9999|:8899|:8892|\\/chart\\b|\\/predict\\/|\\/india\\/|\\/wangji|\\/qimen|\\/taiyi|\\/jinkou|\\/liureng|\\/geomancy|\\/bazi\\/birth|\\/ziwei\\/birth/.test(String(url))) bad.push(String(url));
			return orig.apply(this, arguments);
		};
		window.addEventListener('error', (e) => errors.push(String(e.message)));
		window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason && e.reason.message || e.reason)));
	}
	const clickExact = (name) => {
		const els = [...document.querySelectorAll('button,[role="tab"]')].filter((el) => (el.innerText || '').trim() === name);
		const el = els[els.length - 1];
		if (!el) return false;
		const key = Object.keys(el).find((item) => item.startsWith('__reactProps$'));
		const props = key ? el[key] : null;
		if (props && props.onClick) props.onClick({ preventDefault(){}, stopPropagation(){} });
		else el.click();
		return true;
	};
	const openPalette = () => {
		if ([...document.querySelectorAll('button')].some((el) => (el.innerText || '').trim() === '关闭导航')) return true;
		const header = [...document.querySelectorAll('button')].find((el) => el.getBoundingClientRect().top < 80 && ['占星','星运','八字','紫微','七政','印占','六爻','遁甲','六壬','太乙','三式','分至','数算','其他','AI分析','命盘'].includes((el.innerText || '').trim()));
		if (!header) return false;
		const key = Object.keys(header).find((item) => item.startsWith('__reactProps$'));
		if (key && header[key].onClick) header[key].onClick({ preventDefault(){}, stopPropagation(){} });
		else header.click();
		return true;
	};
	const pageOf = (name) => {
		const text = document.body.innerText || '';
		const banned = ['Java connection', 'Python connection', '请启动 Java', '请启动 Python', '本地服务未就绪', 'service unavailable'];
		return {
			name,
			overflow: document.documentElement.scrollWidth - window.innerWidth,
			crash: text.includes('该面板加载出错'),
			banned: banned.filter((item) => text.includes(item)),
			license: /LICENSE_REVIEW_REQUIRED|LICENSE_BLOCKED|UNSUPPORTED/.test(text),
			calcClicked: ['排盘','起盘','起卦','计算'].some((label) => clickExact(label)),
		};
	};
	const pages = [];
	for (const name of modules) {
		openPalette();
		await new Promise((r) => setTimeout(r, 60));
		clickExact(name);
		await new Promise((r) => setTimeout(r, 220));
		pages.push(pageOf(name));
	}
	openPalette();
	await new Promise((r) => setTimeout(r, 60));
	clickExact('其他');
	await new Promise((r) => setTimeout(r, 200));
	for (const tab of tabs) {
		clickExact(tab);
		await new Promise((r) => setTimeout(r, 140));
		pages.push(pageOf('其他/' + tab));
	}
	const astro = pages.find((item) => item.name === '占星');
	return { bad, errors: errors.slice(0, 8), pages, astroLicense: !!(astro && astro.license) };
})()`;

try {
	await waitForBrowser();
	let created = null;
	for (let i = 0; i < 40 && !created; i += 1) {
		const tabs = await jsonGet(`http://127.0.0.1:${port}/json`);
		created = tabs.find((tab) => tab.type === 'page' && tab.webSocketDebuggerUrl);
		if (!created) await sleep(250);
	}
	if (!created) throw new Error('no debuggable page');
	const cdp = new Cdp(created.webSocketDebuggerUrl);
	await cdp.ready();
	await cdp.send('Runtime.enable');
	await cdp.send('Page.enable');
	await cdp.send('Console.enable').catch(() => {});
	await cdp.send('Page.navigate', { url: 'http://127.0.0.1:8000/' });
	await sleep(3000);

	const removed = [];
	for (const route of REMOVED) {
		await cdp.send('Page.navigate', { url: `http://127.0.0.1:8000${route}` });
		await sleep(2200);
		const evaluated = await cdp.send('Runtime.evaluate', {
			expression: `({ path: location.pathname, text: (document.body.innerText || '').slice(0, 180) })`,
			returnByValue: true,
		});
		const value = evaluated.result && evaluated.result.value;
		const text = (value && value.text) || '';
		const restored = /风水|天象厅|三维星盘|Astrochart3D/.test(text);
		removed.push({
			route,
			path: value && value.path,
			status: restored ? 'FAIL' : (text.includes('404') || (value && value.path === '/') ? 'PASS' : 'PARTIAL'),
			sample: text.slice(0, 80),
		});
	}

	await cdp.send('Page.navigate', { url: 'http://127.0.0.1:8000/' });
	await sleep(2500);
	const identity = [];
	for (const vp of VIEWPORTS) {
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: vp.w,
			height: vp.h,
			deviceScaleFactor: 1,
			mobile: vp.w < 800,
		});
		await sleep(250);
		const evaluated = await cdp.send('Runtime.evaluate', {
			expression: WALK,
			awaitPromise: true,
			returnByValue: true,
		});
		const value = (evaluated.result && evaluated.result.value) || {};
		identity.push({
			viewport: vp.label,
			pages: (value.pages || []).length,
			overflow: (value.pages || []).filter((page) => page.overflow > 0).map((page) => page.name),
			crash: (value.pages || []).filter((page) => page.crash).map((page) => page.name),
			banned: (value.pages || []).filter((page) => page.banned && page.banned.length).map((page) => ({ name: page.name, banned: page.banned })),
			network: value.bad || [],
			errors: value.errors || [],
			calcClicked: (value.pages || []).filter((page) => page.calcClicked).map((page) => page.name),
		});
		process.stderr.write(`${browserName} ${vp.label} pages=${(value.pages || []).length}\n`);
	}

	const out = { browser: browserName, removed, identity };
	const outPath = path.resolve(`tests/final-parity/closure-${browserName}.json`);
	fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
	const fail = identity.some((item) => item.overflow.length || item.crash.length || item.banned.length || item.network.length || item.errors.length)
		|| removed.some((item) => item.status === 'FAIL');
	console.log(JSON.stringify({ browser: browserName, status: fail ? 'FAIL' : 'PASS', removed: removed.map((item) => item.status) }));
} catch (err) {
	console.error(JSON.stringify({ status: 'FAIL', reason: String(err && err.stack || err) }));
	process.exitCode = 1;
} finally {
	proc.kill();
}
