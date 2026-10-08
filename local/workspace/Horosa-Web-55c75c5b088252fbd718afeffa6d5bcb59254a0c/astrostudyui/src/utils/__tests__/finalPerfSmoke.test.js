import { calculateChart } from '../../services/astrologyCalculationService';

jest.mock('../../services/astro', () => ({
	fetchChart: jest.fn(async () => ({ ResultCode: 0, Result: { chart: { objects: [] } } })),
}));

const BIRTH = {
	date: '1990/06/15',
	time: '10:30:00',
	zone: '+08:00',
	lat: 26.066666666666666,
	lon: 119.31666666666666,
	hsys: 1,
	zodiacal: 0,
};

async function timeCharts(count) {
	const started = Date.now();
	let sun = null;
	for (let i = 0; i < count; i += 1) {
		const rsp = await calculateChart({
			...BIRTH,
			date: `${1900 + (i % 120)}/06/15`,
		});
		sun = rsp.Result.chart.objects.find((obj) => obj.id === 'Sun').lon;
	}
	return { ms: Date.now() - started, sun };
}

describe('final performance smoke', () => {
	test('initial, repeat, 10, and 100 charts stay finite and identical on repeat', async () => {
		const first = await timeCharts(1);
		const repeat = await calculateChart(BIRTH);
		const again = await calculateChart(BIRTH);
		const sunA = repeat.Result.chart.objects.find((obj) => obj.id === 'Sun').lon;
		const sunB = again.Result.chart.objects.find((obj) => obj.id === 'Sun').lon;
		expect(sunA).toBe(sunB);
		const ten = await timeCharts(10);
		const hundred = await timeCharts(100);
		expect(Number.isFinite(first.sun)).toBe(true);
		expect(ten.ms).toBeGreaterThan(0);
		expect(hundred.ms).toBeGreaterThan(0);
		expect(hundred.ms).toBeLessThan(first.ms * 100 * 8);
		console.log(JSON.stringify({
			initialMs: first.ms,
			repeatIdentical: sunA === sunB,
			tenMs: ten.ms,
			hundredMs: hundred.ms,
		}));
	});
});
