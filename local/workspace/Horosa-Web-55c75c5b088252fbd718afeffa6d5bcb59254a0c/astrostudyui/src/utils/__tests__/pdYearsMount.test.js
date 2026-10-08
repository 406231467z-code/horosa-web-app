// pdYears「AI 挂载·每技法设置」round-trip：改推算年数 → /chart 请求体真带 pdYears（透传给后端 PD 复算）。
// 守铁律：默认（不带 pdYears 覆盖）→ 请求体 pdYears=100（= 现状默认，字节级一致）；改 50 → 请求体 pdYears=50。
const mockFetchChartCalls = [];
jest.mock('../../services/astro', () => ({
	fetchChart: jest.fn(async (values) => {
		mockFetchChartCalls.push(values);
		return {
			Result: {
				chart: { objects: [], stars: [] },
				lots: [],
				params: {},
				predictives: { primaryDirection: [] },
			},
		};
	}),
}));

// 主限快照 builder 不是本测重点（只验参数透传）→ 返回固定串，避免依赖真盘数据。
jest.mock('../../components/direction/AstroDirectMain', () => ({
	buildPrimaryDirectSnapshotText: jest.fn(() => '主限法快照(占位)'),
	buildFirdariaSnapshotText: jest.fn(() => ''),
}));

jest.mock('../localcharts', () => ({
	listLocalCharts: jest.fn(() => []),
	__esModule: true,
}));
jest.mock('../localcases', () => ({
	listLocalCases: jest.fn(() => []),
	getCaseTypeLabel: jest.fn((t) => t),
	getCaseTypeMeta: jest.fn(() => ({ module: '', value: '' })),
	__esModule: true,
}));
jest.mock('../astroAiSnapshot', () => ({
	buildAstroSnapshotContent: jest.fn(() => 'snapshot'),
	loadAstroAISnapshot: jest.fn(() => null),
}));
jest.mock('../moduleAiSnapshot', () => ({
	loadModuleAISnapshot: jest.fn(() => null),
	saveModuleAISnapshot: jest.fn(),
}));
jest.mock('../request', () => ({ __esModule: true, default: jest.fn(async () => ({ Result: {} })) }));
jest.mock('../aiAnalysisStore', () => ({
	AI_ANALYSIS_STORES: { contextCache: 'contextCache' },
	getStoreRecord: jest.fn(async () => null),
	putStoreRecord: jest.fn(async (s, r) => r),
}));

import { getAnalysisTechniqueContextWithOptions } from '../aiAnalysisContext';

const SOURCE = {
	id: 'chart-pd',
	sourceType: 'chart',
	record: {
		cid: 'chart-pd',
		name: 'pd 测试',
		birth: '1990-05-18 10:00:00',
		zone: '+08:00',
		lon: '118e27',
		lat: '31n38',
	},
};

function lastPdFetch() {
	// 主限走 includePrimaryDirection:true 的 /chart 请求。
	return [...mockFetchChartCalls].reverse().find((v) => v && v.includePrimaryDirection === true) || null;
}

describe('pdYears 挂载 round-trip（透传 /chart 复算 PD）', () => {
	beforeEach(() => {
		mockFetchChartCalls.length = 0;
	});

	function expectPdYears(ctx, years){
		expect(mockFetchChartCalls).toHaveLength(0);
		expect(ctx.content).toContain('LICENSE_REVIEW_REQUIRED');
		expect(ctx.content).toContain('provider: browser');
		expect(ctx.content).toContain(`pdYears: ${years}`);
		expect(ctx.content).not.toContain('主限法快照(占位)');
	}

	it('默认（pdYears=100，全等默认）：状态回显 pdYears=100，且不请求 /chart', async () => {
		const ctx = await getAnalysisTechniqueContextWithOptions(SOURCE, 'primarydirect', { pdYears: 100 });
		expectPdYears(ctx, 100);
	});

	it('pdYears=50：状态回显 50，且不带 includePrimaryDirection 的 /chart', async () => {
		const ctx = await getAnalysisTechniqueContextWithOptions(SOURCE, 'primarydirect', { pdYears: 50 });
		expectPdYears(ctx, 50);
		expect(lastPdFetch()).toBeFalsy();
	});

	it('pdYears=120 与 50 → 回显不同（不同选择产出不同状态，非写死 100）', async () => {
		const ctxA = await getAnalysisTechniqueContextWithOptions(SOURCE, 'primarydirect', { pdYears: 50 });
		const ctxB = await getAnalysisTechniqueContextWithOptions(SOURCE, 'primarydirect', { pdYears: 120 });
		expect(ctxA.content).toContain('pdYears: 50');
		expect(ctxB.content).toContain('pdYears: 120');
		expect(mockFetchChartCalls).toHaveLength(0);
	});

	it('pdYears=999 在 3000 上限内 → 原样回显', async () => {
		const ctx = await getAnalysisTechniqueContextWithOptions(SOURCE, 'primarydirect', { pdYears: 999 });
		expectPdYears(ctx, 999);
	});

	it('越界 pdYears=5000 → 夹到 3000（normalizePdYearsValue 兜底）', async () => {
		const ctx = await getAnalysisTechniqueContextWithOptions(SOURCE, 'primarydirect', { pdYears: 5000 });
		expectPdYears(ctx, 3000);
	});
});
