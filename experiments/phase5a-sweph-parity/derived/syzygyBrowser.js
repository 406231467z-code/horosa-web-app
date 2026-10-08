/**
 * Previous syzygy, from flatlib/ephem/tools.py syzygyJD and eph.py getObject(SYZYGY).
 *
 * The current Moon−Sun elongation only chooses the type:
 * elongation < 180° → previous conjunction (new moon);
 * elongation >= 180° → previous opposition (full moon).
 * The stored longitude is the Moon at that earlier JD, tropical.
 * This file does not call the ephemeris. The caller supplies ecliptic longitudes,
 * because the exact degree is not on the current chart.
 */
import { closest, norm } from '../productionRules.js';

export const SYZYGY_RULE_SOURCE = 'flatlib/ephem/tools.py syzygyJD + flatlib/ephem/eph.py getObject(SYZYGY)';
const MAX_ERROR = 0.0003;
const MOON_MEAN_MOTION = 13.1833;

export function findSyzygy(jd, longitudeOf) {
	let sun = longitudeOf(jd, 'Sun');
	let moon = longitudeOf(jd, 'Moon');
	if (!Number.isFinite(sun) || !Number.isFinite(moon)) {
		return { status: 'MISSING_INPUT', source: SYZYGY_RULE_SOURCE, reason: 'Sun or Moon longitude missing' };
	}
	let dist = norm(moon - sun);
	const offset = dist >= 180 ? 180 : 0;
	let cursor = jd;
	let guard = 0;
	while (Math.abs(dist) > MAX_ERROR && guard < 40) {
		cursor -= dist / MOON_MEAN_MOTION;
		sun = longitudeOf(cursor, 'Sun');
		moon = longitudeOf(cursor, 'Moon');
		if (!Number.isFinite(sun) || !Number.isFinite(moon)) {
			return { status: 'MISSING_INPUT', source: SYZYGY_RULE_SOURCE, reason: 'longitude lookup failed during the syzygy search' };
		}
		dist = closest(sun - offset, moon);
		guard += 1;
	}
	if (Math.abs(dist) > MAX_ERROR) {
		return { status: 'MISSING_INPUT', source: SYZYGY_RULE_SOURCE, reason: 'syzygy search did not converge' };
	}
	return {
		status: 'COMPUTED',
		jd: cursor,
		offset,
		syzygyType: offset === 0 ? 'new-moon' : 'full-moon',
		separation: dist,
	};
}

export function syzygyFromMoon(found, moon) {
	if (!found || found.status !== 'COMPUTED' || !moon || !Number.isFinite(moon.longitude)) {
		return {
			status: 'MISSING_INPUT',
			source: SYZYGY_RULE_SOURCE,
			derivedFrom: ['Sun', 'Moon', 'JD'],
			zodiac: 'tropical',
			direction: 'previous',
		};
	}
	return {
		status: 'COMPUTED',
		source: SYZYGY_RULE_SOURCE,
		formula: 'previous new moon when Moon is less than 180° ahead of the Sun, otherwise previous full moon; longitude is the Moon at that JD',
		syzygyType: found.syzygyType,
		jd: found.jd,
		longitude: moon.longitude,
		latitude: moon.latitude,
		speed: moon.speed,
		declination: moon.declination,
		derivedFrom: ['Sun', 'Moon', 'JD'],
		zodiac: 'tropical',
		direction: 'previous',
		input: ['chart JD', 'tropical Sun longitude', 'tropical Moon longitude'],
	};
}

export function readSyzygy(chart) {
	const found = chart && chart.inputs && chart.inputs.syzygy;
	if (found && found.status === 'COMPUTED' && Number.isFinite(found.longitude)) return found;
	return {
		status: 'MISSING_INPUT',
		source: SYZYGY_RULE_SOURCE,
		derivedFrom: ['Sun', 'Moon', 'JD'],
		zodiac: 'tropical',
		direction: 'previous',
	};
}
