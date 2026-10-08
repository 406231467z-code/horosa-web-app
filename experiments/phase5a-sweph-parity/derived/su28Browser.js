/**
 * perchart.getFixedStarSu28, one function per mode.
 * Mode 0, 5, and 8 need the Swiss fixed-star catalog and stay LICENSE_BLOCKED.
 * Mode 1 widths are in-repo; the 立春 placement needs Alkaid and stays blocked.
 */
import { SIGNS } from './guoTables.js';
import {
	DOUBING_WALK_ORDER,
	MODE_NAMES,
	MOIRA_CURRENT_STELLAR_DEGREES,
	MOIRA_DISTAR_J2000,
	MOIRA_KAIXI_STELLAR_DEGREES,
	MOIRA_STELLAR_ORDER,
	SU28_ANIMAL,
	SU28_ID_BY_NAME,
	SU28_WUXING,
	SU_DEG,
} from './su28Tables.js';
import {
	SU28_NAMES,
	ZHOUTIAN_ANCIENT,
	chidaoToHuangdao,
	cumulativeEquatorial,
	mansionHuangdaoTable,
} from './tuibianBrowser.js';

const JD_J2000 = 2451545.0;

function norm360(x) {
	const n = x % 360;
	return n < 0 ? n + 360 : n;
}

function star(name, lon) {
	const x = norm360(lon);
	return {
		name,
		lon: x,
		ra: x,
		sign: SIGNS[Math.trunc(x / 30) % 12],
		signlon: x % 30,
		wuxing: SU28_WUXING[name],
		animal: SU28_ANIMAL[name],
		id: SU28_ID_BY_NAME[name],
	};
}

function blocked(mode, reason) {
	return {
		mode,
		modeName: MODE_NAMES[mode],
		status: 'LICENSE_BLOCKED',
		productionReady: false,
		productionApproved: false,
		reason,
	};
}

const CANDIDATE = {
	productionReady: false,
	productionApproved: false,
	role: 'implementation candidate',
};

/** perchart._moira_distar_lon. obliquityDeg is swe.calc_ut(jd, ECL_NUT)[0]. */
export function moiraDistarLon(rec, jd, obliquityDeg) {
	const [, rh, rm, rs, sg, dd, dm, ds, pmra, pmdec] = rec;
	let ra = (rh + rm / 60.0 + rs / 3600.0) * 15.0;
	let dec = sg * (dd + dm / 60.0 + ds / 3600.0);
	const yr = (jd - JD_J2000) / 365.25;
	ra += pmra * 0.01 * 15.0 * yr / 3600.0;
	dec += pmdec * 0.01 * yr / 3600.0;
	const T = (jd - JD_J2000) / 36525.0;
	const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T ** 3) / 3600.0;
	const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T ** 3) / 3600.0;
	const th = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T ** 3) / 3600.0;
	const rr = ra * Math.PI / 180;
	const dr = dec * Math.PI / 180;
	const Z = zeta * Math.PI / 180;
	const ZZ = z * Math.PI / 180;
	const TH = th * Math.PI / 180;
	const A = Math.cos(dr) * Math.sin(rr + Z);
	const B = Math.cos(TH) * Math.cos(dr) * Math.cos(rr + Z) - Math.sin(TH) * Math.sin(dr);
	const C = Math.sin(TH) * Math.cos(dr) * Math.cos(rr + Z) + Math.cos(TH) * Math.sin(dr);
	const raD = Math.atan2(A, B) + ZZ;
	const decD = Math.asin(C);
	const eps = obliquityDeg * Math.PI / 180;
	const lon = Math.atan2(
		Math.sin(raD) * Math.cos(eps) + Math.tan(decD) * Math.sin(eps),
		Math.cos(raD),
	) * 180 / Math.PI;
	return [rec[0], norm360(lon)];
}

export function moiraDistarLons(jd, obliquityDeg) {
	const out = {};
	for (const rec of MOIRA_DISTAR_J2000) {
		const [name, lon] = moiraDistarLon(rec, jd, obliquityDeg);
		out[name] = lon;
	}
	return out;
}

