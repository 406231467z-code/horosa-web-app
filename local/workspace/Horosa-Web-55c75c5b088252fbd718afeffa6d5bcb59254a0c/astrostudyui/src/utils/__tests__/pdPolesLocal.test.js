import { computePdPolesLocal } from '../pdPolesLocal';

function makeChart(){
	return {
		params: { pdtype: 0, pdProjection: 'placidus', pdSignificators: ['Spirit', 'Cusps'] },
		chart: {
			date: { jd: 2451545 },
			geo: { lat: 31.2, lon: 121.4 },
			isDiurnal: true,
			objects: [
				{ id: 'Asc', lon: 156, lat: 0, ra: 150, decl: 10 },
				{ id: 'MC', lon: 64, lat: 0, ra: 58, decl: 20 },
				{ id: 'Sun', lon: 80, lat: 0.1, ra: 78, decl: 23 },
				{ id: 'Moon', lon: 210, lat: 2, ra: 212, decl: -10 },
				{ id: 'Mercury', lon: 70, lat: -1, ra: 69, decl: 20 },
				{ id: 'Venus', lon: 100, lat: 1, ra: 101, decl: 22 },
				{ id: 'Mars', lon: 140, lat: -2, ra: 138, decl: 16 },
				{ id: 'Jupiter', lon: 280, lat: 1, ra: 281, decl: -23 },
				{ id: 'Saturn', lon: 300, lat: 2, ra: 301, decl: -19 },
				{ id: 'Syzygy', lon: 25, lat: 0, ra: 25, decl: 9 },
			],
			houses: [
				{ id: 'House2', lon: 180 },
				{ id: 'House3', lon: 210 },
				{ id: 'House4', lon: 240 },
				{ id: 'House5', lon: 270 },
			],
		},
	};
}

describe('browser-native primary-direction pole calculation', ()=>{
	test('calculates core pole rows and selected local significators without a service', ()=>{
		const envelope = makeChart();
		const result = computePdPolesLocal(envelope, envelope.params);
		expect(result).toBeTruthy();
		expect(result.local).toBe(true);
		expect(result.projection).toBe('placidus');
		expect(result.poles.Asc).toBe(31.2);
		expect(result.poles.MC).toBe(0);
		expect(result.poles.Desc).toBe(31.2);
		expect(result.poles.IC).toBe(0);
		['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Spirit', 'House2', 'House3'].forEach((key)=>{
			expect(Number.isFinite(result.poles[key])).toBe(true);
		});
	});

	test('honors the selected projection families', ()=>{
		const envelope = makeChart();
		expect(computePdPolesLocal(envelope, { pdProjection: 'regiomontanus' }).projection).toBe('regiomontanus');
		expect(computePdPolesLocal(envelope, { pdProjection: 'campanus' }).projection).toBe('campanus');
		expect(computePdPolesLocal(envelope, { pdProjection: 'topocentric' }).projection).toBe('topocentric');
	});

	test('returns null rather than manufacturing poles without a chart and geographic frame', ()=>{
		expect(computePdPolesLocal(null)).toBeNull();
		expect(computePdPolesLocal({ chart: { objects: [] } })).toBeNull();
	});
});
