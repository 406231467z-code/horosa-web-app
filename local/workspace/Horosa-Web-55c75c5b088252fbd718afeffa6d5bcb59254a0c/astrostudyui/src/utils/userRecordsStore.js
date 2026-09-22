// PHASE 2-B/2-C/2-D: 命盘/事盘四键 IndexedDB(horosa.user-records.v1)。
//
// 2-B: LS 成功后异步双写 + 首启迁移/对账。
// 2-C: 迁移完成且 schema=1 后 IDB 主读;同步 list 走 memory snapshot。
// 2-D: primaryReady 后 IDB 主写;四键禁止生产 setItem;LS 四键保留为迁移遗留快照,不删除。
// 公开 API 仍同步。IDB 失败永不 throw、不挡首屏、不把 envelope 字段写进 record。
//
// Schema v1
//   DB     horosa.user-records.v1
//   stores charts | cases | charts_trash | cases_trash | meta
//   live/trash envelope:
//     { cid, kind:'chart'|'case', slot:'live'|'trash',
//       record:<LS 数组元素原样 JSON 克隆>,
//       updatedAt:Number(Date.parse(updateTime|deletedAt)||0),
//       createdAt:Number(首次写入本库的 ms),
//       writeSeq:Number(本会话写序号,仅防同会话陈旧 flush) }
//   meta id='state':
//     { id:'state', version:1, migrated:true, migratedAt, lastReconcileAt,
//       counts:{charts,cases,charts_trash,cases_trash} }
//
// 对账(幂等,不覆盖更新一侧):
//   LS 有 IDB 无 → put IDB
//   IDB 有 LS 无 → 写回 LS(双写期 LS 仍是启动真值,补洞不删 LS)
//   两边一致 → 跳过
//   两边都有但 stamp/schemaVersion 不同 → 较新者胜;stamp 相同则 LS 胜
//   IDB 打不开/meta.version>本版 → 当不可用,不动 LS,不置 horosa.lc.idb
import { safeLocalStorageSet } from './safeStorage';
import { mirrorShadowWrite } from './shadowMirror';

export const USER_RECORDS_DB_NAME = 'horosa.user-records.v1';
export const USER_RECORDS_DB_VERSION = 1;
export const USER_RECORDS_META_VERSION = 1;
export const USER_RECORDS_MIGRATION_FLAG = 'horosa.lc.idb';

export const USER_RECORDS_STATUS = {
	uninitialized: 'uninitialized',
	opening: 'opening',
	ready: 'ready',
	unavailable: 'unavailable',
	schemaIncompatible: 'schema-incompatible',
	migrationPending: 'migration-pending',
};

export const USER_RECORDS_STORES = {
	charts: 'charts',
	cases: 'cases',
	chartsTrash: 'charts_trash',
	casesTrash: 'cases_trash',
	meta: 'meta',
};

export const USER_RECORDS_LS_KEYS = {
	chart: { live: 'horosa.localCharts.v1', trash: 'horosa.localCharts.trash.v1' },
	case: { live: 'horosa.localCases.v1', trash: 'horosa.localCases.trash.v1' },
};

export const USER_RECORDS_FOUR_LS_KEYS = [
	USER_RECORDS_LS_KEYS.chart.live,
	USER_RECORDS_LS_KEYS.chart.trash,
	USER_RECORDS_LS_KEYS.case.live,
	USER_RECORDS_LS_KEYS.case.trash,
];

const LIVE_STORE = { chart: USER_RECORDS_STORES.charts, case: USER_RECORDS_STORES.cases };
const TRASH_STORE = { chart: USER_RECORDS_STORES.chartsTrash, case: USER_RECORDS_STORES.casesTrash };
const ALL_OBJECT_STORES = [
	USER_RECORDS_STORES.charts,
	USER_RECORDS_STORES.cases,
	USER_RECORDS_STORES.chartsTrash,
	USER_RECORDS_STORES.casesTrash,
	USER_RECORDS_STORES.meta,
];

let dbPromise = null;
let idbBroken = false;
let forcedUnavailable = false;
let testBackend = null;
let backendFailWrites = false;
let hydrateFailForced = false;
let migrateKicked = false;
let flushScheduled = false;
let flushChain = Promise.resolve();
const pending = {}; // storeName -> { seq, kind, slot, records }
const appliedSeq = {};
let readiness = USER_RECORDS_STATUS.uninitialized;
let primaryReady = false;
let lastIdbFailure = null;
let mutateGen = 0;
let idbReadOps = 0;
let idbTxOps = 0;
let fourKeyWriteCounts = {
	'horosa.localCharts.v1': 0,
	'horosa.localCharts.trash.v1': 0,
	'horosa.localCases.v1': 0,
	'horosa.localCases.trash.v1': 0,
};
let fourKeyRatchetOn = false;
let originalLocalStorageSetItem = null;
const primaryListeners = [];
let snapshots = {
	chart: { live: null, trash: null },
	case: { live: null, trash: null },
};

