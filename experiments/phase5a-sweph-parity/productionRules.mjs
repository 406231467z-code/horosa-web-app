/**
 * Production house / aspect / lot rules, copied from flatlib-ctrad2 and perchart.
 * Used only to compare a stored chart. Does not replace PerChart.
 */
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const RULER = {
	Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
	Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
	Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};
const ORB = {
	Sun: 15, Moon: 12, Mercury: 7, Venus: 8, Mars: 8, Jupiter: 9, Saturn: 9,
	Uranus: 5, Neptune: 5, Pluto: 5, Chiron: 5,
	'North Node': 12, 'South Node': 12,
	'Syzygy': 0, 'Pars Fortuna': 0, Asc: 0, Desc: 0, MC: 0, IC: 0,
	Pholus: 3, Ceres: 3, Pallas: 3, Juno: 3, Vesta: 3,
	MoonSun: 0, JupiterVenus: 0, SaturnMars: 0,
};
const PLANETS10 = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const CONJUNCTION_ONLY = new Set([
	'Pars Fortuna', 'Purple Clouds', 'Dark Moon', 'North Node', 'South Node',
	'MoonSun', 'SaturnMars', 'JupiterVenus',
]);
const VIRTUAL = new Set([
	'Dark Moon', 'Purple Clouds', 'North Node', 'South Node', 'Pars Fortuna', 'Syzygy',
	'MC', 'IC', 'Asc', 'Desc',
]);
const MAJOR = [0, 60, 90, 120, 180];
const ASP_LIST = [0, 60, 90, 120, 180, 45];
const EXACT_ORB = 0.3;
const HOUSE_OFFSET = -5;

export function norm(a) {
	return ((a % 360) + 360) % 360;
}

export function distance(a, b) {
	return norm(b - a);
}

export function closest(a, b) {
	const d = norm(b - a);
	return d <= 180 ? d : d - 360;
}

function signOf(lon) {
	return SIGNS[Math.floor(norm(lon) / 30) % 12];
}

export function assignHouse(lon, houses, offset = HOUSE_OFFSET) {
	const ordered = houses.slice().sort((a, b) => Number(String(a.id).slice(5)) - Number(String(b.id).slice(5)));
	for (const house of ordered) {
		const whole = house.hsys === 'Whole Sign';
		const start = whole ? house.lon : house.lon + offset;
		if (distance(start, lon) < house.size) return house.id;
	}
	return null;
}

export function housesFromCusps(cusps, hsysName) {
	const houses = [];
	for (let i = 1; i <= 12; i += 1) {
		const lon = cusps[i];
		const next = cusps[i === 12 ? 1 : i + 1];
		houses.push({
			id: `House${i}`,
			lon,
			size: distance(lon, next),
			hsys: hsysName,
		});
	}
	return houses;
}

