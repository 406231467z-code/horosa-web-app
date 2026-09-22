// [R3] 统一全量备份全链路:manifest 构建→zip 往返→校验矩阵→预览→恢复(合并/替换/id-并集)。
import JSZip from 'jszip';
import {
	buildUnifiedBackupManifest, parseUnifiedBackupBlob, validateUnifiedBackup,
	previewUnifiedRestore, restoreUnifiedBackup,
	UNIFIED_BACKUP_FORMAT, UNIFIED_MANIFEST_NAME,
} from '../unifiedBackup';
import { upsertLocalChart, listLocalCharts } from '../localcharts';
import { upsertLocalCase, listLocalCases } from '../localcases';

const LIFE_KEY = 'horosa.lc.lifeEvents.v1';

function seedAll(){
	upsertLocalChart({ cid: 'local-u-1', name: '备份甲', birth: '1990-01-01 08:00:00', zone: '+08:00', updateTime: '2026-08-01 10:00:00', preserveUpdateTime: true });
	upsertLocalCase({ cid: 'local-case-u-1', event: '备份课', caseType: 'liuyao', divTime: '2026-01-01 10:00:00', zone: '+08:00', updateTime: '2026-08-01 09:00:00', preserveUpdateTime: true });
	window.localStorage.setItem(LIFE_KEY, JSON.stringify({ 'sig-a': [{ id: 'ev1', date: '2020-01-01', kind: 'good', title: '甲事' }] }));
	window.localStorage.setItem('horosa.ai.export.settings.v1', JSON.stringify({ version: 56, prefs: {} }));
	window.localStorage.setItem('HorosaLocalDeepLearn', JSON.stringify({ 'local-u-1': { a: 1 } }));
}

