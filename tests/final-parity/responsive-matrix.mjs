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

const browserName = process.argv[2] === 'chrome' ? 'chrome' : 'edge';
const exe = browserName === 'chrome' ? CHROME : EDGE;
if (!exe) {
	console.error(JSON.stringify({ status: 'FAIL', reason: `${browserName} executable missing` }));
	process.exit(1);
}

const NAMED = [
	[320, 568], [360, 800], [375, 812], [390, 844], [430, 932],
	[768, 1024], [1024, 768], [1280, 720], [1366, 768], [1440, 900], [1920, 1080],
];
const VIEWPORTS = [];
for (const [w, h] of NAMED) {
	VIEWPORTS.push({ w, h, label: `${w}x${h}`, orientation: w >= h ? 'landscape' : 'portrait' });
	if (w !== h) {
		VIEWPORTS.push({ w: h, h: w, label: `${h}x${w}`, orientation: h >= w ? 'landscape' : 'portrait' });
	}
}

const MODULES = ['占星', '星运', '八字', '紫微', '七政', '印占', '六爻', '遁甲', '六壬', '太乙', '三式', '分至', '数算', 'AI分析', '命盘'];
const TABS = ['金口诀', '统摄法', '皇极经世', '五兆', '太玄', '荆诀', '神易数', '地占', '宿盘'];

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'horosa-edge-'));
const port = 9333;
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
	if (!window.__horosaScan) {
		window.__horosaScan = true;
		const orig = window.fetch;
		window.fetch = function(input, init) {
			const url = typeof input === 'string' ? input : (input && input.url) || '';
			if (/:9999|:8899|:8892|\\/chart\\b|\\/predict\\/|\\/india\\//.test(String(url))) bad.push(String(url));
			return orig.apply(this, arguments);
		};
		window.addEventListener('error', (e) => errors.push(String(e.message)));
	}
	const clickExact = (name, which) => {
		const els = [...document.querySelectorAll('button,[role="tab"]')].filter((el) => (el.innerText || '').trim() === name);
		const el = els[which] || els[els.length - 1];
		if (!el) return false;
		const key = Object.keys(el).find((item) => item.startsWith('__reactProps$'));
		const props = key ? el[key] : null;
		if (props && props.onClick) props.onClick({ preventDefault(){}, stopPropagation(){} });
		else el.click();
		return true;
	};
	const openPalette = () => {
		if ([...document.querySelectorAll('button')].some((el) => (el.innerText || '').trim() === '关闭导航')) return true;
		const header = [...document.querySelectorAll('button')].find((el) => el.getBoundingClientRect().top < 70 && ['占星','星运','八字','紫微','七政','印占','六爻','遁甲','六壬','太乙','三式','分至','数算','其他','AI分析','命盘'].includes((el.innerText || '').trim()));
		if (!header) return false;
		const key = Object.keys(header).find((item) => item.startsWith('__reactProps$'));
		if (key && header[key].onClick) header[key].onClick({ preventDefault(){}, stopPropagation(){} });
		else header.click();
		return true;
	};
	const measure = (name) => {
		const text = document.body.innerText || '';
		const buttons = [...document.querySelectorAll('button,[role="tab"]')].slice(0, 40).map((el) => {
			const r = el.getBoundingClientRect();
			return { w: Math.round(r.width), h: Math.round(r.height) };
		});
		const tiny = buttons.filter((box) => box.w > 0 && box.h > 0 && (box.w < 24 || box.h < 24)).length;
		return {
			name,
			overflow: document.documentElement.scrollWidth - window.innerWidth,
			inner: window.innerWidth,
			crash: text.includes('该面板加载出错'),
			tiny,
		};
	};
	const out = [];
	for (const name of modules) {
		openPalette();
		await new Promise((r) => setTimeout(r, 80));
		const which = name === '命盘' ? 0 : 0;
		clickExact(name, which);
		await new Promise((r) => setTimeout(r, 180));
		out.push(measure(name));
	}
	openPalette();
	await new Promise((r) => setTimeout(r, 80));
	const others = [...document.querySelectorAll('button')].filter((el) => (el.innerText || '').trim() === '其他');
	if (others.length) {
		const el = others[others.length - 1];
		const key = Object.keys(el).find((item) => item.startsWith('__reactProps$'));
		if (key && el[key].onClick) el[key].onClick({ preventDefault(){}, stopPropagation(){} });
		else el.click();
		await new Promise((r) => setTimeout(r, 250));
		for (const tab of tabs) {
			clickExact(tab, 0);
			await new Promise((r) => setTimeout(r, 160));
			out.push(measure('其他/' + tab));
			if ((document.body.innerText || '').includes('该面板加载出错')) break;
		}
	}
	return { bad, errors: errors.slice(0, 5), pages: out };
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
	await cdp.send('Page.navigate', { url: 'http://127.0.0.1:8000/' });
	await sleep(2500);
	const report = [];
	for (const vp of VIEWPORTS) {
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: vp.w,
			height: vp.h,
			deviceScaleFactor: 1,
			mobile: vp.w < 800,
		});
		await sleep(200);
		const evaluated = await cdp.send('Runtime.evaluate', {
			expression: WALK,
			awaitPromise: true,
			returnByValue: true,
		});
		const value = evaluated.result && evaluated.result.value;
		const pages = (value && value.pages) || [];
		const overflow = pages.filter((page) => page.overflow > 0);
		const crash = pages.filter((page) => page.crash);
		report.push({
			viewport: vp.label,
			orientation: vp.orientation,
			pages: pages.length,
			overflow: overflow.map((page) => ({ name: page.name, overflow: page.overflow, inner: page.inner })),
			crash: crash.map((page) => page.name),
			bad: (value && value.bad) || [],
			errors: (value && value.errors) || [],
			tiny: pages.reduce((sum, page) => sum + (page.tiny || 0), 0),
		});
		process.stderr.write(`${vp.label} pages=${pages.length} overflow=${overflow.length} crash=${crash.length}\n`);
	}
	const outPath = path.resolve('tests/final-parity/responsive-matrix.json');
	fs.mkdirSync(path.dirname(outPath), { recursive: true });
	fs.writeFileSync(outPath, JSON.stringify({ browser: browserName, exe, report }, null, 2));
	const fail = report.filter((item) => item.overflow.length || item.crash.length || item.bad.length || item.errors.length);
	console.log(JSON.stringify({
		browser: browserName,
		viewports: report.length,
		fail: fail.length,
		status: fail.length ? 'FAIL' : 'PASS',
	}));
} catch (err) {
	console.error(JSON.stringify({ status: 'FAIL', reason: String(err && err.stack || err) }));
	process.exitCode = 1;
} finally {
	proc.kill();
}
