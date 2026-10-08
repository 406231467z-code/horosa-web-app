/**
 * Maps a chart request onto the browser builder input.
 * Does not modify chartRequest.js.
 */
import { astrologyError } from './astrologyError.js';

function finite(value) {
	return typeof value === 'number' && Number.isFinite(value);
}

function sexagesimal(text) {
	const match = /^(\d+(?:\.\d+)?)([nsew])(\d+(?:\.\d+)?)?$/i.exec(`${text || ''}`.trim());
	if (!match) return null;
	const degrees = Number(match[1]) + (match[3] ? Number(match[3]) / 60 : 0);
	const hemi = match[2].toLowerCase();
	return (hemi === 's' || hemi === 'w') ? -degrees : degrees;
}

function coordinate(raw, key, textKey, kind) {
	if (finite(raw[key])) return raw[key];
	if (finite(raw[textKey])) return raw[textKey];
	const parsed = sexagesimal(raw[textKey]);
	if (parsed == null) {
		throw astrologyError('MISSING_INPUT', `${kind} is missing`, 'input', 'browser');
	}
	return parsed;
}

function zodiacalOf(value) {
	if (value === 0 || value === '0' || value === 'Tropical' || value === 'tropical') return 'Tropical';
	if (value === 1 || value === '1' || value === 'Sidereal' || value === 'sidereal') return 'Sidereal';
	throw astrologyError('UNSUPPORTED', 'zodiacal must be Tropical or Sidereal', 'zodiacal', 'browser');
}

export function adaptBrowserInput(raw) {
	if (!raw || typeof raw !== 'object') {
		throw astrologyError('MISSING_INPUT', 'chart input is required', 'input', 'browser');
	}
	const date = `${raw.date || ''}`.trim().replace(/\//g, '-');
	const time = `${raw.time || ''}`.trim();
	const timezone = `${raw.timezone || raw.zone || ''}`.trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}:\d{2}$/.test(time) || !/^[+-]\d{2}:\d{2}$/.test(timezone)) {
		throw astrologyError('MISSING_INPUT', 'date, time, and timezone are required', 'input', 'browser');
	}
	const houseRaw = raw.houseSystem != null ? raw.houseSystem : raw.hsys;
	const houseSystem = Number(houseRaw);
	if (!Number.isInteger(houseSystem)) {
		throw astrologyError('MISSING_INPUT', 'houseSystem is required', 'houses', 'browser');
	}
	return {
		date,
		time,
		timezone,
		latitude: coordinate(raw, 'latitude', 'lat', 'latitude'),
		longitude: coordinate(raw, 'longitude', 'lon', 'longitude'),
		zodiacal: zodiacalOf(raw.zodiacal == null ? 'Tropical' : raw.zodiacal),
		siderealAyanamsa: raw.siderealAyanamsa == null ? '' : `${raw.siderealAyanamsa}`,
		houseSystem,
		westNodeType: raw.westNodeType === true || raw.westNodeType === 'true',
		westLilithType: raw.westLilithType === true || raw.westLilithType === 'true',
		doubingSu28: raw.doubingSu28 == null ? 0 : Number(raw.doubingSu28),
	};
}
