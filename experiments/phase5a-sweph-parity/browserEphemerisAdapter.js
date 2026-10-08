/**
 * Isolated browser Swiss Ephemeris adapter.
 * Not imported by astrostudyui. Does not replace POST /chart.
 *
 * One SwissEph instance calculates every body. Declination comes from
 * calc_ut with SEFLG_EQUATORIAL, the same second call flatlib swe.sweObject makes.
 */
import SwissEph from '../phase4d-sweph-wasm/node_modules/swisseph-wasm/src/swisseph.js';

/** Horosa id → Swiss body. Defaults match flatlib SWE_OBJECTS and perchart.py. */
export const PLANET_MAP = [
	{ horosaId: 'Sun', swiss: 'SE_SUN', body: 0 },
	{ horosaId: 'Moon', swiss: 'SE_MOON', body: 1 },
	{ horosaId: 'Mercury', swiss: 'SE_MERCURY', body: 2 },
	{ horosaId: 'Venus', swiss: 'SE_VENUS', body: 3 },
	{ horosaId: 'Mars', swiss: 'SE_MARS', body: 4 },
	{ horosaId: 'Jupiter', swiss: 'SE_JUPITER', body: 5 },
	{ horosaId: 'Saturn', swiss: 'SE_SATURN', body: 6 },
	{ horosaId: 'Uranus', swiss: 'SE_URANUS', body: 7 },
	{ horosaId: 'Neptune', swiss: 'SE_NEPTUNE', body: 8 },
	{ horosaId: 'Pluto', swiss: 'SE_PLUTO', body: 9 },
	{
		horosaId: 'North Node',
		swiss: 'SE_MEAN_NODE',
		body: 10,
		note: 'Default mean node. True node (SE_TRUE_NODE, body 11) only when westNodeType or guolaoNodeType is true.',
	},
	{
		horosaId: 'Dark Moon',
		swiss: 'SE_MEAN_APOG',
		body: 12,
		note: 'Horosa Lilith id is Dark Moon. Osculating apogee (SE_OSCU_APOG, body 13) only when westLilithType or guolaoLilithType is true.',
	},
];

/**
 * perchart.hsys index → Swiss house letter from flatlib SWE_HOUSESYS.
 * Index 8 and 24 are Horosa custom systems and have no Swiss letter.
 */
export const HOUSE_LETTERS = {
	0: { name: 'Whole Sign', letter: 'W' },
	1: { name: 'Alcabitus', letter: 'B' },
	2: { name: 'Regiomontanus', letter: 'R' },
	3: { name: 'Placidus', letter: 'P' },
	4: { name: 'Koch', letter: 'K' },
	5: { name: 'Vehlow Equal', letter: 'V' },
	6: { name: 'Polich Page', letter: 'T' },
	7: { name: 'Sripati', letter: 'S' },
	8: { name: 'Equal MC middle', letter: null },
	9: { name: 'Porphyry', letter: 'O' },
	10: { name: 'Campanus', letter: 'C' },
	11: { name: 'Equal', letter: 'A' },
	12: { name: 'Equal MC', letter: 'D' },
	13: { name: 'Meridian', letter: 'X' },
	14: { name: 'Horizontal', letter: 'H' },
	15: { name: 'Morinus', letter: 'M' },
	16: { name: 'Carter Poli-Equatorial', letter: 'F' },
	17: { name: 'Sunshine', letter: 'I' },
	18: { name: 'Sunshine Alternate', letter: 'i' },
	19: { name: 'Krusinski-Pisa-Goelzer', letter: 'U' },
	20: { name: 'Pullen SD', letter: 'L' },
	21: { name: 'Pullen SR', letter: 'Q' },
	22: { name: 'APC Houses', letter: 'Y' },
	23: { name: 'Savard-A', letter: 'J' },
	24: { name: 'Fortuna whole sign', letter: null },
};

function rollGregorian(year, month, day, utHour) {
	let y = year;
	let m = month;
	let d = day;
	let h = utHour;
	while (h < 0) {
		h += 24;
		d -= 1;
	}
	while (h >= 24) {
		h -= 24;
		d += 1;
	}
	const utc = new Date(Date.UTC(y, m - 1, d));
	return {
		year: utc.getUTCFullYear(),
		month: utc.getUTCMonth() + 1,
		day: utc.getUTCDate(),
		utHour: h,
	};
}

/** Local civil time plus a fixed zone offset. Does not apply a DST rules database. */
export function julianDayUt(swe, input) {
	const localHour = input.hour + (input.minute || 0) / 60 + (input.second || 0) / 3600;
	const utHour = localHour - input.zoneOffsetHours;
	const rolled = rollGregorian(input.year, input.month, input.day, utHour);
	return swe.julday(rolled.year, rolled.month, rolled.day, rolled.utHour);
}

