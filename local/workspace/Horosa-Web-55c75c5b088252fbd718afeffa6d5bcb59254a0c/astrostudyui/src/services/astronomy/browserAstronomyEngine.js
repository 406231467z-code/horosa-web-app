// Production browser astrology.
// Ephemeris: Astronomy Engine 2.1.19 (MIT).
// Speed: one method on every body, including the mean node and mean Lilith.
//   method: centered ecliptic-longitude difference
//   interval: 30 minutes before and 30 minutes after
//   units: degrees per day
//   sign: speed < 0 is retrograde
// Declination of Sun–Pluto: Astronomy Engine GeoVector or GeoMoon,
//   rotated by Rotation_EQJ_EQD, then EquatorFromVector.dec.
// Declination of the mean node and mean Lilith: ecliptic latitude is 0,
//   converted with the true obliquity. Checked against the reference
//   equatorial declination to under 0.05 arcsec.
// Houses: swehouse.c CalcH. Indexes 1 Alcabitius, 2 Regiomontanus,
//   3 Placidus, 9 Porphyry. Other indexes are UNSUPPORTED.
// Sidereal longitudes use a caller-provided numeric ayanamsa.
//   A named ayanamsa is UNSUPPORTED. Lahiri is not assumed.

import * as Astronomy from 'astronomy-engine';
import { housesForIndex, degnorm } from './horosaHouses.js';
import {
	meanNodeLongitude,
	meanLilithLongitude,
	eclipticDeclination,
} from './horosaMeanElements.js';
import { completeChartInputs } from '../../../../../../../experiments/phase5a-sweph-parity/derived/completeInputs.js';
import { deriveExperimentalChart } from '../../../../../../../experiments/phase5a-sweph-parity/derived/chartV2.js';
import { deriveMansionChart } from '../../../../../../../experiments/phase5a-sweph-parity/derived/mansionChart.js';
import { fillLots, signOf } from '../../../../../../../experiments/phase5a-sweph-parity/productionRules.js';
import { isDiurnalChart } from '../../../../../../../experiments/phase5a-sweph-parity/derived/diurnalBrowser.js';
import { purpleClouds, southNodeFromNorth } from '../../../../../../../experiments/phase5a-sweph-parity/derived/declinationInputs.js';

export const SPEED_METHOD = {
	method: 'centered-longitude-difference',
	intervalMinutes: 30,
	units: 'degrees/day',
	signConvention: 'speed < 0 is retrograde',
};

const PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const AE_BODY = {
	Sun: Astronomy.Body.Sun,
	Mercury: Astronomy.Body.Mercury,
	Venus: Astronomy.Body.Venus,
	Mars: Astronomy.Body.Mars,
	Jupiter: Astronomy.Body.Jupiter,
	Saturn: Astronomy.Body.Saturn,
	Uranus: Astronomy.Body.Uranus,
	Neptune: Astronomy.Body.Neptune,
	Pluto: Astronomy.Body.Pluto,
};

const SUPPORTED_HOUSES = {
	1: 'Alcabitius',
	2: 'Regiomontanus',
	3: 'Placidus',
	9: 'Porphyry',
};

function fail(code, message, capability) {
	const err = new Error(message);
	err.name = 'AstrologyCalculationError';
	err.code = code;
	err.capability = capability;
	err.provider = 'browser';
	return err;
}

function angDiff(a, b) {
	let d = a - b;
	d = ((d + 180) % 360 + 360) % 360 - 180;
	return d;
}

function finiteNumber(value) {
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(n) ? n : null;
}

// Same degree+minute rule as AstroHelper.convertLatStrToDegree / convertLonStrToDegree.
// The chart form stores display strings such as 26n04 and 119e19, plus gpsLat/gpsLon.
function horosaSignedDegree(text, positiveMark, negativeMark) {
	const str = `${text == null ? '' : text}`.toLowerCase().trim();
	if (!str) return null;
	let positive = 1;
	let parts = str.split(positiveMark);
	if (parts.length === 1) {
		parts = str.split(negativeMark);
		positive = -1;
	}
	if (parts.length < 2 || parts[0] === '' || parts[1] === '') return null;
	const deg = parseInt(parts[0], 10);
	const min = parseInt(parts[1], 10);
	if (!Number.isFinite(deg) || !Number.isFinite(min)) return null;
	return (deg + min / 60) * positive;
}

