/**
 * nakshatra.py + india/primitives.py Abhijit overlay.
 * The longitude is used as given. This file does not compute an ayanamsa.
 */

export const NAKSHATRA_SOURCE = 'astropy/astrostudy/nakshatra.py';

export const NAKSHATRAS = [
	['Ashwini', '马', 'Ketu'],
	['Bharani', '胃', 'Venus'],
	['Krittika', '昴', 'Sun'],
	['Rohini', '毕', 'Moon'],
	['Mrigashira', '参', 'Mars'],
	['Ardra', '井', 'Rahu'],
	['Punarvasu', '鬼', 'Jupiter'],
	['Pushya', '柳', 'Saturn'],
	['Ashlesha', '星', 'Mercury'],
	['Magha', '张', 'Ketu'],
	['Purva Phalguni', '翼', 'Venus'],
	['Uttara Phalguni', '轸', 'Sun'],
	['Hasta', '角', 'Moon'],
	['Chitra', '亢', 'Mars'],
	['Swati', '氐', 'Rahu'],
	['Vishakha', '房', 'Jupiter'],
	['Anuradha', '心', 'Saturn'],
	['Jyeshtha', '尾', 'Mercury'],
	['Mula', '箕', 'Ketu'],
	['Purva Ashadha', '斗', 'Venus'],
	['Uttara Ashadha', '牛', 'Sun'],
	['Shravana', '女', 'Moon'],
	['Dhanishta', '虚', 'Mars'],
	['Shatabhisha', '危', 'Rahu'],
	['Purva Bhadrapada', '室', 'Jupiter'],
	['Uttara Bhadrapada', '壁', 'Saturn'],
	['Revati', '奎', 'Mercury'],
];

export const ABHIJIT_START = 276.0 + 40.0 / 60.0;
export const ABHIJIT_END = 280.0 + 53.0 / 60.0 + 20.0 / 3600.0;
export const ABHIJIT_NAME = 'Abhijit';
export const ABHIJIT_LABEL = '织女';
export const ABHIJIT_NAK_NUMBER_28 = 22;

export function norm360(lon) {
	const x = Number(lon) % 360;
	return x < 0 ? x + 360 : x;
}

export function isAbhijit(lon) {
	const value = norm360(lon);
	return ABHIJIT_START <= value && value < ABHIJIT_END;
}

export function nakshatraNumber28(lon, nak27Index) {
	if (isAbhijit(lon)) return ABHIJIT_NAK_NUMBER_28;
	return nak27Index <= 21 ? nak27Index : nak27Index + 1;
}

export function nakshatraFromLon(lon) {
	const span = 360.0 / 27.0;
	const value = norm360(lon);
	const idx = Math.min(26, Math.trunc(value / span));
	const progress = (value - idx * span) / span;
	const pada = Math.min(4, Math.trunc(progress * 4) + 1);
	const [name, label, lord] = NAKSHATRAS[idx];
	const abhijit = isAbhijit(value);
	return {
		index: idx + 1,
		name,
		label,
		lord,
		pada,
		progress,
		remainingRatio: 1 - progress,
		isAbhijit: abhijit,
		nak28Index: nakshatraNumber28(value, idx + 1),
		nak28Name: abhijit ? ABHIJIT_NAME : name,
		nak28Label: abhijit ? ABHIJIT_LABEL : label,
	};
}

function isSidereal(zodiacal) {
	return zodiacal === 'Sidereal' || zodiacal === 'sidereal' || zodiacal === 1;
}

/** Tropical charts stay null. Sidereal charts use each body's longitude as already given. */
export function nakshatrasForChart(chart) {
	const zodiacal = chart && (chart.zodiacal || (chart.input && chart.input.zodiacal));
	if (!isSidereal(zodiacal)) {
		return null;
	}
	const byBody = {};
	const objects = (chart && chart.objects) || {};
	for (const [id, body] of Object.entries(objects)) {
		if (body && Number.isFinite(body.lon)) byBody[id] = nakshatraFromLon(body.lon);
	}
	return {
		status: 'COMPUTED',
		source: NAKSHATRA_SOURCE,
		ayanamsa: 'chart longitude',
		byBody,
	};
}
