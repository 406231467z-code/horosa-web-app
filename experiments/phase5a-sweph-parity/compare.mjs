/**
 * PHASE 5-A parity. Loads swisseph-wasm from the PHASE 4-D experiment.
 * Does not import astrostudyui. Does not invent PerChart numbers.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const uiRoot = join(
	repoRoot,
	'local',
	'workspace',
	'Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c',
	'astrostudyui',
);
const goldenPath = join(
	uiRoot,
	'src',
	'divination',
	'engine',
	'__tests__',
	'fixtures',
	'realChartResult.json',
);
const sweUrl = pathToFileURL(join(
	here,
	'..',
	'phase4d-sweph-wasm',
	'node_modules',
	'swisseph-wasm',
	'src',
	'swisseph.js',
)).href;

const ARCSEC = 1 / 3600;
const TOL = {
	lon: ARCSEC,
	lat: ARCSEC,
	speed: ARCSEC,
	cusp: ARCSEC,
	angle: ARCSEC,
};

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const PLANETS = [
	['Sun', 'SE_SUN'],
	['Moon', 'SE_MOON'],
	['Mercury', 'SE_MERCURY'],
	['Venus', 'SE_VENUS'],
	['Mars', 'SE_MARS'],
	['Jupiter', 'SE_JUPITER'],
	['Saturn', 'SE_SATURN'],
	['North Node', 'SE_MEAN_NODE'],
];
const LEAK = /swisseph-wasm|@swisseph\/browser|@swisseph\/node/;

function assertNotInApp() {
	const pkg = JSON.parse(readFileSync(join(uiRoot, 'package.json'), 'utf8'));
	const declared = JSON.stringify({
		dependencies: pkg.dependencies || {},
		devDependencies: pkg.devDependencies || {},
	});
	if (LEAK.test(declared)) {
		throw new Error('swisseph wasm package is declared in astrostudyui/package.json');
	}
	const hits = [];
	const walk = (dir) => {
		for (const name of readdirSync(dir)) {
			if (name === 'node_modules' || name === 'dist' || name === 'dist-file' || name === '.umi') continue;
			const full = join(dir, name);
			if (statSync(full).isDirectory()) {
				walk(full);
				continue;
			}
			if (!/\.(js|jsx|ts|tsx|json)$/.test(name)) continue;
			if (LEAK.test(readFileSync(full, 'utf8'))) hits.push(relative(uiRoot, full));
		}
	};
	walk(join(uiRoot, 'src'));
	if (hits.length) {
		throw new Error(`swisseph wasm imported from astrostudyui/src: ${hits.join(', ')}`);
	}
}

function angSep(a, b) {
	let d = Math.abs(a - b) % 360;
	if (d > 180) d = 360 - d;
	return d;
}

function signOf(lon) {
	const x = ((lon % 360) + 360) % 360;
	return SIGNS[Math.floor(x / 30) % 12];
}

function signlonOf(lon) {
	const x = ((lon % 360) + 360) % 360;
	return x % 30;
}

function percentile(sorted, p) {
	if (!sorted.length) return null;
	const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
	return sorted[idx];
}

function byId(list, id) {
	return (list || []).find((o) => o && o.id === id) || null;
}

async function main() {
	assertNotInApp();
	const { default: SwissEph } = await import(sweUrl);
	const fixtures = JSON.parse(readFileSync(join(here, 'fixtures.json'), 'utf8'));
	const goldenRaw = readFileSync(goldenPath);
	const golden = JSON.parse(goldenRaw.toString('utf8'));
	const goldenSha = createHash('sha256').update(goldenRaw).digest('hex');

	const chart = golden.chart || {};
	const objects = chart.objects || [];
	const houses = chart.houses || [];
	const jd = chart.date && chart.date.jd;
	const lat = chart.geo && chart.geo.lat;
	const lon = chart.geo && chart.geo.lon;
	if (!Number.isFinite(jd) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
		throw new Error('historical golden is missing jd or geo');
	}

	const swe = new SwissEph();
	const tInit = performance.now();
	await swe.initSwissEph();
	const initMs = performance.now() - tInit;
	const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;

	const one = () => {
		const rows = PLANETS.map(([name, key]) => {
			const got = swe.calc_ut(jd, swe[key], flags);
			return {
				id: name,
				lon: got[0],
				lat: got[1],
				speed: got[3],
			};
		});
		const h = swe.houses(jd, lat, lon, 'R');
		return { rows, asc: h.ascmc[0], mc: h.ascmc[1], cusps: Array.from(h.cusps) };
	};

	const t1 = performance.now();
	const wasm = one();
	const singleMs = performance.now() - t1;
	const t10 = performance.now();
	for (let i = 0; i < 10; i += 1) one();
	const tenMs = performance.now() - t10;
	const t100 = performance.now();
	for (let i = 0; i < 100; i += 1) one();
	const hundredMs = performance.now() - t100;
	swe.close();

	const fields = [];
	const angular = [];
	for (const row of wasm.rows) {
		const prod = byId(objects, row.id);
		if (!prod) {
			fields.push({ field: `${row.id}.*`, status: 'FAIL', reason: 'NOT PRESENT IN PRODUCTION' });
			continue;
		}
		const dLon = angSep(prod.lon, row.lon);
		const dLat = Math.abs(Number(prod.lat) - row.lat);
		const dSpd = Math.abs(Number(prod.lonspeed) - row.speed);
		angular.push(dLon, dLat);
		const lonOk = dLon <= TOL.lon;
		const latOk = dLat <= TOL.lat;
		const spdOk = dSpd <= TOL.speed;
		const signOk = prod.sign === signOf(row.lon);
		const retroProd = Number(prod.lonspeed) < 0;
		const retroWasm = row.speed < 0;
		fields.push({
			field: `${row.id}.lon`,
			production: prod.lon,
			wasm: row.lon,
			deltaDeg: dLon,
			deltaArcsec: dLon * 3600,
			status: lonOk ? 'PASS' : 'FAIL',
		});
		fields.push({
			field: `${row.id}.lat`,
			production: prod.lat,
			wasm: row.lat,
			deltaDeg: dLat,
			deltaArcsec: dLat * 3600,
			status: latOk ? 'PASS' : 'FAIL',
		});
		fields.push({
			field: `${row.id}.lonspeed`,
			production: prod.lonspeed,
			wasm: row.speed,
			deltaDegPerDay: dSpd,
			deltaArcsecPerDay: dSpd * 3600,
			status: spdOk ? 'PASS' : 'FAIL',
		});
		fields.push({
			field: `${row.id}.sign`,
			production: prod.sign,
			wasm: signOf(row.lon),
			status: signOk ? 'PASS' : 'FAIL',
		});
		fields.push({
			field: `${row.id}.signlon`,
			production: prod.signlon,
			wasm: signlonOf(row.lon),
			deltaDeg: angSep(Number(prod.signlon), signlonOf(row.lon)),
			status: angSep(Number(prod.signlon), signlonOf(row.lon)) <= TOL.lon ? 'PASS' : 'FAIL',
		});
		fields.push({
			field: `${row.id}.retrograde`,
			production: retroProd,
			wasm: retroWasm,
			status: retroProd === retroWasm ? 'PASS' : 'FAIL',
		});
		fields.push({
			field: `${row.id}.house`,
			production: prod.house ?? null,
			wasm: null,
			status: 'MISSING',
		});
	}

	const asc = byId(objects, 'Asc');
	const mc = byId(objects, 'MC');
	const dAsc = asc ? angSep(asc.lon, wasm.asc) : null;
	const dMc = mc ? angSep(mc.lon, wasm.mc) : null;
	if (dAsc !== null) angular.push(dAsc);
	if (dMc !== null) angular.push(dMc);
	fields.push({
		field: 'Asc.lon',
		production: asc && asc.lon,
		wasm: wasm.asc,
		deltaArcsec: dAsc === null ? null : dAsc * 3600,
		status: asc && dAsc <= TOL.angle ? 'PASS' : 'FAIL',
	});
	fields.push({
		field: 'MC.lon',
		production: mc && mc.lon,
		wasm: wasm.mc,
		deltaArcsec: dMc === null ? null : dMc * 3600,
		status: mc && dMc <= TOL.angle ? 'PASS' : 'FAIL',
	});

	for (let i = 1; i <= 12; i += 1) {
		const prod = byId(houses, `House${i}`);
		const got = wasm.cusps[i];
		const d = prod ? angSep(prod.lon, got) : null;
		if (d !== null) angular.push(d);
		fields.push({
			field: `House${i}.lon`,
			production: prod && prod.lon,
			wasm: got,
			deltaArcsec: d === null ? null : d * 3600,
			status: prod && d <= TOL.cusp ? 'PASS' : 'FAIL',
		});
	}

	const derived = {
		aspects: golden.aspects ? 'MISSING' : 'NOT PRESENT IN PRODUCTION',
		lots: golden.lots ? 'MISSING' : 'NOT PRESENT IN PRODUCTION',
		sidereal: chart.zodiacal === 'Sidereal' ? 'MISSING' : 'NOT PRESENT IN THIS GOLDEN',
		returns: 'NOT PRESENT IN THIS GOLDEN',
		nongli: chart.nongli ? 'MISSING' : 'NOT PRESENT IN THIS GOLDEN',
		housePlacement: 'MISSING',
	};

	const sorted = angular.slice().sort((a, b) => a - b);
	const worst = fields
		.filter((f) => typeof f.deltaArcsec === 'number')
		.sort((a, b) => b.deltaArcsec - a.deltaArcsec)[0] || null;
	const compared = fields.filter((f) => f.status === 'PASS' || f.status === 'FAIL');
	const failed = compared.filter((f) => f.status === 'FAIL');
	const withGolden = fixtures.fixtures.filter((f) => f.golden);
	const withoutGolden = fixtures.fixtures.filter((f) => !f.golden);

	const report = {
		verdict: 'BLOCKED',
		reasons: [
			'BACKEND GOLDEN CAPTURE BLOCKED',
			'ports 9999 and 8899 were down',
			'python 3.14 has no swisseph, flatlib, or jsonpickle',
			'astrostudyboot.jar is not built',
			'only one HISTORICAL GOLDEN exists, so the fixture matrix has no production numbers',
			failed.length ? `${failed.length} historical fields failed the predeclared 1-arcsecond tolerance` : 'historical angular fields met 1 arcsecond on the single stored chart',
			'aspects, lots, and house placement are MISSING from the WASM candidate',
		],
		golden: {
			kind: 'HISTORICAL GOLDEN',
			file: 'astrostudyui/src/divination/engine/__tests__/fixtures/realChartResult.json',
			sha256: goldenSha,
			birth: golden.params && golden.params.birth,
			zone: golden.params && golden.params.zone,
			hsys: chart.hsys,
			zodiacal: chart.zodiacal,
			jd,
			lat,
			lon,
			topLevelKeys: Object.keys(golden),
		},
		fixtureCount: fixtures.fixtures.length,
		fixturesWithGolden: withGolden.map((f) => f.id),
		fixturesWithoutGolden: withoutGolden.map((f) => f.id),
		toleranceArcsec: 1,
		toleranceWidened: false,
		angular: {
			n: sorted.length,
			maxDeg: sorted.length ? sorted[sorted.length - 1] : null,
			maxArcsec: sorted.length ? sorted[sorted.length - 1] * 3600 : null,
			medianArcsec: sorted.length ? percentile(sorted, 50) * 3600 : null,
			p95Arcsec: sorted.length ? percentile(sorted, 95) * 3600 : null,
			worstField: worst && worst.field,
			worstFixture: 'astro-moon / realChartResult.json',
		},
		fieldFailCount: failed.length,
		fieldPassCount: compared.filter((f) => f.status === 'PASS').length,
		missing: fields.filter((f) => f.status === 'MISSING').map((f) => f.field),
		derived,
		fields,
		performance: {
			label: 'NODE EXPERIMENT',
			notBrowser: true,
			initMs: Number(initMs.toFixed(2)),
			singleChartMs: Number(singleMs.toFixed(2)),
			tenChartsMs: Number(tenMs.toFixed(2)),
			hundredChartsMs: Number(hundredMs.toFixed(2)),
			backendRequestMs: null,
			backendNote: 'BACKEND GOLDEN CAPTURE BLOCKED',
		},
		productionDependency: false,
		productionChartChanged: false,
	};

	mkdirSync(join(here, 'results'), { recursive: true });
	writeFileSync(join(here, 'results', 'historical-1990.json'), JSON.stringify(report, null, 2));
	console.log(JSON.stringify({
		verdict: report.verdict,
		fieldPassCount: report.fieldPassCount,
		fieldFailCount: report.fieldFailCount,
		maxArcsec: report.angular.maxArcsec,
		medianArcsec: report.angular.medianArcsec,
		p95Arcsec: report.angular.p95Arcsec,
		worstField: report.angular.worstField,
		initMs: report.performance.initMs,
		singleChartMs: report.performance.singleChartMs,
		hundredChartsMs: report.performance.hundredChartsMs,
		fixturesWithGolden: report.fixturesWithGolden,
		fixtureCount: report.fixtureCount,
	}, null, 2));
	process.exit(report.verdict === 'BLOCKED' ? 2 : 0);
}

main().catch((err) => {
	console.error(err && err.stack ? err.stack : err);
	process.exit(1);
});
