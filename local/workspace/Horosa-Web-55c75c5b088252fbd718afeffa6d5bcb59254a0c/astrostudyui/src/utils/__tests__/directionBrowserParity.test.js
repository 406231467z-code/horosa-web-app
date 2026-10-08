import fs from 'fs';
import path from 'path';
import { DirectionBrowserEngine, DirectionCalculationProvider } from '../directionBrowser';

const YEARS = [1990, 2000, 2026];

function natalInput(year){
	return {
		date: `${year}-06-15`,
		time: '10:30:00',
		ad: 1,
		zone: '+08:00',
		lat: '26n04',
		lon: '119e19',
		hsys: 'B',
		pdMethod: 'core_alchabitius',
		pdTimeKey: 'Ptolemy',
		pdtype: 0,
	};
}

describe('directionBrowserParity', ()=>{
	test.each(YEARS)('%s returns the Swiss license status and no arc table', (year)=>{
		const input = natalInput(year);
		const actual = DirectionBrowserEngine.calculate(input);
		const viaProvider = DirectionCalculationProvider.calculate(input);
		const expected = {
			status: 'LICENSE_REVIEW_REQUIRED',
			provider: 'browser',
			code: 'PRIMARY_DIRECTION_EPHEMERIS',
			feature: 'direction',
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
		expect(actual.pd).toBeUndefined();
		expect(actual.message).toContain('/predict/pd');
		expect(actual.message).toContain('/predict/pdchart');
		expect(actual.message).toContain('/predict/pdpoles');
		expect(DirectionBrowserEngine.getCapabilities().provider).toBe('browser');
	});

	test('production modules do not request primary-direction endpoints', ()=>{
		const root = path.resolve(__dirname, '../..');
		const files = [
			'components/direction/AstroDirectMain.js',
			'components/astro/AstroPrimaryDirectionChart.js',
			'components/astro/AstroPrimaryDirection.js',
			'services/astroPd3d.js',
		];
		files.forEach((rel)=>{
			const text = fs.readFileSync(path.join(root, rel), 'utf8');
			expect(text).not.toMatch(/ServerRoot\}\/predict\/pd/);
			expect(text).not.toMatch(/['"`]\/predict\/pdpoles['"`]/);
		});
	});
});
