import { isDesktopCalcShell } from './serviceStatus';
import { unsupportedStatus } from './calcStatus';

// 纯浏览器不把计算发给本机 Java/Python/Kentang。
// 桌面壳和 Jest 保持原请求。外部 https API 不在此列。

const CALC_PATH = /^\/(chart\d*|predict|india|astroextra|modern|qimen|taiyi|jinkou|liureng|ziwei|bazi|nongli|wangji|geomancy|taixuan|jingjue|shenyishu|wuzhao|germany|jieqi|jdn|heartbeat|horosaIdentity|qizheng|cetian|xianqin|shaozi|fendjing|beiji|nanji|chunzi|tieban|qizhengkin|common\/time|user\/check|log)\b/i;

export function browserCalculationBlock(url){
	if(process.env.NODE_ENV === 'test'){
		return null;
	}
	if(typeof window === 'undefined' || isDesktopCalcShell()){
		return null;
	}
	const raw = `${url || ''}`;
	if(!raw){
		return null;
	}
	let path = raw;
	let local = false;
	try{
		const parsed = new URL(raw, 'http://127.0.0.1');
		local = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || raw.startsWith('/');
		path = parsed.pathname || '/';
	}catch(e){
		local = raw.startsWith('/') || /127\.0\.0\.1|localhost/i.test(raw);
	}
	if(!local || !CALC_PATH.test(path)){
		return null;
	}
	const status = unsupportedStatus(path, 'BROWSER_NO_LOCAL_CALC', '浏览器不请求本地计算服务。');
	return {
		...status,
		ResultCode: status.status,
		Result: null,
	};
}
