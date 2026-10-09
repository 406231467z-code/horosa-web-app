import { openEphemeris } from '../phase5a-sweph-parity/browserEphemerisAdapter.js';
import { MakeTime, e_tilt, SiderealTime } from 'astronomy-engine';
import { housesForIndex } from '../../local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui/src/services/astronomy/horosaHouses.js';
import { meanNodeLongitude, meanLilithLongitude, eclipticDeclination } from '../../local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui/src/services/astronomy/horosaMeanElements.js';

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
function arcsec(d) { return Math.abs(d) * 3600; }

const dates = [
	[1900, 6, 15, 12, 0],
	[1950, 6, 15, 12, 0],
	[1976, 6, 15, 12, 0],
	[1990, 6, 15, 0, 0],
	[1990, 6, 15, 10, 30],
	[1990, 6, 15, 23, 59],
	[2000, 6, 15, 12, 0],
	[2026, 6, 15, 12, 0],
];
const places = [
	{ name: 'equator', lat: 0, lon: 0 },
	{ name: 'shanghai', lat: 31.233333333333334, lon: 121.46666666666667 },
	{ name: 'tromso', lat: 69.6492, lon: 18.9553 },
	{ name: 'sydney', lat: -33.8688, lon: 151.2093 },
];

const eph = await openEphemeris();
let nodeMax = 0;
let lilMax = 0;
let declMax = 0;
const houseMax = { 1: 0, 2: 0, 3: 0 };
const rows = [];
for (const [year, month, day, hour, minute] of dates) {
	const jd = eph.julianDayUt({ year, month, day, hour, minute, second: 0, zoneOffsetHours: 0 });
	const date = new Date((jd - 2440587.5) * 86400000);
	const time = MakeTime(date);
	const tilt = e_tilt(time);
	const node = meanNodeLongitude(2451545 + time.tt, tilt.dpsi);
	const lil = meanLilithLongitude(2451545 + time.tt, tilt.dpsi);
	const swissNode = eph.positionAt(jd, 'SE_MEAN_NODE');
	const swissLil = eph.positionAt(jd, 'SE_MEAN_APOG');
	const nd = arcsec(angDiff(node, swissNode.longitude));
	const ld = arcsec(angDiff(lil, swissLil.longitude));
	const decl = eclipticDeclination(node, 0, tilt.tobl);
	const dd = arcsec(decl - swissNode.declination);
	nodeMax = Math.max(nodeMax, nd);
	lilMax = Math.max(lilMax, ld);
	declMax = Math.max(declMax, dd);
	rows.push({ year, month, day, hour, minute, node: nd, lilith: ld, decl: dd, status: nd < 1 && ld < 1 ? 'PASS' : 'FAIL' });
	if (year === 1990 && hour === 10) {
		for (const place of places) {
			const gast = eph.siderealTime(jd);
			const eps = eph.obliquity(jd);
			const armc = degnorm(gast * 15 + place.lon);
			for (const index of [1, 2, 3]) {
				const built = housesForIndex(index, armc, place.lat, eps);
				const swiss = eph.computeChart({ jd, lat: place.lat, lon: place.lon, hsysIndex: index, hour, minute, second: 0, zoneOffsetHours: 0, year, month, day });
				let max = 0;
				for (let i = 1; i <= 12; i += 1) {
					max = Math.max(max, arcsec(angDiff(built.cusps[i], swiss.houses.cusps[`House${i}`])));
				}
				houseMax[index] = Math.max(houseMax[index], max);
				const aeArmc = degnorm(SiderealTime(date) * 15 + place.lon);
				const aeBuilt = housesForIndex(index, aeArmc, place.lat, tilt.tobl);
				let signChange = 0;
				for (let i = 1; i <= 12; i += 1) {
					const a = Math.floor(degnorm(aeBuilt.cusps[i]) / 30);
					const b = Math.floor(degnorm(swiss.houses.cusps[`House${i}`]) / 30);
					if (a !== b) signChange += 1;
				}
				if (signChange) console.log('SIGN', index, place.name, signChange);
			}
		}
	}
}
console.log(JSON.stringify({ nodeMax, lilMax, declMax, houseMax, rows }, null, 2));
await eph.close();
if (nodeMax >= 1 || lilMax >= 1 || houseMax[1] >= 1 || houseMax[2] >= 1 || houseMax[3] >= 1) process.exit(1);