function emptySnapshots(){
	return {
		chart: { live: null, trash: null },
		case: { live: null, trash: null },
	};
}

function snapshotsComplete(s){
	return !!(s
		&& s.chart && s.case
		&& (s.chart.live instanceof Array)
		&& (s.chart.trash instanceof Array)
		&& (s.case.live instanceof Array)
		&& (s.case.trash instanceof Array));
}

function isTestEnv(){
	try{
		return typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
	}catch(_e){
		return false;
	}
}

function kindOf(kind){
	return kind === 'case' ? 'case' : 'chart';
}

function slotOf(slot){
	return slot === 'trash' ? 'trash' : 'live';
}

function setReadiness(status, failure){
	readiness = status;
	if(failure){
		lastIdbFailure = failure;
	}
	if(status === USER_RECORDS_STATUS.ready){
		primaryReady = true;
	}else{
		primaryReady = false;
	}
}

function notifyPrimaryListeners(){
	primaryListeners.forEach((fn)=>{
		try{ fn(); }catch(_e){ /* 监听失败不阻断主读 */ }
	});
}

function recordsFromEnvelopes(rows){
	const out = [];
	(rows || []).forEach((row)=>{
		if(row && row.record && row.record.cid){
			out.push(row.record);
		}
	});
	return out;
}

export function getUserRecordsReadiness(){
	return {
		status: readiness,
		primaryReady,
		lastFailure: lastIdbFailure,
	};
}

export function isUserRecordsPrimaryReady(){
	return primaryReady === true && readiness === USER_RECORDS_STATUS.ready;
}

export function getUserRecordsSnapshot(kind, slot){
	if(!isUserRecordsPrimaryReady()){
		return null;
	}
	const list = snapshots[kindOf(kind)][slotOf(slot)];
	return list instanceof Array ? list : null;
}

export function adoptUserRecordsSnapshot(kind, slot, records){
	const k = kindOf(kind);
	const s = slotOf(slot);
	snapshots[k][s] = records instanceof Array ? records : [];
	mutateGen += 1;
}

export function subscribeUserRecordsPrimary(fn){
	if(typeof fn !== 'function'){
		return ()=>{};
	}
	primaryListeners.push(fn);
	return ()=>{
		const idx = primaryListeners.indexOf(fn);
		if(idx >= 0){
			primaryListeners.splice(idx, 1);
		}
	};
}

export function formatUserRecordsReadinessLabel(){
	if(readiness === USER_RECORDS_STATUS.ready){
		return '主存';
	}
	if(readiness === USER_RECORDS_STATUS.unavailable){
		return '不可用，使用兼容回退';
	}
	if(readiness === USER_RECORDS_STATUS.schemaIncompatible){
		return '版本不兼容';
	}
	if(readiness === USER_RECORDS_STATUS.opening){
		return '迁移中';
	}
	if(readiness === USER_RECORDS_STATUS.migrationPending){
		return '迁移中';
	}
	return '未初始化';
}

export function getUserRecordsIdbReadOps(){
	return idbReadOps;
}

export function getUserRecordsIdbTxOps(){
	return idbTxOps;
}

function replicaEnabled(){
	if(forcedUnavailable){
		return false;
	}
	if(testBackend){
		return true;
	}
	if(isTestEnv()){
		return false;
	}
	return idbSupported();
}

function idbSupported(){
	try{
		return typeof window !== 'undefined' && !!window.indexedDB;
	}catch(_e){
		return false;
	}
}

function cloneRecord(rec){
	if(!rec || typeof rec !== 'object'){
		return null;
	}
	try{
		return JSON.parse(JSON.stringify(rec));
	}catch(_e){
		return null;
	}
}

function recordStamp(rec){
	if(!rec || typeof rec !== 'object'){
		return 0;
	}
	const raw = rec.deletedAt || rec.updateTime || '';
	return Date.parse(raw) || 0;
}

function recordSchemaVersion(rec){
	return parseInt(rec && rec.schemaVersion, 10) || 1;
}

function jsonEqual(a, b){
	try{
		return JSON.stringify(a) === JSON.stringify(b);
	}catch(_e){
		return false;
	}
}

