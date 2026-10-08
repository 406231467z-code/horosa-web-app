// House cusps from swehouse.c CalcH.
// Regiomontanus is the port already checked against swe.houses at 0 arcsec
// when both sides receive the same RAMC and obliquity.
// Alcabitius is case 'B'. Placidus is the default case. Inside the polar
// circle Placidus follows the same switch to Porphyry (case 'O').

const TINY = 1e-10;
const PLAC_ITER = 1 / 360000;

export function degnorm(x) {
	let v = x % 360;
	if (v < 0) v += 360;
	return v;
}

function sind(d) { return Math.sin(d * Math.PI / 180); }
function cosd(d) { return Math.cos(d * Math.PI / 180); }
function tand(d) { return Math.tan(d * Math.PI / 180); }
function atand(x) { return Math.atan(x) * 180 / Math.PI; }
function asind(x) {
	const c = x > 1 ? 1 : x < -1 ? -1 : x;
	return Math.asin(c) * 180 / Math.PI;
}
function acosd(x) {
	const c = x > 1 ? 1 : x < -1 ? -1 : x;
	return Math.acos(c) * 180 / Math.PI;
}

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

function angles(armcDeg, latDeg, epsDeg) {
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
	const ac = Asc1(th + 90, fi, sine, cose);
	return { th, fi, ekl, sine, cose, tanfi: tand(fi), tane: tand(ekl), ac, mc };
}

function opposites(cusp) {
	cusp[4] = degnorm(cusp[10] + 180);
	cusp[5] = degnorm(cusp[11] + 180);
	cusp[6] = degnorm(cusp[12] + 180);
	cusp[7] = degnorm(cusp[1] + 180);
	cusp[8] = degnorm(cusp[2] + 180);
	cusp[9] = degnorm(cusp[3] + 180);
	return cusp;
}

function pack(system, cusp, fallback) {
	return {
		system,
		fallback: fallback || null,
		asc: cusp[1],
		mc: cusp[10],
		cusps: cusp,
	};
}

export function regiomontanus(armcDeg, latDeg, epsDeg) {
	const a = angles(armcDeg, latDeg, epsDeg);
	let { th, fi, ekl, sine, cose, ac, mc } = a;
	const cusp = { 1: ac, 10: mc };
	const fh1 = atand(a.tanfi * 0.5);
	const fh2 = atand(a.tanfi * cosd(30));
	cusp[11] = Asc1(30 + th, fh1, sine, cose);
	cusp[12] = Asc1(60 + th, fh2, sine, cose);
	cusp[2] = Asc1(120 + th, fh2, sine, cose);
	cusp[3] = Asc1(150 + th, fh1, sine, cose);
	if (Math.abs(fi) >= 90 - ekl && difdeg2n(ac, mc) < 0) {
		ac = degnorm(ac + 180);
		mc = degnorm(mc + 180);
		cusp[1] = ac;
		cusp[10] = mc;
		for (const i of [11, 12, 2, 3]) cusp[i] = degnorm(cusp[i] + 180);
	}
	return pack('Regiomontanus', opposites(cusp));
}

export function porphyry(armcDeg, latDeg, epsDeg) {
	const a = angles(armcDeg, latDeg, epsDeg);
	let ac = a.ac;
	const mc = a.mc;
	let acmc = difdeg2n(ac, mc);
	if (acmc < 0) {
		ac = degnorm(ac + 180);
		acmc = difdeg2n(ac, mc);
	}
	const cusp = {
		1: ac,
		10: mc,
		2: degnorm(ac + (180 - acmc) / 3),
		3: degnorm(ac + (180 - acmc) / 3 * 2),
		11: degnorm(mc + acmc / 3),
		12: degnorm(mc + acmc / 3 * 2),
	};
	return pack('Porphyry', opposites(cusp));
}

export function alcabitus(armcDeg, latDeg, epsDeg) {
	const a = angles(armcDeg, latDeg, epsDeg);
	let ac = a.ac;
	const mc = a.mc;
	let acmc = difdeg2n(ac, mc);
	if (acmc < 0) {
		ac = degnorm(ac + 180);
		acmc = difdeg2n(ac, mc);
	}
	const dek = asind(sind(ac) * a.sine);
	let r = -a.tanfi * tand(dek);
	if (r > 1) r = 1;
	if (r < -1) r = -1;
	const sda = acosd(r);
	const sna = 180 - sda;
	const sd3 = sda / 3;
	const sn3 = sna / 3;
	const cusp = { 1: ac, 10: mc };
	cusp[11] = Asc1(degnorm(a.th + sd3), 0, a.sine, a.cose);
	cusp[12] = Asc1(degnorm(a.th + 2 * sd3), 0, a.sine, a.cose);
	cusp[2] = Asc1(degnorm(a.th + 180 - 2 * sn3), 0, a.sine, a.cose);
	cusp[3] = Asc1(degnorm(a.th + 180 - sn3), 0, a.sine, a.cose);
	return pack('Alcabitius', opposites(cusp));
}

function placidusCusp(rectasc, fh0, divisor, sine, cose, tanfi) {
	let tant = tand(asind(sine * sind(Asc1(rectasc, fh0, sine, cose))));
	if (Math.abs(tant) < TINY) return rectasc;
	let f = atand(sind(asind(tanfi * tant) / divisor) / tant);
	let cusp = Asc1(rectasc, f, sine, cose);
	let prev = 0;
	for (let i = 1; i <= 100; i += 1) {
		tant = tand(asind(sine * sind(cusp)));
		if (Math.abs(tant) < TINY) return rectasc;
		f = atand(sind(asind(tanfi * tant) / divisor) / tant);
		const next = Asc1(rectasc, f, sine, cose);
		if (i > 1 && Math.abs(difdeg2n(next, prev)) < PLAC_ITER) return next;
		prev = next;
		cusp = next;
	}
	return null;
}

export function placidus(armcDeg, latDeg, epsDeg) {
	const a = angles(armcDeg, latDeg, epsDeg);
	if (Math.abs(a.fi) >= 90 - a.ekl) {
		const fallback = porphyry(armcDeg, latDeg, epsDeg);
		return pack('Placidus', fallback.cusps, 'Porphyry');
	}
	const fh1 = atand(sind(asind(tand(a.fi) * a.tane) / 3) / a.tane);
	const fh2 = atand(sind(asind(tand(a.fi) * a.tane) * 2 / 3) / a.tane);
	const specs = [
		[11, 30, fh1, 3],
		[12, 60, fh2, 1.5],
		[2, 120, fh2, 1.5],
		[3, 150, fh1, 3],
	];
	const cusp = { 1: a.ac, 10: a.mc };
	for (const [house, offset, fh, divisor] of specs) {
		const got = placidusCusp(degnorm(offset + a.th), fh, divisor, a.sine, a.cose, a.tanfi);
		if (got == null) {
			const fallback = porphyry(armcDeg, latDeg, epsDeg);
			return pack('Placidus', fallback.cusps, 'Porphyry');
		}
		cusp[house] = got;
	}
	return pack('Placidus', opposites(cusp));
}

const BY_INDEX = {
	1: alcabitus,
	2: regiomontanus,
	3: placidus,
	9: porphyry,
};

export function housesForIndex(index, armcDeg, latDeg, epsDeg) {
	const fn = BY_INDEX[index];
	if (!fn) return null;
	return fn(armcDeg, latDeg, epsDeg);
}
