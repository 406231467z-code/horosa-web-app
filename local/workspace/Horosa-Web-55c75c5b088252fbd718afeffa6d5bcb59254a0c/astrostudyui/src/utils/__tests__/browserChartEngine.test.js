import fs from 'fs';
import path from 'path';
import { calculateBrowserChart, canCalculateBrowserChart } from '../browserChartEngine';
import request from '../request';
import { fetchChart } from '../../services/astro';

jest.mock('../request', ()=>jest.fn());

const GOLDEN = JSON.parse(fs.readFileSync(
	path.join(__dirname, '../../divination/engine/__tests__/fixtures/realChartResult.json'),
	'utf8',
));

function simpleParams(){
	return {
		date: '1990/06/15',
		time: '10:30:00',
		zone: '+08:00',
		lat: '31n14',
		lon: '121e28',
		gpsLat: '31n14',
		gpsLon: '121e28',
		ad: 1,
		hsys: 2,
		zodiacal: 0,
		siderealAyanamsa: '',
		predictive: 0,
		tradition: 0,
		strongRecption: 0,
		simpleAsp: 0,
		virtualPointReceiveAsp: 0,
	};
}

function angularDistance(a,b){
	const delta = Math.abs(a-b)%360;
	return Math.min(delta,360-delta);
}

describe('browser-native natal chart engine candidate', ()=>{
	beforeEach(()=>{ request.mockReset(); });
	test('calculates a real chart envelope from local birth inputs without a network transport', ()=>{
		const params = simpleParams();
		expect(canCalculateBrowserChart(params)).toEqual({ ok: true, reason: '' });
		const envelope = calculateBrowserChart(params);
		expect(envelope.ResultCode).toBe(0);
		expect(envelope.Result.localEngine).toBe('caelus@0.25.0');
		expect(envelope.Result.params.birth).toBe('1990-06-15 10:30:00');
		expect(envelope.Result.chart.objects.length).toBeGreaterThan(20);
		expect(envelope.Result.chart.houses).toHaveLength(12);
		expect(envelope.Result.chart.houses.map((house)=>house.id)).toEqual(expect.arrayContaining([
			'House1','House2','House3','House4','House5','House6','House7','House8','House9','House10','House11','House12',
		]));
		expect(envelope.Result.chart.fixedStars.length).toBeGreaterThan(0);
		expect(envelope.Result.aspects.normalAsp.Sun).toBeTruthy();

		const source = GOLDEN.chart.objects;
		const local = envelope.Result.chart.objects;
		['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].forEach((id)=>{
			const expected = source.find((row)=>row.id === id);
			const actual = local.find((row)=>row.id === id);
			expect(expected).toBeTruthy();
			expect(actual).toBeTruthy();
			expect(angularDistance(expected.lon,actual.lon)).toBeLessThan(1/3600);
		});
	});

	test('service uses the browser-native path and does not call the legacy request wrapper', async ()=>{
		const response = await fetchChart(simpleParams(), { browserNative: true });
		expect(response.Result.localEngine).toBe('caelus@0.25.0');
		expect(request).not.toHaveBeenCalled();
	});

	test('matches classical dignity and derived metadata against the historical chart', ()=>{
		const local = calculateBrowserChart(simpleParams()).Result;
		const expected = GOLDEN.chart.objects.find((row)=>row.id === 'Sun');
		const actual = local.chart.objects.find((row)=>row.id === 'Sun');
		expect(actual.dignities).toEqual(expected.dignities);
		expect(actual.selfDignity).toEqual(expected.selfDignity);
		expect(actual.score).toBe(expected.score);
		expect(actual.degreeGender).toBe(expected.degreeGender);
		expect(actual.ninthPart).toBe(expected.ninthPart);
		expect(local.receptions.normal.length).toBeGreaterThan(0);
		expect(local.mutuals).toHaveProperty('abnormal');
		expect(local.declParallel).toHaveProperty('contraParallel');
		expect(local.surround.planets.Sun).toHaveLength(2);
	});

	test('does not claim support for primary directions or unsupported house systems', ()=>{
		const params = simpleParams();
		expect(canCalculateBrowserChart({ ...params, includePrimaryDirection: 1 }).ok).toBe(false);
		expect(canCalculateBrowserChart({ ...params, hsys: 7 }).ok).toBe(false);
		expect(()=>calculateBrowserChart({ ...params, includePrimaryDirection: 1 })).toThrow('主限预测');
	});

	test('refuses out-of-range birth years instead of fabricating a local chart', ()=>{
		const result = canCalculateBrowserChart({ ...simpleParams(), date: '0500/06/15' });
		expect(result.ok).toBe(false);
		expect(result.reason).toContain('1000–3000');
	});
});
