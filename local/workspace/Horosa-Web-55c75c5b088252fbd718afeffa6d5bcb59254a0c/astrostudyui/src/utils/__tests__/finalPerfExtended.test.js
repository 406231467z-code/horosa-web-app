import { calculateChart } from '../../services/astrologyCalculationService';
import {
	upsertLocalChart,
	listLocalCharts,
	removeLocalChart,
} from '../localcharts';
import {
	flushUserRecordsWrites,
	__installUserRecordsMemoryBackendForTests,
	__resetUserRecordsForTests,
} from '../userRecordsStore';

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

describe('final performance extended', () => {
	beforeEach(() => {
		window.localStorage.clear();
		__resetUserRecordsForTests();
		__installUserRecordsMemoryBackendForTests();
	});

	afterEach(() => {
		__resetUserRecordsForTests();
		window.localStorage.clear();
	});

	test('save and load stay finite', async () => {
		const saveStarted = Date.now();
		for (let i = 0; i < 10; i += 1) {
			upsertLocalChart({
				cid: `perf-save-${i}`,
				name: `Perf ${i}`,
				birth: '1990-06-15 10:30:00',
				zone: '+08:00',
				preserveUpdateTime: true,
				updateTime: '2026-09-24 10:00:00',
			});
		}
		await flushUserRecordsWrites();
		const saveMs = Date.now() - saveStarted;

		const loadStarted = Date.now();
		const rows = listLocalCharts();
		const loadMs = Date.now() - loadStarted;

		expect(rows.length).toBeGreaterThanOrEqual(10);
		expect(Number.isFinite(saveMs)).toBe(true);
		expect(Number.isFinite(loadMs)).toBe(true);

		const chartStarted = Date.now();
		const rsp = await calculateChart(BIRTH);
		const chartMs = Date.now() - chartStarted;
		const sun = rsp.Result.chart.objects.find((obj) => obj.id === 'Sun').lon;
		expect(Number.isFinite(sun)).toBe(true);

		for (let i = 0; i < 10; i += 1) {
			removeLocalChart(`perf-save-${i}`);
		}
		await flushUserRecordsWrites();

		console.log(JSON.stringify({ saveTenMs: saveMs, loadMs, singleChartMs: chartMs }));
	});
});