function storeFor(kind, slot){
	const k = kind === 'case' ? 'case' : 'chart';
	return slot === 'trash' ? TRASH_STORE[k] : LIVE_STORE[k];
}

function lsKeyFor(kind, slot){
	const k = kind === 'case' ? 'case' : 'chart';
	return slot === 'trash' ? USER_RECORDS_LS_KEYS[k].trash : USER_RECORDS_LS_KEYS[k].live;
}

function makeEnvelope(kind, slot, rec, writeSeq, prev){
	const record = cloneRecord(rec);
	if(!record || !record.cid){
		return null;
	}
	return {
		cid: `${record.cid}`,
		kind: kind === 'case' ? 'case' : 'chart',
		slot: slot === 'trash' ? 'trash' : 'live',
		record,
		updatedAt: recordStamp(record),
		createdAt: (prev && prev.createdAt) || Date.now(),
		writeSeq: writeSeq || 0,
	};
}

function createMemoryBackend(){
	const maps = {};
	ALL_OBJECT_STORES.forEach((name)=>{ maps[name] = new Map(); });
	return {
		async getAll(storeName){
			return Array.from((maps[storeName] || new Map()).values());
		},
		async get(storeName, key){
			const m = maps[storeName];
			return m ? m.get(key) : undefined;
		},
		async put(storeName, value){
			const m = maps[storeName];
			if(!m || !value){
				return;
			}
			const key = value.cid || value.id;
			if(key){
				m.set(key, value);
			}
		},
		async delete(storeName, key){
			const m = maps[storeName];
			if(m){
				m.delete(key);
			}
		},
	};
}

function openDb(){
	if(forcedUnavailable){
		return Promise.resolve(null);
	}
	if(testBackend){
		return Promise.resolve({ __memory: true });
	}
	if(idbBroken || !idbSupported()){
		return Promise.resolve(null);
	}
	if(dbPromise){
		return dbPromise;
	}
	dbPromise = new Promise((resolve)=>{
		let req;
		try{
			req = window.indexedDB.open(USER_RECORDS_DB_NAME, USER_RECORDS_DB_VERSION);
		}catch(_e){
			idbBroken = true;
			resolve(null);
			return;
		}
		req.onupgradeneeded = ()=>{
			try{
				const db = req.result;
				ALL_OBJECT_STORES.forEach((name)=>{
					if(!db.objectStoreNames.contains(name)){
						const keyPath = name === USER_RECORDS_STORES.meta ? 'id' : 'cid';
						db.createObjectStore(name, { keyPath });
					}
				});
			}catch(_e){ /* onerror 收 */ }
		};
		req.onsuccess = ()=>{
			const db = req.result;
			try{
				db.onversionchange = ()=>{ try{ db.close(); }catch(_e){} dbPromise = null; };
			}catch(_e){ /* ignore */ }
			resolve(db);
		};
		req.onerror = ()=>{ idbBroken = true; lastIdbFailure = 'open'; resolve(null); };
		req.onblocked = ()=>{ lastIdbFailure = 'blocked'; resolve(null); };
	});
	return dbPromise;
}

function cursorGetAll(store){
	return new Promise((resolve)=>{
		const out = [];
		try{
			const req = store.openCursor();
			req.onsuccess = ()=>{
				const cur = req.result;
				if(cur){
					out.push(cur.value);
					cur.continue();
				}else{
					resolve(out);
				}
			};
			req.onerror = ()=>resolve([]);
		}catch(_e){
			resolve([]);
		}
	});
}

function txDone(tx){
	return new Promise((resolve)=>{
		if(!tx){
			resolve(false);
			return;
		}
		tx.oncomplete = ()=>resolve(true);
		tx.onerror = ()=>resolve(false);
		tx.onabort = ()=>resolve(false);
	});
}

async function backendGetAll(storeName){
	idbReadOps += 1;
	if(testBackend){
		try{
			return await testBackend.getAll(storeName);
		}catch(_e){
			return [];
		}
	}
	const db = await openDb();
	if(!db || db.__memory){
		return [];
	}
	return new Promise((resolve)=>{
		try{
			const tx = db.transaction(storeName, 'readonly');
			cursorGetAll(tx.objectStore(storeName)).then(resolve, ()=>resolve([]));
		}catch(_e){
			resolve([]);
		}
	});
}

async function backendGet(storeName, key){
	if(testBackend){
		try{
			return await testBackend.get(storeName, key);
		}catch(_e){
			return undefined;
		}
	}
	const db = await openDb();
	if(!db || db.__memory){
		return undefined;
	}
	return new Promise((resolve)=>{
		try{
			const tx = db.transaction(storeName, 'readonly');
			const req = tx.objectStore(storeName).get(key);
			req.onsuccess = ()=>resolve(req.result);
			req.onerror = ()=>resolve(undefined);
		}catch(_e){
			resolve(undefined);
		}
	});
}

