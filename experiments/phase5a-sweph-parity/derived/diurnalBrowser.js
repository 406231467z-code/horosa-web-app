/**
 * Day/night from flatlib chart.isDiurnal.
 * eqCoords is swisseph.cotrans([lon, lat, 1], const.ECLI2EQ_OBLIQUITY = -23.44).
 * This is a coordinate rotation of chart longitudes, not a second ephemeris call.
 */
import { closest } from '../productionRules.js';

const OBLIQUITY_ECLI2EQ = -23.44;
const DEG = Math.PI / 180;

function ascdiff(decl, lat) {
	const x = Math.tan(decl * DEG) * Math.tan(lat * DEG);
	if (x >= 1) return 90;
	if (x <= -1) return -90;
	return Math.asin(x) / DEG;
}

/** Swiss swe_cotrans. eps -23.44 is ecliptic to equator; +23.44 is the reverse. */
export function cotrans(lon, lat, epsDeg) {
	const eps = epsDeg * DEG;
	const lonR = lon * DEG;
	const latR = lat * DEG;
	const x = Math.cos(latR) * Math.cos(lonR);
	const y = Math.cos(latR) * Math.sin(lonR);
	const z = Math.sin(latR);
	const se = Math.sin(eps);
	const ce = Math.cos(eps);
	const y2 = y * ce + z * se;
	const z2 = -y * se + z * ce;
	let outLon = Math.atan2(y2, x) / DEG;
	if (outLon < 0) outLon += 360;
	const outLat = Math.atan2(z2, Math.hypot(x, y2)) / DEG;
	return { lon: outLon, lat: outLat };
}

export function eqCoords(lon, lat) {
	const eq = cotrans(lon, lat, OBLIQUITY_ECLI2EQ);
	return { ra: eq.lon, decl: eq.lat };
}

export function isAboveHorizon(ra, decl, mcRA, lat) {
	const dArc = 180 + 2 * ascdiff(decl, lat);
	const dist = Math.abs(closest(mcRA, ra));
	return dist <= dArc / 2 + 0.0003;
}

/** Default sectBuffer is geometric horizon. No Swiss rise_trans. */
export function isDiurnalChart(chart) {
	const sun = chart.objects && chart.objects.Sun;
	const mc = chart.ascmc && chart.ascmc.MC;
	const lat = chart.input && chart.input.latitude;
	if (!sun || !mc || typeof lat !== 'number') {
		return { status: 'LOT_RULE_UNRESOLVED', diurnal: null, reason: 'Sun, MC, or latitude missing from chart JSON' };
	}
	const sunEq = eqCoords(sun.lon, sun.lat);
	const mcEq = eqCoords(mc.lon, 0);
	return {
		status: 'COMPUTED',
		diurnal: isAboveHorizon(sunEq.ra, sunEq.decl, mcEq.ra, lat),
		source: 'flatlib chart.isDiurnal / utils.eqCoords obliquity -23.44 / utils.isAboveHorizon',
	};
}