export function doubingTotal() {
	return Object.values(SU_DEG).reduce((sum, n) => sum + n, 0);
}

/** Widths only. The 立春 anchor is Alkaid and stays outside this result. */
export function doubingWidths() {
	const total = doubingTotal();
	let cursor = 0;
	return DOUBING_WALK_ORDER.map((name) => {
		const ancient = SU_DEG[name];
		const span = ancient / total * 360;
		const start = cursor;
		cursor += span;
		return { name, ancientDegrees: ancient, spanDegrees: span, startFromTestOrigin: start };
	});
}

/**
 * Walk the width circle from an explicit origin.
 * Exact start belongs to the mansion that begins there (sval <= pval).
 * originDegrees is not the 立春 anchor.
 */
export function doubingMansionAt(originDegrees, absoluteDegrees) {
	const widths = doubingWidths();
	const origin = norm360(originDegrees);
	const target = norm360(absoluteDegrees);
	let along = norm360(target - origin);
	if (along === 0) return widths[0].name;
	let acc = 0;
	let selected = widths[widths.length - 1].name;
	for (const row of widths) {
		if (acc <= along) selected = row.name;
		else break;
		acc += row.spanDegrees;
	}
	return selected;
}

function placed(names, degrees) {
	const entries = names.map((name, i) => star(name, degrees[i]));
	entries.sort((a, b) => a.lon - b.lon);
	return entries;
}

function mode2(ctx) {
	if (!Number.isFinite(ctx.jd) || !Number.isFinite(ctx.obliquityDeg)) {
		return { mode: 2, modeName: 'MOIRA_CURRENT', status: 'MISSING_INPUT', missing: 'jd and obliquityDeg', dependsOnSwissForObliquity: true, productionReady: false };
	}
	const lonByName = moiraDistarLons(ctx.jd, ctx.obliquityDeg);
	const degrees = MOIRA_STELLAR_ORDER.map((name) => norm360(lonByName[name]));
	return {
		mode: 2,
		modeName: 'MOIRA_CURRENT',
		status: 'EXPERIMENTAL',
		source: 'perchart._moira_distar_lons',
		dependsOnSwissForObliquity: true,
		dependencies: 'experimental Swiss obliquity from calc_ut ECL_NUT',
		reason: 'LICENSE_REVIEW_REQUIRED',
		implementation: 'derived/su28Browser.js',
		...CANDIDATE,
		entries: placed(MOIRA_STELLAR_ORDER, degrees),
	};
}

function mode3(ctx) {
	if (!Number.isFinite(ctx.ayanamsaDeg)) {
		return { mode: 3, modeName: 'MOIRA_KAIXI', status: 'MISSING_INPUT', missing: 'caller-provided ayanamsaDeg', productionReady: false };
	}
	const degrees = MOIRA_KAIXI_STELLAR_DEGREES.map((d) => norm360(d + ctx.ayanamsaDeg));
	return {
		mode: 3,
		modeName: 'MOIRA_KAIXI',
		status: 'EXPERIMENTAL',
		source: 'MOIRA_KAIXI_STELLAR_DEGREES + caller ayanamsa',
		ayanamsaDeg: ctx.ayanamsaDeg,
		ayanamsaSource: 'caller',
		dependencies: 'caller-provided ayanamsa; Swiss generation is not used here',
		reason: 'LICENSE_REVIEW_REQUIRED',
		implementation: 'derived/su28Browser.js',
		...CANDIDATE,
		entries: placed(MOIRA_STELLAR_ORDER, degrees),
	};
}

function mode4() {
	const degrees = MOIRA_CURRENT_STELLAR_DEGREES.map((d) => norm360(d));
	return { mode: 4, modeName: 'ZHENG_SIDEREAL', status: 'EXPERIMENTAL', source: 'MOIRA_CURRENT_STELLAR_DEGREES', implementation: 'derived/su28Browser.js', dependencies: 'in-repo degree list', ayanamsaApplied: false, ...CANDIDATE, entries: placed(MOIRA_STELLAR_ORDER, degrees) };
}

