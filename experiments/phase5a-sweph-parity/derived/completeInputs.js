/**
 * Attach Syzygy and the declination bodies the derived layer can consume.
 * Ephemeris lookups stay on the adapter. Syzygy search math stays in syzygyBrowser.js.
 */
import { findSyzygy, syzygyFromMoon } from './syzygyBrowser.js';
import {
	EXTRA_SWISS_BODIES,
	angleDeclinations,
	parsFortunaDecl,
	purpleClouds,
	southNodeFromNorth,
} from './declinationInputs.js';

function swissBody(horosaId, position) {
	return {
		id: horosaId,
		lon: position.longitude,
		lat: position.latitude,
		lonspeed: position.speed,
		decl: position.declination,
		source: 'browserEphemerisAdapter positionAt: SEFLG_SWIEPH | SEFLG_SPEED, declination from SEFLG_EQUATORIAL',
		derivedFrom: ['JD'],
	};
}

export function completeChartInputs(eph, chart) {
	const found = findSyzygy(chart.jd, (jd, id) => eph.eclipticLongitude(jd, id));
	const moon = found.status === 'COMPUTED' ? eph.positionAt(found.jd, 'SE_MOON') : null;
	const syzygy = syzygyFromMoon(found, moon);
	const declinationBodies = {};
	for (const row of EXTRA_SWISS_BODIES) {
		const position = eph.positionAt(chart.jd, row.swiss);
		if (position && Number.isFinite(position.declination)) declinationBodies[row.horosaId] = swissBody(row.horosaId, position);
	}
	const north = chart.objects['North Node'];
	if (north) declinationBodies['South Node'] = southNodeFromNorth(north);
	declinationBodies['Purple Clouds'] = purpleClouds(chart.jd);
	const fortuna = parsFortunaDecl(chart);
	if (fortuna) declinationBodies['Pars Fortuna'] = fortuna;
	if (syzygy.status === 'COMPUTED') {
		declinationBodies.Syzygy = {
			id: 'Syzygy',
			lon: syzygy.longitude,
			lat: syzygy.latitude,
			lonspeed: syzygy.speed,
			decl: syzygy.declination,
			source: syzygy.source,
			derivedFrom: syzygy.derivedFrom,
		};
	}
	const raw = eph.rawHouses(chart.jd, chart.input.latitude, chart.input.longitude, chart.input.houseSystem);
	const angles = raw ? angleDeclinations(raw.ascmc, chart.input.latitude) : null;
	if (angles) Object.assign(declinationBodies, angles);
	return {
		...chart,
		inputs: { syzygy, declinationBodies },
	};
}