const FORMULAS = {
	'Pars Fortuna': [['Sun', 'Moon', 'Asc'], ['Moon', 'Sun', 'Asc']],
	'Pars Spirit': [['Moon', 'Sun', 'Asc'], ['Sun', 'Moon', 'Asc']],
	'Pars Faith': [['Moon', 'Mercury', 'Asc'], ['Mercury', 'Moon', 'Asc']],
	'Pars Substance': [['$RHouse2', 'House2', 'Asc'], ['$RHouse2', 'House2', 'Asc']],
	'Pars Wedding [Male]': [['Saturn', 'Venus', 'Asc'], ['Saturn', 'Venus', 'Asc']],
	'Pars Wedding [Female]': [['Venus', 'Saturn', 'Asc'], ['Venus', 'Saturn', 'Asc']],
	'Pars Sons': [['Jupiter', 'Saturn', 'Asc'], ['Saturn', 'Jupiter', 'Asc']],
	'Pars Father': [['Sun', 'Saturn', 'Asc'], ['Saturn', 'Sun', 'Asc']],
	'Pars Mother': [['Venus', 'Moon', 'Asc'], ['Moon', 'Venus', 'Asc']],
	'Pars Brothers': [['Saturn', 'Jupiter', 'Asc'], ['Saturn', 'Jupiter', 'Asc']],
	'Pars Diseases': [['Saturn', 'Mars', 'Asc'], ['Mars', 'Saturn', 'Asc']],
	'Pars Death': [['Moon', 'House8', 'Saturn'], ['Moon', 'House8', 'Saturn']],
	'Pars Travel': [['$RHouse9', 'House9', 'Asc'], ['$RHouse9', 'House9', 'Asc']],
	'Pars Friends': [['Moon', 'Mercury', 'Asc'], ['Moon', 'Mercury', 'Asc']],
	'Pars Enemies': [['$RHouse12', 'House12', 'Asc'], ['$RHouse12', 'House12', 'Asc']],
	'Pars Saturn': [['Saturn', 'Pars Fortuna', 'Asc'], ['Pars Fortuna', 'Saturn', 'Asc']],
	'Pars Jupiter': [['Pars Spirit', 'Jupiter', 'Asc'], ['Jupiter', 'Pars Spirit', 'Asc']],
	'Pars Mars': [['Mars', 'Pars Fortuna', 'Asc'], ['Pars Fortuna', 'Mars', 'Asc']],
	'Pars Venus': [['Pars Spirit', 'Venus', 'Asc'], ['Venus', 'Pars Spirit', 'Asc']],
	'Pars Mercury': [['Mercury', 'Pars Fortuna', 'Asc'], ['Pars Fortuna', 'Mercury', 'Asc']],
	'Pars Horsemanship': [['Saturn', 'Moon', 'Asc'], ['Moon', 'Saturn', 'Asc']],
	'Pars Life': [['Syzygy', 'Moon', 'Asc'], ['Syzygy', 'Moon', 'Asc']],
	'Pars Radix': [['Moon', 'Syzygy', 'Asc'], ['Moon', 'Syzygy', 'Asc']],
	'Pars Eros': [['Venus', 'Pars Spirit', 'Asc'], ['Pars Spirit', 'Venus', 'Asc']],
	'Pars Necessity': [['Mercury', 'Pars Fortuna', 'Asc'], ['Pars Fortuna', 'Mercury', 'Asc']],
	'Pars Courage': [['Mars', 'Pars Fortuna', 'Asc'], ['Pars Fortuna', 'Mars', 'Asc']],
	'Pars Victory': [['Jupiter', 'Pars Spirit', 'Asc'], ['Pars Spirit', 'Jupiter', 'Asc']],
	'Pars Nemesis': [['Saturn', 'Pars Fortuna', 'Asc'], ['Pars Fortuna', 'Saturn', 'Asc']],
	'Pars Basis': null,
	'Pars Exaltation': null,
	'Pars Sons Valens': [['Jupiter', 'Mercury', 'Asc'], ['Mercury', 'Jupiter', 'Asc']],
	'Pars Daughters': [['Jupiter', 'Venus', 'Asc'], ['Venus', 'Jupiter', 'Asc']],
	'Pars Praxis': [['Mercury', 'Mars', 'Asc'], ['Mars', 'Mercury', 'Asc']],
	'Pars Wedding Dorothean': [['Sun', 'Venus', 'Asc'], ['Venus', 'Sun', 'Asc']],
};

function objLon(id, bodies, diurnal) {
	if (id.startsWith('$R')) {
		const houseId = id.slice(2);
		const house = bodies.get(houseId);
		if (!house) return null;
		const ruler = RULER[signOf(house.lon)];
		const r = bodies.get(ruler);
		return r ? r.lon : null;
	}
	if (id.startsWith('Pars')) return partLon(id, bodies, diurnal);
	const obj = bodies.get(id);
	return obj ? obj.lon : null;
}

function partLon(id, bodies, diurnal) {
	if (id === 'Pars Basis') {
		const f = partLon('Pars Fortuna', bodies, diurnal);
		const s = partLon('Pars Spirit', bodies, diurnal);
		const asc = objLon('Asc', bodies, diurnal);
		if (f === null || s === null || asc === null) return null;
		let arc = norm(s - f);
		arc = Math.min(arc, 360 - arc);
		return asc + arc;
	}
	if (id === 'Pars Exaltation') {
		const asc = objLon('Asc', bodies, diurnal);
		if (asc === null) return null;
		if (diurnal) {
			const sun = objLon('Sun', bodies, diurnal);
			return sun === null ? null : asc + (19 - sun);
		}
		const moon = objLon('Moon', bodies, diurnal);
		return moon === null ? null : asc + (33 - moon);
	}
	const row = FORMULAS[id];
	if (!row) return null;
	const abc = diurnal ? row[0] : row[1];
	const a = objLon(abc[0], bodies, diurnal);
	const b = objLon(abc[1], bodies, diurnal);
	const c = objLon(abc[2], bodies, diurnal);
	if (a === null || b === null || c === null) return null;
	return c + b - a;
}

export function fillLots(bodies, diurnal, ids) {
	const out = [];
	for (const id of ids) {
		const lon = partLon(id, bodies, diurnal);
		if (lon === null) {
			out.push({ id, lon: null, missing: true });
			continue;
		}
		const n = norm(lon);
		bodies.set(id, {
			id, lon: n, lat: 0, lonspeed: 0, sign: signOf(n), signlon: n % 30, type: 'Arabic Part',
		});
		out.push({ id, lon: n, missing: false });
	}
	return out;
}

function orbOf(id) {
	return Object.prototype.hasOwnProperty.call(ORB, id) ? ORB[id] : 0;
}

function isPlanet(obj) {
	return obj && obj.type === 'Planet';
}

