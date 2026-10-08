import fs from 'fs';
import path from 'path';
import { IndiaBrowserEngine, IndiaCalculationProvider } from '../indiaBrowser';
import { requestIndiaChartData } from '../../components/astro/IndiaChart';

const YEARS = [1990, 2000, 2026];

function natalInput(year){
	return {
		date: `${year}-06-15`,
		time: '10:30:00',
		ad: 1,
		zone: '+08:00',
		lat: '26n04',
		lon: '119e19',
		chartnum: 1,
		siderealMode: 'lahiri',
	};
}

describe('indiaBrowserParity', ()=>{
	test.each(YEARS)('%s returns the Swiss license status and no vedic chart', async (year)=>{
		const input = natalInput(year);
		const actual = IndiaBrowserEngine.calculate(input);
		const viaProvider = IndiaCalculationProvider.calculate(input);
		const fromRequest = await requestIndiaChartData(input);
		const expected = {
			status: 'LICENSE_REVIEW_REQUIRED',
			provider: 'browser',
			code: 'INDIA_SIDEREAL_EPHEMERIS',
			feature: 'indiachart',
			productionReady: false,
		};
		const row = {
			expected: expected.status,
			actual: actual.status,
			delta: null,
			status: actual.status,
		};
		expect(row).toEqual({
			expected: 'LICENSE_REVIEW_REQUIRED',
			actual: 'LICENSE_REVIEW_REQUIRED',
			delta: null,
			status: 'LICENSE_REVIEW_REQUIRED',
		});
		expect(actual).toMatchObject(expected);
		expect(viaProvider).toMatchObject(expected);
		expect(fromRequest).toMatchObject(expected);
		expect(actual.chart).toBeUndefined();
		expect(actual.jyotish).toBeUndefined();
		expect(actual.message).toContain('/india/chart');
		expect(IndiaBrowserEngine.getCapabilities().provider).toBe('browser');
	});

	test('production modules do not request india chart or rectify', ()=>{
		const root = path.resolve(__dirname, '../..');
		const files = [
			'components/astro/IndiaChart.js',
			'components/astro/IndiaChartMain.js',
		];
		files.forEach((rel)=>{
			const text = fs.readFileSync(path.join(root, rel), 'utf8');
			expect(text).not.toMatch(/ServerRoot\}\/india\/chart/);
			expect(text).not.toMatch(/ServerRoot\}\/india\/rectify/);
		});
	});
});
