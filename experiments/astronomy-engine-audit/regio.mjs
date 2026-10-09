// Regiomontanus cusps from swehouse.c CalcH case 'R' and Asc1/Asc2.
// Inputs are RAMC degrees, geographic latitude, and true obliquity.
// This is the house geometry, not an ephemeris.

const TINY = 1e-10;

export function degnorm(x) {
	let v = x % 360;
	if (v < 0) v += 360;
	return v;
}

function sind(d) { return Math.sin(d * Math.PI / 180); }
function cosd(d) { return Math.cos(d * Math.PI / 180); }
function tand(d) { return Math.tan(d * Math.PI / 180); }
function atand(x) { return Math.atan(x) * 180 / Math.PI; }

function difdeg2n(a, b) {
	let d = degnorm(a - b);
	if (d > 180) d -= 360;
	return d;
}

function Asc2(x, f, sine, cose) {
	let ass = -tand(f) * sine + cose * cosd(x);
	let sinx = sind(x);
	if (Math.abs(ass) < TINY) ass = 0;
	if (Math.abs(sinx) < TINY) sinx = 0;
	if (sinx === 0) ass = ass < 0 ? -TINY : TINY;
	else if (ass === 0) ass = sinx < 0 ? -90 : 90;
	else ass = atand(sinx / ass);
	if (ass < 0) ass += 180;
	return ass;
}

function Asc1(x1, f, sine, cose) {
	x1 = degnorm(x1);
	const n = Math.floor(x1 / 90) + 1;
	let ass;
	if (n === 1) ass = Asc2(x1, f, sine, cose);
	else if (n === 2) ass = 180 - Asc2(180 - x1, -f, sine, cose);
	else if (n === 3) ass = 180 + Asc2(x1 - 180, -f, sine, cose);
	else ass = 360 - Asc2(360 - x1, f, sine, cose);
	return degnorm(ass);
}

export function regiomontanus(armcDeg, latDeg, epsDeg) {
	let th = degnorm(armcDeg);
	let fi = latDeg;
	const ekl = epsDeg;
	const cose = cosd(ekl);
	const sine = sind(ekl);
	if (Math.abs(Math.abs(fi) - 90) < TINY) fi = fi < 0 ? -90 + TINY : 90 - TINY;
	let mc;
	if (Math.abs(th - 90) > TINY && Math.abs(th - 270) > TINY) {
		mc = atand(tand(th) / cose);
		if (th > 90 && th <= 270) mc = degnorm(mc + 180);
	} else {
		mc = Math.abs(th - 90) <= TINY ? 90 : 270;
	}
	mc = degnorm(mc);
	let ac = Asc1(th + 90, fi, sine, cose);
	const cusp = { 1: ac, 10: mc };
	const tanfi = tand(fi);
	const fh1 = atand(tanfi * 0.5);
	const fh2 = atand(tanfi * cosd(30));
	cusp[11] = Asc1(30 + th, fh1, sine, cose);
	cusp[12] = Asc1(60 + th, fh2, sine, cose);
	cusp[2] = Asc1(120 + th, fh2, sine, cose);
	cusp[3] = Asc1(150 + th, fh1, sine, cose);
	if (Math.abs(fi) >= 90 - ekl) {
		if (difdeg2n(ac, mc) < 0) {
			ac = degnorm(ac + 180);
			mc = degnorm(mc + 180);
			cusp[1] = ac;
			cusp[10] = mc;
			for (const i of [11, 12, 2, 3]) cusp[i] = degnorm(cusp[i] + 180);
		}
	}
	cusp[4] = degnorm(cusp[10] + 180);
	cusp[5] = degnorm(cusp[11] + 180);
	cusp[6] = degnorm(cusp[12] + 180);
	cusp[7] = degnorm(cusp[1] + 180);
	cusp[8] = degnorm(cusp[2] + 180);
	cusp[9] = degnorm(cusp[3] + 180);
	return { asc: cusp[1], mc: cusp[10], cusps: cusp };
}
