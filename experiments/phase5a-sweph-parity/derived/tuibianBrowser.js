/**
 * guolao_tuibian.py functions used by su28 modes 6 and 7.
 * Widths and the closed-form difference are copied from that file.
 */
export const SU28_NAMES = ['角', '亢', '氐', '房', '心', '尾', '箕', '斗', '牛', '女', '虚', '危', '室', '壁', '奎', '娄', '胃', '昴', '毕', '觜', '参', '井', '鬼', '柳', '星', '张', '翼', '轸'];

export const YUANMING_EQUATORIAL_SU = [12.1, 9.2, 16.3, 5.6, 6.5, 19.1, 10.4, 25.2, 7.2, 11.35, 8.9575, 15.4, 17.1, 8.6, 16.6, 11.8, 15.6, 11.3, 17.4, 0.05, 11.1, 33.3, 2.2, 13.3, 6.3, 17.25, 18.75, 17.3];

export const ZHOUTIAN_ANCIENT = 365.2575;
export const OBLIQUITY_YUAN = 23.9;
const CHUNFEN_AT_BI_DEGREE = 6.0;
const QUARTER = ZHOUTIAN_ANCIENT / 4.0;
const EIGHTH = QUARTER / 2.0;
const JINTUI_A = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45];
const JINTUI_DIFF = [0.0, 12 / 24.0, 23 / 24.0, 1 + 9 / 24.0, 1 + 18 / 24.0, 2 + 2 / 24.0, 2 + 9 / 24.0, 2 + 15 / 24.0, 2 + 20 / 24.0, 3.0];

function round4(value) {
	const m = 10000;
	const x = value * m;
	const base = Math.floor(x + 1e-8);
	const frac = x - base;
	if (frac > 0.5) return (base + 1) / m;
	if (frac < 0.5) return base / m;
	return (base % 2 === 0 ? base : base + 1) / m;
}

export function cumulativeEquatorial() {
	const acc = [0];
	for (const w of YUANMING_EQUATORIAL_SU) acc.push(acc[acc.length - 1] + w);
	return acc;
}

export function chunfenEquatorial() {
	const cum = cumulativeEquatorial();
	return cum[SU28_NAMES.indexOf('壁')] + CHUNFEN_AT_BI_DEGREE;
}

function yaoshunfuDiff(c) {
	return (c / 1000.0) * (101.0 - c);
}

function jintuiDiff(c) {
	if (c <= 0) return 0;
	if (c >= 45) return JINTUI_DIFF[JINTUI_DIFF.length - 1];
	for (let i = 0; i < JINTUI_A.length - 1; i += 1) {
		const a0 = JINTUI_A[i];
		const a1 = JINTUI_A[i + 1];
		if (a0 <= c && c <= a1) {
			const t = (c - a0) / (a1 - a0);
			return JINTUI_DIFF[i] + t * (JINTUI_DIFF[i + 1] - JINTUI_DIFF[i]);
		}
	}
	return JINTUI_DIFF[JINTUI_DIFF.length - 1];
}

function huiyuanDiff(c, obliquityDeg) {
	const cr = c * Math.PI / 180;
	const lam = Math.atan2(Math.tan(cr), Math.cos(obliquityDeg * Math.PI / 180)) * 180 / Math.PI;
	return lam - c;
}

function diffAt(cFromChunfen, method, obliquityDeg) {
	const c = ((cFromChunfen % ZHOUTIAN_ANCIENT) + ZHOUTIAN_ANCIENT) % ZHOUTIAN_ANCIENT;
	const quarterIdx = Math.trunc(c / QUARTER);
	const phase = c - quarterIdx * QUARTER;
	const pr = phase <= EIGHTH ? phase : (QUARTER - phase);
	let mag;
	if (method === 'jintui') mag = jintuiDiff(pr);
	else if (method === 'huiyuan') mag = huiyuanDiff(pr, obliquityDeg);
	else mag = yaoshunfuDiff(pr);
	const sign = quarterIdx % 2 === 0 ? 1 : -1;
	return sign * mag;
}

export function huangdaoJidu(equatorialAbs, method = 'jiyuan', obliquityDeg = OBLIQUITY_YUAN) {
	const cf = chunfenEquatorial();
	const c = ((equatorialAbs - cf) % ZHOUTIAN_ANCIENT + ZHOUTIAN_ANCIENT) % ZHOUTIAN_ANCIENT;
	return c + diffAt(c, method, obliquityDeg);
}

export function mansionHuangdaoTable(method = 'jiyuan', obliquityDeg = OBLIQUITY_YUAN) {
	const cum = cumulativeEquatorial();
	const res = [];
	for (let i = 0; i < 28; i += 1) {
		const start = huangdaoJidu(cum[i], method, obliquityDeg);
		const end = huangdaoJidu(cum[i + 1], method, obliquityDeg);
		const span = ((end - start) % ZHOUTIAN_ANCIENT + ZHOUTIAN_ANCIENT) % ZHOUTIAN_ANCIENT;
		res.push(round4(span));
	}
	return res;
}

export function chidaoToHuangdao(raDeg, method = 'jiyuan', obliquityDeg = OBLIQUITY_YUAN) {
	const ra = ((raDeg % ZHOUTIAN_ANCIENT) + ZHOUTIAN_ANCIENT) % ZHOUTIAN_ANCIENT;
	return huangdaoJidu(ra, method, obliquityDeg);
}
