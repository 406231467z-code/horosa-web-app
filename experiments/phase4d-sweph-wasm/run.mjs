/**
 * PHASE 4-D spike. Runs only from this folder.
 * Does not import astrostudyui, and astrostudyui must not import this package.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import SwissEph from 'swisseph-wasm';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const uiRoot = join(
	repoRoot,
	'local',
	'workspace',
	'Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c',
	'astrostudyui',
);

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
			const st = statSync(full);
			if (st.isDirectory()) {
				walk(full);
				continue;
			}
			if (!/\.(js|jsx|ts|tsx|json)$/.test(name)) continue;
			const text = readFileSync(full, 'utf8');
			if (LEAK.test(text)) hits.push(relative(uiRoot, full));
		}
	};
	walk(join(uiRoot, 'src'));
	if (hits.length) {
		throw new Error(`swisseph wasm imported from astrostudyui/src: ${hits.join(', ')}`);
	}
}

function sep(a, b) {
	let d = Math.abs(a - b) % 360;
	if (d > 180) d = 360 - d;
	return d;
}

const PLANETS = [
	['sun', 'SE_SUN'],
	['moon', 'SE_MOON'],
	['mercury', 'SE_MERCURY'],
	['venus', 'SE_VENUS'],
	['mars', 'SE_MARS'],
	['jupiter', 'SE_JUPITER'],
	['saturn', 'SE_SATURN'],
];

async function main() {
	assertNotInApp();
	const swe = new SwissEph();
	const t0 = performance.now();
	await swe.initSwissEph();
	const initMs = performance.now() - t0;

	// flatlib ChartTests instant: 1976/07/06 21:07 +08:00 → 13:07 UT.
	// GeoPos 26n05, 119e18.
	const jd = swe.julday(1976, 7, 6, 13 + 7 / 60);
	const lat = 26 + 5 / 60;
	const lon = 119 + 18 / 60;
	const swieph = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
	const moseph = swe.SEFLG_MOSEPH | swe.SEFLG_SPEED;

	const t1 = performance.now();
	const planets = PLANETS.map(([name, key]) => {
		const swiss = swe.calc_ut(jd, swe[key], swieph);
		const moshier = swe.calc_ut(jd, swe[key], moseph);
		return {
			name,
			swiephLon: swiss[0],
			moshierLon: moshier[0],
			arcsec: sep(swiss[0], moshier[0]) * 3600,
		};
	});
	const calcMs = performance.now() - t1;
	const houses = swe.houses(jd, lat, lon, 'P');
	swe.close();

	const maxArcsec = Math.max(...planets.map((p) => p.arcsec));
	const report = {
		package: 'swisseph-wasm@0.1.0',
		license: 'GPL-3.0-or-later',
		jd,
		initMs: Number(initMs.toFixed(1)),
		calcMs: Number(calcMs.toFixed(1)),
		planets: planets.map((p) => ({
			name: p.name,
			swiephLon: Number(p.swiephLon.toFixed(6)),
			moshierLon: Number(p.moshierLon.toFixed(6)),
			arcsec: Number(p.arcsec.toFixed(3)),
		})),
		maxArcsec: Number(maxArcsec.toFixed(3)),
		placidusAsc: Number(houses.ascmc[0].toFixed(6)),
		placidusMc: Number(houses.ascmc[1].toFixed(6)),
		productionChart: 'unchanged',
	};
	console.log(JSON.stringify(report, null, 2));
	if (!Number.isFinite(report.placidusAsc) || maxArcsec > 60) {
		throw new Error(`wasm positions diverged or failed: maxArcsec=${maxArcsec}`);
	}
}

main().catch((err) => {
	console.error(err && err.stack ? err.stack : err);
	process.exit(1);
});