describe('[R3] 统一全量备份', ()=>{
	beforeEach(()=>{
		window.localStorage.clear();
	});

	it('manifest:五类数据齐备(命盘/事盘信封嵌套自带 format;raw 只收在场键)', ()=>{
		seedAll();
		const m = buildUnifiedBackupManifest();
		expect(m.format).toBe(UNIFIED_BACKUP_FORMAT);
		expect(m.charts.format).toBe('horosa-local-charts');
		expect(m.charts.total).toBe(1);
		expect(m.cases.format).toBe('horosa-local-cases');
		expect(m.raw[LIFE_KEY]).toBeTruthy();
		expect(m.raw['horosa.ai.export.settings.v1']).toBeTruthy();
		expect(m.raw['HorosaLocalDeepLearn']).toBeTruthy();
		expect(m.raw['horosa.ai.mount.techniqueDefaults.v1']).toBeUndefined();   // 不在场不收
	});

	it('🔴 zip 往返:manifest 打包→解析逐字段等价;缺 manifest/坏 zip → null', async ()=>{
		seedAll();
		const m = buildUnifiedBackupManifest();
		const zip = new JSZip();
		zip.file(UNIFIED_MANIFEST_NAME, JSON.stringify(m));
		const data = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
		const parsed = await parseUnifiedBackupBlob(data);
		expect(parsed).toEqual(m);
		const emptyZip = await new JSZip().generateAsync({ type: 'uint8array' });
		expect(await parseUnifiedBackupBlob(emptyZip)).toBe(null);
		expect(await parseUnifiedBackupBlob(new Uint8Array([1, 2, 3]))).toBe(null);
	});

	it('校验矩阵:AI 工作区 zip 防呆(format 不符拒)/空内容拒/未来版软闸', ()=>{
		expect(validateUnifiedBackup(null)).toMatchObject({ ok: false, reason: 'not-object' });
		expect(validateUnifiedBackup({ format: 'something-else' })).toMatchObject({ ok: false, reason: 'format-mismatch' });
		expect(validateUnifiedBackup({ format: UNIFIED_BACKUP_FORMAT, version: 1 })).toMatchObject({ ok: false, reason: 'empty' });
		expect(validateUnifiedBackup({ format: UNIFIED_BACKUP_FORMAT, version: 9, charts: { charts: [] } })).toMatchObject({ ok: true, reason: 'newer-version' });
	});

	it('🔴 恢复:命盘/事盘合并导入 + 设置整值替换 + 人生事件 id-并集(同 id 保本机)', async ()=>{
		// 本机现状:一张命盘、sig-a 有 ev1(本机版)
		upsertLocalChart({ cid: 'local-keep', name: '本机保留', birth: '1980-01-01 08:00:00', zone: '+08:00', updateTime: '2026-07-01 10:00:00', preserveUpdateTime: true });
		window.localStorage.setItem(LIFE_KEY, JSON.stringify({ 'sig-a': [{ id: 'ev1', title: '本机版' }] }));
		const manifest = {
			format: UNIFIED_BACKUP_FORMAT,
			version: 1,
			charts: { format: 'horosa-local-charts', version: 1, charts: [{ cid: 'local-in-1', name: '备份来的', updateTime: '2026-08-02 10:00:00' }] },
			cases: { format: 'horosa-local-cases', version: 1, cases: [{ cid: 'local-case-in-1', event: '备份来的课', caseType: 'taiyi', divTime: '2026-02-01 10:00:00', updateTime: '2026-08-02 09:00:00' }] },
			raw: {
				[LIFE_KEY]: JSON.stringify({ 'sig-a': [{ id: 'ev1', title: '备份版' }, { id: 'ev2', title: '新事件' }], 'sig-b': [{ id: 'ev3', title: '乙签名' }] }),
				'horosa.ai.export.settings.v1': '{"version":56,"marker":"from-backup"}',
			},
		};
		const rows = previewUnifiedRestore(manifest);
		expect(rows.find((r)=>r.key === 'charts').detail).toContain('新增 1 条');
		const results = await restoreUnifiedBackup(manifest);
		expect(results.every((r)=>r.ok)).toBe(true);
		// 命盘:合并不删现有
		const names = listLocalCharts().map((r)=>r.name);
		expect(names).toContain('本机保留');
		expect(names).toContain('备份来的');
		expect(listLocalCases().map((r)=>r.event)).toContain('备份来的课');
		// 设置:整值替换
		expect(window.localStorage.getItem('horosa.ai.export.settings.v1')).toContain('from-backup');
		// 人生事件:id-并集,同 id 保本机
		const life = JSON.parse(window.localStorage.getItem(LIFE_KEY));
		expect(life['sig-a'].find((e)=>e.id === 'ev1').title).toBe('本机版');
		expect(life['sig-a'].find((e)=>e.id === 'ev2').title).toBe('新事件');
		expect(life['sig-b'][0].id).toBe('ev3');
	});

	it('人生事件坏形状:跳过不写、诚实上报,其余项照常恢复', async ()=>{
		const manifest = {
			format: UNIFIED_BACKUP_FORMAT,
			version: 1,
			raw: {
				[LIFE_KEY]: '[not-an-object]',
				'HorosaLocalDeepLearn': '{"x":1}',
			},
		};
		const results = await restoreUnifiedBackup(manifest);
		expect(results.find((r)=>r.key === LIFE_KEY).ok).toBe(false);
		expect(results.find((r)=>r.key === 'HorosaLocalDeepLearn').ok).toBe(true);
		expect(window.localStorage.getItem(LIFE_KEY)).toBe(null);
		expect(window.localStorage.getItem('HorosaLocalDeepLearn')).toBe('{"x":1}');
	});
});