async function replaceStore(storeName, kind, slot, records, writeSeq){
	const prevApplied = appliedSeq[storeName] || 0;
	if(writeSeq < prevApplied){
		return true;
	}
	const list = records instanceof Array ? records : [];
	const envelopes = [];
	for(let i = 0; i < list.length; i++){
		const env = makeEnvelope(kind, slot, list[i], writeSeq, null);
		if(env){
			envelopes.push(env);
		}
	}
	const nextIds = new Set(envelopes.map((e)=>e.cid));

	if(backendFailWrites){
		lastIdbFailure = 'write';
		return false;
	}
	if(testBackend){
		try{
			const existing = await testBackend.getAll(storeName);
			for(let i = 0; i < envelopes.length; i++){
				const env = envelopes[i];
				const prev = await testBackend.get(storeName, env.cid);
				env.createdAt = (prev && prev.createdAt) || env.createdAt;
				await testBackend.put(storeName, env);
			}
			for(let i = 0; i < (existing || []).length; i++){
				const row = existing[i];
				const cid = row && (row.cid || row.id);
				if(cid && !nextIds.has(cid) && cid !== 'state'){
					await testBackend.delete(storeName, cid);
				}
			}
			appliedSeq[storeName] = writeSeq;
			return true;
		}catch(_e){
			return false;
		}
	}

	const db = await openDb();
	if(!db || db.__memory){
		return false;
	}
	try{
		const tx = db.transaction(storeName, 'readwrite');
		const os = tx.objectStore(storeName);
		const existing = await cursorGetAll(os);
		existing.forEach((row)=>{
			const cid = row && row.cid;
			if(cid && !nextIds.has(cid)){
				try{ os.delete(cid); }catch(_e){ /* skip */ }
			}
		});
		envelopes.forEach((env)=>{
			const prev = existing.find((row)=>row && row.cid === env.cid);
			if(prev && prev.createdAt){
				env.createdAt = prev.createdAt;
			}
			try{ os.put(env); }catch(_e){ /* skip */ }
		});
		const ok = await txDone(tx);
		if(ok){
			appliedSeq[storeName] = writeSeq;
		}
		return ok;
	}catch(_e){
		return false;
	}
}

async function replaceLiveAndTrash(kind, liveJob, trashJob){
	const k = kind === 'case' ? 'case' : 'chart';
	const liveStore = storeFor(k, 'live');
	const trashStore = storeFor(k, 'trash');
	const liveSeq = (liveJob && liveJob.seq) || 0;
	const trashSeq = (trashJob && trashJob.seq) || 0;
	const liveRecords = liveJob && liveJob.records;
	const trashRecords = trashJob && trashJob.records;
	if(backendFailWrites){
		lastIdbFailure = 'write';
		return false;
	}
	if(testBackend){
		const liveOk = await replaceStore(liveStore, k, 'live', liveRecords, liveSeq);
		const trashOk = await replaceStore(trashStore, k, 'trash', trashRecords, trashSeq);
		return liveOk && trashOk;
	}
	const db = await openDb();
	if(!db || db.__memory){
		return false;
	}
	try{
		const tx = db.transaction([liveStore, trashStore], 'readwrite');
		const liveApplied = appliedSeq[liveStore] || 0;
		const trashApplied = appliedSeq[trashStore] || 0;
		if(liveSeq >= liveApplied){
			const os = tx.objectStore(liveStore);
			const existing = await cursorGetAll(os);
			applyReplaceOnStore(os, k, 'live', liveRecords, liveSeq, existing);
		}
		if(trashSeq >= trashApplied){
			const os = tx.objectStore(trashStore);
			const existing = await cursorGetAll(os);
			applyReplaceOnStore(os, k, 'trash', trashRecords, trashSeq, existing);
		}
		const ok = await txDone(tx);
		if(ok){
			if(liveSeq >= liveApplied){
				appliedSeq[liveStore] = liveSeq;
			}
			if(trashSeq >= trashApplied){
				appliedSeq[trashStore] = trashSeq;
			}
		}
		return ok;
	}catch(_e){
		return false;
	}
}

