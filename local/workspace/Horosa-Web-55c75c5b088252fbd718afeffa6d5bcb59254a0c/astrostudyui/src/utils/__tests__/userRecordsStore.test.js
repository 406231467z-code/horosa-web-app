import {
	upsertLocalChart,
	listLocalCharts,
	removeLocalChart,
	listLocalChartsTrash,
	purgeLocalChartTrashItem,
	restoreLocalChartFromTrash,
	exportLocalChartsBackup,
	importLocalChartsBackup,
} from '../localcharts';
import {
	upsertLocalCase,
	listLocalCases,
	removeLocalCase,
	listLocalCasesTrash,
	restoreLocalCaseFromTrash,
} from '../localcases';
import {
	USER_RECORDS_STORES,
	USER_RECORDS_STATUS,
	USER_RECORDS_MIGRATION_FLAG,
	flushUserRecordsWrites,
	migrateAndReconcileUserRecords,
	hydrateUserRecordsPrimary,
	listUserRecordEnvelopes,
	getUserRecordsMeta,
	getUserRecordsReadiness,
	isUserRecordsPrimaryReady,
	getUserRecordsIdbReadOps,
	getUserRecordsIdbTxOps,
	formatUserRecordsReadinessLabel,
	scheduleUserRecordsReplace,
	USER_RECORDS_FOUR_LS_KEYS,
	__installUserRecordsMemoryBackendForTests,
	__setUserRecordsUnavailableForTests,
	__setUserRecordsWriteFailForTests,
	__setUserRecordsHydrateFailForTests,
	__resetUserRecordsForTests,
	__putUserRecordsMetaForTests,
	__startFourKeyWriteRatchetForTests,
	__getFourKeyWriteCountsForTests,
	__stopFourKeyWriteRatchetForTests,
} from '../userRecordsStore';

const CHARTS_KEY = 'horosa.localCharts.v1';
const CASES_KEY = 'horosa.localCases.v1';
const CHARTS_TRASH = 'horosa.localCharts.trash.v1';
const CASES_TRASH = 'horosa.localCases.trash.v1';

function chartSeed(cid, extra){
	return {
		cid,
		name: cid,
		birth: '1990-01-01 08:00:00',
		zone: '+08:00',
		updateTime: '2026-09-01 10:00:00',
		preserveUpdateTime: true,
		...(extra || {}),
	};
}

function caseSeed(cid, extra){
	return {
		cid,
		event: cid,
		caseType: 'liuyao',
		divTime: '2026-01-01 10:00:00',
		zone: '+08:00',
		updateTime: '2026-09-01 09:00:00',
		preserveUpdateTime: true,
		...(extra || {}),
	};
}