function aspectDict(active, passive, aspList) {
	if (active.id === passive.id || active.id === 'Syzygy') return null;
	const sep = closest(active.lon, passive.lon);
	const absSep = Math.abs(sep);
	for (const asp of aspList) {
		const orb = Math.abs(absSep - asp);
		if (MAJOR.includes(asp)) {
			if (orbOf(active.id) < orb && orbOf(passive.id) < orb) continue;
		} else if (orb > 3) continue;
		if (CONJUNCTION_ONLY.has(active.id) && asp !== 0) continue;
		return { type: asp, orb, separation: sep };
	}
	return null;
}

function aspectProps(active, passive, aspDict) {
	const orb = aspDict.orb;
	const asp = aspDict.type;
	const sep = aspDict.separation;
	const prop1 = { id: active.id, inOrb: false, movement: 'None' };
	const prop2 = { id: passive.id, inOrb: false, movement: 'None' };
	prop1.inOrb = orb <= orbOf(active.id);
	prop2.inOrb = orb <= orbOf(passive.id);
	const orbDir = sep >= 0 ? sep - asp : sep + asp;
	if (Math.abs(orbDir) < EXACT_ORB) {
		prop1.movement = 'Exact';
		prop2.movement = 'Exact';
	} else {
		prop1.movement = 'Separative';
		if (isPlanet(active)) {
			const direct = active.lonspeed > 0.0003;
			const retro = active.lonspeed < -0.0003;
			if ((orbDir > 0 && direct) || (orbDir < 0 && retro)) prop1.movement = 'Applicative';
			else if (Math.abs(active.lonspeed) < 0.0003) prop1.movement = 'Stationary';
		}
		const speed2 = isPlanet(passive) ? passive.lonspeed : 0;
		const sameDir = isPlanet(active) ? active.lonspeed * speed2 >= 0 : true;
		if (!sameDir) prop2.movement = prop1.movement;
	}
	return { type: asp, orb, active: prop1, passive: prop2 };
}

function getAspect(a, b, aspList) {
	const speed1 = isPlanet(a) ? Math.abs(a.lonspeed) : -1;
	const speed2 = isPlanet(b) ? Math.abs(b.lonspeed) : -1;
	const active = speed1 > speed2 ? a : b;
	const passive = active === a ? b : a;
	const dict = aspectDict(active, passive, aspList);
	if (!dict) return null;
	return aspectProps(active, passive, dict);
}

function roleOf(asp, id) {
	if (asp.active.id === id) return asp.active;
	if (asp.passive.id === id) return asp.passive;
	return null;
}

export function normalAspects(bodies, starters) {
	const targets = PLANETS10.filter((id) => bodies.has(id));
	const res = {};
	for (const id of starters) {
		if (VIRTUAL.has(id)) continue;
		const item = bodies.get(id);
		if (!item || item.type === 'Arabic Part') continue;
		const buckets = { Exact: [], Applicative: [], Separative: [], None: [], Obvious: [] };
		for (const other of targets) {
			if (other === id) continue;
			const asp = getAspect(item, bodies.get(other), ASP_LIST);
			if (!asp) continue;
			const role = roleOf(asp, id);
			if (!role || !role.inOrb) continue;
			buckets[role.movement].push({ id: other, asp: asp.type, orb: asp.orb });
		}
		for (const key of ['Exact', 'Applicative', 'None', 'Separative']) {
			for (const row of buckets[key]) {
				if (key === 'Exact' || row.orb <= 3) buckets.Obvious.push(row);
			}
		}
		res[id] = buckets;
	}
	return res;
}

export function signAspects(bodies) {
	const res = {};
	for (const a of PLANETS10) {
		const pa = bodies.get(a);
		if (!pa) continue;
		const ia = SIGNS.indexOf(pa.sign);
		res[a] = [];
		for (const b of PLANETS10) {
			if (a === b) continue;
			const pb = bodies.get(b);
			if (!pb) continue;
			const ib = SIGNS.indexOf(pb.sign);
			let delta = ia - ib;
			if (delta < 0) delta += 12;
			const asp = { 0: 0, 2: 60, 3: 90, 4: 120, 6: 180, 8: 120, 9: 90, 10: 60 }[delta];
			if (asp === undefined) continue;
			res[a].push({ asp, id: b });
		}
		res[a].sort((x, y) => x.asp - y.asp);
	}
	return res;
}

export function immediateAspects(bodies, starters) {
	const full = normalAspects(bodies, starters);
	const res = {};
	for (const id of starters) {
		if (VIRTUAL.has(id)) continue;
		const buckets = full[id];
		if (!buckets) continue;
		const applications = buckets.Applicative.concat(buckets.Exact.filter((row) => row.orb >= 0))
			.slice()
			.sort((a, b) => a.orb - b.orb);
		const separations = buckets.Separative.slice().sort((a, b) => a.orb - b.orb);
		const major = (row) => MAJOR.includes(row.asp);
		const sep = separations.find(major) || null;
		const app = applications.find(major) || null;
		if (sep || app) res[id] = [sep, app];
	}
	return res;
}

export { PLANETS10, HOUSE_OFFSET, FORMULAS };
