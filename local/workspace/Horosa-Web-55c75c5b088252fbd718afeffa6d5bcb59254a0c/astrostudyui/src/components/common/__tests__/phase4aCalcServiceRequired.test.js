import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';
import StartupGate from '../StartupGate';
import ServiceStatusBanner from '../ServiceStatusBanner';
import {
	isDesktopCalcShell,
	isServiceOnline,
	markServiceOffline,
	markServiceOnline,
	CALC_SERVICE_REQUIRED_MESSAGE,
} from '../../../utils/serviceStatus';

describe('PHASE 4-A calc service required', () => {
	let host;
	const origFetch = global.fetch;

	beforeEach(() => {
		host = document.createElement('div');
		document.body.appendChild(host);
		markServiceOnline();
		try { delete window.horosaDesktop; } catch (e) { window.horosaDesktop = undefined; }
		try { delete window.__TAURI__; } catch (e) { window.__TAURI__ = undefined; }
	});

	afterEach(() => {
		act(() => {
			unmountComponentAtNode(host);
		});
		host.remove();
		global.fetch = origFetch;
		markServiceOnline();
		try { delete window.horosaDesktop; } catch (e) { window.horosaDesktop = undefined; }
	});

	test('纯浏览器不探测 heartbeat，缺 Java 也不标成未生成结果', async () => {
		expect(isDesktopCalcShell()).toBe(false);
		global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch')));
		await act(async () => {
			render(<StartupGate />, host);
		});
		await act(async () => {
			await Promise.resolve();
		});
		expect(global.fetch).not.toHaveBeenCalled();
		expect(isServiceOnline()).toBe(true);
		expect(host.textContent || '').not.toContain('正在连接本地服务');
		await act(async () => {
			render(<ServiceStatusBanner />, host);
		});
		expect(host.textContent || '').not.toContain('需要计算服务');
		expect(host.textContent || '').not.toContain(CALC_SERVICE_REQUIRED_MESSAGE);
	});

	test('桌面壳连接被拒：仍保持启动覆盖，不假装服务已就绪', async () => {
		window.horosaDesktop = { getBootstrapConfig: () => null };
		expect(isDesktopCalcShell()).toBe(true);
		global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch')));
		await act(async () => {
			render(<StartupGate />, host);
		});
		await act(async () => {
			await Promise.resolve();
		});
		expect(host.textContent).toContain('正在连接本地服务');
		expect(isServiceOnline()).toBe(true);
		markServiceOffline();
	});
});