describe('PHASE 2-B user-records IDB replica', ()=>{
	beforeEach(()=>{
		window.localStorage.clear();
		__resetUserRecordsForTests();
		__installUserRecordsMemoryBackendForTests();
	});

	afterEach(()=>{
		__resetUserRecordsForTests();
		window.localStorage.clear();
	});

	it('migration copies LS charts/cases per cid and is idempotent', async ()=>{
		upsertLocalChart(chartSeed('local-m-1', { name: '甲' }));
		upsertLocalChart(chartSeed('local-m-2', { name: '乙', updateTime: '2026-09-01 11:00:00' }));
		upsertLocalCase(caseSeed('local-case-m-1', { event: '课甲' }));
		const first = await migrateAndReconcileUserRecords();
		expect(first.ok).toBe(true);
		expect(window.localStorage.getItem(USER_RECORDS_MIGRATION_FLAG)).toBe('1');
		expect(window.localStorage.getItem(CHARTS_KEY)).toContain('甲');
		expect(window.localStorage.getItem(CASES_KEY)).toContain('课甲');
		const charts = await listUserRecordEnvelopes(USER_RECORDS_STORES.charts);
		const cases = await listUserRecordEnvelopes(USER_RECORDS_STORES.cases);
		expect(charts.map((e)=>e.cid).sort()).toEqual(['local-m-1', 'local-m-2']);
		expect(cases.map((e)=>e.cid)).toEqual(['local-case-m-1']);
		expect(charts.every((e)=>e.kind === 'chart' && e.slot === 'live' && e.record)).toBe(true);
		const second = await migrateAndReconcileUserRecords();
		expect(second.ok).toBe(true);
		expect((await listUserRecordEnvelopes(USER_RECORDS_STORES.charts)).length).toBe(2);
		expect(listLocalCharts().map((r)=>r.name).sort()).toEqual(['乙', '甲']);
	});

	it('CRUD dual-write: upsert/update/delete keep LS and IDB aligned', async ()=>{
		upsertLocalChart(chartSeed('local-c-1', { name: '初' }));
		await flushUserRecordsWrites();
		let rows = await listUserRecordEnvelopes(USER_RECORDS_STORES.charts);
		expect(rows).toHaveLength(1);
		expect(rows[0].record.name).toBe('初');
		upsertLocalChart({ cid: 'local-c-1', name: '改' });
		await flushUserRecordsWrites();
		rows = await listUserRecordEnvelopes(USER_RECORDS_STORES.charts);
		expect(rows[0].record.name).toBe('改');
		expect(listLocalCharts()[0].name).toBe('改');
		removeLocalChart('local-c-1');
		await flushUserRecordsWrites();
		expect(await listUserRecordEnvelopes(USER_RECORDS_STORES.charts)).toEqual([]);
		const trash = await listUserRecordEnvelopes(USER_RECORDS_STORES.chartsTrash);
		expect(trash).toHaveLength(1);
		expect(trash[0].cid).toBe('local-c-1');
		expect(trash[0].slot).toBe('trash');
		expect(listLocalChartsTrash()[0].cid).toBe('local-c-1');
		expect(JSON.parse(window.localStorage.getItem(CHARTS_KEY))).toEqual([]);
	});

	it('purge trash deletes IDB trash row and does not resurrect live', async ()=>{
		upsertLocalChart(chartSeed('local-p-1'));
		removeLocalChart('local-p-1');
		await flushUserRecordsWrites();
		purgeLocalChartTrashItem('local-p-1');
		await flushUserRecordsWrites();
		expect(await listUserRecordEnvelopes(USER_RECORDS_STORES.chartsTrash)).toEqual([]);
		expect(listLocalCharts()).toEqual([]);
		expect(window.localStorage.getItem(CHARTS_TRASH) === '[]' || window.localStorage.getItem(CHARTS_TRASH) === null).toBe(true);
	});

	it('IDB unavailable: LS CRUD still works, migrate fails closed, LS not deleted', async ()=>{
		__setUserRecordsUnavailableForTests();
		upsertLocalChart(chartSeed('local-u-1', { name: '仍在' }));
		expect(listLocalCharts()[0].name).toBe('仍在');
		const r = await migrateAndReconcileUserRecords();
		expect(r.ok).toBe(false);
		expect(r.reason).toBe('unavailable');
		expect(window.localStorage.getItem(CHARTS_KEY)).toContain('仍在');
		expect(window.localStorage.getItem(USER_RECORDS_MIGRATION_FLAG)).toBe(null);
	});

	it('fallback: LS empty after replica exists restores from IDB without dropping IDB', async ()=>{
		upsertLocalChart(chartSeed('local-r-1', { name: '可恢复' }));
		await flushUserRecordsWrites();
		window.localStorage.removeItem(CHARTS_KEY);
		expect(listLocalCharts()).toEqual([]);
		const r = await migrateAndReconcileUserRecords();
		expect(r.ok).toBe(true);
		expect(listLocalCharts()[0].name).toBe('可恢复');
		expect((await listUserRecordEnvelopes(USER_RECORDS_STORES.charts))[0].record.name).toBe('可恢复');
	});

	it('partial migration: existing IDB cid is kept, missing cid is filled, newer IDB is not overwritten', async ()=>{
		upsertLocalChart(chartSeed('local-old', { name: 'LS旧', updateTime: '2026-09-01 08:00:00' }));
		upsertLocalChart(chartSeed('local-only-ls', { name: '仅LS', updateTime: '2026-09-01 09:00:00' }));
		await flushUserRecordsWrites();
		scheduleUserRecordsReplace('chart', 'live', [
			{ cid: 'local-old', name: 'IDB新', birth: '1990-01-01 08:00:00', zone: '+08:00', updateTime: '2026-09-02 08:00:00' },
			{ cid: 'local-only-idb', name: '仅IDB', birth: '1990-01-01 08:00:00', zone: '+08:00', updateTime: '2026-09-02 09:00:00' },
		], 9999);
		await flushUserRecordsWrites();
		const r = await migrateAndReconcileUserRecords();
		expect(r.ok).toBe(true);
		const byCid = {};
		listLocalCharts({ includeArchived: true }).forEach((rec)=>{ byCid[rec.cid] = rec; });
		expect(byCid['local-old'].name).toBe('IDB新');
		expect(byCid['local-only-ls'].name).toBe('仅LS');
		expect(byCid['local-only-idb'].name).toBe('仅IDB');
		const idb = await listUserRecordEnvelopes(USER_RECORDS_STORES.charts);
		const idbNames = idb.map((e)=>e.record.name).sort();
		expect(idbNames).toEqual(['IDB新', '仅IDB', '仅LS']);
	});

	it('stale write: lower writeSeq after a newer replace is ignored', async ()=>{
		scheduleUserRecordsReplace('chart', 'live', [chartSeed('local-s-1', { name: '新' })], 5);
		await flushUserRecordsWrites();
		scheduleUserRecordsReplace('chart', 'live', [chartSeed('local-s-1', { name: '旧' })], 2);
		await flushUserRecordsWrites();
		const rows = await listUserRecordEnvelopes(USER_RECORDS_STORES.charts);
		expect(rows[0].record.name).toBe('新');
	});

	it('reconciliation: same content is a no-op; schema-incompatible IDB does not delete LS', async ()=>{
		upsertLocalChart(chartSeed('local-eq-1', { name: '同' }));
		await migrateAndReconcileUserRecords();
		const before = window.localStorage.getItem(CHARTS_KEY);
		await migrateAndReconcileUserRecords();
		expect(window.localStorage.getItem(CHARTS_KEY)).toBe(before);
		await __putUserRecordsMetaForTests({ version: 99, migrated: true });
		const blocked = await migrateAndReconcileUserRecords();
		expect(blocked.ok).toBe(false);
		expect(blocked.reason).toBe('schema');
		expect(window.localStorage.getItem(CHARTS_KEY)).toBe(before);
	});

	it('reload persistence: dual-write survives a second migrate pass', async ()=>{
		upsertLocalChart(chartSeed('local-rl-1', { name: '持久' }));
		upsertLocalCase(caseSeed('local-case-rl-1', { event: '持久课' }));
		await flushUserRecordsWrites();
		await migrateAndReconcileUserRecords();
		const meta = await getUserRecordsMeta();
		expect(meta.migrated).toBe(true);
		expect(meta.version).toBe(1);
		expect((await listUserRecordEnvelopes(USER_RECORDS_STORES.charts))[0].record.name).toBe('持久');
		expect((await listUserRecordEnvelopes(USER_RECORDS_STORES.cases))[0].record.event).toBe('持久课');
	});

	it('multi cid and 命盘/事盘 isolation share a cid string without mixing stores', async ()=>{
		upsertLocalChart(chartSeed('shared-cid', { name: '命盘同号' }));
		upsertLocalCase(caseSeed('shared-cid', { event: '事盘同号' }));
		await flushUserRecordsWrites();
		const charts = await listUserRecordEnvelopes(USER_RECORDS_STORES.charts);
		const cases = await listUserRecordEnvelopes(USER_RECORDS_STORES.cases);
		expect(charts).toHaveLength(1);
		expect(cases).toHaveLength(1);
		expect(charts[0].kind).toBe('chart');
		expect(cases[0].kind).toBe('case');
		expect(charts[0].record.name).toBe('命盘同号');
		expect(cases[0].record.event).toBe('事盘同号');
		expect(listLocalCharts().find((r)=>r.cid === 'shared-cid').name).toBe('命盘同号');
		expect(listLocalCases().find((r)=>r.cid === 'shared-cid').event).toBe('事盘同号');
	});
});

