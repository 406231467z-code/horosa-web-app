/**
 * Declination inputs that Horosa already defines and this chart did not carry.
 * Planet declination stays on the Swiss equatorial call. These are the other points.
 */
import { fillLots, norm } from '../productionRules.js';
import { chartBodies } from './chartBodies.js';
import { cotrans, eqCoords, isDiurnalChart } from './diurnalBrowser.js';

export const EXTRA_SWISS_BODIES = [
	{ horosaId: 'Chiron', swiss: 'SE_CHIRON', body: 15 },
	{ horosaId: 'Pholus', swiss: 'SE_PHOLUS', body: 16 },
	{ horosaId: 'Ceres', swiss: 'SE_CERES', body: 17 },
	{ horosaId: 'Pallas', swiss: 'SE_PALLAS', body: 18 },
	{ horosaId: 'Juno', swiss: 'SE_JUNO', body: 19 },
	{ horosaId: 'Vesta', swiss: 'SE_VESTA', body: 20 },
	{ horosaId: 'Intp_Apog', swiss: 'SE_INTP_APOG', body: 21 },
	{ horosaId: 'Intp_Perg', swiss: 'SE_INTP_PERG', body: 22 },
];

export function southNodeFromNorth(north) {
	return {
		id: 'South Node',
		lon: norm(north.lon + 180),
		lat: north.lat,
		lonspeed: north.lonspeed,
		decl: north.decl,
		source: 'flatlib/ephem/eph.py SOUTH_NODE: north-node position, longitude and RA +180, declination unchanged',
		derivedFrom: ['North Node'],
	};
}

export function purpleClouds(jd) {
	let lon = (188.6849 + 360 * (jd - 2451543.5) / 10226.78132) % 360;
	if (lon < 0) lon += 360;
	const eq = eqCoords(lon, 0);
	return {
		id: 'Purple Clouds',
		lon,
		lat: 0,
		lonspeed: 0,
		decl: eq.decl,
		source: 'flatlib/ephem/tools.py pcLon; declination from eph.py eqCoords(lon, 0)',
		derivedFrom: ['JD'],
	};
}

export function parsFortunaDecl(chart) {
	const day = isDiurnalChart(chart);
	if (day.status !== 'COMPUTED') return null;
	const bodies = chartBodies(chart);
	const [row] = fillLots(bodies, day.diurnal, ['Pars Fortuna']);
	if (!row || row.missing) return null;
	const eq = eqCoords(row.lon, 0);
	return {
		id: 'Pars Fortuna',
		lon: row.lon,
		lat: 0,
		lonspeed: 0,
		decl: eq.decl,
		source: 'flatlib/ephem/eph.py PARS_FORTUNA via pfLon; declination from eqCoords(lon, 0)',
		derivedFrom: ['Sun', 'Moon', 'Asc'],
	};
}

/** Angle declinations from flatlib/ephem/swe.py sweHouses. ASC declination is the geographic latitude. */
export function angleDeclinations(ascmc, geoLat) {
	if (!ascmc || !Number.isFinite(ascmc[0]) || !Number.isFinite(ascmc[1]) || !Number.isFinite(ascmc[4]) || !Number.isFinite(geoLat)) {
		return null;
	}
	const ascLon = ascmc[0];
	const mcLon = ascmc[1];
	const ascEclip = cotrans(ascmc[4], geoLat, 23.44);
	const descLon = norm(ascLon + 180);
	const icLon = norm(mcLon + 180);
	const desc = cotrans(descLon, ascEclip.lat, -23.44);
	const mc = cotrans(mcLon, ascEclip.lat, -23.44);
	const ic = cotrans(icLon, ascEclip.lat, -23.44);
	const source = 'flatlib/ephem/swe.py sweHouses';
	return {
		Asc: { id: 'Asc', lon: ascLon, lat: ascEclip.lat, decl: geoLat, source, derivedFrom: ['geographic latitude'] },
		Desc: { id: 'Desc', lon: descLon, lat: ascEclip.lat, decl: desc.lat, source, derivedFrom: ['Asc', 'ascmc[4]'] },
		MC: { id: 'MC', lon: mcLon, lat: ascEclip.lat, decl: mc.lat, source, derivedFrom: ['MC', 'ascmc[4]'] },
		IC: { id: 'IC', lon: icLon, lat: ascEclip.lat, decl: ic.lat, source, derivedFrom: ['MC', 'ascmc[4]'] },
	};
}
