// Treat RFC1918/LAN origins as local browser sessions too. When the UI is opened
// from a phone (for example http://172.20.10.5:8001), localhost would mean the phone,
// not the computer running the Java/Python services.
function isLanHostname(value){
	const host = String(value || '').toLowerCase().replace(/^\[|\]$/g, '').trim();
	if(!host || host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '::1'){
		return false;
	}
	if(host.endsWith('.local') || /^fe80:/i.test(host) || /^(fc|fd)[0-9a-f]{2}:/i.test(host)){
		return true;
	}
	const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if(!match){
		return false;
	}
	const octets = match.slice(1).map(Number);
	if(octets.some((n)=>n < 0 || n > 255)){
		return false;
	}
	const [a, b] = octets;
	return a === 10 ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 168) ||
		(a === 169 && b === 254);
}

function isLoopbackRoot(value){
	try{
		const host = new URL(value).hostname.toLowerCase().replace(/^\[|\]$/g, '');
		return host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '::1';
	}catch(e){
		return false;
	}
}

const isLocalHost =
	typeof window !== 'undefined' &&
	(
		window.location.protocol === 'file:' ||
		window.location.hostname === 'localhost' ||
		window.location.hostname === '127.0.0.1' ||
		isLanHostname(window.location.hostname)
	);

function isValidServerRootValue(val){
	return !!(val && /^https?:\/\/.+/i.test(String(val)));
}

function safeStorageGet(storage, key){
	try{
		return storage && storage.getItem ? storage.getItem(key) : null;
	}catch(e){
		return null;
	}
}

function safeStorageSet(storage, key, value){
	try{
		if(storage && storage.setItem){
			storage.setItem(key, value);
		}
	}catch(e){}
}

const LOCAL_ROOT_STORAGE_KEY = 'horosaLocalServerRoot';
const LOCAL_ROOT_STORAGE_MODE_KEY = 'horosaLocalServerRootMode';

function deriveLocalRootFromPagePort(){
	if(typeof window === 'undefined'){
		return null;
	}
	try{
		// Java remains on its configured local service port. Do not infer webPort + 1999:
		// Umi may move from 8000 to 8001 when the default port is already occupied.
		// For LAN access use the host serving the UI, not the phone's own loopback.
		let hostname = String(window.location.hostname || '').trim() || '127.0.0.1';
		if(hostname.indexOf(':') >= 0 && hostname.charAt(0) !== '['){
			hostname = '[' + hostname + ']';
		}
		return 'http://' + hostname + ':9999';
	}catch(e){
		return null;
	}
}

function queryLocalServerRoot(){
	if(typeof window === 'undefined'){
		return null;
	}
	try{
		const params = new URLSearchParams(window.location.search || '');
		const fromQuery = params.get('srv');
		if(isValidServerRootValue(fromQuery)){
			return fromQuery;
		}
	}catch(e){}
	return null;
}

function resolveLocalServerRoot(){
	if(typeof window === 'undefined'){
		return 'http://127.0.0.1:9999';
	}
	const storageKey = LOCAL_ROOT_STORAGE_KEY;
	const storageModeKey = LOCAL_ROOT_STORAGE_MODE_KEY;
	const saveServerRoot = (serverRoot, mode)=>{
		if(!isValidServerRootValue(serverRoot)){
			return;
		}
		safeStorageSet(window.localStorage, storageKey, serverRoot);
		if(mode){
			safeStorageSet(window.localStorage, storageModeKey, mode);
		}
	};
	const deriveFromPagePort = deriveLocalRootFromPagePort;
	{
		const fromQuery = queryLocalServerRoot();
		if(fromQuery){
			saveServerRoot(fromQuery, 'query');
			return fromQuery;
		}
	}
	const fromStorage = safeStorageGet(window.localStorage, storageKey);
	const storageMode = safeStorageGet(window.localStorage, storageModeKey);
	const fromPage = deriveFromPagePort();
	// A loopback address persisted from desktop use cannot reach the host machine
	// from a phone. In a LAN browser session prefer the same LAN host unless storage
	// contains a non-loopback custom root. An explicit current ?srv= override was handled above.
	const staleLoopbackForLan = isLanHostname(window.location.hostname) && isLoopbackRoot(fromStorage);
	const shouldPreferStorage = isValidServerRootValue(fromStorage) && !staleLoopbackForLan &&
		(
			storageMode === 'query' ||
			storageMode === 'pinned' ||
			storageMode === 'manual' ||
			!isValidServerRootValue(fromPage)
		);
	if(shouldPreferStorage){
		return fromStorage;
	}
	if(isValidServerRootValue(fromPage)){
		saveServerRoot(fromPage, 'page');
		return fromPage;
	}
	if(isValidServerRootValue(fromStorage)){
		return fromStorage;
	}
	return 'http://127.0.0.1:9999';
}

