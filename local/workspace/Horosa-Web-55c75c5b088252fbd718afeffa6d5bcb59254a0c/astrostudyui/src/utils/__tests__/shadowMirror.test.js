// [V5-A3] 影子副本闸:白名单/no-op 安全/🔴 恢复语义(仅主存缺失时写回,绝不覆盖存在的主存)
//   + 内核写路径 hook 在位(保存记录 → 镜像 invoke 真的发出)。
jest.mock('../aiAnalysisDesktop', ()=>({
	isDesktopBridgeAvailable: jest.fn(()=>false),
	invokeDesktopCommand: jest.fn(()=>Promise.resolve()),
}));
import { isDesktopBridgeAvailable, invokeDesktopCommand } from '../aiAnalysisDesktop';
import { mirrorShadowWrite, reconcileShadowOnBoot, SHADOW_MIRROR_KEYS } from '../shadowMirror';
import { upsertLocalChart } from '../localcharts';

describe('[V5-A3] 影子副本', ()=>{
	beforeEach(()=>{
		window.localStorage.clear();
		jest.clearAllMocks();
		isDesktopBridgeAvailable.mockReturnValue(false);
	});

	it('非桌面环境全程 no-op(不炸、零 invoke)', async ()=>{
		mirrorShadowWrite('horosa.localCharts.v1', '[]');
		const r = await reconcileShadowOnBoot();
		expect(r.checked).toBe(false);
		expect(invokeDesktopCommand).not.toHaveBeenCalled();
	});

	it('白名单外键绝不镜像(防任意键→壳层文件写)', ()=>{
		isDesktopBridgeAvailable.mockReturnValue(true);
		mirrorShadowWrite('horosa.liuyao.settings.v1', '{}');
		mirrorShadowWrite('anything.else', 'x');
		expect(invokeDesktopCommand).not.toHaveBeenCalled();
		expect(SHADOW_MIRROR_KEYS).toEqual([
			'horosa.localCharts.v1', 'horosa.localCases.v1',
			'horosa.localCharts.trash.v1', 'horosa.localCases.trash.v1',
		]);
	});

	it('🔴 内核写路径 hook 在位:保存记录 → shadow_store_write_command 携主库最新串发出', ()=>{
		isDesktopBridgeAvailable.mockReturnValue(true);
		upsertLocalChart({ cid: 'local-sh-1', name: '影子甲', birth: '1990-01-01 08:00:00', zone: '+08:00' });
		const calls = invokeDesktopCommand.mock.calls.filter((c)=>c[0] === 'shadow_store_write_command');
		expect(calls.length).toBeGreaterThan(0);
		const last = calls[calls.length - 1][1];
		expect(last.key).toBe('horosa.localCharts.v1');
		expect(last.text).toContain('影子甲');
		expect(last.text).toBe(window.localStorage.getItem('horosa.localCharts.v1'));
	});

	it('🔴 第二实例(阶梯口)不镜像不对账:独立数据集绝不许覆盖主实例影子(数据混串)', async ()=>{
		isDesktopBridgeAvailable.mockReturnValue(true);
		const orig = window.location;
		delete window.location;
		window.location = { ...orig, port: '38992' };
		mirrorShadowWrite('horosa.localCharts.v1', '[{"cid":"second-instance"}]');
		const r = await reconcileShadowOnBoot();
		expect(invokeDesktopCommand).not.toHaveBeenCalled();
		expect(r.checked).toBe(false);
		window.location = orig;
	});

	it('🔴 对账恢复语义:主存缺失→写回;主存在(哪怕不同)→绝不覆盖只记 diverged', async ()=>{
		isDesktopBridgeAvailable.mockReturnValue(true);
		window.localStorage.setItem('horosa.localCases.v1', '[{"cid":"local-main"}]');
		invokeDesktopCommand.mockResolvedValue({
			'horosa.localCharts.v1': '[{"cid":"local-from-shadow","name":"影子恢复"}]',
			'horosa.localCases.v1': '[{"cid":"local-shadow-old"}]',
		});
		const r = await reconcileShadowOnBoot();
		expect(r.checked).toBe(true);
		expect(r.restored).toEqual(['horosa.localCharts.v1']);
		expect(r.diverged).toEqual(['horosa.localCases.v1']);
		expect(window.localStorage.getItem('horosa.localCharts.v1')).toContain('影子恢复');
		expect(window.localStorage.getItem('horosa.localCases.v1')).toBe('[{"cid":"local-main"}]');
	});

	it('PHASE 2-E TEST D: primaryReady 后 shadow 不得回写四键 LS,也不改 IDB primary', async ()=>{
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
		window.localStorage.clear();
		__resetUserRecordsForTests();
		__installUserRecordsMemoryBackendForTests();
		upsertLocalChart({ cid: 'local-prim', name: '主存真值', birth: '1990-01-01 08:00:00', zone: '+08:00', updateTime: '2026-09-01 10:00:00', preserveUpdateTime: true });
		await flushUserRecordsWrites();
		await hydrateUserRecordsPrimary();
		expect(isUserRecordsPrimaryReady()).toBe(true);
		const beforeCharts = window.localStorage.getItem('horosa.localCharts.v1');
		const beforeCases = window.localStorage.getItem('horosa.localCases.v1');
		const beforeChartsTrash = window.localStorage.getItem('horosa.localCharts.trash.v1');
		const beforeCasesTrash = window.localStorage.getItem('horosa.localCases.trash.v1');
		const idbBefore = await listUserRecordEnvelopes(USER_RECORDS_STORES.charts);
		isDesktopBridgeAvailable.mockReturnValue(true);
		invokeDesktopCommand.mockResolvedValue({
			'horosa.localCharts.v1': '[{"cid":"old-chart","name":"影子旧命盘"}]',
			'horosa.localCases.v1': '[{"cid":"old-case","event":"影子旧事盘"}]',
			'horosa.localCharts.trash.v1': '[{"cid":"old-ct"}]',
			'horosa.localCases.trash.v1': '[{"cid":"old-xt"}]',
		});
		__startFourKeyWriteRatchetForTests();
		// 清空四键以模拟「主存缺失」——若无 primary guard 会触发 shadow 回写。
		USER_RECORDS_FOUR_LS_KEYS.forEach((k)=>window.localStorage.removeItem(k));
		const r = await reconcileShadowOnBoot();
		expect(r.skippedPrimary).toBe(true);
		expect(r.restored).toEqual([]);
		USER_RECORDS_FOUR_LS_KEYS.forEach((key)=>{
			expect(__getFourKeyWriteCountsForTests()[key]).toBe(0);
			expect(window.localStorage.getItem(key)).toBe(null);
		});
		const idbAfter = await listUserRecordEnvelopes(USER_RECORDS_STORES.charts);
		expect(idbAfter.map((e)=>e.cid)).toEqual(idbBefore.map((e)=>e.cid));
		expect(idbAfter[0].record.name).toBe('主存真值');
		__stopFourKeyWriteRatchetForTests();
		__resetUserRecordsForTests();
		// restore LS snapshot strings for isolation of following tests in file (none after)
		if(beforeCharts){ window.localStorage.setItem('horosa.localCharts.v1', beforeCharts); }
		if(beforeCases){ window.localStorage.setItem('horosa.localCases.v1', beforeCases); }
		if(beforeChartsTrash){ window.localStorage.setItem('horosa.localCharts.trash.v1', beforeChartsTrash); }
		if(beforeCasesTrash){ window.localStorage.setItem('horosa.localCases.trash.v1', beforeCasesTrash); }
	});

	it('PHASE 2-E TEST E: primaryReady=false 时 shadow 回写兼容仍在', async ()=>{
		const {
			__resetUserRecordsForTests,
			__setUserRecordsUnavailableForTests,
			isUserRecordsPrimaryReady,
		} = require('../userRecordsStore');
		__resetUserRecordsForTests();
		__setUserRecordsUnavailableForTests();
		expect(isUserRecordsPrimaryReady()).toBe(false);
		isDesktopBridgeAvailable.mockReturnValue(true);
		window.localStorage.clear();
		invokeDesktopCommand.mockResolvedValue({
			'horosa.localCharts.v1': '[{"cid":"local-from-shadow","name":"影子恢复"}]',
		});
		const r = await reconcileShadowOnBoot();
		expect(r.skippedPrimary).toBe(false);
		expect(r.restored).toEqual(['horosa.localCharts.v1']);
		expect(window.localStorage.getItem('horosa.localCharts.v1')).toContain('影子恢复');
		__resetUserRecordsForTests();
	});
});