function mode6(ctx) {
	const method = ctx.method || 'jiyuan';
	const table = mansionHuangdaoTable(method);
	const scale = 360.0 / ZHOUTIAN_ANCIENT;
	let anchor = norm360(chidaoToHuangdao(0, method) * scale);
	const precess = ctx.precess === true || ctx.precess === 1;
	if (precess && Number.isFinite(ctx.year)) {
		anchor = norm360(anchor + (ctx.year - 1280.0) * (50.29 / 3600.0));
	}
	const degrees = [];
	let cum = 0;
	for (let i = 0; i < SU28_NAMES.length; i += 1) {
		degrees.push(norm360(anchor + cum));
		cum += table[i] * scale;
	}
	return {
		mode: 6,
		modeName: 'GUFA_LICHENG',
		status: 'EXPERIMENTAL',
		source: 'perchart.getGufaLichengSu28',
		implementation: 'derived/su28Browser.js',
		dependencies: 'in-repo Shoushi widths',
		...CANDIDATE,
		method,
		precess,
		entries: placed(SU28_NAMES, degrees),
	};
}

function mode7(ctx) {
	const scale = 360.0 / ZHOUTIAN_ANCIENT;
	const cum = cumulativeEquatorial();
	const anchor = ctx.anchor === 'chunfen' ? 'chunfen' : 'dongzhi';
	let offset;
	if (anchor === 'chunfen') {
		const anchorPos = (cum[SU28_NAMES.indexOf('壁')] + 2.3) * scale;
		offset = norm360(0 - anchorPos);
	} else {
		const anchorPos = cum[SU28_NAMES.indexOf('牛')] * scale;
		offset = norm360(270 - anchorPos);
	}
	const degrees = SU28_NAMES.map((_, i) => norm360(cum[i] * scale + offset));
	return {
		mode: 7,
		modeName: 'EQUATORIAL_TROPICAL',
		status: 'EXPERIMENTAL',
		source: 'perchart.getEquatorialTropicalSu28',
		implementation: 'derived/su28Browser.js',
		dependencies: 'in-repo Yuan-Ming equatorial widths',
		...CANDIDATE,
		anchor,
		precess: false,
		entries: placed(SU28_NAMES, degrees),
	};
}

export function computeSu28(mode = 0, ctx = {}) {
	const selected = mode == null ? 0 : Number(mode);
	if (selected === 0) {
		return blocked(0, 'getAdjustFixedStarSu28 reads chart.getFixedStartsSu28 from sefstars.txt');
	}
	if (selected === 5) {
		return blocked(5, 'getEquatorialSu28 reads chart.getFixedStartsSu28 from sefstars.txt');
	}
	if (selected === 1) {
		return {
			mode: 1,
			modeName: 'DOUBING',
			status: 'LICENSE_BLOCKED',
			reason: 'Guo74.virtualSu28 anchors on sweFixedStar(Alkaid) and the 28-star declinations',
			tableStatus: 'EXPERIMENTAL',
			placementStatus: 'LICENSE_BLOCKED',
			productionReady: false,
			widths: doubingWidths(),
		};
	}
	if (selected === 8) {
		return blocked(8, 'getEquatorialTropicalLiveSu28 takes live RA from getFixedStartsSu28');
	}
	if (selected === 2) return mode2(ctx);
	if (selected === 3) return mode3(ctx);
	if (selected === 4) return mode4();
	if (selected === 6) return mode6(ctx);
	if (selected === 7) return mode7(ctx);
	return { mode: selected, modeName: null, status: 'UNSUPPORTED', missing: 'su28 mode 0..8', productionReady: false };
}

/** chart carries jd, obliquityDeg, ayanamsaDeg, year, precess, anchor, method. Omitted mode is 0. */
export function calculateSu28(chart, mode) {
	return computeSu28(mode == null ? 0 : mode, chart || {});
}

/** Last mansion whose coordinate is <= the body. Matches setPlanetSu28. */
export function mansionAt(entries, value) {
	if (!entries || !entries.length) return null;
	const sorted = entries.slice().sort((a, b) => a.lon - b.lon);
	let selected = null;
	for (const row of sorted) {
		if (row.lon <= value) selected = row;
		else break;
	}
	return selected || sorted[sorted.length - 1];
}
