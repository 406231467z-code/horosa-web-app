import { calculateChart } from '../../services/astrologyCalculationService';
import { buildLocalBaziResult } from '../baziLunarLocal';
import { calcDunJia } from '../../components/dunjia/DunJiaCalc';
import { calcZiwei } from '../../components/ziwei/ZiweiCalc';
import { buildLocalJieqiYearSeed } from '../localNongliAdapter';

jest.mock('../../services/astro', () => ({
	fetchChart: jest.fn(async () => ({ ResultCode: 0, Result: { chart: { objects: [] } } })),
}));

const ASTRO = {
	date: '1990/06/15',
	time: '10:30:00',
	zone: '+08:00',
	lat: 26.066666666666666,
	lon: 119.31666666666666,
	hsys: 1,
	zodiacal: 0,
};

function normalizeAstro(rsp) {
	const sun = rsp.Result.chart.objects.find((obj) => obj.id === 'Sun');
	const moon = rsp.Result.chart.objects.find((obj) => obj.id === 'Moon');
	return JSON.stringify({
		provider: rsp.calculationProvider,
		sunLon: sun.lon,
		moonLon: moon.lon,
		houseCount: rsp.Result.chart.houses.length,
	});
}

function normalizeBazi(input) {
	const built = buildLocalBaziResult(input);
	const fc = built.bazi.fourColumns;
	return JSON.stringify({
		year: fc.year.ganzi,
		month: fc.month.ganzi,
		day: fc.day.ganzi,
		time: fc.time.ganzi,
	});
}

function nongliOf(date, time) {
	const local = buildLocalBaziResult({
		date, time, zone: '+08:00', lon: '120e00', lat: '0n00', gpsLon: 120, gpsLat: 0, ad: 1, gender: 1, timeAlg: 1, after23NewDay: 1,
	});
	return { ...local.bazi.nongli, bazi: local.bazi };
}

function normalizeQimen() {
	const fields = { date: { value: { format: () => '2026-02-18' } }, time: { value: { format: () => '10:30:00' } }, zone: { value: '+08:00' } };
	const y = 2026;
	const ctx = {
		jieqiYearSeeds: {
			[y - 1]: buildLocalJieqiYearSeed(y - 1, '+08:00'),
			[y]: buildLocalJieqiYearSeed(y, '+08:00'),
			[y + 1]: buildLocalJieqiYearSeed(y + 1, '+08:00'),
		},
	};
	const pan = calcDunJia(fields, nongliOf('2026-02-18', '10:30:00'), { paiPanType: 3, qijuMethod: 'chaibu', school: '转盘', timeAlg: 1, after23NewDay: 1 }, ctx);
	return JSON.stringify({ juText: pan.juText });
}

function normalizeZiwei() {
	const birth = {
		date: '1990/06/15',
		time: '10:30:00',
		zone: '+08:00',
		lon: 119.31666666666666,
		lat: 26.066666666666666,
		gpsLon: 119.31516153077507,
		gpsLat: 26.076417371316914,
		ad: 1,
		gender: 1,
	};
	const chart = calcZiwei(birth, {
		timeAlg: 1,
		after23NewDay: 1,
		lateZiHourUseNextDay: 0,
		yearBoundary: 'lunar_1_1',
		ziweiLunarBasis: 'calendar',
		lifeMasterBy: 'year_branch',
	});
	return JSON.stringify({
		lifeHouseIndex: chart.lifeHouseIndex,
		bodyHouseIndex: chart.bodyHouseIndex,
		wuxingJu: chart.wuxingJu,
	});
}

describe('final cross-viewport calculation identity', () => {
	test('astrology natal is identical across repeated runs', async () => {
		const runs = [];
		for (let i = 0; i < 3; i += 1) {
			runs.push(normalizeAstro(await calculateChart(ASTRO)));
		}
		expect(runs[0]).toBe(runs[1]);
		expect(runs[1]).toBe(runs[2]);
	});

	test('bazi pillars are identical across repeated runs', () => {
		const input = { date: '1990-06-15', time: '10:30:00', zone: '+08:00', lon: '119e19', lat: '26n04', gpsLon: 119.31516153077507, gpsLat: 26.076417371316914, ad: 1, gender: 1, timeAlg: 1, after23NewDay: 1 };
		const runs = [normalizeBazi(input), normalizeBazi(input), normalizeBazi(input)];
		expect(runs[0]).toBe(runs[1]);
		expect(runs[1]).toBe(runs[2]);
	});

	test('qimen ju text is identical across repeated runs', () => {
		const runs = [normalizeQimen(), normalizeQimen(), normalizeQimen()];
		expect(runs[0]).toBe(runs[1]);
		expect(runs[1]).toBe(runs[2]);
	});

	test('ziwei core indices are identical across repeated runs', () => {
		const runs = [normalizeZiwei(), normalizeZiwei(), normalizeZiwei()];
		expect(runs[0]).toBe(runs[1]);
		expect(runs[1]).toBe(runs[2]);
	});
});