function envelopeKeysOn(rec){
	if(!rec){
		return [];
	}
	return ['writeSeq', 'kind', 'slot', 'createdAt'].filter((k)=>Object.prototype.hasOwnProperty.call(rec, k));
}

describe('PHASE 2-C IndexedDB primary read', ()=>{
	beforeEach(()=>{
		window.localStorage.clear();
		__resetUserRecordsForTests();
		__installUserRecordsMemoryBackendForTests();
	});

	afterEach(()=>{
		__resetUserRecordsForTests();
		window.localStorage.clear();
	});

	it('migrated → IDB primary; pending/failed/unavailable/schema/missing-state stay on LS', async ()=>{
		expect(getUserRecordsReadiness().status).toBe(USER_RECORDS_STATUS.uninitialized);
		expect(isUserRecordsPrimaryReady()).toBe(false);
		expect(formatUserRecordsReadinessLabel()).toContain('未初始化');
		upsertLocalChart(chartSeed('local-2c-miss', { name: '缺 state' }));
		expect(listLocalCharts()[0].name).toBe('缺 state');
		expect(isUserRecordsPrimaryReady()).toBe(false);

		__setUserRecordsWriteFailForTests(true);
		const pending = await hydrateUserRecordsPrimary();
		expect(pending.ok).toBe(false);
		expect(getUserRecordsReadiness().status).toBe(USER_RECORDS_STATUS.migrationPending);
		expect(isUserRecordsPrimaryReady()).toBe(false);
		expect(listLocalCharts()[0].name).toBe('缺 state');
		__setUserRecordsWriteFailForTests(false);

		window.localStorage.clear();
		__resetUserRecordsForTests();
		__installUserRecordsMemoryBackendForTests();
		await __putUserRecordsMetaForTests({ version: 99, migrated: true });
		upsertLocalChart(chartSeed('local-2c-schema', { name: 'schema 回退' }));
		const blocked = await hydrateUserRecordsPrimary();
		expect(blocked.reason).toBe('schema');
		expect(getUserRecordsReadiness().status).toBe(USER_RECORDS_STATUS.schemaIncompatible);
		expect(isUserRecordsPrimaryReady()).toBe(false);
		expect(listLocalCharts()[0].name).toBe('schema 回退');
		expect(window.localStorage.getItem(CHARTS_KEY)).toContain('schema 回退');

		__setUserRecordsUnavailableForTests();
		const down = await hydrateUserRecordsPrimary();
		expect(down.reason).toBe('unavailable');
		expect(getUserRecordsReadiness().status).toBe(USER_RECORDS_STATUS.unavailable);
		expect(listLocalCharts()[0].name).toBe('schema 回退');

		__resetUserRecordsForTests();
		__installUserRecordsMemoryBackendForTests();
		window.localStorage.clear();
		upsertLocalChart(chartSeed('local-2c-ok', { name: '主读' }));
		const ready = await hydrateUserRecordsPrimary();
		expect(ready.ok).toBe(true);
		expect(isUserRecordsPrimaryReady()).toBe(true);
		expect(getUserRecordsReadiness().status).toBe(USER_RECORDS_STATUS.ready);
		expect(formatUserRecordsReadinessLabel()).toBe('主存');
		expect(listLocalCharts()[0].name).toBe('主读');
	});

	it('hydration: LS snapshot then IDB memory; hydrate fail keeps LS memory', async ()=>{
		upsertLocalChart(chartSeed('local-2c-hy', { name: '先 LS' }));
		const lsName = listLocalCharts()[0].name;
		expect(lsName).toBe('先 LS');
		expect(isUserRecordsPrimaryReady()).toBe(false);
		const ok = await hydrateUserRecordsPrimary();
		expect(ok.ok).toBe(true);
		expect(isUserRecordsPrimaryReady()).toBe(true);
		expect(listLocalCharts()[0].name).toBe('先 LS');
		expect(envelopeKeysOn(listLocalCharts()[0])).toEqual([]);

		window.localStorage.clear();
		__resetUserRecordsForTests();
		__installUserRecordsMemoryBackendForTests();
		upsertLocalChart(chartSeed('local-2c-hy-fail', { name: '保留' }));
		__setUserRecordsHydrateFailForTests(true);
		const failed = await hydrateUserRecordsPrimary();
		expect(failed.ok).toBe(true);
		expect(isUserRecordsPrimaryReady()).toBe(false);
		expect(listLocalCharts()[0].name).toBe('保留');
		expect(window.localStorage.getItem(CHARTS_KEY)).toContain('保留');
	});

	it('primary writes keep memory + IDB; restore/permanent delete stay consistent', async ()=>{
		upsertLocalChart(chartSeed('local-2c-w1', { name: 'A' }));
		await hydrateUserRecordsPrimary();
		expect(isUserRecordsPrimaryReady()).toBe(true);
		const lsBefore = window.localStorage.getItem(CHARTS_KEY);
		upsertLocalChart({ cid: 'local-2c-w1', name: 'B' });
		await flushUserRecordsWrites();
		expect(listLocalCharts()[0].name).toBe('B');
		expect(window.localStorage.getItem(CHARTS_KEY)).toBe(lsBefore);
		expect(JSON.parse(lsBefore)[0].name).toBe('A');
		expect((await listUserRecordEnvelopes(USER_RECORDS_STORES.charts))[0].record.name).toBe('B');

		removeLocalChart('local-2c-w1');
		await flushUserRecordsWrites();
		expect(listLocalCharts()).toEqual([]);
		expect(listLocalChartsTrash()[0].cid).toBe('local-2c-w1');
		expect(await listUserRecordEnvelopes(USER_RECORDS_STORES.charts)).toEqual([]);
		expect((await listUserRecordEnvelopes(USER_RECORDS_STORES.chartsTrash))[0].cid).toBe('local-2c-w1');

		restoreLocalChartFromTrash('local-2c-w1');
		await flushUserRecordsWrites();
		expect(listLocalCharts()[0].cid).toBe('local-2c-w1');
		expect(listLocalChartsTrash()).toEqual([]);
		expect((await listUserRecordEnvelopes(USER_RECORDS_STORES.charts))[0].cid).toBe('local-2c-w1');
		expect(await listUserRecordEnvelopes(USER_RECORDS_STORES.chartsTrash)).toEqual([]);

		removeLocalChart('local-2c-w1');
		purgeLocalChartTrashItem('local-2c-w1');
		await flushUserRecordsWrites();
		const log = JSON.parse(window.localStorage.getItem('horosa.deleted.log.v1') || '[]');
		expect(log.some((e)=>e && e.record && e.record.cid === 'local-2c-w1')).toBe(true);
		expect(listLocalCharts()).toEqual([]);
		expect(listLocalChartsTrash()).toEqual([]);
	});

	it('stale flush A after B cannot roll IDB back; chart/case cid isolation holds after primary', async ()=>{
		await hydrateUserRecordsPrimary();
		scheduleUserRecordsReplace('chart', 'live', [chartSeed('local-2c-stale', { name: 'B' })], 8);
		await flushUserRecordsWrites();
		scheduleUserRecordsReplace('chart', 'live', [chartSeed('local-2c-stale', { name: 'A' })], 3);
		await flushUserRecordsWrites();
		expect((await listUserRecordEnvelopes(USER_RECORDS_STORES.charts))[0].record.name).toBe('B');

		upsertLocalChart(chartSeed('abc', { name: '命盘 abc' }));
		upsertLocalCase(caseSeed('abc', { event: '事盘 abc' }));
		await flushUserRecordsWrites();
		expect(listLocalCharts().find((r)=>r.cid === 'abc').name).toBe('命盘 abc');
		expect(listLocalCases().find((r)=>r.cid === 'abc').event).toBe('事盘 abc');
		const charts = await listUserRecordEnvelopes(USER_RECORDS_STORES.charts);
		const cases = await listUserRecordEnvelopes(USER_RECORDS_STORES.cases);
		expect(charts.filter((e)=>e.cid === 'abc')).toHaveLength(1);
		expect(cases.filter((e)=>e.cid === 'abc')).toHaveLength(1);
		expect(charts[0].record.name).toBe('命盘 abc');
		expect(cases[0].record.event).toBe('事盘 abc');
	});

	it('backup after primary-ready keeps LS-era envelope; import does not leak envelope fields', async ()=>{
		upsertLocalChart(chartSeed('local-2c-bk', { name: '备份' }));
		await hydrateUserRecordsPrimary();
		const backup = exportLocalChartsBackup();
		expect(backup.format).toBe('horosa-local-charts');
		expect(backup.version).toBe(1);
		expect(backup.charts).toHaveLength(1);
		expect(backup.charts[0].cid).toBe('local-2c-bk');
		expect(backup.charts[0].name).toBe('备份');
		expect(envelopeKeysOn(backup.charts[0])).toEqual([]);
		window.localStorage.removeItem(CHARTS_KEY);
		__resetUserRecordsForTests();
		__installUserRecordsMemoryBackendForTests();
		importLocalChartsBackup(backup);
		await hydrateUserRecordsPrimary();
		const rec = listLocalCharts()[0];
		expect(rec.name).toBe('备份');
		expect(envelopeKeysOn(rec)).toEqual([]);
	});

	it('IDB write fail after primary does not throw, does not rewrite LS, does not drop primary', async ()=>{
		upsertLocalChart(chartSeed('local-2c-fb', { name: '可见' }));
		await hydrateUserRecordsPrimary();
		expect(isUserRecordsPrimaryReady()).toBe(true);
		const lsBefore = window.localStorage.getItem(CHARTS_KEY);
		__setUserRecordsWriteFailForTests(true);
		upsertLocalChart({ cid: 'local-2c-fb', name: '仍可见' });
		await flushUserRecordsWrites();
		expect(listLocalCharts()[0].name).toBe('仍可见');
		expect(window.localStorage.getItem(CHARTS_KEY)).toBe(lsBefore);
		expect(getUserRecordsReadiness().lastFailure).toBe('write');
		expect(isUserRecordsPrimaryReady()).toBe(true);
		__setUserRecordsUnavailableForTests();
		expect(listLocalCharts()[0].name).toBe('可见');
		expect(window.localStorage.getItem(CHARTS_KEY)).toContain('可见');
	});

	it('list latency: hydrated memory is not slower than LS fallback by IDB access', async ()=>{
		upsertLocalChart(chartSeed('local-2c-lat', { name: '计时' }));
		const tLs0 = Date.now();
		for(let i = 0; i < 1000; i++){
			listLocalCharts();
		}
		const lsMs = Date.now() - tLs0;
		await hydrateUserRecordsPrimary();
		const readsBefore = getUserRecordsIdbReadOps();
		const tIdb0 = Date.now();
		for(let i = 0; i < 1000; i++){
			listLocalCharts();
		}
		const idbMs = Date.now() - tIdb0;
		expect(getUserRecordsIdbReadOps()).toBe(readsBefore);
		expect(idbMs).toBeLessThan(Math.max(40, lsMs * 4 + 20));
	});

	it('1000 charts + 1000 cases: hydrate/list/upsert/remove/restore stay isolated', async ()=>{
		for(let i = 0; i < 1000; i++){
			upsertLocalChart(chartSeed(`local-2c-n-${i}`, { name: `命${i}`, updateTime: '2026-09-01 10:00:00' }));
			upsertLocalCase(caseSeed(`local-case-2c-n-${i}`, { event: `事${i}`, updateTime: '2026-09-01 09:00:00' }));
		}
		await flushUserRecordsWrites();
		const hyd = await hydrateUserRecordsPrimary();
		expect(hyd.ok).toBe(true);
		expect(listLocalCharts({ includeArchived: true })).toHaveLength(1000);
		expect(listLocalCases({ includeArchived: true })).toHaveLength(1000);
		upsertLocalChart({ cid: 'local-2c-n-0', name: '命改' });
		removeLocalChart('local-2c-n-1');
		await flushUserRecordsWrites();
		expect(listLocalCharts({ includeArchived: true }).find((r)=>r.cid === 'local-2c-n-0').name).toBe('命改');
		expect(listLocalCharts({ includeArchived: true }).find((r)=>r.cid === 'local-2c-n-1')).toBeFalsy();
		expect(listLocalChartsTrash().find((r)=>r.cid === 'local-2c-n-1')).toBeTruthy();
		restoreLocalChartFromTrash('local-2c-n-1');
		await flushUserRecordsWrites();
		expect(listLocalCharts({ includeArchived: true }).find((r)=>r.cid === 'local-2c-n-1')).toBeTruthy();
		expect(listLocalChartsTrash().find((r)=>r.cid === 'local-2c-n-1')).toBeFalsy();
		expect(listLocalCases({ includeArchived: true })).toHaveLength(1000);
		removeLocalCase('local-case-2c-n-2');
		restoreLocalCaseFromTrash('local-case-2c-n-2');
		expect(listLocalCases({ includeArchived: true })).toHaveLength(1000);
		expect(listLocalCasesTrash()).toEqual([]);
	}, 60000);
});

