/**
 * Experimental Horosa-shaped chart JSON.
 * Uses browserEphemerisAdapter for JD, planets, and houses.
 * Does not replace POST /chart. Does not copy aspects, lots, or receptions.
 *
 * Legacy field map (HISTORICAL-GOLDEN → this JSON):
 *   chart.date.jd                         → jd
 *   chart.objects[id].lon                 → objects[id].lon
 *   chart.objects[id].lat                 → objects[id].lat
 *   chart.objects[id].lonspeed            → objects[id].lonspeed
 *   chart.objects[id].decl                → objects[id].decl
 *   lonspeed < 0                          → retrograde   (same sign test as production)
 *   chart.objects[id=Asc|MC|Desc|IC].lon  → ascmc[id].lon
 *   chart.houses[id=HouseN].lon           → houses.cusps[id].lon
 *   adapter longitude/latitude/speed/declination are renamed only to those Horosa keys.
 *   Dark Moon stays Dark Moon. North Node stays North Node.
 */
import { HOUSE_LETTERS } from './browserEphemerisAdapter.js';

export const ENGINE_VERSION = '0.1.0';

export const NOT_IMPLEMENTED = Object.freeze({
	aspects: 'NOT_IMPLEMENTED',
	lots: 'NOT_IMPLEMENTED',
	receptions: 'NOT_IMPLEMENTED',
	mutuals: 'NOT_IMPLEMENTED',
	fixedStars: 'NOT_IMPLEMENTED',
	nakshatras: 'NOT_IMPLEMENTED',
	declParallel: 'NOT_IMPLEMENTED',
	parans: 'NOT_IMPLEMENTED',
});

export class ChartBuilderError extends Error {
	constructor(code, message, input) {
		super(message);
		this.name = 'ChartBuilderError';
		this.code = code;
		this.input = input;
	}
}

function finite(value) {
	return typeof value === 'number' && Number.isFinite(value);
}

function requireFinite(value, code, message, input) {
	if (!finite(value)) throw new ChartBuilderError(code, message, input);
	return value;
}

/** Explicit fields only. No host timezone, DST database, or locale. */
export function normalizeAstrologyInput(raw) {
	const input = raw || {};
	const date = `${input.date || ''}`;
	const time = `${input.time || ''}`;
	const timezone = `${input.timezone || ''}`;
	const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
	const timeMatch = /^(\d{2}):(\d{2}):(\d{2})$/.exec(time);
	const zoneMatch = /^([+-])(\d{2}):(\d{2})$/.exec(timezone);
	if (!dateMatch || !timeMatch || !zoneMatch) {
		throw new ChartBuilderError('INVALID_DATE', 'date, time, and timezone must be explicit YYYY-MM-DD, HH:mm:ss, and ±HH:MM', input);
	}
	const latitude = input.latitude;
	const longitude = input.longitude;
	if (!finite(latitude) || latitude < -90 || latitude > 90 || !finite(longitude) || longitude < -180 || longitude > 180) {
		throw new ChartBuilderError('INVALID_COORDINATES', 'latitude must be -90..90 and longitude -180..180', input);
	}
	const houseSystem = input.houseSystem;
	if (!Number.isInteger(houseSystem) || !HOUSE_LETTERS[houseSystem]) {
		throw new ChartBuilderError('UNSUPPORTED_HOUSE', 'houseSystem is not an AstroConst.HOUSE_SYSTEM_OPTIONS index', input);
	}
	if (!HOUSE_LETTERS[houseSystem].letter) {
		throw new ChartBuilderError('UNSUPPORTED_HOUSE', `${HOUSE_LETTERS[houseSystem].name} has no Swiss letter`, input);
	}
	const zodiacalRaw = input.zodiacal;
	const tropical = zodiacalRaw === 'Tropical' || zodiacalRaw === 'tropical' || zodiacalRaw === 0;
	const sidereal = zodiacalRaw === 'Sidereal' || zodiacalRaw === 'sidereal' || zodiacalRaw === 1;
	if (!tropical && !sidereal) {
		throw new ChartBuilderError('UNSUPPORTED_ZODIAC', 'zodiacal must be Tropical or Sidereal', input);
	}
	const siderealAyanamsa = input.siderealAyanamsa == null ? '' : `${input.siderealAyanamsa}`;
	if (sidereal && siderealAyanamsa !== '' && siderealAyanamsa !== 'lahiri') {
		throw new ChartBuilderError('UNSUPPORTED_SIDEREAL', 'only lahiri is wired, and it is REFERENCE-ONLY', input);
	}
	const sign = zoneMatch[1] === '-' ? -1 : 1;
	const zoneOffsetHours = sign * (Number(zoneMatch[2]) + Number(zoneMatch[3]) / 60);
	return {
		date,
		time,
		timezone,
		year: Number(dateMatch[1]),
		month: Number(dateMatch[2]),
		day: Number(dateMatch[3]),
		hour: Number(timeMatch[1]),
		minute: Number(timeMatch[2]),
		second: Number(timeMatch[3]),
		zoneOffsetHours,
		latitude,
		longitude,
		zodiacal: tropical ? 'Tropical' : 'Sidereal',
		siderealAyanamsa,
		houseSystem,
		westNodeType: input.westNodeType === true,
		westLilithType: input.westLilithType === true,
	};
}

