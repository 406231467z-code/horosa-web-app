// Horosa mean node and mean Lilith.
// Source: swemmoon.c swi_mean_node / swi_mean_apog, the functions Swiss
// SE_MEAN_NODE (body 10) and SE_MEAN_APOG (body 12) call. Horosa defaults
// are those two bodies. The year 0–3000 correction tables in that file are
// zero, so they are omitted. Nutation in longitude is applied afterwards
// because swe_calc returns the true equinox of date.
// This file does not call Swiss, Java, or Python.

const ARCSEC_CIRCLE = 1296000;
const J2000 = 2451545.0;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const MOON_MEAN_INCL = 5.1453964;

const Z = [
	-1.312045233711e+01, -1.138215912580e-03, -9.646018347184e-06,
	3.146734198839e+01, 4.768357585780e-02, -3.421689790404e-04,
	-6.847070905410e+00, -5.834100476561e-03, -2.905334122698e-04,
	-5.663161722088e+00, 5.722859298199e-03, -8.466472828815e-05,
];

function mods3600(x) {
	return x - ARCSEC_CIRCLE * Math.floor(x / ARCSEC_CIRCLE);
}

function degnorm(x) {
	let v = x % 360;
	if (v < 0) v += 360;
	return v;
}

function mod2pi(x) {
	const t = Math.PI * 2;
	let v = x % t;
	if (v < 0) v += t;
	return v;
}

function meanArcs(jdEt) {
	const T = (jdEt - J2000) / 36525;
	const T2 = T * T;
	const fracT = T % 1;
	let nf = mods3600(1739232000.0 * fracT + 295263.0983 * T - 2.079419901760e-01 * T + 335779.55755);
	let mp = mods3600(1717200000.0 * fracT + 715923.4728 * T - 2.035946368532e-01 * T + 485868.28096);
	let lp = mods3600(1731456000.0 * fracT + 1108372.83264 * T - 6.784914260953e-01 * T + 785939.95571);
	nf += ((Z[2] * T + Z[1]) * T + Z[0]) * T2;
	mp += ((Z[5] * T + Z[4]) * T + Z[3]) * T2;
	lp += ((Z[11] * T + Z[10]) * T + Z[9]) * T2;
	return { lp, nf, mp };
}

export function meanNodeLongitude(jdEt, nutationArcsec) {
	const { lp, nf } = meanArcs(jdEt);
	return degnorm((lp - nf) / 3600 + nutationArcsec / 3600);
}

export function meanLilithLongitude(jdEt, nutationArcsec) {
	const { lp, nf, mp } = meanArcs(jdEt);
	let lon = mod2pi((lp - mp) / 3600 * DEG2RAD + Math.PI);
	const node = mod2pi((lp - nf) / 3600 * DEG2RAD);
	lon = mod2pi(lon - node);
	const eps = -MOON_MEAN_INCL * DEG2RAD;
	const se = Math.sin(eps);
	const ce = Math.cos(eps);
	const x = Math.cos(lon);
	const y = Math.sin(lon);
	const y2 = y * ce;
	const z2 = -y * se;
	let ap = Math.atan2(y2, x);
	if (ap < 0) ap += Math.PI * 2;
	return degnorm(ap * RAD2DEG + node * RAD2DEG + nutationArcsec / 3600);
}

export function eclipticDeclination(longitude, latitude, obliquityDeg) {
	const eps = obliquityDeg * DEG2RAD;
	const lam = longitude * DEG2RAD;
	const beta = latitude * DEG2RAD;
	const sinDec = Math.sin(beta) * Math.cos(eps) + Math.cos(beta) * Math.sin(eps) * Math.sin(lam);
	const c = sinDec > 1 ? 1 : sinDec < -1 ? -1 : sinDec;
	return Math.asin(c) * RAD2DEG;
}
