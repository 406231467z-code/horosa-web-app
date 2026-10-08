import { calculateChart, getAstrologyCapabilities } from '../astrologyCalculationService';
import { fetchChart } from '../astro';

jest.mock('../astro', () => ({
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

describe('production default provider does not call fetchChart', () => {
	test('default provider is browser and fetchChart is never called', async () => {
		expect(getAstrologyCapabilities().defaultProvider).toBe('browser');
		fetchChart.mockClear();
		const rsp = await calculateChart(BIRTH);
		expect(rsp.calculationProvider).toBe('browser');
		expect(rsp.Result.chart.houses).toHaveLength(12);
		expect(fetchChart).not.toHaveBeenCalled();
	});

	test('only an explicit legacy provider calls fetchChart', async () => {
		fetchChart.mockClear();
		await calculateChart(BIRTH, { provider: 'legacy' });
		expect(fetchChart).toHaveBeenCalledTimes(1);
	});
});