function applyReplaceOnStore(os, kind, slot, records, writeSeq, existing){
	const list = records instanceof Array ? records : [];
	const envelopes = [];
	for(let i = 0; i < list.length; i++){
		const env = makeEnvelope(kind, slot, list[i], writeSeq, null);
		if(env){
			envelopes.push(env);
		}
	}
	const nextIds = new Set(envelopes.map((e)=>e.cid));
	(existing || []).forEach((row)=>{
		const cid = row && row.cid;
		if(cid && !nextIds.has(cid)){
			try{ os.delete(cid); }catch(_e){ /* skip */ }
		}
	});
	envelopes.forEach((env)=>{
		const prev = (existing || []).find((row)=>row && row.cid === env.cid);
		if(prev && prev.createdAt){
			env.createdAt = prev.createdAt;
		}
		try{ os.put(env); }catch(_e){ /* skip */ }
	});
}

async function putEnvelope(storeName, env){
	if(!env || !env.cid){
		return false;
	}
	if(backendFailWrites){
		lastIdbFailure = 'write';
		return false;
	}
	if(testBackend){
		try{
			const prev = await testBackend.get(storeName, env.cid);
			if(prev && prev.createdAt){
				env.createdAt = prev.createdAt;
			}
			await testBackend.put(storeName, env);
			return true;
		}catch(_e){
			return false;
		}
	}
	const db = await openDb();
	if(!db || db.__memory){
		return false;
	}
	return new Promise((resolve)=>{
		try{
			const tx = db.transaction(storeName, 'readwrite');
			tx.oncomplete = ()=>resolve(true);
			tx.onerror = ()=>resolve(false);
			tx.objectStore(storeName).put(env);
		}catch(_e){
			resolve(false);
		}
	});
}

async function putMeta(state){
	const rec = { id: 'state', ...state };
	if(backendFailWrites){
		lastIdbFailure = 'write';
		return false;
	}
	if(testBackend){
		try{
			await testBackend.put(USER_RECORDS_STORES.meta, rec);
			return true;
		}catch(_e){
			return false;
		}
	}
	const db = await openDb();
	if(!db || db.__memory){
		return false;
	}
	return new Promise((resolve)=>{
		try{
			const tx = db.transaction(USER_RECORDS_STORES.meta, 'readwrite');
			tx.oncomplete = ()=>resolve(true);
			tx.onerror = ()=>resolve(false);
			tx.objectStore(USER_RECORDS_STORES.meta).put(rec);
		}catch(_e){
			resolve(false);
		}
	});
}

async function getMeta(){
	if(testBackend){
		try{
			return await testBackend.get(USER_RECORDS_STORES.meta, 'state') || null;
		}catch(_e){
			return null;
		}
	}
	return (await backendGet(USER_RECORDS_STORES.meta, 'state')) || null;
}

function readLsArray(key){
	try{
		if(typeof window === 'undefined' || !window.localStorage){
			return [];
		}
		const raw = window.localStorage.getItem(key);
		if(raw === null || raw === undefined || raw === ''){
			return [];
		}
		const ary = JSON.parse(raw);
		return ary instanceof Array ? ary : [];
	}catch(_e){
		return [];
	}
}

function writeLsArray(key, list){
	try{
		const text = JSON.stringify(list instanceof Array ? list : []);
		if(!safeLocalStorageSet(key, text)){
			return false;
		}
		try{ mirrorShadowWrite(key, text); }catch(_e){ /* 影子失败不阻断 */ }
		return true;
	}catch(_e){
		return false;
	}
}

function pickWinner(lsRec, idbEnv){
	if(lsRec && !idbEnv){
		return 'ls';
	}
	if(!lsRec && idbEnv){
		return 'idb';
	}
	if(!lsRec && !idbEnv){
		return 'none';
	}
	const idbRec = idbEnv.record;
	if(jsonEqual(lsRec, idbRec)){
		return 'same';
	}
	const lsStamp = recordStamp(lsRec);
	const idbStamp = (idbEnv && idbEnv.updatedAt) || recordStamp(idbRec);
	if(idbStamp > lsStamp){
		return 'idb';
	}
	if(lsStamp > idbStamp){
		return 'ls';
	}
	const lsVer = recordSchemaVersion(lsRec);
	const idbVer = recordSchemaVersion(idbRec);
	if(idbVer > lsVer){
		return 'idb';
	}
	return 'ls';
}