function fourKeyCountsZero(counts){
	USER_RECORDS_FOUR_LS_KEYS.forEach((key)=>{
		expect(counts[key]).toBe(0);
	});
}

describe('PHASE 2-D IndexedDB primary write', ()=>{
	beforeEach(()=>{
		window.localStorage.clear();
		__resetUserRecordsForTests();
		__installUserRecordsMemoryBackendForTests();
	});

	afterEach(()=>{
		__stopFourKeyWriteRatchetForTests();
		__resetUserRecordsForTests();
		window.localStorage.clear();
	});

	it('after primaryReady, CRUD does not setItem the four LS keys and leaves LS as legacy snapshot', async ()=>{
		upsertLocalChart(chartSeed('local-2d-a', { name: 'A' }));
		upsertLocalCase(caseSeed('local-2d-case', { event: '课A' }));
		await hydrateUserRecordsPrimary();
		expect(isUserRecordsPrimaryReady()).toBe(true);
		const lsCharts = window.localStorage.getItem(CHARTS_KEY);
		const lsCases = window.localStorage.getItem(CASES_KEY);
		const lsChartsTrash = window.localStorage.getItem(CHARTS_TRASH);
		const lsCasesTrash = window.localStorage.getItem(CASES_TRASH);
		expect(JSON.parse(lsCharts)[0].name).toBe('A');
		__startFourKeyWriteRatchetForTests();
		upsertLocalChart({ cid: 'local-2d-a', name: 'B' });
		removeLocalChart('local-2d-a');
		restoreLocalChartFromTrash('local-2d-a');
		await flushUserRecordsWrites();
		fourKeyCountsZero(__getFourKeyWriteCountsForTests());
		expect(window.localStorage.getItem(CHARTS_KEY)).toBe(lsCharts);
		expect(window.localStorage.getItem(CASES_KEY)).toBe(lsCases);
		expect(window.localStorage.getItem(CHARTS_TRASH)).toBe(lsChartsTrash);
		expect(window.localStorage.getItem(CASES_TRASH)).toBe(lsCasesTrash);
		expect(JSON.parse(lsCharts)[0].name).toBe('A');
		expect(listLocalCharts()[0].name).toBe('B');
		expect((await listUserRecordEnvelopes(USER_RECORDS_STORES.charts))[0].record.name).toBe('B');
	});

	it('import after primaryReady writes IDB only; backup envelope stays LS-era', async ()=>{
		upsertLocalChart(chartSeed('local-2d-imp', { name: '旧' }));
		await hydrateUserRecordsPrimary();
		const backup = exportLocalChartsBackup();
		backup.charts[0].name = '导入';
		__startFourKeyWriteRatchetForTests();
		const lsBefore = window.localStorage.getItem(CHARTS_KEY);
		importLocalChartsBackup(backup);
		await flushUserRecordsWrites();
		fourKeyCountsZero(__getFourKeyWriteCountsForTests());
		expect(window.localStorage.getItem(CHARTS_KEY)).toBe(lsBefore);
		expect(listLocalCharts()[0].name).toBe('导入');
		expect(envelopeKeysOn(listLocalCharts()[0])).toEqual([]);
		expect(backup.format).toBe('horosa-local-charts');
		expect(backup.version).toBe(1);
	});

	it('unavailable keeps LS fallback without claiming IDB ready or deleting keys', async ()=>{
		upsertLocalChart(chartSeed('local-2d-u', { name: 'A' }));
		__setUserRecordsUnavailableForTests();
		expect(getUserRecordsReadiness().status).toBe(USER_RECORDS_STATUS.unavailable);
		expect(isUserRecordsPrimaryReady()).toBe(false);
		expect(listLocalCharts()[0].name).toBe('A');
		expect(window.localStorage.getItem(CHARTS_KEY)).toContain('A');
		const r = await hydrateUserRecordsPrimary();
		expect(r.ok).toBe(false);
		expect(r.reason).toBe('unavailable');
		expect(isUserRecordsPrimaryReady()).toBe(false);
		expect(window.localStorage.getItem(CHARTS_KEY)).toContain('A');
	});

	it('schema > 1 leaves LS intact and does not become primary', async ()=>{
		upsertLocalChart(chartSeed('local-2d-sc', { name: '留' }));
		const before = window.localStorage.getItem(CHARTS_KEY);
		await __putUserRecordsMetaForTests({ version: 99, migrated: true });
		const blocked = await hydrateUserRecordsPrimary();
		expect(blocked.reason).toBe('schema');
		expect(getUserRecordsReadiness().status).toBe(USER_RECORDS_STATUS.schemaIncompatible);
		expect(isUserRecordsPrimaryReady()).toBe(false);
		expect(window.localStorage.getItem(CHARTS_KEY)).toBe(before);
	});

	it('migration failure does not set migrated or delete LS', async ()=>{
		upsertLocalChart(chartSeed('local-2d-mf', { name: '原' }));
		__setUserRecordsWriteFailForTests(true);
		const pending = await hydrateUserRecordsPrimary();
		expect(pending.ok).toBe(false);
		expect(isUserRecordsPrimaryReady()).toBe(false);
		expect(getUserRecordsReadiness().status).toBe(USER_RECORDS_STATUS.migrationPending);
		const meta = await getUserRecordsMeta();
		expect(!meta || meta.migrated !== true).toBe(true);
		expect(window.localStorage.getItem(CHARTS_KEY)).toContain('原');
		expect(listLocalCharts()[0].name).toBe('原');
	});

	it('same cid chart/case and trash stores stay isolated after primary write', async ()=>{
		upsertLocalChart(chartSeed('abc', { name: '命盘 abc' }));
		upsertLocalCase(caseSeed('abc', { event: '事盘 abc' }));
		await hydrateUserRecordsPrimary();
		__startFourKeyWriteRatchetForTests();
		removeLocalChart('abc');
		await flushUserRecordsWrites();
		fourKeyCountsZero(__getFourKeyWriteCountsForTests());
		expect(listLocalCharts().find((r)=>r.cid === 'abc')).toBeFalsy();
		expect(listLocalCases().find((r)=>r.cid === 'abc').event).toBe('事盘 abc');
		expect(listLocalChartsTrash()[0].cid).toBe('abc');
		expect(listLocalCasesTrash()).toEqual([]);
		const chartsTrash = await listUserRecordEnvelopes(USER_RECORDS_STORES.chartsTrash);
		const casesTrash = await listUserRecordEnvelopes(USER_RECORDS_STORES.casesTrash);
		expect(chartsTrash.filter((e)=>e.cid === 'abc')).toHaveLength(1);
		expect(casesTrash.filter((e)=>e.cid === 'abc')).toEqual([]);
		expect((await listUserRecordEnvelopes(USER_RECORDS_STORES.cases))[0].record.event).toBe('事盘 abc');
	});

	it('permanent delete still appends horosa.deleted.log.v1 on LS', async ()=>{
		upsertLocalChart(chartSeed('local-2d-del', { name: '删' }));
		await hydrateUserRecordsPrimary();
		removeLocalChart('local-2d-del');
		purgeLocalChartTrashItem('local-2d-del');
		await flushUserRecordsWrites();
		const log = JSON.parse(window.localStorage.getItem('horosa.deleted.log.v1') || '[]');
		expect(log.some((e)=>e && e.record && e.record.cid === 'local-2d-del')).toBe(true);
		expect(window.localStorage.getItem(CHARTS_KEY)).toContain('删');
	});

	it('1000 records stay on memory snapshot; repeated list does not open IDB', async ()=>{
		for(let i = 0; i < 1000; i++){
			upsertLocalChart(chartSeed(`local-2d-n-${i}`, { name: `命${i}`, updateTime: '2026-09-01 10:00:00' }));
			upsertLocalCase(caseSeed(`local-case-2d-n-${i}`, { event: `事${i}`, updateTime: '2026-09-01 09:00:00' }));
		}
		await flushUserRecordsWrites();
		await hydrateUserRecordsPrimary();
		const lsCharts = window.localStorage.getItem(CHARTS_KEY);
		__startFourKeyWriteRatchetForTests();
		const readsBefore = getUserRecordsIdbReadOps();
		const txBefore = getUserRecordsIdbTxOps();
		for(let i = 0; i < 1000; i++){
			listLocalCharts();
			listLocalCases();
		}
		expect(getUserRecordsIdbReadOps()).toBe(readsBefore);
		upsertLocalChart({ cid: 'local-2d-n-0', name: '命改' });
		await flushUserRecordsWrites();
		expect(getUserRecordsIdbTxOps()).toBeGreaterThan(txBefore);
		fourKeyCountsZero(__getFourKeyWriteCountsForTests());
		expect(window.localStorage.getItem(CHARTS_KEY)).toBe(lsCharts);
		expect(listLocalCharts({ includeArchived: true }).find((r)=>r.cid === 'local-2d-n-0').name).toBe('命改');
	}, 60000);
});
