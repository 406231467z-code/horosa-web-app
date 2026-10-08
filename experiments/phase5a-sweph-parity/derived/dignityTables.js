/**
 * Essential dignities copied from flatlib/dignities/tables.py.
 * Defaults: ESSENTIAL_DIGNITIES, EGYPTIAN_TERMS, CHALDEAN_FACES.
 */
export const ESSENTIAL = {
	Aries: { ruler: 'Mars', exalt: 'Sun', trip: ['Sun', 'Jupiter', 'Saturn'], face: ['Mars', 'Sun', 'Venus'], exile: 'Venus', fall: 'Saturn' },
	Taurus: { ruler: 'Venus', exalt: 'Moon', trip: ['Venus', 'Moon', 'Mars'], face: ['Mercury', 'Moon', 'Saturn'], exile: 'Mars', fall: null },
	Gemini: { ruler: 'Mercury', exalt: null, trip: ['Saturn', 'Mercury', 'Jupiter'], face: ['Jupiter', 'Mars', 'Sun'], exile: 'Jupiter', fall: null },
	Cancer: { ruler: 'Moon', exalt: 'Jupiter', trip: ['Venus', 'Mars', 'Moon'], face: ['Venus', 'Mercury', 'Moon'], exile: 'Saturn', fall: 'Mars' },
	Leo: { ruler: 'Sun', exalt: null, trip: ['Sun', 'Jupiter', 'Saturn'], face: ['Saturn', 'Jupiter', 'Mars'], exile: 'Saturn', fall: null },
	Virgo: { ruler: 'Mercury', exalt: 'Mercury', trip: ['Venus', 'Moon', 'Mars'], face: ['Sun', 'Venus', 'Mercury'], exile: 'Jupiter', fall: 'Venus' },
	Libra: { ruler: 'Venus', exalt: 'Saturn', trip: ['Saturn', 'Mercury', 'Jupiter'], face: ['Moon', 'Saturn', 'Jupiter'], exile: 'Mars', fall: 'Sun' },
	Scorpio: { ruler: 'Mars', exalt: null, trip: ['Venus', 'Mars', 'Moon'], face: ['Mars', 'Sun', 'Venus'], exile: 'Venus', fall: 'Moon' },
	Sagittarius: { ruler: 'Jupiter', exalt: null, trip: ['Sun', 'Jupiter', 'Saturn'], face: ['Mercury', 'Moon', 'Saturn'], exile: 'Mercury', fall: null },
	Capricorn: { ruler: 'Saturn', exalt: 'Mars', trip: ['Venus', 'Moon', 'Mars'], face: ['Jupiter', 'Mars', 'Sun'], exile: 'Moon', fall: 'Jupiter' },
	Aquarius: { ruler: 'Saturn', exalt: null, trip: ['Saturn', 'Mercury', 'Jupiter'], face: ['Venus', 'Mercury', 'Moon'], exile: 'Sun', fall: null },
	Pisces: { ruler: 'Jupiter', exalt: 'Venus', trip: ['Venus', 'Mars', 'Moon'], face: ['Saturn', 'Jupiter', 'Mars'], exile: 'Mercury', fall: 'Mercury' },
};

export const EGYPTIAN_TERMS = {
	Aries: [['Jupiter', 0, 6], ['Venus', 6, 12], ['Mercury', 12, 20], ['Mars', 20, 25], ['Saturn', 25, 30]],
	Taurus: [['Venus', 0, 8], ['Mercury', 8, 14], ['Jupiter', 14, 22], ['Saturn', 22, 27], ['Mars', 27, 30]],
	Gemini: [['Mercury', 0, 6], ['Jupiter', 6, 12], ['Venus', 12, 17], ['Mars', 17, 24], ['Saturn', 24, 30]],
	Cancer: [['Mars', 0, 7], ['Venus', 7, 13], ['Mercury', 13, 19], ['Jupiter', 19, 26], ['Saturn', 26, 30]],
	Leo: [['Jupiter', 0, 6], ['Venus', 6, 11], ['Saturn', 11, 18], ['Mercury', 18, 24], ['Mars', 24, 30]],
	Virgo: [['Mercury', 0, 7], ['Venus', 7, 17], ['Jupiter', 17, 21], ['Mars', 21, 28], ['Saturn', 28, 30]],
	Libra: [['Saturn', 0, 6], ['Mercury', 6, 14], ['Jupiter', 14, 21], ['Venus', 21, 28], ['Mars', 28, 30]],
	Scorpio: [['Mars', 0, 7], ['Venus', 7, 11], ['Mercury', 11, 19], ['Jupiter', 19, 24], ['Saturn', 24, 30]],
	Sagittarius: [['Jupiter', 0, 12], ['Venus', 12, 17], ['Mercury', 17, 21], ['Saturn', 21, 26], ['Mars', 26, 30]],
	Capricorn: [['Mercury', 0, 7], ['Jupiter', 7, 14], ['Venus', 14, 22], ['Saturn', 22, 26], ['Mars', 26, 30]],
	Aquarius: [['Mercury', 0, 7], ['Venus', 7, 13], ['Jupiter', 13, 20], ['Mars', 20, 25], ['Saturn', 25, 30]],
	Pisces: [['Venus', 0, 12], ['Jupiter', 12, 16], ['Mercury', 16, 19], ['Mars', 19, 28], ['Saturn', 28, 30]],
};

export function dignityInfo(sign, signlon) {
	const row = ESSENTIAL[sign];
	if (!row) return null;
	let term = null;
	for (const [id, a, b] of EGYPTIAN_TERMS[sign]) {
		if (a <= signlon && signlon < b) {
			term = id;
			break;
		}
	}
	let face = row.face[2];
	if (signlon < 10) face = row.face[0];
	else if (signlon < 20) face = row.face[1];
	return {
		ruler: row.ruler,
		exalt: row.exalt,
		dayTrip: row.trip[0],
		nightTrip: row.trip[1],
		partTrip: row.trip[2],
		term,
		face,
		exile: row.exile,
		fall: row.fall,
	};
}

const INFO_KEYS = ['ruler', 'exalt', 'dayTrip', 'nightTrip', 'partTrip', 'term', 'face', 'exile', 'fall'];

export function inDignities(body, ownerId) {
	const info = dignityInfo(body.sign, body.signlon);
	if (!info) return [];
	const found = [];
	for (const key of INFO_KEYS) {
		if (info[key] === ownerId) found.push(key);
	}
	return found;
}

export function selfDignity(planetId, body) {
	const info = dignityInfo(body.sign, body.signlon);
	const res = [];
	if (!info) return res;
	if (info.ruler === planetId) res.push('ruler');
	if (info.exalt === planetId) res.push('exalt');
	if (info.dayTrip === planetId) res.push('dayTrip');
	if (info.nightTrip === planetId) res.push('nightTrip');
	if (info.partTrip === planetId) res.push('partTrip');
	if (info.term === planetId) res.push('term');
	if (info.face === planetId) res.push('face');
	if (info.fall === planetId) res.push('fall');
	if (info.exile === planetId) res.push('exile');
	return res;
}