function bodyPosition(swe, jd, body, eclFlags) {
	const ecl = swe.calc_ut(jd, body, eclFlags);
	const eq = swe.calc_ut(jd, body, eclFlags | swe.SEFLG_EQUATORIAL);
	if (!ecl || !eq || !Number.isFinite(ecl[0]) || !Number.isFinite(eq[1])) return null;
	const speed = ecl[3];
	return {
		longitude: ecl[0],
		latitude: ecl[1],
		distance: ecl[2],
		speed,
		declination: eq[1],
		retrograde: speed < 0,
	};
}

function housesFor(swe, jd, lat, lon, hsysIndex) {
	const spec = HOUSE_LETTERS[hsysIndex];
	if (!spec || !spec.letter) {
		return {
			system: spec ? spec.name : null,
			letter: null,
			status: 'NO_SWISS_LETTER',
		};
	}
	const got = swe.houses(jd, lat, lon, spec.letter);
	const asc = got.ascmc[0];
	const mc = got.ascmc[1];
	const cusps = {};
	for (let i = 1; i <= 12; i += 1) cusps[`House${i}`] = got.cusps[i];
	return {
		system: spec.name,
		letter: spec.letter,
		asc,
		mc,
		dsc: (asc + 180) % 360,
		ic: (mc + 180) % 360,
		cusps,
		status: 'COMPUTED',
	};
}

export async function openEphemeris() {
	const swe = new SwissEph();
	const t0 = performance.now();
	await swe.initSwissEph();
	const initMs = performance.now() - t0;
	let closed = false;
	const eclFlags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;

	return {
		initMs,
		flags: 'SEFLG_SWIEPH | SEFLG_SPEED',
		async close() {
			if (!closed) {
				swe.close();
				closed = true;
			}
		},
		julianDayUt(input) {
			return julianDayUt(swe, input);
		},
		siderealTime(jd) {
			return swe.sidtime(jd);
		},
		ayanamsaUt(jd) {
			return swe.get_ayanamsa_ut(jd);
		},
		siderealReference(input) {
			const jd = input.jd != null ? input.jd : julianDayUt(swe, input);
			swe.set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);
			const flags = eclFlags | swe.SEFLG_SIDEREAL;
			const sun = bodyPosition(swe, jd, swe.SE_SUN, flags);
			const moon = bodyPosition(swe, jd, swe.SE_MOON, flags);
			const houses = swe.houses_ex(jd, swe.SEFLG_SIDEREAL, input.lat, input.lon, 'R');
			return {
				status: 'REFERENCE-ONLY',
				ayanamsa: 'lahiri',
				jd,
				sun,
				moon,
				asc: houses && houses.ascmc ? houses.ascmc[0] : null,
				mc: houses && houses.ascmc ? houses.ascmc[1] : null,
			};
		},
		eclipticLongitude(jd, horosaId) {
			const body = horosaId === 'Moon' ? swe.SE_MOON : swe.SE_SUN;
			const ecl = swe.calc_ut(jd, body, eclFlags);
			return ecl ? ecl[0] : null;
		},
		positionAt(jd, swissName) {
			return bodyPosition(swe, jd, swe[swissName], eclFlags);
		},
		obliquity(jd) {
			const nut = swe.calc_ut(jd, swe.SE_ECL_NUT, eclFlags);
			return nut ? nut[0] : null;
		},
		moiraAyanamsa(jd) {
			const t0 = swe.julday(1300, 1, 1, 0);
			swe.set_sid_mode(swe.SE_SIDM_USER, t0, 4);
			const ayan = swe.get_ayanamsa_ut(jd);
			swe.set_sid_mode(0, 0, 0);
			return ayan;
		},
		rawHouses(jd, lat, lon, hsysIndex) {
			const spec = HOUSE_LETTERS[hsysIndex];
			if (!spec || !spec.letter) return null;
			const got = swe.houses(jd, lat, lon, spec.letter);
			const ascmc = got && got.ascmc ? Array.from(got.ascmc) : [];
			return { ascmc };
		},
		computeChart(input) {
			const jd = input.jd != null ? input.jd : julianDayUt(swe, input);
			const t1 = performance.now();
			const nodeSwiss = input.nodeSwiss || 'SE_MEAN_NODE';
			const lilithSwiss = input.lilithSwiss || 'SE_MEAN_APOG';
			const planets = {};
			for (const row of PLANET_MAP) {
				let swiss = row.swiss;
				if (row.horosaId === 'North Node') swiss = nodeSwiss;
				if (row.horosaId === 'Dark Moon') swiss = lilithSwiss;
				planets[row.horosaId] = bodyPosition(swe, jd, swe[swiss], eclFlags);
			}
			const houses = housesFor(swe, jd, input.lat, input.lon, input.hsysIndex);
			const calcMs = performance.now() - t1;
			return {
				source: 'browser-sweph-experiment',
				reference: 'HISTORICAL-GOLDEN',
				jd,
				siderealTime: swe.sidtime(jd),
				planets,
				houses,
				calcMs,
			};
		},
	};
}
