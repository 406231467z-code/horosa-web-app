import { openEphemeris } from '../phase5a-sweph-parity/browserEphemerisAdapter.js';
import { MakeTime, e_tilt } from 'astronomy-engine';

function degnorm(x) {
	let v = x % 360;
	if (v < 0) v += 360;
	return v;
}
function angDiff(a, b) {
	let d = a - b;
	d = ((d + 180) % 360 + 360) % 360 - 180;
	return d;
}

const ARCSEC_CIRCLE = 1296000;
const Z = [
	-1.312045233711e+01, -1.138215912580e-03, -9.646018347184e-06,
	3.146734198839e+01, 4.768357585780e-02, -3.421689790404e-04,
	-6.847070905410e+00, -5.834100476561e-03, -2.905334122698e-04,
	-5.663161722088e+00, 5.722859298199e-03, -8.466472828815e-05,
];
const MOON_MEAN_INCL = 5.1453964;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function mods3600(x) {
	return x - ARCSEC_CIRCLE * Math.floor(x / ARCSEC_CIRCLE);
}
function mod2pi(x) {
	const t = Math.PI * 2;
	let v = x % t;
	if (v < 0) v += t;
	return v;
}

function meanElements(jd) {
	const T = (jd - 2451545.0) / 36525;
	const T2 = T * T;
	const fracT = T % 1;
	let NF = mods3600(1739232000.0 * fracT + 295263.0983 * T - 2.079419901760e-01 * T + 335779.55755);
	let MP = mods3600(1717200000.0 * fracT + 715923.4728 * T - 2.035946368532e-01 * T + 485868.28096);
	let LP = mods3600(1731456000.0 * fracT + 1108372.83264 * T - 6.784914260953e-01 * T + 785939.95571);
	NF += ((Z[2] * T + Z[1]) * T + Z[0]) * T2;
	MP += ((Z[5] * T + Z[4]) * T + Z[3]) * T2;
	LP += ((Z[11] * T + Z[10]) * T + Z[9]) * T2;
	const node = degnorm((LP - NF) / 3600);
	let lon = mod2pi((LP - MP) / 3600 * DEG2RAD + Math.PI);
	const nodeRad = mod2pi((LP - NF) / 3600 * DEG2RAD);
	lon = mod2pi(lon - nodeRad);
	const r = 1;
	const cosb = Math.cos(0);
	let x = r * cosb * Math.cos(lon);
	let y = r * cosb * Math.sin(lon);
	let z = r * Math.sin(0);
	const eps = -MOON_MEAN_INCL * DEG2RAD;
	const se = Math.sin(eps);
	const ce = Math.cos(eps);
	const y2 = y * ce + z * se;
	const z2 = -y * se + z * ce;
	y = y2;
	z = z2;
	let ap = Math.atan2(y, x);
	if (ap < 0) ap += Math.PI * 2;
	ap = degnorm(ap * RAD2DEG + node);
	return { node, apogee: ap };
}

const eph = await openEphemeris();
const dates = [
	[1900, 6, 15, 12],
	[1950, 6, 15, 12],
	[1976, 6, 15, 12],
	[1990, 6, 15, 0],
	[1990, 6, 15, 10.5],
	[1990, 6, 15, 23, 59],
	[2000, 6, 15, 12],
	[2026, 6, 15, 12],
];
for (const [year, month, day, hour, minute] of dates) {
	const jd = eph.julianDayUt({ year, month, day, hour: Math.floor(hour), minute: minute || Math.round((hour % 1) * 60), second: 0, zoneOffsetHours: 0 });
	const node = eph.positionAt(jd, 'SE_MEAN_NODE');
	const lil = eph.positionAt(jd, 'SE_MEAN_APOG');
	const time = MakeTime(new Date((jd - 2440587.5) * 86400000));
	const mean = meanElements(2451545.0 + time.tt);
	const tilt = e_tilt(time);
	const dpsiDeg = tilt.dpsi / 3600;
	const nodeTrue = degnorm(mean.node + dpsiDeg);
	const apTrue = degnorm(mean.apogee + dpsiDeg);
	console.log(year, month, day, hour,
		'node', (angDiff(mean.node, node.longitude) * 3600).toFixed(3),
		'node+dpsi', (angDiff(nodeTrue, node.longitude) * 3600).toFixed(3),
		'ap', (angDiff(mean.apogee, lil.longitude) * 3600).toFixed(3),
		'ap+dpsi', (angDiff(apTrue, lil.longitude) * 3600).toFixed(3),
		'dpsi"', tilt.dpsi.toFixed(3));
}
await eph.close();