describe('[V4] 全量备份 v2:注册表驱动全键面 + 回收站 + AI 工作区 + 敏感剥离', ()=>{
	beforeEach(()=>{
		window.localStorage.clear();
	});

	it('🔴 导出面=注册表推导:settings/user-data 键全收;cache/device-local 排除;未登记键防呆带走并留痕', ()=>{
		window.localStorage.setItem('horosa.liuyao.settings.v1', '{"a":1}');       // settings
		window.localStorage.setItem('ziweiPreset', 'sanhe');                       // 无前缀历史键(settings 族)
		window.localStorage.setItem('horosa.tarot.personalMeanings', '{"m":1}');   // user-data
		window.localStorage.setItem('horosa.perf.chartSCU', '1');                  // device-local → 排除
		window.localStorage.setItem('horosa.localcalc.nongli.v1', '{"c":1}');      // cache → 排除
		window.localStorage.setItem('some.future.key', 'x');                       // 未登记 → 防呆带走
		const m = buildUnifiedBackupManifest();
		expect(m.version).toBe(2);
		expect(m.raw['horosa.liuyao.settings.v1']).toBe('{"a":1}');
		expect(m.raw['ziweiPreset']).toBe('sanhe');
		expect(m.raw['horosa.tarot.personalMeanings']).toBe('{"m":1}');
		expect(m.raw['horosa.perf.chartSCU']).toBeUndefined();
		expect(m.raw['horosa.localcalc.nongli.v1']).toBeUndefined();
		expect(m.raw['some.future.key']).toBe('x');
		expect(m.unknownKeys).toEqual(['some.future.key']);
	});

	it('🔴 回收站随备份:导出带 trash 段;恢复=按 cid 并集,本机已有保留', async ()=>{
		window.localStorage.setItem('horosa.localCharts.trash.v1', JSON.stringify([
			{ cid: 'local-t-local', name: '本机垃圾', deletedAt: '2026-09-15 10:00:00' },
		]));
		const m = buildUnifiedBackupManifest();
		expect(m.trash.charts).toContain('local-t-local');
		const manifest = {
			format: UNIFIED_BACKUP_FORMAT,
			version: 2,
			trash: {
				charts: JSON.stringify([
					{ cid: 'local-t-local', name: '备份版(须被本机压住)', deletedAt: '2026-09-01 10:00:00' },
					{ cid: 'local-t-in', name: '备份来的垃圾', deletedAt: '2026-09-16 10:00:00' },
				]),
			},
		};
		const results = await restoreUnifiedBackup(manifest);
		expect(results.find((r)=>r.key === 'trash.charts').ok).toBe(true);
		const { listLocalChartsTrash } = require('../localcharts');
		const trash = listLocalChartsTrash();
		expect(trash.find((r)=>r.cid === 'local-t-local').name).toBe('本机垃圾');
		expect(trash.find((r)=>r.cid === 'local-t-in').name).toBe('备份来的垃圾');
	});

	it('手改包防呆:cache/device-local 键即使出现在 raw 里也拒写', async ()=>{
		const manifest = {
			format: UNIFIED_BACKUP_FORMAT,
			version: 2,
			raw: {
				'horosa.perf.chartSCU': '0',
				'horosa.liuyao.settings.v1': '{"ok":1}',
			},
		};
		const results = await restoreUnifiedBackup(manifest);
		expect(results.find((r)=>r.key === 'horosa.perf.chartSCU').detail).toContain('跳过');
		expect(window.localStorage.getItem('horosa.perf.chartSCU')).toBe(null);
		expect(window.localStorage.getItem('horosa.liuyao.settings.v1')).toBe('{"ok":1}');
	});

	it('🔴 AI 工作区 dump 剥密:providerProfiles 的 apiKey 绝不入包;恢复同 id 保本机', async ()=>{
		const store = require('../aiAnalysisStore');
		const { collectAiWorkspaceDump, restoreUnifiedBackup: restore2 } = require('../unifiedBackup');
		await store.putStoreRecord(store.AI_ANALYSIS_STORES.providerProfiles, { id: 'prov-1', name: '本机档', apiKey: 'sk-PLAINTEXT-SECRET' }, 'provider');
		const dump = await collectAiWorkspaceDump();
		const profs = dump.stores[store.AI_ANALYSIS_STORES.providerProfiles];
		expect(profs.length).toBe(1);
		expect(profs[0].apiKey).toBe('');
		expect(profs[0].apiKeyRedacted).toBe(true);
		expect(JSON.stringify(dump)).not.toContain('sk-PLAINTEXT-SECRET');
		// 恢复:同 id 保本机(本机 prov-1 不被备份覆盖);新 id 写入
		const manifest = {
			format: UNIFIED_BACKUP_FORMAT,
			version: 2,
			aiWorkspace: { stores: { [store.AI_ANALYSIS_STORES.providerProfiles]: [
				{ id: 'prov-1', name: '备份版(须被本机压住)', apiKey: '', apiKeyRedacted: true },
				{ id: 'prov-2', name: '备份来的档', apiKey: '', apiKeyRedacted: true },
			] } },
		};
		const results = await restore2(manifest);
		const row = results.find((r)=>r.key === 'aiWorkspace');
		expect(row.ok).toBe(true);
		const cur1 = await store.getStoreRecord(store.AI_ANALYSIS_STORES.providerProfiles, 'prov-1');
		expect(cur1.name).toBe('本机档');
		const cur2 = await store.getStoreRecord(store.AI_ANALYSIS_STORES.providerProfiles, 'prov-2');
		expect(cur2.name).toBe('备份来的档');
	});
});

