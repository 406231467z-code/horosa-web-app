import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSpaStaticServer } from './spa-static-server.mjs';

const DIST = process.env.HOROSA_STATIC_ROOT
	|| path.resolve('local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui/dist');
const CHROME = [
	'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].find((item) => fs.existsSync(item));

const VIEWPORTS = [
	{ w: 390, h: 844, label: '390x844' },
	{ w: 375, h: 812, label: '375x812' },
	{ w: 360, h: 800, label: '360x800' },
];

if (!CHROME) {
	console.error(JSON.stringify({ status: 'FAIL', reason: 'chrome missing' }));
	process.exit(1);
}

const spa = process.env.HOROSA_STATIC_URL
	? null
	: await createSpaStaticServer(DIST, { port: Number(process.env.HOROSA_STATIC_PORT || 8010), host: '127.0.0.1' });
const BASE = process.env.HOROSA_STATIC_URL || spa.origin;

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'horosa-mkbd-'));
const debugPort = 9340;
const proc = spawn(CHROME, [
	'--headless=new',
	`--remote-debugging-port=${debugPort}`,
	`--user-data-dir=${profile}`,
	'--disable-gpu',
	BASE,
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

function flowScript(viewportLabel) {
	return `(async () => {
	const issues = [];
	const errors = [];
	const steps = [];
	const badNet = [];
	const vpLabel = ${JSON.stringify(viewportLabel)};
	if (!window.__horosaMkbd) {
		window.__horosaMkbd = true;
		const orig = window.fetch;
		window.fetch = function(input, init) {
			const url = typeof input === 'string' ? input : (input && input.url) || '';
			if (/:9999|:8899|:8892|\\/chart\\b|\\/predict\\/|\\/india\\/|\\/bazi\\/birth|\\/ziwei\\/birth/.test(String(url))) badNet.push(String(url));
			return orig.apply(this, arguments);
		};
		window.addEventListener('error', (e) => errors.push(String(e.message)));
		window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason && e.reason.message || e.reason)));
	}
	const snap = (name) => {
		const vv = window.visualViewport;
		const el = document.activeElement;
		const rect = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
		const vh = vv ? vv.height : window.innerHeight;
		const clipped = rect && (rect.bottom > vh - 4 || rect.top < 0);
		return {
			step: name,
			overflow: document.documentElement.scrollWidth - window.innerWidth,
			scrollY: window.scrollY,
			activeTag: el && el.tagName,
			activeType: el && el.type,
			clipped: !!clipped,
			vvHeight: vh,
		};
	};
	const clickExact = (name) => {
		const els = [...document.querySelectorAll('button,[role="tab"]')].filter((el) => (el.innerText || '').trim() === name);
		const el = els[els.length - 1];
		if (!el) return false;
		el.click();
		return true;
	};
	const openPalette = () => {
		if ([...document.querySelectorAll('button')].some((el) => (el.innerText || '').trim() === '关闭导航')) return true;
		const header = [...document.querySelectorAll('button')].find((el) => el.getBoundingClientRect().top < 88 && ['占星','星运','八字','AI分析','命盘','其他'].includes((el.innerText || '').trim()));
		if (!header) return false;
		header.click();
		return true;
	};
	const typeValue = (el, text) => {
		if (!el) return;
		el.focus();
		el.click && el.click();
		if ('value' in el) {
			el.value = text;
			el.dispatchEvent(new Event('input', { bubbles: true }));
			el.dispatchEvent(new Event('change', { bubbles: true }));
		}
	};
	const visible = (el) => el && el.offsetParent !== null;
	await new Promise((r) => setTimeout(r, 1200));
	steps.push(snap('home'));
	// Date/time: Ant Design picker inputs on workspace shell (home astro tab, not sub-module).
	const pickerInputs = [...document.querySelectorAll('.horosa-workspace-shell .ant-picker-input input')].filter(visible);
	if (pickerInputs.length === 0) {
		issues.push({ severity: 'medium', file: 'layouts/index + workspace shell', selector: '.horosa-workspace-shell .ant-picker-input input', viewport: vpLabel, behavior: 'no visible Ant Design picker input on home' });
	} else {
		typeValue(pickerInputs[0], '1990-06-15 10:30:00');
		await new Promise((r) => setTimeout(r, 120));
		steps.push(snap('after-datetime-focus'));
		if (steps[steps.length - 1].clipped) {
			issues.push({ severity: 'high', file: 'ant-picker-input', selector: '.ant-picker-input input', viewport: vpLabel, behavior: 'active picker input clipped after keyboard-sim viewport shrink' });
		}
		pickerInputs[0].blur();
		await new Promise((r) => setTimeout(r, 80));
	}
	const locInput = document.querySelector('.horosa-workspace-shell input[placeholder*="地点"], .horosa-workspace-shell .ant-select-selection-search-input');
	if (locInput && visible(locInput)) {
		typeValue(locInput, '福州');
		steps.push(snap('after-location'));
	} else {
		issues.push({ severity: 'low', file: 'workspace location field', selector: 'input[placeholder*="地点"]', viewport: vpLabel, behavior: 'location search input not found (may use alternate control)' });
	}
	clickExact('确 定') || clickExact('确定');
	await new Promise((r) => setTimeout(r, 200));
	steps.push(snap('after-submit'));
	openPalette();
	await new Promise((r) => setTimeout(r, 150));
	clickExact('AI分析');
	await new Promise((r) => setTimeout(r, 4500));
	const aiTa = document.querySelector('textarea[placeholder*="分析问题"], .composerInput textarea, textarea.ant-input');
	if (!aiTa || !visible(aiTa)) {
		issues.push({ severity: 'medium', file: 'AIAnalysisMain.js', selector: 'textarea[placeholder*="分析问题"]', viewport: vpLabel, behavior: 'AI composer textarea not visible after lazy chunk load' });
	} else {
		typeValue(aiTa, '键盘流测试');
		await new Promise((r) => setTimeout(r, 100));
		steps.push(snap('ai-focus'));
		if (steps[steps.length - 1].clipped) {
			issues.push({ severity: 'high', file: 'AIAnalysisMain.js', selector: 'textarea composer', viewport: vpLabel, behavior: 'AI textarea clipped under keyboard-sim viewport' });
		}
		aiTa.blur();
	}
	openPalette();
	await new Promise((r) => setTimeout(r, 150));
	clickExact('命盘');
	await new Promise((r) => setTimeout(r, 500));
	const drawer = document.querySelector('.ant-drawer-open, .ant-drawer-content');
	if (drawer) {
		steps.push(snap('drawer-open'));
		clickExact('关闭') || clickExact('返回列表') || clickExact('取消');
		await new Promise((r) => setTimeout(r, 200));
		steps.push(snap('drawer-close'));
	}
	clickExact('设置') || clickExact('帮助');
	await new Promise((r) => setTimeout(r, 400));
	const modal = document.querySelector('.ant-modal-wrap:not([style*="display: none"])');
	if (modal) {
		steps.push(snap('modal-open'));
		const cancel = [...document.querySelectorAll('button')].find((b) => /取消|关闭/.test((b.innerText || '').trim()));
		if (cancel) cancel.click();
		await new Promise((r) => setTimeout(r, 200));
		steps.push(snap('modal-close'));
	}
	const maxOverflow = Math.max(...steps.map((s) => s.overflow || 0), 0);
	const high = issues.filter((i) => i.severity === 'high');
	const pass = high.length === 0 && badNet.length === 0 && errors.length === 0 && maxOverflow <= 0;
	return { issues, errors: errors.slice(0, 8), steps, badNet, maxOverflow, pass };
})()`;
}

try {
	for (let i = 0; i < 40; i += 1) {
		try {
			if (Array.isArray(await jsonGet(`http://127.0.0.1:${debugPort}/json`))) break;
		} catch (err) {
			await sleep(250);
		}
	}
	const tabs = await jsonGet(`http://127.0.0.1:${debugPort}/json`);
	const page = tabs.find((tab) => tab.type === 'page' && tab.webSocketDebuggerUrl);
	if (!page) throw new Error('no page');
	const cdp = new Cdp(page.webSocketDebuggerUrl);
	await cdp.ready();
	await cdp.send('Runtime.enable');
	await cdp.send('Page.enable');
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

	const report = [];
	for (const vp of VIEWPORTS) {
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: vp.w,
			height: vp.h,
			deviceScaleFactor: 3,
			mobile: true,
		});
		await cdp.send('Page.navigate', { url: BASE });
		await sleep(2800);
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: vp.w,
			height: Math.round(vp.h * 0.52),
			deviceScaleFactor: 3,
			mobile: true,
		});
		await sleep(150);
		const evaluated = await cdp.send('Runtime.evaluate', {
			expression: flowScript(vp.label),
			awaitPromise: true,
			returnByValue: true,
		});
		const value = (evaluated.result && evaluated.result.value) || { pass: false, issues: [{ severity: 'high', behavior: 'empty evaluate' }] };
		report.push({ viewport: vp.label, ...value, status: value.pass ? 'PASS' : 'FAIL' });
		process.stderr.write(`${vp.label} pass=${value.pass} issues=${(value.issues || []).length} high=${(value.issues || []).filter((i) => i.severity === 'high').length} overflow=${value.maxOverflow}\n`);
	}

	const out = { base: BASE, dist: DIST, report, status: report.every((row) => row.status === 'PASS') ? 'PASS' : 'PARTIAL' };
	fs.writeFileSync(path.resolve('tests/final-parity/closure-mobile-keyboard.json'), JSON.stringify(out, null, 2));
	console.log(JSON.stringify({ status: out.status, viewports: report.map((r) => ({ v: r.viewport, pass: r.pass, issues: (r.issues || []).length })) }));
	if (out.status !== 'PASS') process.exitCode = 1;
} catch (err) {
	console.error(JSON.stringify({ status: 'FAIL', reason: String(err && err.stack || err) }));
	process.exitCode = 1;
} finally {
	proc.kill();
	if (spa) await spa.close();
}
