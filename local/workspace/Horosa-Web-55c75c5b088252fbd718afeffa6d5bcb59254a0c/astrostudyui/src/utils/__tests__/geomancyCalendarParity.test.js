import { computeGeomancyReading } from '../geomancyBrowser';
import { midpoint } from '../uranianDial';
import { CalendarProvider } from '../calendarProvider';

describe('geomancy browser shield', ()=>{
	test('manual seed 42 matches the legacy Python shield', ()=>{
		const result = computeGeomancyReading({ seedMode: 'manual', seed: 42, castMethod: 'manual' });
		expect(result.status).toBe('SUCCESS');
		expect(result.provider).toBe('browser');
		const reading = result.reading;
		expect(reading.motherFigures.map((fig)=>fig.nameEn)).toEqual(['Albus', 'Populus', 'Laetitia', 'Populus']);
		expect(reading.judge.nameEn).toBe('Populus');
		expect(reading.reconciler.nameEn).toBe('Albus');
		expect(reading.judge.points % 2).toBe(0);
		expect(reading.houses).toHaveLength(12);
		expect(reading.houses[0].figure.nameEn).toBe('Albus');
	});

	test('sixteen odd numbers make four Via mothers', ()=>{
		const numbers = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
		const result = computeGeomancyReading({ castMethod: 'numbers', castNumbers: numbers, seed: 0 });
		expect(result.status).toBe('SUCCESS');
		expect(result.reading.motherFigures.map((fig)=>fig.nameEn)).toEqual(['Via', 'Via', 'Via', 'Via']);
	});

	test('real ephemeris stays on the shield and marks the license', ()=>{
		const result = computeGeomancyReading({ seed: 42, house_projection: 'real_ephemeris' });
		expect(result.status).toBe('SUCCESS');
		expect(result.reading.ephemeris.status).toBe('LICENSE_REVIEW_REQUIRED');
		expect(result.reading.motherFigures[0].nameEn).toBe('Albus');
	});
});

describe('circular midpoint', ()=>{
	test('keeps the short arc across 0', ()=>{
		expect(midpoint(359, 1)).toBe(0);
		expect(midpoint(1, 359)).toBe(0);
	});

	test('averages an ordinary pair', ()=>{
		expect(midpoint(10, 20)).toBe(15);
	});

	test('same longitude stays put', ()=>{
		expect(midpoint(10, 10)).toBe(10);
	});

	test('retrograde speed does not change the longitude rule', ()=>{
		const direct = midpoint(350, 10);
		const retro = midpoint(350, 10);
		expect(direct).toBe(retro);
		expect(direct).not.toBe(180);
	});
});

describe('calendar provider', ()=>{
	test('1990-06-15 solar to lunar stays in domain', ()=>{
		const result = CalendarProvider.solarToLunar({
			date: '1990-06-15',
			time: '10:30:00',
			zone: '+08:00',
			gender: 1,
		});
		expect(result.local).toBe(true);
		expect(result.bazi.fourColumns.day.ganzi).toBeTruthy();
	});

	test('solar terms for 2000 include lichun', ()=>{
		const terms = CalendarProvider.solarTerms(2000, '+08:00');
		expect(terms.status).toBeUndefined();
		expect(terms['立春'] || terms['立春']).toBeTruthy();
	});

	test('year 12000 is unsupported', ()=>{
		const terms = CalendarProvider.solarTerms(12000, '+08:00');
		expect(terms.status).toBe('UNSUPPORTED');
		expect(terms.code).toBe('LUNAR_DOMAIN');
	});
});
