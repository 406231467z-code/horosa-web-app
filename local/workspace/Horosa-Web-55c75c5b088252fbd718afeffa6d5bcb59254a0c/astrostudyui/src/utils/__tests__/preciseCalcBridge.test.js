import request from '../request';
import { fetchPreciseJieqiSeed, fetchPreciseJieqiYear } from '../preciseCalcBridge';
import { buildLocalJieqiYearSeed } from '../localNongliAdapter';

jest.mock('../request', ()=>jest.fn());

describe('PHASE 4-B jieqi local table', ()=>{
	beforeEach(()=>{
		request.mockReset();
	});

	test('公元可靠域走本地 24 节气表，不请求后端', async()=>{
		const year = await fetchPreciseJieqiYear({
			year: '2026',
			ad: 1,
			zone: '+08:00',
		});
		expect(request).not.toHaveBeenCalled();
		expect(year && year.local).toBe(true);
		expect(year.jieqi24).toHaveLength(24);
		const byName = {};
		year.jieqi24.forEach((row)=>{ byName[row.jieqi] = row; });
		expect(byName['立春'].time).toBe('2026-02-04 04:02:08');
		expect(byName['立春'].bazi.fourColumns.day.ganzi).toBe('己酉');
		expect(byName['夏至'].time).toBe('2026-06-21 16:24:30');
		expect(byName['夏至'].bazi.fourColumns.day.ganzi).toBe('丙寅');
		expect(byName['冬至'].time).toBe('2025-12-21 23:03:05');
		expect(byName['冬至'].bazi.fourColumns.day.ganzi).toBe('甲子');
		expect(byName['立春'].bazi.fourColumns.year.ganzi).toBeTruthy();
	});

	test('域内种子时刻与 buildLocalJieqiYearSeed 一致', async()=>{
		const seed = await fetchPreciseJieqiSeed({
			year: '2047',
			ad: 1,
			zone: '+08:00',
			timeAlg: 1,
			jieqis: ['大雪'],
		});
		const localSeed = buildLocalJieqiYearSeed(2047, '+08:00');
		expect(request).not.toHaveBeenCalled();
		expect(seed.大雪.time).toEqual(localSeed.大雪.time);
		expect(seed.大雪.dayGanzhi).toEqual(localSeed.大雪.dayGanzhi);
		expect(seed.大雪.dayGanzhi).toBeTruthy();
	});

	test('域外年份才请求 /jieqi/year，并保留后端时刻', async()=>{
		request.mockResolvedValue({
			Result: {
				year: 12000,
				jieqi24: [{ jieqi: '大雪', time: '12000-12-07 13:11:06' }],
			},
		});
		const seed = await fetchPreciseJieqiSeed({
			year: '12000',
			ad: 1,
			zone: '+08:00',
			jieqis: ['大雪'],
		});
		expect(request).toHaveBeenCalled();
		expect(String(request.mock.calls[0][0])).toContain('/jieqi/year');
		expect(seed.大雪.time).toBe('12000-12-07 13:11:06');
	});

	test('公元前不拿公元表冒充，仍走后端', async()=>{
		request.mockResolvedValue({
			Result: {
				year: 500,
				jieqi24: [{ jieqi: '立春', time: '-0500-02-08 00:00:00' }],
			},
		});
		const seed = await fetchPreciseJieqiSeed({
			year: '500',
			ad: 'BC',
			zone: '+08:00',
			jieqis: ['立春'],
		});
		expect(request).toHaveBeenCalled();
		expect(seed.立春.time).toBe('-0500-02-08 00:00:00');
		const ad500 = buildLocalJieqiYearSeed(500, '+08:00');
		expect(seed.立春.time).not.toBe(ad500.立春.time);
	});

	test('域外后端无结果时不编造节气表', async()=>{
		request.mockResolvedValue(undefined);
		const year = await fetchPreciseJieqiYear({
			year: '12000',
			ad: 1,
			zone: '+08:00',
		});
		expect(year).toBeFalsy();
	});
});