function readLatitude(raw) {
	const primary = raw.latitude != null ? raw.latitude : raw.lat;
	if (typeof primary === 'number' && Number.isFinite(primary)) return primary;
	if (typeof raw.gpsLat === 'number' && Number.isFinite(raw.gpsLat)) return raw.gpsLat;
	const parsed = horosaSignedDegree(primary, 'n', 's');
	if (parsed != null) return parsed;
	return finiteNumber(primary);
}

function readLongitude(raw) {
	const primary = raw.longitude != null ? raw.longitude : raw.lon;
	if (typeof primary === 'number' && Number.isFinite(primary)) return primary;
	if (typeof raw.gpsLon === 'number' && Number.isFinite(raw.gpsLon)) return raw.gpsLon;
	// "119e19" is east 119°19′, not scientific notation 1.19e21.
	const parsed = horosaSignedDegree(primary, 'e', 'w');
	if (parsed != null) return parsed;
	return finiteNumber(primary);
}

function parseZoneMinutes(zone) {
	if (typeof zone === 'number' && Number.isFinite(zone)) return zone * 60;
	const text = `${zone == null ? '' : zone}`.trim();
	const match = /^([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(text);
	if (!match) return null;
	const sign = match[1] === '-' ? -1 : 1;
	return sign * (Number(match[2]) * 60 + Number(match[3] || 0));
}

function normalizeInput(raw) {
	if (!raw || typeof raw !== 'object') throw fail('INVALID_INPUT', 'chart input is required', 'input');
	const date = `${raw.date || ''}`.trim().replace(/\//g, '-');
	const time = `${raw.time || ''}`.trim();
	const zoneMinutes = parseZoneMinutes(raw.timezone != null ? raw.timezone : raw.zone);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(?::\d{2})?$/.test(time) || zoneMinutes == null) {
		throw fail('INVALID_INPUT', 'date, time, and timezone are required', 'input');
	}
	const latitude = readLatitude(raw);
	const longitude = readLongitude(raw);
	if (latitude == null || longitude == null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
		throw fail('INVALID_INPUT', 'latitude and longitude are required', 'input');
	}
	const zodiacRaw = raw.zodiacal == null ? 0 : raw.zodiacal;
	let zodiacal;
	if (zodiacRaw === 0 || zodiacRaw === '0' || zodiacRaw === 'Tropical' || zodiacRaw === 'tropical') zodiacal = 'Tropical';
	else if (zodiacRaw === 1 || zodiacRaw === '1' || zodiacRaw === 'Sidereal' || zodiacRaw === 'sidereal') zodiacal = 'Sidereal';
	else throw fail('UNSUPPORTED', 'zodiacal must be Tropical or Sidereal', 'zodiacal');
	const houseSystem = Number(raw.houseSystem != null ? raw.houseSystem : raw.hsys);
	if (!Number.isInteger(houseSystem) || !SUPPORTED_HOUSES[houseSystem]) {
		throw fail('UNSUPPORTED', `house system ${raw.houseSystem != null ? raw.houseSystem : raw.hsys} is not available in the browser engine`, 'houses');
	}
	if (raw.westNodeType === true || raw.westNodeType === 'true' || raw.guolaoNodeType === 'true') {
		throw fail('UNSUPPORTED', 'true lunar node is not the Horosa mean node', 'node');
	}
	if (raw.westLilithType === true || raw.westLilithType === 'true' || raw.guolaoLilithType === 'true') {
		throw fail('UNSUPPORTED', 'osculating apogee is not the Horosa mean Lilith', 'lilith');
	}
	let ayanamsa = null;
	if (zodiacal === 'Sidereal') {
		const rawAyan = raw.siderealAyanamsa;
		ayanamsa = finiteNumber(rawAyan);
		if (ayanamsa == null) {
			throw fail('UNSUPPORTED', 'sidereal charts need a caller-provided numeric ayanamsa', 'siderealAyanamsa');
		}
	}
	const [year, month, day] = date.split('-').map(Number);
	const timeParts = time.split(':').map(Number);
	const utc = new Date(Date.UTC(year, month - 1, day, timeParts[0], timeParts[1], timeParts[2] || 0) - zoneMinutes * 60000);
	return {
		date,
		time: timeParts.length === 2 ? `${time}:00` : time,
		zoneMinutes,
		timezone: raw.timezone || raw.zone,
		latitude,
		longitude,
		zodiacal,
		ayanamsa,
		houseSystem,
		houseName: SUPPORTED_HOUSES[houseSystem],
		utc,
		doubingSu28: raw.doubingSu28 == null ? 0 : Number(raw.doubingSu28),
		raw,
	};
}

function eclipticOf(name, date) {
	if (name === 'Moon') {
		const moon = Astronomy.EclipticGeoMoon(date);
		return { longitude: degnorm(moon.lon), latitude: moon.lat };
	}
	const vec = Astronomy.GeoVector(AE_BODY[name], date, true);
	const ecl = Astronomy.Ecliptic(vec);
	return { longitude: degnorm(ecl.elon), latitude: ecl.elat };
}

function declinationOf(name, date) {
	const vec = name === 'Moon' ? Astronomy.GeoMoon(date) : Astronomy.GeoVector(AE_BODY[name], date, true);
	const eqd = Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(date), vec);
	return Astronomy.EquatorFromVector(eqd).dec;
}

function planetAt(name, date) {
	const ecl = eclipticOf(name, date);
	const before = eclipticOf(name, new Date(date.getTime() - 1800000));
	const after = eclipticOf(name, new Date(date.getTime() + 1800000));
	const speed = angDiff(after.longitude, before.longitude) * 24;
	return {
		longitude: ecl.longitude,
		latitude: ecl.latitude,
		speed,
		declination: declinationOf(name, date),
		retrograde: speed < 0,
	};
}

function elementAt(date, longitudeOf) {
	const at = (when) => {
		const time = Astronomy.MakeTime(when);
		return longitudeOf(2451545 + time.tt, Astronomy.e_tilt(time).dpsi);
	};
	const lon = at(date);
	const speed = angDiff(at(new Date(date.getTime() + 1800000)), at(new Date(date.getTime() - 1800000))) * 24;
	const obl = Astronomy.e_tilt(Astronomy.MakeTime(date)).tobl;
	return {
		longitude: lon,
		latitude: 0,
		speed,
		declination: eclipticDeclination(lon, 0, obl),
		retrograde: speed < 0,
	};
}

function bodyRecord(id, position) {
	return {
		id,
		lon: position.longitude,
		lat: position.latitude,
		lonspeed: position.speed,
		decl: position.declination,
		retrograde: position.retrograde,
	};
}

function shiftLon(value, ayanamsa) {
	return ayanamsa == null ? value : degnorm(value - ayanamsa);
}

function houseIndexOf(lon, cusps) {
	for (let i = 1; i <= 12; i += 1) {
		const start = cusps[i];
		const end = cusps[i === 12 ? 1 : i + 1];
		const span = degnorm(end - start);
		if (span > 0 && degnorm(lon - start) < span) return i;
	}
	return null;
}

function adapterFor(input) {
	return {
		eclipticLongitude(jd, id) {
			const date = new Date((jd - 2440587.5) * 86400000);
			if (id !== 'Sun' && id !== 'Moon') return null;
			return eclipticOf(id, date).longitude;
		},
		positionAt(jd, swissName) {
			if (swissName !== 'SE_MOON') return null;
			const date = new Date((jd - 2440587.5) * 86400000);
			const p = planetAt('Moon', date);
			return { longitude: p.longitude, latitude: p.latitude, speed: p.speed, declination: p.declination };
		},
		rawHouses() {
			return null;
		},
	};
}

export function calculateBrowserChart(raw) {
	const input = normalizeInput(raw);
	const objects = {};
	for (const name of PLANETS) objects[name] = bodyRecord(name, planetAt(name, input.utc));
	objects['North Node'] = bodyRecord('North Node', elementAt(input.utc, meanNodeLongitude));
	objects['Dark Moon'] = bodyRecord('Dark Moon', elementAt(input.utc, meanLilithLongitude));

	const time = Astronomy.MakeTime(input.utc);
	const gastHours = Astronomy.SiderealTime(input.utc);
	const obliquity = Astronomy.e_tilt(time).tobl;
	const armc = degnorm(gastHours * 15 + input.longitude);
	const built = housesForIndex(input.houseSystem, armc, input.latitude, obliquity);
	if (!built) throw fail('UNSUPPORTED', `house system ${input.houseSystem} is not available`, 'houses');

	if (input.ayanamsa != null) {
		for (const obj of Object.values(objects)) obj.lon = shiftLon(obj.lon, input.ayanamsa);
		for (let i = 1; i <= 12; i += 1) built.cusps[i] = shiftLon(built.cusps[i], input.ayanamsa);
		built.asc = built.cusps[1];
		built.mc = built.cusps[10];
	}

	const cusps = {};
	for (let i = 1; i <= 12; i += 1) cusps[`House${i}`] = { id: `House${i}`, lon: built.cusps[i] };
	const jd = time.tt + 2451545;
	let chart = {
		jd,
		input: {
			latitude: input.latitude,
			longitude: input.longitude,
			houseSystem: input.houseSystem,
		},
		objects,
		ascmc: {
			Asc: { id: 'Asc', lon: built.asc },
			MC: { id: 'MC', lon: built.mc },
			Desc: { id: 'Desc', lon: degnorm(built.asc + 180) },
			IC: { id: 'IC', lon: degnorm(built.mc + 180) },
		},
		houses: {
			system: built.system,
			letter: { 1: 'B', 2: 'R', 3: 'P', 9: 'O' }[input.houseSystem],
			cusps,
		},
	};
	chart = completeChartInputs(adapterFor(input), chart);
	if (input.ayanamsa != null && chart.inputs && chart.inputs.syzygy && Number.isFinite(chart.inputs.syzygy.longitude)) {
		chart.inputs.syzygy = {
			...chart.inputs.syzygy,
			longitude: shiftLon(chart.inputs.syzygy.longitude, input.ayanamsa),
			zodiac: 'sidereal',
		};
	}
	const v2 = deriveExperimentalChart(chart);
	const mansion = deriveMansionChart(chart, { mode: input.doubingSu28 });
	return toHorosaResult(chart, v2, mansion, input, built);
}

function reflectedPoint(lon, axis) {
	const reflected = degnorm(axis - lon);
	return {
		lon: reflected,
		sign: signOf(reflected),
		signlon: reflected % 30,
	};
}

// Astronomy Engine azimuth is clockwise from north. The planet panel's
// getAzimuthStr treats 0 as south and increases toward west.
function horizonFields(date, latitude, longitude, eclLon, eclLat) {
	const time = Astronomy.MakeTime(date);
	const ecl = Astronomy.VectorFromSphere(new Astronomy.Spherical(eclLat || 0, degnorm(eclLon), 1), time);
	const eq = Astronomy.EquatorFromVector(Astronomy.RotateVector(Astronomy.Rotation_ECL_EQD(time), ecl));
	const observer = new Astronomy.Observer(latitude, longitude, 0);
	const geometric = Astronomy.Horizon(date, observer, eq.ra, eq.dec, null);
	const apparent = Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal');
	return {
		altitudeTrue: geometric.altitude,
		altitudeAppa: apparent.altitude,
		azimuth: degnorm(geometric.azimuth - 180),
	};
}

function houseKeyFromIndex(index) {
	if (index == null || index === '') return null;
	if (typeof index === 'string') return index;
	const n = Number(index);
	if (!Number.isFinite(n) || n < 1 || n > 12) return null;
	return `House${n}`;
}

function toHorosaResult(chart, v2, mansion, input, built) {
	const derived = (v2 && v2.derived) || {};
	const mansionDerived = (mansion && mansion.derived) || {};
	const su28Result = mansionDerived.su28;
	const su28Entries = su28Result && Array.isArray(su28Result.entries) ? su28Result.entries : [];
	const uiObjects = [];
	const push = (obj) => {
		if (!obj || !Number.isFinite(obj.lon)) return;
		const tropicalLon = input.ayanamsa == null ? obj.lon : degnorm(obj.lon + input.ayanamsa);
		const hor = horizonFields(input.utc, input.latitude, input.longitude, tropicalLon, Number.isFinite(obj.lat) ? obj.lat : 0);
		const speed = Number.isFinite(obj.lonspeed) ? obj.lonspeed : 0;
		uiObjects.push({
			id: obj.id,
			lon: obj.lon,
			lat: Number.isFinite(obj.lat) ? obj.lat : 0,
			lonspeed: speed,
			meanSpeed: speed,
			decl: obj.decl,
			retrograde: obj.lonspeed < 0,
			sign: signOf(obj.lon),
			signlon: degnorm(obj.lon) % 30,
			house: houseKeyFromIndex(houseIndexOf(obj.lon, built.cusps)),
			altitudeTrue: hor.altitudeTrue,
			altitudeAppa: hor.altitudeAppa,
			azimuth: hor.azimuth,
			// Same reflection as divination/horary/antisciaTable.js.
			antisciaPoint: reflectedPoint(obj.lon, 180),
			cantisciaPoint: reflectedPoint(obj.lon, 0),
		});
	};
	for (const obj of Object.values(chart.objects)) push(obj);
	for (const ang of Object.values(chart.ascmc)) push({ ...ang, lat: 0, lonspeed: 0 });
	const north = chart.objects['North Node'];
	if (north) push(southNodeFromNorth(north));
	push(purpleClouds(chart.jd));
	const day = isDiurnalChart(chart);
	if (day.status === 'COMPUTED') {
		const bodies = new Map();
		for (const obj of Object.values(chart.objects)) bodies.set(obj.id, obj);
		bodies.set('Asc', chart.ascmc.Asc);
		const [fortuna] = fillLots(bodies, day.diurnal, ['Pars Fortuna']);
		if (fortuna && Number.isFinite(fortuna.lon)) push({ id: 'Pars Fortuna', lon: fortuna.lon, lat: 0, lonspeed: 0 });
	}
	const syzygy = derived.syzygy;
	if (syzygy && syzygy.status === 'COMPUTED' && Number.isFinite(syzygy.longitude)) {
		push({
			id: 'Syzygy',
			lon: syzygy.longitude,
			lat: syzygy.latitude,
			lonspeed: syzygy.speed,
			decl: syzygy.declination,
		});
	}
	const lotItems = (derived.lots && derived.lots.items) || [];
	const houses = [];
	for (let i = 1; i <= 12; i += 1) {
		const lon = built.cusps[i];
		houses.push({ id: `House${i}`, lon, sign: signOf(lon), signlon: degnorm(lon) % 30 });
	}
	return {
		params: { ...(input.raw || {}) },
		chart: {
			objects: uiObjects,
			houses,
			stars: [],
			fixedStarSu28: su28Entries,
			orientOccident: {},
		},
		aspects: {
			normalAsp: derived.aspects && derived.aspects.normalAsp,
			signAsp: derived.aspects && derived.aspects.signAsp,
			immediateAsp: derived.aspects && derived.aspects.immediateAsp,
			status: derived.aspects && derived.aspects.status,
		},
		lots: lotItems
			.filter((item) => item && Number.isFinite(item.lon))
			.map((item) => ({
				...item,
				sign: item.sign || signOf(item.lon),
				signlon: Number.isFinite(item.signlon) ? item.signlon : degnorm(item.lon) % 30,
				house: houseKeyFromIndex(item.house != null ? item.house : houseIndexOf(item.lon, built.cusps)),
			})),
		predictives: { primaryDirection: [] },
		receptions: derived.receptions,
		mutuals: derived.mutuals,
		declParallel: derived.declParallel,
		syzygy,
		nakshatras: mansionDerived.nakshatras,
		guoStarSect: mansionDerived.guoStarSect || { houses: [] },
		su28: mansionDerived.su28,
		fixedStars: { status: 'LICENSE_BLOCKED', productionReady: false },
		fixedStarsCapability: mansionDerived.fixedStarsCapability || { status: 'LICENSE_BLOCKED', productionReady: false, source: 'Swiss fixed-star catalog' },
		qizheng: mansionDerived.qizheng || { status: 'LICENSE_BLOCKED', productionReady: false },
		parans: { status: 'NOT_IMPLEMENTED' },
		meta: {
			provider: 'browser',
			engine: 'astronomy-engine',
			engineVersion: '2.1.19',
			license: 'MIT',
			productionReady: true,
			legalReviewRequired: true,
			zodiacal: input.zodiacal,
			ayanamsa: input.ayanamsa,
			houseSystem: input.houseName,
			houseFallback: built.fallback,
			speed: SPEED_METHOD,
			jd: chart.jd,
			objectIds: { Node: 'North Node', Lilith: 'Dark Moon' },
		},
	};
}
