/**
 * Astronomy Engine vs Swiss browser experiment.
 * Does not import astrostudyui and does not change production.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Astronomy from 'astronomy-engine';
import { openEphemeris } from '../phase5a-sweph-parity/browserEphemerisAdapter.js';
import { deriveAspects } from '../phase5a-sweph-parity/derived/aspectsBrowser.js';
import { deriveLots } from '../phase5a-sweph-parity/derived/lotsBrowser.js';
import { deriveReception } from '../phase5a-sweph-parity/derived/receptionBrowser.js';
import { deriveDeclParallel } from '../phase5a-sweph-parity/derived/declinationBrowser.js';
import { findSyzygy, syzygyFromMoon } from '../phase5a-sweph-parity/derived/syzygyBrowser.js';
import { degnorm, regiomontanus } from './regio.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'results');
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const AE_BODY = {
	Sun: Astronomy.Body.Sun,
	Moon: Astronomy.Body.Moon,
	Mercury: Astronomy.Body.Mercury,
	Venus: Astronomy.Body.Venus,
	Mars: Astronomy.Body.Mars,
	Jupiter: Astronomy.Body.Jupiter,
	Saturn: Astronomy.Body.Saturn,
	Uranus: Astronomy.Body.Uranus,
	Neptune: Astronomy.Body.Neptune,
	Pluto: Astronomy.Body.Pluto,
};
const LOCS = [
	{ id: 'equator', lat: 0, lon: 0, tz: '+00:00' },
	{ id: 'high-northern', lat: 69.6492, lon: 18.9553, tz: '+01:00' },
	{ id: 'high-southern', lat: -77.8419, lon: 166.6863, tz: '+12:00' },
	{ id: 'southern-hemisphere', lat: -33.8688, lon: 151.2093, tz: '+10:00' },
];
const DATES = ['1900-06-15', '1950-06-15', '1976-06-15', '1990-06-15', '2000-06-15', '2026-06-15'];

function zoneHours(tz) {
	const m = /^([+-])(\d{2}):(\d{2})$/.exec(tz);
	const sign = m[1] === '-' ? -1 : 1;
	return sign * (Number(m[2]) + Number(m[3]) / 60);
}

function civilToInput(date, time, loc) {
	const [year, month, day] = date.split('-').map(Number);
	const [hour, minute, second] = time.split(':').map(Number);
	return {
		date, time, loc: loc.id,
		year, month, day, hour, minute, second,
		zoneOffsetHours: zoneHours(loc.tz),
		lat: loc.lat, lon: loc.lon, tz: loc.tz,
	};
}

function cases() {
	const rows = [];
	for (const date of DATES) {
		for (const loc of LOCS) rows.push(civilToInput(date, '12:00:00', loc));
	}
	for (const time of ['00:00:00', '10:30:00', '23:59:00']) {
		for (const loc of LOCS) rows.push(civilToInput('1990-06-15', time, loc));
	}
	return rows;
}

function dateFromJd(jd) {
	return new Date((jd - 2440587.5) * 86400000);
}

function angDiff(a, b) {
	let d = a - b;
	d = ((d + 180) % 360 + 360) % 360 - 180;
	return d;
}

function arcsec(deltaDeg) {
	return Math.abs(deltaDeg) * 3600;
}

function stats(values) {
	const s = values.filter((n) => Number.isFinite(n)).slice().sort((a, b) => a - b);
	if (!s.length) return { n: 0, max: null, mean: null, median: null, p95: null, p99: null };
	const n = s.length;
	const sum = s.reduce((a, b) => a + b, 0);
	const pick = (p) => s[Math.min(n - 1, Math.max(0, Math.ceil(p * n) - 1))];
	const median = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
	return { n, max: s[n - 1], mean: sum / n, median, p95: pick(0.95), p99: pick(0.99) };
}

function signIndex(lon) {
	return Math.floor(degnorm(lon) / 30);
}

function degreeInSign(lon) {
	return Math.floor(degnorm(lon) % 30);
}

function aeEcliptic(bodyName, date) {
	if (bodyName === 'Moon') {
		const moon = Astronomy.EclipticGeoMoon(date);
		return { longitude: degnorm(moon.lon), latitude: moon.lat };
	}
	const vec = Astronomy.GeoVector(AE_BODY[bodyName], date, true);
	const ecl = Astronomy.Ecliptic(vec);
	return { longitude: degnorm(ecl.elon), latitude: ecl.elat };
}

function aeDeclination(bodyName, date) {
	const vec = bodyName === 'Moon'
		? Astronomy.GeoMoon(date)
		: Astronomy.GeoVector(AE_BODY[bodyName], date, true);
	const eqd = Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(date), vec);
	return Astronomy.EquatorFromVector(eqd).dec;
}

function aePosition(bodyName, date) {
	const ecl = aeEcliptic(bodyName, date);
	const before = aeEcliptic(bodyName, new Date(date.getTime() - 1800000));
	const after = aeEcliptic(bodyName, new Date(date.getTime() + 1800000));
	const speed = angDiff(after.longitude, before.longitude) / (1 / 24);
	return {
		longitude: ecl.longitude,
		latitude: ecl.latitude,
		speed,
		declination: aeDeclination(bodyName, date),
		retrograde: speed < 0,
	};
}

function aeHouses(date, lat, lon) {
	const gastHours = Astronomy.SiderealTime(date);
	const tilt = Astronomy.e_tilt(date);
	const armc = degnorm(gastHours * 15 + lon);
	const built = regiomontanus(armc, lat, tilt.tobl);
	return { ...built, gastHours, obliquity: tilt.tobl, armc };
}

function swissHousesFromOwnTime(eph, jd, lat, lon) {
	const gastHours = eph.siderealTime(jd);
	const obliquity = eph.obliquity(jd);
	const armc = degnorm(gastHours * 15 + lon);
	const formula = regiomontanus(armc, lat, obliquity);
	const swiss = eph.computeChart({ jd, lat, lon, hsysIndex: 2, hour: 0, minute: 0, second: 0, zoneOffsetHours: 0, year: 2000, month: 1, day: 1 });
	return { gastHours, obliquity, armc, formula, swiss: swiss.houses };
}

function houseOf(lon, cusps) {
	for (let i = 1; i <= 12; i += 1) {
		const a = cusps[i];
		const b = cusps[i === 12 ? 1 : i + 1];
		const span = degnorm(b - a);
		if (span === 0) continue;
		if (degnorm(lon - a) < span) return i;
	}
	return null;
}

function chartModel(planets, houses, jd, syzygy, latitude) {
	const objects = {};
	for (const id of BODIES) {
		const p = planets[id];
		objects[id] = {
			id,
			lon: p.longitude,
			lat: p.latitude,
			lonspeed: p.speed,
			decl: p.declination,
			retrograde: p.retrograde,
		};
	}
	const cusps = {};
	for (let i = 1; i <= 12; i += 1) {
		cusps[`House${i}`] = { id: `House${i}`, lon: houses.cusps[i] };
	}
	return {
		jd,
		input: { latitude },
		objects,
		ascmc: {
			Asc: { id: 'Asc', lon: houses.asc },
			MC: { id: 'MC', lon: houses.mc },
			Desc: { id: 'Desc', lon: degnorm(houses.asc + 180) },
			IC: { id: 'IC', lon: degnorm(houses.mc + 180) },
		},
		houses: { system: 'Regiomontanus', letter: 'R', cusps },
		inputs: { syzygy },
	};
}

function aspectRecords(derived) {
	const rows = [];
	const normal = derived.normalAsp || {};
	for (const starter of Object.keys(normal)) {
		for (const bucket of ['Exact', 'Applicative', 'Separative', 'None']) {
			for (const row of normal[starter][bucket] || []) {
				rows.push({ starter, other: row.id, type: row.asp, movement: bucket, orb: row.orb });
			}
		}
	}
	return rows;
}

function keyOf(row) {
	return `${row.starter}|${row.other}|${row.type}`;
}

function compareAspects(swiss, ae) {
	const a = aspectRecords(swiss);
	const b = aspectRecords(ae);
	const mapA = new Map(a.map((row) => [keyOf(row), row]));
	const mapB = new Map(b.map((row) => [keyOf(row), row]));
	let aspectChanged = 0;
	let aspectTypeChanged = 0;
	let applyingChanged = 0;
	const keys = new Set([...mapA.keys(), ...mapB.keys()]);
	for (const key of keys) {
		const left = mapA.get(key);
		const right = mapB.get(key);
		if (!left || !right) {
			aspectChanged += 1;
			aspectTypeChanged += 1;
			continue;
		}
		if (left.movement !== right.movement) {
			aspectChanged += 1;
			applyingChanged += 1;
		}
	}
	const pair = (row) => `${row.starter}|${row.other}`;
	const typesA = new Map();
	const typesB = new Map();
	for (const row of a) typesA.set(pair(row), row.type);
	for (const row of b) {
		const id = pair(row);
		if (typesB.has(id) && typesB.get(id) !== row.type) typesB.set(id, 'MULTI');
		else if (!typesB.has(id)) typesB.set(id, row.type);
	}
	return { aspectChanged, aspectTypeChanged, applyingChanged, swissCount: a.length, aeCount: b.length };
}

function lotMap(derived) {
	const map = {};
	for (const row of derived.lots || []) map[row.id] = row;
	return map;
}

function receptionKeys(derived) {
	const keys = [];
	for (const kind of ['normal', 'abnormal']) {
		for (const row of derived.receptions[kind] || []) {
			keys.push(`${kind}|${JSON.stringify(row)}`);
		}
		for (const row of derived.mutuals[kind] || []) {
			keys.push(`mutual-${kind}|${row.planetA.id}|${row.planetB.id}|${JSON.stringify(row.planetA.rulerShip)}|${JSON.stringify(row.planetB.rulerShip)}`);
		}
	}
	return keys.sort();
}

function parallelKeys(derived) {
	const keys = [];
	for (const group of derived.parallel || []) keys.push(`P|${group.join('+')}`);
	for (const id of Object.keys(derived.contraParallel || {}).sort()) {
		keys.push(`C|${id}|${derived.contraParallel[id].join('+')}`);
	}
	return keys.sort();
}

function symmetricCount(left, right) {
	const a = new Set(left);
	const b = new Set(right);
	let n = 0;
	for (const item of a) if (!b.has(item)) n += 1;
	for (const item of b) if (!a.has(item)) n += 1;
	return n;
}

function syzygyFor(jd, longitudeOf, positionOfMoon) {
	const found = findSyzygy(jd, longitudeOf);
	if (found.status !== 'COMPUTED') return found;
	const moon = positionOfMoon(found.jd);
	return syzygyFromMoon(found, moon);
}

const eph = await openEphemeris();
const formulaChecks = [];
const probeCases = [
	civilToInput('1990-06-15', '10:30:00', LOCS[0]),
	civilToInput('1990-06-15', '10:30:00', LOCS[1]),
	civilToInput('1990-06-15', '10:30:00', LOCS[2]),
	civilToInput('1990-06-15', '10:30:00', LOCS[3]),
];
for (const input of probeCases) {
	const jd = eph.julianDayUt(input);
	const check = swissHousesFromOwnTime(eph, jd, input.lat, input.lon);
	const fields = ['asc', 'mc'];
	let maxArcsec = 0;
	for (const field of fields) {
		const swissVal = field === 'asc' ? check.swiss.asc : check.swiss.mc;
		const formulaVal = field === 'asc' ? check.formula.asc : check.formula.mc;
		maxArcsec = Math.max(maxArcsec, arcsec(angDiff(formulaVal, swissVal)));
	}
	for (let i = 1; i <= 12; i += 1) {
		maxArcsec = Math.max(maxArcsec, arcsec(angDiff(check.formula.cusps[i], check.swiss.cusps[`House${i}`])));
	}
	formulaChecks.push({ loc: input.loc, jd, maxArcsec, status: maxArcsec < 2 ? 'FORMULA_MATCHES_SWISS' : 'FORMULA_MISMATCH' });
}
if (formulaChecks.some((row) => row.status !== 'FORMULA_MATCHES_SWISS')) {
	console.error(JSON.stringify(formulaChecks, null, 2));
	await eph.close();
	throw new Error('Regiomontanus formula does not match Swiss houses when given Swiss time');
}

const planetRows = [];
const houseRows = [];
const derivedRows = [];
const totals = {
	houseChanged: 0,
	aspectChanged: 0,
	aspectTypeChanged: 0,
	applyingChanged: 0,
	lotChanged: 0,
	receptionChanged: 0,
	parallelChanged: 0,
	syzygyChanged: 0,
	parsChanged: 0,
};

for (const input of cases()) {
	const jd = eph.julianDayUt(input);
	const when = dateFromJd(jd);
	const swissChart = eph.computeChart({ ...input, jd, hsysIndex: 2 });
	const aePlanets = {};
	for (const body of BODIES) {
		const ae = aePosition(body, when);
		const sw = swissChart.planets[body];
		aePlanets[body] = ae;
		for (const field of ['longitude', 'latitude', 'speed', 'declination']) {
			const deltaDeg = field === 'longitude' ? angDiff(ae[field], sw[field]) : ae[field] - sw[field];
			planetRows.push({
				field,
				date: `${input.date} ${input.time}`,
				location: input.loc,
				body,
				Swiss: sw[field],
				AstronomyEngine: ae[field],
				delta_arcsec: arcsec(deltaDeg),
				status: 'MEASURED',
			});
		}
		planetRows.push({
			field: 'retrograde',
			date: `${input.date} ${input.time}`,
			location: input.loc,
			body,
			Swiss: sw.retrograde,
			AstronomyEngine: ae.retrograde,
			delta_arcsec: sw.retrograde === ae.retrograde ? 0 : null,
			status: sw.retrograde === ae.retrograde ? 'SAME' : 'SIGN_CHANGED',
		});
	}
	for (const body of ['North Node', 'Dark Moon']) {
		planetRows.push({
			field: 'longitude',
			date: `${input.date} ${input.time}`,
			location: input.loc,
			body,
			Swiss: swissChart.planets[body] && swissChart.planets[body].longitude,
			AstronomyEngine: null,
			delta_arcsec: null,
			status: 'NOT_SUPPORTED',
		});
	}
	const aeHouse = aeHouses(when, input.lat, input.lon);
	const swHouse = swissChart.houses;
	const houseDelta = [];
	for (const [name, aeVal, swVal] of [['ASC', aeHouse.asc, swHouse.asc], ['MC', aeHouse.mc, swHouse.mc]]) {
		const delta = arcsec(angDiff(aeVal, swVal));
		houseDelta.push(delta);
		houseRows.push({
			field: name, date: `${input.date} ${input.time}`, location: input.loc,
			Swiss: swVal, AstronomyEngine: aeVal, delta_arcsec: delta,
			signChanged: signIndex(aeVal) !== signIndex(swVal),
			status: 'MEASURED',
		});
	}
	let houseChanged = 0;
	for (let i = 1; i <= 12; i += 1) {
		const aeVal = aeHouse.cusps[i];
		const swVal = swHouse.cusps[`House${i}`];
		const delta = arcsec(angDiff(aeVal, swVal));
		houseDelta.push(delta);
		const signChanged = signIndex(aeVal) !== signIndex(swVal);
		if (signChanged) houseChanged += 1;
		houseRows.push({
			field: `House${i}`, date: `${input.date} ${input.time}`, location: input.loc,
			Swiss: swVal, AstronomyEngine: aeVal, delta_arcsec: delta, signChanged, status: 'MEASURED',
		});
	}
	for (const body of BODIES) {
		const hSw = houseOf(swissChart.planets[body].longitude, Object.fromEntries([...Array(12)].map((_, n) => [n + 1, swHouse.cusps[`House${n + 1}`]])));
		const hAe = houseOf(aePlanets[body].longitude, aeHouse.cusps);
		if (hSw !== hAe) houseChanged += 1;
	}
	if (signIndex(aeHouse.asc) !== signIndex(swHouse.asc) || signIndex(aeHouse.mc) !== signIndex(swHouse.mc)) houseChanged += 1;

	const swissLon = (cursor, id) => eph.eclipticLongitude(cursor, id);
	const aeLon = (cursor, id) => aeEcliptic(id, dateFromJd(cursor)).longitude;
	const swSyzygy = syzygyFor(jd, swissLon, (cursor) => eph.positionAt(cursor, 'SE_MOON'));
	const aeSyzygy = syzygyFor(jd, aeLon, (cursor) => aePosition('Moon', dateFromJd(cursor)));
	const swModel = chartModel(swissChart.planets, {
		asc: swHouse.asc, mc: swHouse.mc,
		cusps: Object.fromEntries([...Array(12)].map((_, n) => [n + 1, swHouse.cusps[`House${n + 1}`]])),
	}, jd, swSyzygy, input.lat);
	const aeModel = chartModel(aePlanets, aeHouse, jd, aeSyzygy, input.lat);
	const swAspects = deriveAspects(swModel);
	const aeAspects = deriveAspects(aeModel);
	const aspect = compareAspects(swAspects, aeAspects);
	const swLots = lotMap(deriveLots(swModel));
	const aeLots = lotMap(deriveLots(aeModel));
	let lotChanged = 0;
	let parsChanged = 0;
	const lotDetail = {};
	for (const id of Object.keys(swLots)) {
		const left = swLots[id];
		const right = aeLots[id];
		const changed = !left || !right || left.status !== right.status
			|| (Number.isFinite(left.lon) && Number.isFinite(right.lon) && (signIndex(left.lon) !== signIndex(right.lon) || degreeInSign(left.lon) !== degreeInSign(right.lon)));
		if (changed) lotChanged += 1;
		if ((id === 'Pars Life' || id === 'Pars Radix') && changed) parsChanged += 1;
		if (id === 'Pars Life' || id === 'Pars Radix') {
			lotDetail[id] = {
				Swiss: left && left.lon,
				AstronomyEngine: right && right.lon,
				delta_arcsec: left && right && Number.isFinite(left.lon) && Number.isFinite(right.lon) ? arcsec(angDiff(right.lon, left.lon)) : null,
				status: changed ? 'USER_VISIBLE_CHANGE' : 'SAME_SIGN_AND_DEGREE',
			};
		}
	}
	const swRec = receptionKeys(deriveReception(swModel));
	const aeRec = receptionKeys(deriveReception(aeModel));
	const receptionChanged = symmetricCount(swRec, aeRec);
	const swPar = parallelKeys(deriveDeclParallel(swModel));
	const aePar = parallelKeys(deriveDeclParallel(aeModel));
	const parallelChanged = symmetricCount(swPar, aePar);
	const syzygyChanged = !swSyzygy || !aeSyzygy || swSyzygy.syzygyType !== aeSyzygy.syzygyType
		|| !Number.isFinite(swSyzygy.jd) || Math.abs(swSyzygy.jd - aeSyzygy.jd) > 1 / 1440
		|| (Number.isFinite(swSyzygy.longitude) && signIndex(swSyzygy.longitude) !== signIndex(aeSyzygy.longitude))
		? 1 : 0;
	totals.houseChanged += houseChanged;
	totals.aspectChanged += aspect.aspectChanged;
	totals.aspectTypeChanged += aspect.aspectTypeChanged;
	totals.applyingChanged += aspect.applyingChanged;
	totals.lotChanged += lotChanged;
	totals.receptionChanged += receptionChanged;
	totals.parallelChanged += parallelChanged;
	totals.syzygyChanged += syzygyChanged;
	totals.parsChanged += parsChanged;
	derivedRows.push({
		date: `${input.date} ${input.time}`,
		location: input.loc,
		jd,
		houseChanged,
		houseMaxArcsec: Math.max(...houseDelta),
		...aspect,
		lotChanged,
		receptionChanged,
		parallelChanged,
		syzygy: {
			Swiss: { type: swSyzygy.syzygyType, jd: swSyzygy.jd, longitude: swSyzygy.longitude },
			AstronomyEngine: { type: aeSyzygy.syzygyType, jd: aeSyzygy.jd, longitude: aeSyzygy.longitude },
			jdDeltaMinutes: Number.isFinite(swSyzygy.jd) && Number.isFinite(aeSyzygy.jd) ? (aeSyzygy.jd - swSyzygy.jd) * 1440 : null,
			longitudeDeltaArcsec: Number.isFinite(swSyzygy.longitude) && Number.isFinite(aeSyzygy.longitude) ? arcsec(angDiff(aeSyzygy.longitude, swSyzygy.longitude)) : null,
			changed: syzygyChanged,
		},
		pars: lotDetail,
	});
}

const siderealInput = civilToInput('1990-06-15', '10:30:00', LOCS[0]);
const siderealJd = eph.julianDayUt(siderealInput);
const siderealSwiss = eph.siderealReference({ ...siderealInput, jd: siderealJd });
const ayanamsa = eph.ayanamsaUt(siderealJd);
const siderealAeDate = dateFromJd(siderealJd);
const sidereal = {
	status: 'AYANAMSA_NOT_NATIVE',
	note: 'Astronomy Engine has no Lahiri mode. The Swiss Lahiri value is subtracted from Astronomy Engine tropical longitude. The sidereal delta therefore repeats the tropical delta.',
	ayanamsaSource: 'swiss-SE_SIDM_LAHIRI',
	ayanamsa,
	sunDeltaArcsec: arcsec(angDiff(degnorm(aeEcliptic('Sun', siderealAeDate).longitude - ayanamsa), siderealSwiss.sun.longitude)),
	moonDeltaArcsec: arcsec(angDiff(degnorm(aeEcliptic('Moon', siderealAeDate).longitude - ayanamsa), siderealSwiss.moon.longitude)),
};

function byField(field, body) {
	return stats(planetRows.filter((row) => row.field === field && row.status === 'MEASURED' && (!body || row.body === body)).map((row) => row.delta_arcsec));
}

const planetSummary = {
	longitude: byField('longitude'),
	latitude: byField('latitude'),
	speed: byField('speed'),
	declination: byField('declination'),
	moon: {
		longitude: byField('longitude', 'Moon'),
		latitude: byField('latitude', 'Moon'),
		speed: byField('speed', 'Moon'),
		declination: byField('declination', 'Moon'),
	},
	retrogradeSignChanges: planetRows.filter((row) => row.field === 'retrograde' && row.status === 'SIGN_CHANGED').length,
	notSupported: ['North Node', 'Dark Moon'],
};

const houseSummary = {
	ASC: stats(houseRows.filter((row) => row.field === 'ASC').map((row) => row.delta_arcsec)),
	MC: stats(houseRows.filter((row) => row.field === 'MC').map((row) => row.delta_arcsec)),
	cusps: stats(houseRows.filter((row) => row.field.startsWith('House')).map((row) => row.delta_arcsec)),
	signChanges: houseRows.filter((row) => row.signChanged).length,
	formulaChecks,
};

const perfCases = [];
for (let i = 0; i < 100; i += 1) {
	const day = 1 + (i % 28);
	const hour = i % 24;
	perfCases.push(civilToInput(
		`1990-06-${String(day).padStart(2, '0')}`,
		`${String(hour).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00`,
		LOCS[i % 4],
	));
}
function timeSwiss(list) {
	const t = performance.now();
	for (const input of list) eph.computeChart({ ...input, hsysIndex: 2 });
	return performance.now() - t;
}
function timeAe(list) {
	const instants = list.map((input) => ({ input, when: dateFromJd(eph.julianDayUt(input)) }));
	const t = performance.now();
	for (const item of instants) {
		for (const body of BODIES) aePosition(body, item.when);
		aeHouses(item.when, item.input.lat, item.input.lon);
	}
	return performance.now() - t;
}
const one = [perfCases[0]];
const ten = perfCases.slice(0, 10);
const hundred = perfCases.slice(0, 100);
const performanceReport = {
	swissInitMs: eph.initMs,
	astronomyEngineInitMs: 0,
	note: 'Astronomy Engine has no ephemeris-file init. Swiss time includes wasm calc_ut for 12 bodies plus houses. Astronomy Engine time includes 10 bodies, a 1-hour centered speed difference, declination, and Regiomontanus. Both use the same Swiss Julian day so the clock conversion is shared.',
	oneChartMs: { Swiss: timeSwiss(one), AstronomyEngine: timeAe(one) },
	repeatChartMs: { Swiss: timeSwiss(one), AstronomyEngine: timeAe(one) },
	tenChartsMs: { Swiss: timeSwiss(ten), AstronomyEngine: timeAe(ten) },
	hundredChartsMs: { Swiss: timeSwiss(hundred), AstronomyEngine: timeAe(hundred) },
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'planet-parity.json'), JSON.stringify({
	reference: 'browser-sweph-experiment',
	candidate: 'astronomy-engine@2.1.19',
	zodiac: 'Tropical',
	speedMethod: 'Astronomy Engine longitude at ±30 minutes, converted to degrees/day. delta_arcsec for speed is |Δ degrees/day| × 3600.',
	summary: planetSummary,
	sidereal,
	rows: planetRows,
}, null, 2));
fs.writeFileSync(path.join(outDir, 'house-parity.json'), JSON.stringify({
	system: 'Regiomontanus',
	sameInputs: 'same latitude, longitude, and Swiss Julian day',
	summary: houseSummary,
	rows: houseRows,
}, null, 2));
fs.writeFileSync(path.join(outDir, 'derived-parity.json'), JSON.stringify({
	algorithms: ['aspectsBrowser.js', 'lotsBrowser.js', 'receptionBrowser.js', 'declinationBrowser.js', 'syzygyBrowser.js'],
	nodeAndLilith: 'omitted from both derived charts because Astronomy Engine has no mean node or mean apogee',
	totals,
	charts: derivedRows.length,
	rows: derivedRows,
}, null, 2));
fs.writeFileSync(path.join(outDir, 'performance.json'), JSON.stringify(performanceReport, null, 2));
fs.writeFileSync(path.join(outDir, 'runtime.json'), JSON.stringify({
	node: {
		platform: process.platform,
		node: process.version,
		swissInitMs: eph.initMs,
		charts: derivedRows.length,
		formulaChecks,
	},
	browser: { status: 'PENDING_CHROME' },
}, null, 2));

console.log(JSON.stringify({
	charts: derivedRows.length,
	planetLongitude: planetSummary.longitude,
	moon: planetSummary.moon,
	houses: { ASC: houseSummary.ASC, MC: houseSummary.MC, signChanges: houseSummary.signChanges },
	totals,
	sidereal,
	performance: performanceReport,
	formulaChecks,
}, null, 2));
await eph.close();