async function reconcileSlot(kind, slot){
	const storeName = storeFor(kind, slot);
	const lsKey = lsKeyFor(kind, slot);
	const lsList = readLsArray(lsKey);
	const lsMap = new Map();
	lsList.forEach((rec)=>{
		if(rec && rec.cid){
			lsMap.set(`${rec.cid}`, rec);
		}
	});
	const existing = (await backendGetAll(storeName)).filter((row)=>row && row.cid && row.record);
	const idbMap = new Map();
	existing.forEach((row)=>idbMap.set(`${row.cid}`, row));

	const allCids = new Set([...lsMap.keys(), ...idbMap.keys()]);
	const nextLs = lsList.filter((rec)=>rec && rec.cid).slice();
	const lsByCid = new Map(nextLs.map((rec)=>[`${rec.cid}`, rec]));
	let lsDirty = false;
	let ok = true;

	const cids = Array.from(allCids);
	for(let i = 0; i < cids.length; i++){
		const cid = cids[i];
		const lsRec = lsMap.get(cid);
		const idbEnv = idbMap.get(cid);
		const winner = pickWinner(lsRec, idbEnv);
		if(winner === 'same' || winner === 'none'){
			continue;
		}
		if(winner === 'ls'){
			const env = makeEnvelope(kind, slot, lsRec, 0, idbEnv);
			if(env){
				const putOk = await putEnvelope(storeName, env);
				if(!putOk){
					ok = false;
				}
			}
		}else if(winner === 'idb'){
			const rec = cloneRecord(idbEnv.record);
			if(!rec){
				continue;
			}
			if(lsByCid.has(cid)){
				const idx = nextLs.findIndex((r)=>r && `${r.cid}` === cid);
				if(idx >= 0){
					nextLs[idx] = rec;
				}
			}else{
				nextLs.push(rec);
			}
			lsByCid.set(cid, rec);
			lsDirty = true;
		}
	}

	if(lsDirty){
		if(!writeLsArray(lsKey, nextLs)){
			ok = false;
		}
	}
	return { ok, storeName, count: nextLs.length };
}

function coalesceFlushJobs(jobs){
	const byKind = { chart: {}, case: {} };
	const rest = [];
	jobs.forEach((job)=>{
		const k = job.kind === 'case' ? 'case' : 'chart';
		if(job.slot === 'live' || job.slot === 'trash'){
			byKind[k][job.slot] = job;
		}else{
			rest.push(job);
		}
	});
	const out = rest.slice();
	['chart', 'case'].forEach((k)=>{
		const pair = byKind[k];
		if(pair.live && pair.trash){
			out.push({
				paired: true,
				kind: k,
				live: pair.live,
				trash: pair.trash,
			});
		}else{
			if(pair.live){
				out.push(pair.live);
			}
			if(pair.trash){
				out.push(pair.trash);
			}
		}
	});
	return out;
}

async function runFlush(){
	if(!replicaEnabled()){
		return false;
	}
	const jobs = Object.keys(pending).map((storeName)=>{
		const job = pending[storeName];
		delete pending[storeName];
		return job ? { storeName, ...job } : null;
	}).filter(Boolean);
	if(!jobs.length){
		return true;
	}
	const coalesced = coalesceFlushJobs(jobs);
	let ok = true;
	for(let i = 0; i < coalesced.length; i++){
		const job = coalesced[i];
		idbTxOps += 1;
		let wrote = false;
		if(job.paired){
			// eslint-disable-next-line no-await-in-loop
			wrote = await replaceLiveAndTrash(job.kind, job.live, job.trash);
		}else{
			// eslint-disable-next-line no-await-in-loop
			wrote = await replaceStore(job.storeName, job.kind, job.slot, job.records, job.seq);
		}
		if(!wrote){
			ok = false;
			lastIdbFailure = lastIdbFailure || 'write';
		}
	}
	return ok;
}

function scheduleFlush(){
	if(isTestEnv()){
		return;
	}
	if(flushScheduled){
		return;
	}
	flushScheduled = true;
	const kick = ()=>{
		flushScheduled = false;
		flushChain = flushChain.then(runFlush).catch(()=>false);
	};
	if(typeof requestIdleCallback === 'function' && !isTestEnv()){
		requestIdleCallback(kick, { timeout: 800 });
		return;
	}
	setTimeout(kick, 0);
}

export function scheduleUserRecordsReplace(kind, slot, records, writeSeq){
	if(!replicaEnabled()){
		return;
	}
	const k = kind === 'case' ? 'case' : 'chart';
	const s = slot === 'trash' ? 'trash' : 'live';
	const storeName = storeFor(k, s);
	const seq = writeSeq || 0;
	const prev = pending[storeName];
	const applied = appliedSeq[storeName] || 0;
	if(seq < applied){
		return;
	}
	if(prev && seq < prev.seq){
		return;
	}
	pending[storeName] = {
		seq,
		kind: k,
		slot: s,
		records: (records instanceof Array ? records.slice() : []),
	};
	scheduleFlush();
}

