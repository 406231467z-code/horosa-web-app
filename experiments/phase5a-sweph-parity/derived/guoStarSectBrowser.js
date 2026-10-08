/**
 * perchart.setupPlanets planet.su plus GuoStarSect.allTerm.
 * Field name stays su. No separate day or night table.
 */
import {
	LIST_OBJECTS_NOCHIRON,
	LIST_OBJECTS_TRADITIONAL,
	LIST_SU,
	LIST_SU_RELATION,
	LIST_SU_SIXHOUSE,
	SIGNS,
	SU_CATEGORY_BIRTH,
	TERM_SU27,
	copySu27,
} from './guoTables.js';

export const GUO_SOURCE = 'astropy/astrostudy/guostarsect/guotables.py';

export function norm360(lon) {
	const x = Number(lon) % 360;
	return x < 0 ? x + 360 : x;
}

export function signFromLon(lon) {
	const x = norm360(lon);
	const index = Math.trunc(x / 30) % 12;
	return { sign: SIGNS[index], signlon: x % 30, lon: x };
}

/** Half-open [start, end), matching pos[1] <= signlon < pos[2]. */
export function suFromSign(sign, signlon) {
	const term = TERM_SU27[sign];
	if (!term) return null;
	for (const pos of term) {
		if (pos[1] <= signlon && signlon < pos[2]) return pos[0];
	}
	return null;
}

export function suFromLon(lon) {
	const placed = signFromLon(lon);
	return suFromSign(placed.sign, placed.signlon);
}

function bodyLon(body) {
	if (!body || !Number.isFinite(body.lon)) return null;
	return body.lon;
}

export function deriveGuoStarSect(chart, options = {}) {
	const tradition = options.tradition === true;
	const objects = (chart && chart.objects) || {};
	const ascmc = (chart && chart.ascmc) || {};
	const su = {};
	const place = (id, body) => {
		const lon = bodyLon(body);
		if (lon == null) return;
		su[id] = suFromLon(lon);
	};
	for (const [id, body] of Object.entries(objects)) place(id, body);
	for (const [id, body] of Object.entries(ascmc)) place(id, body);

	const ids = tradition ? LIST_OBJECTS_TRADITIONAL : LIST_OBJECTS_NOCHIRON;
	const terms = copySu27();
	let lifesu = null;
	for (const id of ids) {
		const mansion = su[id];
		if (!mansion || !terms[mansion]) continue;
		const term = terms[mansion];
		term.planets.push(id);
		if (id === 'Moon') {
			lifesu = mansion;
			term.character.push(SU_CATEGORY_BIRTH[term.category]);
		}
	}

	const houses = [];
	if (lifesu) {
		const start = LIST_SU.indexOf(lifesu);
		const sulen = LIST_SU.length;
		let j = 0;
		for (let i = start; i < start + sulen; i += 1) {
			const term = terms[LIST_SU[i % sulen]];
			term.relation = LIST_SU_RELATION[j];
			term.sixhouse = null;
			j += 1;
			houses.push(term);
		}
		let s = 0;
		for (const obj of LIST_SU_SIXHOUSE) {
			const idx = (s + obj.count - 1) % sulen;
			houses[idx].sixhouse = obj.id;
		}
	}

	return {
		status: lifesu ? 'COMPUTED' : 'MISSING_INPUT',
		source: GUO_SOURCE,
		includesNiu: false,
		lifesu,
		su,
		houses,
	};
}