function planetObject(id, raw) {
	if (!raw) {
		throw new ChartBuilderError('EPHEMERIS_BODY_FAILED', `${id} was not calculated`, { id });
	}
	const lon = requireFinite(raw.longitude, 'EPHEMERIS_BODY_FAILED', `${id} longitude is not finite`, { id });
	const lat = requireFinite(raw.latitude, 'EPHEMERIS_BODY_FAILED', `${id} latitude is not finite`, { id });
	const lonspeed = requireFinite(raw.speed, 'EPHEMERIS_BODY_FAILED', `${id} speed is not finite`, { id });
	const decl = requireFinite(raw.declination, 'EPHEMERIS_BODY_FAILED', `${id} declination is not finite`, { id });
	return { id, lon, lat, lonspeed, decl, retrograde: lonspeed < 0 };
}

function angle(id, lon) {
	return { id, lon: requireFinite(lon, 'HOUSE_FAILED', `${id} is not finite`, { id }) };
}

function fromAdapter(eph, normalized) {
	let raw;
	try {
		raw = eph.computeChart({
			year: normalized.year,
			month: normalized.month,
			day: normalized.day,
			hour: normalized.hour,
			minute: normalized.minute,
			second: normalized.second,
			zoneOffsetHours: normalized.zoneOffsetHours,
			lat: normalized.latitude,
			lon: normalized.longitude,
			hsysIndex: normalized.houseSystem,
			nodeSwiss: normalized.westNodeType ? 'SE_TRUE_NODE' : 'SE_MEAN_NODE',
			lilithSwiss: normalized.westLilithType ? 'SE_OSCU_APOG' : 'SE_MEAN_APOG',
		});
	} catch (err) {
		throw new ChartBuilderError('EPHEMERIS_INIT_FAILED', err && err.message ? err.message : 'ephemeris calculation failed', normalized);
	}
	if (!raw || !finite(raw.jd)) {
		throw new ChartBuilderError('EPHEMERIS_INIT_FAILED', 'adapter did not return a Julian day', normalized);
	}
	if (!raw.houses || raw.houses.status !== 'COMPUTED') {
		throw new ChartBuilderError('UNSUPPORTED_HOUSE', 'Swiss did not return cusps for this house system', normalized);
	}
	const objects = {};
	for (const [id, body] of Object.entries(raw.planets)) objects[id] = planetObject(id, body);
	const cusps = {};
	for (let i = 1; i <= 12; i += 1) {
		const id = `House${i}`;
		cusps[id] = { id, lon: requireFinite(raw.houses.cusps[id], 'HOUSE_FAILED', `${id} cusp is not finite`, normalized) };
	}
	return {
		jd: raw.jd,
		objects,
		ascmc: {
			Asc: angle('Asc', raw.houses.asc),
			MC: angle('MC', raw.houses.mc),
			Desc: angle('Desc', raw.houses.dsc),
			IC: angle('IC', raw.houses.ic),
		},
		houses: {
			system: raw.houses.system,
			letter: raw.houses.letter,
			cusps,
		},
	};
}

function envelope(normalized, body, siderealStatus) {
	return {
		source: 'browser-sweph-experiment',
		engineVersion: ENGINE_VERSION,
		input: {
			date: normalized.date,
			time: normalized.time,
			timezone: normalized.timezone,
			latitude: normalized.latitude,
			longitude: normalized.longitude,
			zodiacal: normalized.zodiacal,
			siderealAyanamsa: normalized.siderealAyanamsa,
			houseSystem: normalized.houseSystem,
			westNodeType: normalized.westNodeType,
			westLilithType: normalized.westLilithType,
		},
		jd: body.jd,
		objects: body.objects,
		ascmc: body.ascmc,
		houses: body.houses,
		capability: NOT_IMPLEMENTED,
		meta: {
			source: 'browser',
			engine: 'swisseph-wasm',
			engineVersion: ENGINE_VERSION,
			goldenType: 'EXPERIMENTAL',
			legacyReference: 'HISTORICAL-GOLDEN',
			siderealStatus,
			license: 'LEGAL_REVIEW_REQUIRED',
		},
	};
}

/** Tropical chart. JD comes only from the adapter. */
export function buildChart(eph, rawInput) {
	const normalized = normalizeAstrologyInput(rawInput);
	if (normalized.zodiacal !== 'Tropical') {
		throw new ChartBuilderError('SIDEREAL_USE_REFERENCE', 'sidereal has no historical oracle; call buildSiderealReference', rawInput);
	}
	return envelope(normalized, fromAdapter(eph, normalized), 'TROPICAL');
}

/**
 * Lahiri sidereal Sun/Moon/ASC on the same adapter instance.
 * Not compared to HISTORICAL-GOLDEN.
 */
export function buildSiderealReference(eph, rawInput) {
	const normalized = normalizeAstrologyInput({ ...rawInput, zodiacal: 'Sidereal', siderealAyanamsa: rawInput.siderealAyanamsa || 'lahiri' });
	let ref;
	try {
		ref = eph.siderealReference({
			year: normalized.year,
			month: normalized.month,
			day: normalized.day,
			hour: normalized.hour,
			minute: normalized.minute,
			second: normalized.second,
			zoneOffsetHours: normalized.zoneOffsetHours,
			lat: normalized.latitude,
			lon: normalized.longitude,
		});
	} catch (err) {
		throw new ChartBuilderError('UNSUPPORTED_SIDEREAL', err && err.message ? err.message : 'sidereal reference failed', rawInput);
	}
	if (!ref || !ref.sun || !ref.moon || !finite(ref.asc) || !finite(ref.mc)) {
		throw new ChartBuilderError('UNSUPPORTED_SIDEREAL', 'sidereal reference did not return Sun, Moon, ASC, and MC', rawInput);
	}
	return {
		status: 'REFERENCE-ONLY',
		jd: ref.jd,
		ayanamsa: 'lahiri',
		sun: planetObject('Sun', ref.sun),
		moon: planetObject('Moon', ref.moon),
		asc: ref.asc,
		mc: ref.mc,
	};
}