function readLaunchSid(){
	if(typeof window === 'undefined'){
		return '';
	}
	try{
		const params = new URLSearchParams(window.location.search || '');
		const fromQuery = `${params.get('sid') || ''}`.trim();
		if(/^[A-Za-z0-9_-]{4,64}$/.test(fromQuery)){
			safeStorageSet(window.sessionStorage, 'horosaLaunchSid', fromQuery);
			return fromQuery;
		}
	}catch(e){}
	const stored = safeStorageGet(window.sessionStorage, 'horosaLaunchSid');
	return (stored && /^[A-Za-z0-9_-]{4,64}$/.test(`${stored}`)) ? `${stored}` : '';
}

export const IsLocalHostEnv = isLocalHost;
// 壳注入的启动会话 nonce(URL &sid=,同 tab 存 sessionStorage 兜住丢 query 的页内导航):
// /horosaIdentity 身份握手的期望值;浏览器直连 dev 无 sid 时只核 app 标记。
export const LaunchSid = readLaunchSid();
// 活绑定(let,2026-07-04 事故复盘:):backendIdentity 自愈换根时原地更新;babel CJS 下 import 方
// 每次读取都是属性访问,取到最新值。本地服务地址永不盲信——地址可疑时经身份握手再协商。
export let ServerRoot = isLocalHost ? resolveLocalServerRoot() : 'https://srv.horosa.com';
// 服务地址自愈的唯一写入口:仅本地环境生效;写通过后同步持久化(mode 记录来源)。
export function applyLocalServerRoot(root, mode){
	if(!isLocalHost || !isValidServerRootValue(root)){
		return false;
	}
	const normalized = `${root}`.replace(/\/$/, '');
	ServerRoot = normalized;
	if(typeof window !== 'undefined'){
		safeStorageSet(window.localStorage, LOCAL_ROOT_STORAGE_KEY, normalized);
		if(mode){
			safeStorageSet(window.localStorage, LOCAL_ROOT_STORAGE_MODE_KEY, mode);
		}
	}
	return true;
}
// 自愈候选序(去重,含当前值):query > 存储 > 页面端口推导 > dev 默认 9999。仅本地环境使用。
export function localServerRootCandidates(){
	if(!isLocalHost){
		return [];
	}
	const list = [];
	const push = (val)=>{
		if(isValidServerRootValue(val)){
			const normalized = `${val}`.replace(/\/$/, '');
			if(list.indexOf(normalized) < 0){
				list.push(normalized);
			}
		}
	};
	push(ServerRoot);
	push(queryLocalServerRoot());
	if(typeof window !== 'undefined'){
		push(safeStorageGet(window.localStorage, LOCAL_ROOT_STORAGE_KEY));
	}
	push(deriveLocalRootFromPagePort());
	push('http://127.0.0.1:9999');
	return list;
}
export const MobileServer = 'https://mobileweb.horosa.com';
export const WebSockServer = 'ws://www.horosa.com:26900/ws';
export const RtmpPushServer = 'https://rtmpush.horosa.com';
export const RtmpPlayServer = 'https://rtmp.horosa.com';
export const HasRtspPlayer = false;

// export const ServerRoot = 'http://localhost:9999';

export const NeedEncrypt = true;

export const NeedWS = false;

export const ResultCodeKey = 'ResultCode';
export const ResultKey = 'Result';
export const ResultMessageKey = 'Result';
export const TokenKey = 'Token';
export const UserDataKey = 'UserData';
export const LoginIdKey = 'LoginId';
export const NeedLoginKey = 'NeedLogin';

export const SignatureKey = 'FE45AB6E29EF';

export const ClientChannel = '1';
export const ClientApp = '1';
export const ClientVer = '1.0';

export const AMapKey = '6a8a4bc072c3c948bf85167b66b09bfd';
export const AMapVer = '2.0';
export const AMapUIVer = '1.1';

export const DefLat = '26n04';
export const DefLon = '119e19';
export const DefGpsLat = 26.076417371316914;
export const DefGpsLon = 119.31516153077507;

export const AccessDenyCode = 900;
export const UploadFailCode = 800;

export const TableOddRowBgColor = 'var(--horosa-table-row-alt, rgba(47, 125, 241, 0.06))';

export const TimeInterval = 15000;

export const EmailRegex = new RegExp("(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|\"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*\")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)\\])");
export const GlobalSetupKey = 'globalSetup';

export const HomePageKey = 'pchomepage';
