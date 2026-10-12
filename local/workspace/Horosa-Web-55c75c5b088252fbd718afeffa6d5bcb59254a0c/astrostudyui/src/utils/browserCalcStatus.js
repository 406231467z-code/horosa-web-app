import { message } from 'antd';
import { isBrowserOnlyEnv } from './constants';

const shownWarnings = new Set();

/**
 * Report that an existing module has no complete browser-local calculation yet.
 * Returns true in browser-only mode so callers can distinguish this from ordinary
 * desktop/backend errors. Each module warns once per page session to avoid spam
 * when reactive form updates trigger several consecutive recalculations.
 */
export function notifyBrowserCalcUnavailable(moduleKey, moduleLabel){
	if(!isBrowserOnlyEnv()){
		return false;
	}
	const key = String(moduleKey || 'unknown-module');
	if(!shownWarnings.has(key)){
		shownWarnings.add(key);
		const label = moduleLabel || '该术数模块';
		message.warning(`${label}尚未完成浏览器本地计算迁移。当前未连接后端，也未生成结果。`);
	}
	return true;
}

export function __resetBrowserCalcStatusForTest(){
	shownWarnings.clear();
}
