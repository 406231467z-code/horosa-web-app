import { calculateChart, getAstrologyCapabilities } from '../astrologyCalculationService';
import { fetchChart } from '../astro';

jest.mock('../astro', () => ({
	fetchChart: jest.fn(async () => ({ ResultCode: 0, Result: { chart: { objects: [] } } })),
}));

const BIRTH = {
	date: '1990/06/15',
	time: '10:30:00',
	zone: '+08:00',
	lat: 31.233333333333334,
	lon: 121.46666666666667,
	hsys: 1,
	zodiacal: 0,
};

describe('production astronomy engine', () => {
	beforeEach(() => {
		fetchChart.mockClear();
	});

	test('default chart does not call fetchChart', async () => {
		const rsp = await calculateChart(BIRTH);
		expect(fetchChart).not.toHaveBeenCalled();
		expect(rsp.ResultCode).toBe(0);
		expect(rsp.calculationProvider).toBe('browser');
		expect(rsp.Result.meta.engine).toBe('astronomy-engine');
		const ids = rsp.Result.chart.objects.map((obj) => obj.id);
		for (const id of ['Sun', 'Moon', 'North Node', 'Dark Moon', 'Asc', 'MC']) {
			expect(ids).toContain(id);
		}
		expect(rsp.Result.chart.houses).toHaveLength(12);
		const sun = rsp.Result.chart.objects.find((obj) => obj.id === 'Sun');
		expect(sun.antisciaPoint.sign).toEqual(expect.any(String));
		expect(sun.cantisciaPoint.signlon).toEqual(expect.any(Number));
		expect(sun.meanSpeed).toBe(sun.lonspeed);
		expect(sun.house).toMatch(/^House([1-9]|1[0-2])$/);
		for (const id of ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']) {
			const body = rsp.Result.chart.objects.find((obj) => obj.id === id);
			expect(body.meanSpeed).toBe(body.lonspeed);
			expect(Number.isFinite(body.lonspeed)).toBe(true);
			expect(body.house).toMatch(/^House([1-9]|1[0-2])$/);
		}
		expect(rsp.Result.aspects.status).toBe('COMPUTED');
		expect(rsp.Result.lots.length).toBeGreaterThan(0);
		expect(rsp.Result.fixedStars.status).toBe('LICENSE_BLOCKED');
		expect(rsp.Result.parans.status).toBe('NOT_IMPLEMENTED');
	});

	test('form place strings and gps decimals do not call fetchChart', async () => {
		const rsp = await calculateChart({
			date: '1990/06/15',
			time: '10:30:00',
			zone: '+08:00',
			lat: '31n14',
			lon: '121e28',
			gpsLat: BIRTH.lat,
			gpsLon: BIRTH.lon,
			hsys: 1,
			zodiacal: 0,
		});
		expect(fetchChart).not.toHaveBeenCalled();
		expect(rsp.ResultCode).toBe(0);
		const base = await calculateChart(BIRTH);
		const sun = rsp.Result.chart.objects.find((obj) => obj.id === 'Sun');
		const baseSun = base.Result.chart.objects.find((obj) => obj.id === 'Sun');
		expect(sun.lon).toBeCloseTo(baseSun.lon, 8);
	});

	test('named sidereal ayanamsa is UNSUPPORTED and still does not call fetchChart', async () => {
		const rsp = await calculateChart({ ...BIRTH, zodiacal: 1, siderealAyanamsa: 'lahiri' });
		expect(fetchChart).not.toHaveBeenCalled();
		expect(rsp.Result.status).toBe('UNSUPPORTED');
		expect(rsp.Result.err).toBe('UNSUPPORTED');
	});

	test('legacy provider is the only fetchChart path', async () => {
		await calculateChart(BIRTH, { provider: 'legacy' });
		expect(fetchChart).toHaveBeenCalledTimes(1);
	});

	test('allowLegacyFallback does not call fetchChart', async () => {
		await calculateChart({ ...BIRTH, hsys: 4 }, { allowLegacyFallback: true });
		expect(fetchChart).not.toHaveBeenCalled();
	});

	test('capabilities name the browser engine', () => {
		const caps = getAstrologyCapabilities();
		expect(caps.defaultProvider).toBe('browser');
		expect(caps.productionReady).toBe(true);
		expect(caps['legacy-only']).toContain('post /chart');
	});
});