export function kickUserRecordsMigration(){
	if(isTestEnv()){
		return;
	}
	if(migrateKicked){
		return;
	}
	migrateKicked = true;
	const run = ()=>{
		hydrateUserRecordsPrimary().catch(()=>{});
	};
	if(typeof requestIdleCallback === 'function'){
		requestIdleCallback(run, { timeout: 2000 });
		return;
	}
	setTimeout(run, 0);
}

export function flushUserRecordsWrites(){
	flushScheduled = false;
	flushChain = flushChain.then(runFlush).catch(()=>false);
	return flushChain;
}

export async function listUserRecordEnvelopes(storeName){
	if(!replicaEnabled()){
		return [];
	}
	const rows = await backendGetAll(storeName);
	return (rows || []).filter((row)=>row && row.cid);
}

async function loadSnapshotsFromIdb(){
	if(hydrateFailForced){
		throw new Error('hydrate-fail');
	}
	const next = {
		chart: { live: [], trash: [] },
		case: { live: [], trash: [] },
	};
	const plan = [
		['chart', 'live', USER_RECORDS_STORES.charts],
		['chart', 'trash', USER_RECORDS_STORES.chartsTrash],
		['case', 'live', USER_RECORDS_STORES.cases],
		['case', 'trash', USER_RECORDS_STORES.casesTrash],
	];
	for(let i = 0; i < plan.length; i++){
		const kind = plan[i][0];
		const slot = plan[i][1];
		const storeName = plan[i][2];
		// eslint-disable-next-line no-await-in-loop
		const rows = await backendGetAll(storeName);
		next[kind][slot] = recordsFromEnvelopes(rows);
	}
	return next;
}

function mergeLoadedSnapshots(loaded){
	snapshots = {
		chart: {
			live: snapshots.chart.live instanceof Array ? snapshots.chart.live : loaded.chart.live,
			trash: snapshots.chart.trash instanceof Array ? snapshots.chart.trash : loaded.chart.trash,
		},
		case: {
			live: snapshots.case.live instanceof Array ? snapshots.case.live : loaded.case.live,
			trash: snapshots.case.trash instanceof Array ? snapshots.case.trash : loaded.case.trash,
		},
	};
}

async function activatePrimaryIfEligible(state){
	if(!state || state.migrated !== true || parseInt(state.version, 10) !== USER_RECORDS_META_VERSION){
		setReadiness(USER_RECORDS_STATUS.migrationPending, 'not-migrated');
		return false;
	}
	try{
		await flushUserRecordsWrites();
		const gen = mutateGen;
		const loaded = await loadSnapshotsFromIdb();
		if(mutateGen === gen){
			snapshots = loaded;
		}else{
			mergeLoadedSnapshots(loaded);
		}
	}catch(_e){
		setReadiness(USER_RECORDS_STATUS.unavailable, 'hydrate');
		return false;
	}
	if(!snapshotsComplete(snapshots)){
		setReadiness(USER_RECORDS_STATUS.migrationPending, 'incomplete-snapshot');
		return false;
	}
	if(!state.primaryReadyAt){
		try{
			await putMeta({
				...state,
				primaryReadyAt: new Date().toISOString(),
			});
		}catch(_e){ /* 主读标记失败不撤回已迁移数据 */ }
	}
	setReadiness(USER_RECORDS_STATUS.ready);
	notifyPrimaryListeners();
	return true;
}

export async function hydrateUserRecordsPrimary(){
	return migrateAndReconcileUserRecords();
}

