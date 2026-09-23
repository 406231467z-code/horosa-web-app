/**
 * Derived-field parity against the one historical chart.
 * Does not invent backend numbers and does not call /chart.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
	HOUSE_OFFSET,
	PLANETS10,
	assignHouse,
	fillLots,
	housesFromCusps,
	immediateAspects,
	normalAspects,
	signAspects,
} from './productionRules.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const goldenPath = join(
	repoRoot,
	'local', 'workspace', 'Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c',
	'astrostudyui', 'src', 'divination', 'engine', '__tests__', 'fixtures', 'realChartResult.json',
);
const sweUrl = pathToFileURL(join(
	here, '..', 'phase4d-sweph-wasm', 'node_modules', 'swisseph-wasm', 'src', 'swisseph.js',
)).href;
const ARCSEC = 1 / 3600;
const LOT_IDS = [
	'Pars Fortuna', 'Pars Spirit', 'Pars Faith', 'Pars Substance',
	'Pars Wedding [Male]', 'Pars Wedding [Female]', 'Pars Sons', 'Pars Father', 'Pars Mother',
	'Pars Brothers', 'Pars Diseases', 'Pars Death', 'Pars Travel', 'Pars Friends', 'Pars Enemies',
	'Pars Saturn', 'Pars Jupiter', 'Pars Mars', 'Pars Venus', 'Pars Mercury', 'Pars Horsemanship',
	'Pars Life', 'Pars Radix', 'Pars Eros', 'Pars Necessity', 'Pars Courage', 'Pars Victory',
	'Pars Nemesis', 'Pars Basis', 'Pars Exaltation', 'Pars Sons Valens', 'Pars Daughters',
	'Pars Praxis', 'Pars Wedding Dorothean',
];

function angSep(a, b) {
	let d = Math.abs(a - b) % 360;
	if (d > 180) d = 360 - d;
	return d;
}

function byId(list, id) {
	return (list || []).find((o) => o && o.id === id) || null;
}

function pairKey(row) {
	return `${row.id}|${row.asp}`;
}

async function main() {
	const golden = JSON.parse(readFileSync(goldenPath, 'utf8'));
	const chart = golden.chart;
	const { default: SwissEph } = await import(sweUrl);
	const swe = new SwissEph();
	await swe.initSwissEph();
	const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
	const jd = chart.date.jd;
	const ids = {
		Sun: 'SE_SUN', Moon: 'SE_MOON', Mercury: 'SE_MERCURY', Venus: 'SE_VENUS',
		Mars: 'SE_MARS', Jupiter: 'SE_JUPITER', Saturn: 'SE_SATURN',
		Uranus: 'SE_URANUS', Neptune: 'SE_NEPTUNE', Pluto: 'SE_PLUTO', Chiron: 'SE_CHIRON',
		'North Node': 'SE_MEAN_NODE',
		Pholus: 'SE_PHOLUS', Ceres: 'SE_CERES', Pallas: 'SE_PALLAS', Juno: 'SE_JUNO', Vesta: 'SE_VESTA',
	};
	const numeric = { Intp_Apog: 21, Intp_Perg: 22 };
	const wasmBodies = new Map();
	for (const [name, key] of Object.entries(ids)) {
		const got = swe.calc_ut(jd, swe[key], flags);
		if (!got || !Number.isFinite(got[0])) continue;
		wasmBodies.set(name, {
			id: name, lon: got[0], lat: got[1], lonspeed: got[3], type: 'Planet',
			sign: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][Math.floor((((got[0] % 360) + 360) % 360) / 30)],
		});
	}
	for (const [name, body] of Object.entries(numeric)) {
		const got = swe.calc_ut(jd, body, flags);
		if (!got || !Number.isFinite(got[0])) continue;
		wasmBodies.set(name, {
			id: name, lon: got[0], lat: got[1], lonspeed: got[3], type: 'Planet',
		});
	}
	const mid = (id, a, b) => {
		const o1 = wasmBodies.get(a);
		const o2 = wasmBodies.get(b);
		if (!o1 || !o2) return;
		let lon = (o1.lon + o2.lon) / 2;
		const lat = (o1.lat + o2.lat) / 2;
		if (Math.abs(lon - o1.lon) > 90) lon = (lon + 180) % 360;
		lon = ((lon % 360) + 360) % 360;
		wasmBodies.set(id, { id, lon, lat, lonspeed: 0, type: 'Middle' });
	};
	mid('MoonSun', 'Moon', 'Sun');
	mid('SaturnMars', 'Saturn', 'Mars');
	mid('JupiterVenus', 'Jupiter', 'Venus');
	const node = wasmBodies.get('North Node');
	wasmBodies.set('South Node', {
		id: 'South Node',
		lon: (node.lon + 180) % 360,
		lat: -node.lat,
		lonspeed: -node.lonspeed,
		type: 'Planet',
	});
	const houses = swe.houses(jd, chart.geo.lat, chart.geo.lon, 'R');
	swe.close();
	const asc = houses.ascmc[0];
	const mc = houses.ascmc[1];
	wasmBodies.set('Asc', { id: 'Asc', lon: asc, lonspeed: 0, type: 'Angle' });
	wasmBodies.set('MC', { id: 'MC', lon: mc, lonspeed: 0, type: 'Angle' });
	wasmBodies.set('Desc', { id: 'Desc', lon: (asc + 180) % 360, lonspeed: 0, type: 'Angle' });
	wasmBodies.set('IC', { id: 'IC', lon: (mc + 180) % 360, lonspeed: 0, type: 'Angle' });
	const wasmHouses = housesFromCusps(houses.cusps, 'Regiomontanus');
	for (const house of wasmHouses) wasmBodies.set(house.id, house);

	const prodHouses = chart.houses;
	const prodObjects = chart.objects;
	const selfHouse = [];
	for (const obj of prodObjects) {
		if (!obj || obj.house === undefined) continue;
		const got = assignHouse(obj.lon, prodHouses, HOUSE_OFFSET);
		selfHouse.push({ id: obj.id, production: obj.house, rule: got, ok: got === obj.house });
	}
	const selfFail = selfHouse.filter((row) => !row.ok);

	const wasmHouseRows = [];
	for (const name of [...PLANETS10, 'North Node', 'Asc', 'MC']) {
		const prod = byId(prodObjects, name);
		const body = wasmBodies.get(name);
		if (!prod || prod.house === undefined) {
			wasmHouseRows.push({ field: `${name}.house`, status: 'NOT PRESENT IN PRODUCTION' });
			continue;
		}
		const got = assignHouse(body.lon, wasmHouses, HOUSE_OFFSET);
		wasmHouseRows.push({
			field: `${name}.house`,
			backend: prod.house,
			wasm: got,
			status: got === prod.house ? 'PASS' : 'FAIL',
		});
	}

	const diurnal = chart.isDiurnal === true;
	const lotRows = fillLots(wasmBodies, diurnal, LOT_IDS);
	const prodLots = new Map((golden.lots || []).map((lot) => [lot.id, lot]));
	const lotCompare = lotRows.map((row) => {
		const prod = prodLots.get(row.id) || byId(chart.objects, row.id);
		if (!prod) return { field: row.id, status: 'NOT PRESENT IN PRODUCTION' };
		if (row.missing) return { field: row.id, status: 'MISSING', reason: 'formula input not computed by WASM' };
		const delta = angSep(prod.lon, row.lon);
		return {
			field: row.id,
			backend: prod.lon,
			wasm: row.lon,
			deltaArcsec: delta * 3600,
			tolerance: '1 arcsecond',
			status: delta <= ARCSEC ? 'PASS' : 'FAIL',
		};
	});

	const starters = prodObjects.map((obj) => obj.id);
	const wasmNormal = normalAspects(wasmBodies, starters);
	const prodNormal = (golden.aspects && golden.aspects.normalAsp) || {};
	const aspectRows = [];
	for (const id of Object.keys(prodNormal)) {
		if (!wasmBodies.has(id)) {
			aspectRows.push({ field: `normalAsp.${id}`, status: 'MISSING', reason: 'starter not computed by WASM' });
			continue;
		}
		for (const bucket of ['Exact', 'Applicative', 'Separative', 'None']) {
			const left = new Map((prodNormal[id][bucket] || []).map((row) => [pairKey(row), row]));
			const right = new Map(((wasmNormal[id] && wasmNormal[id][bucket]) || []).map((row) => [pairKey(row), row]));
			const keys = new Set([...left.keys(), ...right.keys()]);
			for (const key of keys) {
				const a = left.get(key);
				const b = right.get(key);
				if (!a || !b) {
					aspectRows.push({ field: `normalAsp.${id}.${bucket}.${key}`, backend: a || null, wasm: b || null, status: 'FAIL' });
					continue;
				}
				const d = Math.abs(a.orb - b.orb);
				aspectRows.push({
					field: `normalAsp.${id}.${bucket}.${key}`,
					backend: a.orb,
					wasm: b.orb,
					deltaArcsec: d * 3600,
					tolerance: '1 arcsecond',
					status: d <= ARCSEC ? 'PASS' : 'FAIL',
				});
			}
		}
	}

	const prodSign = (golden.aspects && golden.aspects.signAsp) || null;
	const wasmSign = signAspects(wasmBodies);
	const signRows = [];
	if (!prodSign) {
		signRows.push({ field: 'signAsp', status: 'NOT PRESENT IN PRODUCTION' });
	} else {
		for (const id of Object.keys(prodSign)) {
			const a = JSON.stringify(prodSign[id]);
			const b = JSON.stringify(wasmSign[id] || []);
			signRows.push({ field: `signAsp.${id}`, status: a === b ? 'PASS' : 'FAIL', backend: prodSign[id], wasm: wasmSign[id] || [] });
		}
	}

	const prodImm = (golden.aspects && golden.aspects.immediateAsp) || null;
	const wasmImm = immediateAspects(wasmBodies, Object.keys(prodImm || {}));
	const immRows = [];
	if (!prodImm) {
		immRows.push({ field: 'immediateAsp', status: 'NOT PRESENT IN PRODUCTION' });
	} else {
		for (const id of Object.keys(prodImm)) {
			const raw = prodImm[id];
			const pair = Array.isArray(raw) ? raw : [raw && raw[0], raw && raw[1]];
			const got = wasmImm[id] || [null, null];
			const same = JSON.stringify(pair.map((row) => row && { id: row.id, asp: row.asp }))
				=== JSON.stringify(got.map((row) => row && { id: row.id, asp: row.asp }));
			immRows.push({
				field: `immediateAsp.${id}`,
				backend: pair,
				wasm: got,
				status: same ? 'PASS' : 'FAIL',
			});
		}
	}

	const groups = {
		houseSelfCheckFail: selfFail.length,
		house: wasmHouseRows,
		lots: lotCompare,
		aspects: aspectRows,
		signAsp: signRows,
		immediateAsp: immRows,
	};
	const all = [...wasmHouseRows, ...lotCompare, ...aspectRows, ...signRows, ...immRows];
	const tally = { PASS: 0, FAIL: 0, MISSING: 0, 'NOT PRESENT': 0 };
	for (const row of all) {
		if (row.status === 'PASS') tally.PASS += 1;
		else if (row.status === 'FAIL') tally.FAIL += 1;
		else if (row.status === 'MISSING') tally.MISSING += 1;
		else tally['NOT PRESENT'] += 1;
	}

	const report = {
		golden: 'HISTORICAL GOLDEN',
		backendCapture: 'BACKEND GOLDEN CAPTURE BLOCKED',
		sidereal: 'NOT PRESENT IN THIS GOLDEN',
		houseOffsetDeg: HOUSE_OFFSET,
		diurnal: diurnal,
		tally,
		selfHouseFailSample: selfFail.slice(0, 8),
		groups,
	};
	mkdirSync(join(here, 'results'), { recursive: true });
	writeFileSync(join(here, 'results', 'derived-1990.json'), JSON.stringify(report, null, 2));
	console.log(JSON.stringify({
		tally,
		houseSelfCheckFail: selfFail.length,
		houseFail: wasmHouseRows.filter((r) => r.status === 'FAIL').map((r) => r.field),
		lotFail: lotCompare.filter((r) => r.status === 'FAIL').map((r) => r.field),
		lotMissing: lotCompare.filter((r) => r.status === 'MISSING').map((r) => r.field),
		aspectFail: aspectRows.filter((r) => r.status === 'FAIL').length,
		signFail: signRows.filter((r) => r.status === 'FAIL').length,
		immFail: immRows.filter((r) => r.status === 'FAIL').length,
	}, null, 2));
	process.exit(2);
}

main().catch((err) => {
	console.error(err && err.stack ? err.stack : err);
	process.exit(1);
});
