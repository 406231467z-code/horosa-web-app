import fs from 'fs';
import path from 'path';
import request from '../request';
import { localZiweiBirthEnvelope, fetchZiweiBirth } from '../ziweiBirthLocal';
import { getZiweiRulesEnvelope } from '../ziweiRulesLocal';
import { buildLocalLiureng, fillXun, findTaiSuiGods, fetchLiurengGods } from '../liurengGodsLocal';

jest.mock('../request', ()=>jest.fn());

const GRID = JSON.parse(fs.readFileSync(
	path.join(__dirname, '../../components/ziwei/__tests__/fixtures/ziweiJavaGrid.json'),
	'utf8',
));

describe('PHASE 4-C ziwei birth and liuren gods', ()=>{
	beforeEach(()=>{
		request.mockReset();
	});

	test('可靠域起盘与 Java 金样同盘，且不请求后端', async ()=>{
		const sample = GRID[0];
		const env = localZiweiBirthEnvelope(sample.params);
		expect(request).not.toHaveBeenCalled();
		const chart = env.Result.chart;
		const java = sample.chart;
		expect(chart.lifeHouseIndex).toBe(java.lifeHouseIndex);
		expect(chart.bodyHouseIndex).toBe(java.bodyHouseIndex);
		expect(chart.wuxingJu).toBe(java.wuxingJu);
		expect(chart.ziweiIndex).toBe(java.ziweiIndex);
		expect(chart.lifeMaster).toBe(java.lifeMaster);
		expect(chart.bodyMaster).toBe(java.bodyMaster);
		expect(chart.yearGan).toBe(java.yearGan);
		expect(chart.yearZi).toBe(java.yearZi);
		const fetched = await fetchZiweiBirth(sample.params, { silent: true });
		expect(request).not.toHaveBeenCalled();
		expect(fetched.Result.local).toBe(true);
		expect(fetched.Result.chart.lifeMaster).toBe(java.lifeMaster);
	});

	test('域外年份不编造紫微盘，改走 /ziwei/birth', async ()=>{
		expect(localZiweiBirthEnvelope({ date: '12000-06-01', time: '12:00:00', ad: 1 })).toBeNull();
		expect(localZiweiBirthEnvelope({ date: '500-01-01', time: '12:00:00', ad: -1 })).toBeNull();
		request.mockResolvedValue({ Result: { chart: { remote: true } } });
		const env = await fetchZiweiBirth({ date: '12000-06-01', time: '12:00:00', ad: 1 });
		expect(request).toHaveBeenCalled();
		expect(String(request.mock.calls[0][0])).toContain('/ziwei/birth');
		expect(env.Result.chart.remote).toBe(true);
	});

	test('格局规则是静态表', ()=>{
		const rules = getZiweiRulesEnvelope().Result;
		expect(Array.isArray(rules.ZWRules.ZWStarArray)).toBe(true);
		expect(rules.ZWRules.ZWStarArray.length).toBeGreaterThan(0);
		expect(rules.ZWRuleSihua.HuaInHouse).toBeTruthy();
	});

	test('旬日与太岁神煞按 Java 公式', ()=>{
		expect(fillXun('甲子')).toEqual({
			'旬丁': '丁卯',
			'遁丁': '卯',
			'旬空': '戌亥',
			'旬首': '甲子',
			'旬尾': '癸酉',
		});
		expect(fillXun('丙午')['旬空']).toBe('寅卯');
		const tai = findTaiSuiGods('子');
		expect(tai.taisui1['岁驾']).toBe('子');
		expect(tai.taisui1['岁破']).toBe('午');
		expect(fillXun('不是')).toBeNull();
	});

	test('常见日期六壬神煞在本地，缺表不冒充', async ()=>{
		const lr = buildLocalLiureng({
			date: '2026-09-22',
			time: '15:00:00',
			zone: '+08:00',
			lon: '116e23',
			lat: '39n54',
			ad: 1,
			after23NewDay: 1,
			lateZiHourUseNextDay: 1,
		});
		expect(lr).toBeTruthy();
		expect(lr.local).toBe(true);
		expect(lr.nongli.dayGanZi).toMatch(/^[\u4e00-\u9fff]{2}$/);
		expect(lr.xun['旬空']).toBeTruthy();
		expect(Array.isArray(lr.gods['驿马'])).toBe(true);
		expect(lr.godsYear.taisui1['岁驾']).toBeTruthy();
		expect(buildLocalLiureng({ date: '12000-01-01', time: '12:00:00', ad: 1 })).toBeNull();
		request.mockResolvedValue(undefined);
		const missing = await fetchLiurengGods({ date: '12000-01-01', time: '12:00:00', ad: 1 });
		expect(request).toHaveBeenCalled();
		expect(missing).toBeUndefined();
	});
});