export async function migrateAndReconcileUserRecords(){
	if(forcedUnavailable){
		setReadiness(USER_RECORDS_STATUS.unavailable, 'unavailable');
		return { ok: false, reason: 'unavailable' };
	}
	if(!testBackend && !idbSupported()){
		setReadiness(USER_RECORDS_STATUS.unavailable, 'unsupported');
		return { ok: false, reason: 'unavailable' };
	}
	if(readiness !== USER_RECORDS_STATUS.ready){
		setReadiness(USER_RECORDS_STATUS.opening);
	}
	const db = await openDb();
	if(!db && !testBackend){
		setReadiness(USER_RECORDS_STATUS.unavailable, lastIdbFailure || 'open');
		return { ok: false, reason: 'unavailable' };
	}
	const meta = await getMeta();
	if(meta && parseInt(meta.version, 10) > USER_RECORDS_META_VERSION){
		setReadiness(USER_RECORDS_STATUS.schemaIncompatible, 'schema');
		return { ok: false, reason: 'schema' };
	}
	if(meta && meta.migrated === true && parseInt(meta.version, 10) === USER_RECORDS_META_VERSION){
		await activatePrimaryIfEligible(meta);
		return { ok: isUserRecordsPrimaryReady(), reason: isUserRecordsPrimaryReady() ? 'ok' : 'hydrate', counts: meta.counts };
	}
	await flushUserRecordsWrites();
	const slots = [
		{ kind: 'chart', slot: 'live' },
		{ kind: 'chart', slot: 'trash' },
		{ kind: 'case', slot: 'live' },
		{ kind: 'case', slot: 'trash' },
	];
	const counts = {};
	let ok = true;
	for(let i = 0; i < slots.length; i++){
		// eslint-disable-next-line no-await-in-loop
		const r = await reconcileSlot(slots[i].kind, slots[i].slot);
		if(!r.ok){
			ok = false;
		}
		counts[r.storeName] = r.count;
	}
	if(!ok){
		setReadiness(USER_RECORDS_STATUS.migrationPending, 'partial');
		return { ok: false, reason: 'partial', counts };
	}
	const state = {
		version: USER_RECORDS_META_VERSION,
		migrated: true,
		migratedAt: (meta && meta.migratedAt) || new Date().toISOString(),
		lastReconcileAt: new Date().toISOString(),
		counts,
	};
	const metaOk = await putMeta(state);
	if(metaOk){
		try{ safeLocalStorageSet(USER_RECORDS_MIGRATION_FLAG, '1'); }catch(_e){ /* 旗标失败不删数据 */ }
		await activatePrimaryIfEligible(state);
		return { ok: true, reason: 'ok', counts };
	}
	setReadiness(USER_RECORDS_STATUS.migrationPending, 'meta');
	return { ok: false, reason: 'meta', counts };
}

function emptyFourKeyCounts(){
	const counts = {};
	USER_RECORDS_FOUR_LS_KEYS.forEach((key)=>{ counts[key] = 0; });
	return counts;
}

function ensureFourKeyRatchetPatched(){
	if(originalLocalStorageSetItem || typeof window === 'undefined' || !window.localStorage){
		return;
	}
	originalLocalStorageSetItem = window.localStorage.setItem.bind(window.localStorage);
	window.localStorage.setItem = function(key, value){
		if(fourKeyRatchetOn && Object.prototype.hasOwnProperty.call(fourKeyWriteCounts, key)){
			fourKeyWriteCounts[key] += 1;
		}
		return originalLocalStorageSetItem(key, value);
	};
}

export function __startFourKeyWriteRatchetForTests(){
	ensureFourKeyRatchetPatched();
	fourKeyWriteCounts = emptyFourKeyCounts();
	fourKeyRatchetOn = true;
}

export function __getFourKeyWriteCountsForTests(){
	return { ...fourKeyWriteCounts };
}

export function __stopFourKeyWriteRatchetForTests(){
	fourKeyRatchetOn = false;
}

function resetRuntimeState(){
	migrateKicked = false;
	flushScheduled = false;
	flushChain = Promise.resolve();
	Object.keys(pending).forEach((k)=>{ delete pending[k]; });
	Object.keys(appliedSeq).forEach((k)=>{ delete appliedSeq[k]; });
	backendFailWrites = false;
	hydrateFailForced = false;
	lastIdbFailure = null;
	mutateGen = 0;
	idbReadOps = 0;
	idbTxOps = 0;
	snapshots = emptySnapshots();
	setReadiness(USER_RECORDS_STATUS.uninitialized);
	fourKeyWriteCounts = emptyFourKeyCounts();
	fourKeyRatchetOn = false;
}

export function __installUserRecordsMemoryBackendForTests(){
	forcedUnavailable = false;
	idbBroken = false;
	dbPromise = null;
	testBackend = createMemoryBackend();
	resetRuntimeState();
}

export function __setUserRecordsUnavailableForTests(){
	forcedUnavailable = true;
	testBackend = null;
	idbBroken = true;
	dbPromise = null;
	Object.keys(pending).forEach((k)=>{ delete pending[k]; });
	setReadiness(USER_RECORDS_STATUS.unavailable, 'unavailable');
}

export function __setUserRecordsWriteFailForTests(flag){
	backendFailWrites = !!flag;
}

export function __setUserRecordsHydrateFailForTests(flag){
	hydrateFailForced = !!flag;
}

export function getUserRecordsMeta(){
	if(!replicaEnabled()){
		return Promise.resolve(null);
	}
	return getMeta();
}

export function __putUserRecordsMetaForTests(state){
	return putMeta(state);
}

export function __resetUserRecordsForTests(){
	forcedUnavailable = false;
	testBackend = null;
	idbBroken = false;
	dbPromise = null;
	resetRuntimeState();
}