describe('PHASE 2-E unified backup trash under IDB primary', ()=>{
	const {
		hydrateUserRecordsPrimary,
		flushUserRecordsWrites,
		isUserRecordsPrimaryReady,
		listUserRecordEnvelopes,
		USER_RECORDS_STORES,
		USER_RECORDS_FOUR_LS_KEYS,
		__installUserRecordsMemoryBackendForTests,
		__resetUserRecordsForTests,
		__startFourKeyWriteRatchetForTests,
		__getFourKeyWriteCountsForTests,
		__stopFourKeyWriteRatchetForTests,
	} = require('../userRecordsStore');
	const {
		upsertLocalChart,
		removeLocalChart,
		listLocalCharts,
		listLocalChartsTrash,
		exportLocalChartsBackup,
	} = require('../localcharts');
	const {
		upsertLocalCase,
		removeLocalCase,
		listLocalCases,
		listLocalCasesTrash,
		exportLocalCasesBackup,
	} = require('../localcases');

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
	function envelopeKeysOn(rec){
		return ['createdAt', 'updatedAt', 'writeSeq', 'kind', 'slot'].filter((k)=>rec && Object.prototype.hasOwnProperty.call(rec, k));
	}

	it('TEST A: primaryReady trash export uses IDB/memory, ignores stale LS-only trash', async ()=>{
		upsertLocalChart(chartSeed('chart-trash-1', { name: '主存废纸' }));
		upsertLocalCase(caseSeed('case-trash-1', { event: '主存废课' }));
		removeLocalChart('chart-trash-1');
		removeLocalCase('case-trash-1');
		await flushUserRecordsWrites();
		await hydrateUserRecordsPrimary();
		expect(isUserRecordsPrimaryReady()).toBe(true);
		window.localStorage.setItem('horosa.localCharts.trash.v1', JSON.stringify([
			{ cid: 'chart-trash-old', name: '陈旧 LS', deletedAt: '2026-01-01 00:00:00' },
		]));
		window.localStorage.setItem('horosa.localCases.trash.v1', JSON.stringify([
			{ cid: 'case-trash-old', event: '陈旧课', deletedAt: '2026-01-01 00:00:00' },
		]));
		const m = buildUnifiedBackupManifest();
		expect(m.trash.charts).toContain('chart-trash-1');
		expect(m.trash.charts).not.toContain('chart-trash-old');
		expect(m.trash.cases).toContain('case-trash-1');
		expect(m.trash.cases).not.toContain('case-trash-old');
		expect(m.charts.format).toBe('horosa-local-charts');
		expect(m.charts.version).toBe(1);
		expect(m.cases.format).toBe('horosa-local-cases');
		expect(m.cases.version).toBe(1);
	});

	it('TEST B/F/G: primaryReady trash restore writes IDB only; ratchet=0; envelope clean', async ()=>{
		upsertLocalChart(chartSeed('local-keep-live', { name: '在册' }));
		await hydrateUserRecordsPrimary();
		expect(isUserRecordsPrimaryReady()).toBe(true);
		const lsCharts = window.localStorage.getItem('horosa.localCharts.v1');
		const lsTrash = window.localStorage.getItem('horosa.localCharts.trash.v1');
		__startFourKeyWriteRatchetForTests();
		const manifest = {
			format: UNIFIED_BACKUP_FORMAT,
			version: 2,
			trash: {
				charts: JSON.stringify([
					{ cid: 'chart-from-bk', name: '备份垃圾', deletedAt: '2026-09-18 10:00:00' },
				]),
			},
		};
		const results = await restoreUnifiedBackup(manifest);
		expect(results.find((r)=>r.key === 'trash.charts').ok).toBe(true);
		await flushUserRecordsWrites();
		USER_RECORDS_FOUR_LS_KEYS.forEach((key)=>{
			expect(__getFourKeyWriteCountsForTests()[key]).toBe(0);
		});
		expect(window.localStorage.getItem('horosa.localCharts.v1')).toBe(lsCharts);
		expect(window.localStorage.getItem('horosa.localCharts.trash.v1')).toBe(lsTrash);
		expect(listLocalChartsTrash().find((r)=>r.cid === 'chart-from-bk').name).toBe('备份垃圾');
		expect(listLocalCharts().find((r)=>r.cid === 'chart-from-bk')).toBeFalsy();
		expect(listLocalCharts().find((r)=>r.cid === 'local-keep-live')).toBeTruthy();
		const idbTrash = await listUserRecordEnvelopes(USER_RECORDS_STORES.chartsTrash);
		expect(idbTrash.find((e)=>e.cid === 'chart-from-bk').record.name).toBe('备份垃圾');
		const exported = exportLocalChartsBackup();
		expect(exported.format).toBe('horosa-local-charts');
		expect(exported.version).toBe(1);
		expect(envelopeKeysOn(exported.charts[0])).toEqual([]);
		const casesEnv = exportLocalCasesBackup();
		expect(casesEnv.format).toBe('horosa-local-cases');
		expect(casesEnv.version).toBe(1);
	});

	it('TEST C: charts/cases trash same cid stay isolated across unified restore', async ()=>{
		await hydrateUserRecordsPrimary();
		__startFourKeyWriteRatchetForTests();
		const manifest = {
			format: UNIFIED_BACKUP_FORMAT,
			version: 2,
			trash: {
				charts: JSON.stringify([{ cid: 'abc', name: '命盘废', deletedAt: '2026-09-18 10:00:00' }]),
				cases: JSON.stringify([{ cid: 'abc', event: '事盘废', caseType: 'liuyao', deletedAt: '2026-09-18 11:00:00' }]),
			},
		};
		await restoreUnifiedBackup(manifest);
		await flushUserRecordsWrites();
		USER_RECORDS_FOUR_LS_KEYS.forEach((key)=>{
			expect(__getFourKeyWriteCountsForTests()[key]).toBe(0);
		});
		expect(listLocalChartsTrash().find((r)=>r.cid === 'abc').name).toBe('命盘废');
		expect(listLocalCasesTrash().find((r)=>r.cid === 'abc').event).toBe('事盘废');
		expect(listLocalCharts().find((r)=>r.cid === 'abc')).toBeFalsy();
		expect(listLocalCases().find((r)=>r.cid === 'abc')).toBeFalsy();
		const ct = await listUserRecordEnvelopes(USER_RECORDS_STORES.chartsTrash);
		const xt = await listUserRecordEnvelopes(USER_RECORDS_STORES.casesTrash);
		expect(ct.filter((e)=>e.cid === 'abc')).toHaveLength(1);
		expect(xt.filter((e)=>e.cid === 'abc')).toHaveLength(1);
	});
});
