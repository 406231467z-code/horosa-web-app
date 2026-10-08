/**
 * PHASE 5-A.3 adapter check.
 * TEST_ENVIRONMENT=node. The module is the same ESM file the browser smoke imports.
 * Oracle: HISTORICAL-GOLDEN realChartResult.json. Tolerance: field-map.json (1 arcsecond).
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { openEphemeris } from './browserEphemerisAdapter.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const goldenPath = join(
	repoRoot,
	'local', 'workspace', 'Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c',
	'astrostudyui', 'src', 'divination', 'engine', '__tests__', 'fixtures', 'realChartResult.json',
);
const fieldMap = JSON.parse(readFileSync(join(here, 'field-map.json'), 'utf8'));
const ARCSEC = fieldMap.tolerance.longitudeDeg;
const golden = JSON.parse(readFileSync(goldenPath, 'utf8'));

function angSep(a, b) {
	let d = Math.abs(a - b) % 360;
	if (d > 180) d = 360 - d;
	return d;
}

function byId(list, id) {
	return (list || []).find((row) => row && row.id === id) || null;
}

function classify(delta, limit) {
	if (!Number.isFinite(delta)) return 'UNAVAILABLE';
	return delta <= limit ? 'PASS' : 'FAIL';
}

test('browser ephemeris adapter matches the 1990 historical chart', async () => {
	const eph = await openEphemeris();
	try {
		const fromCalendar = eph.julianDayUt({
			year: 1990, month: 6, day: 15,
			hour: 10, minute: 30, second: 0,
			zoneOffsetHours: 8,
		});
		const historicalJd = golden.chart.date.jd;
		assert.ok(Math.abs(fromCalendar - historicalJd) < 1e-9, `JD ${fromCalendar} != historical ${historicalJd}`);

		const chart = eph.computeChart({
			jd: historicalJd,
			lat: golden.chart.geo.lat,
			lon: golden.chart.geo.lon,
			hsysIndex: golden.params.hsys,
		});

		const rows = [];
		for (const [id, got] of Object.entries(chart.planets)) {
			const prod = byId(golden.chart.objects, id);
			const fields = [
				['longitude', 'lon', angSep],
				['latitude', 'lat', (a, b) => Math.abs(a - b)],
				['speed', 'lonspeed', (a, b) => Math.abs(a - b)],
				['declination', 'decl', (a, b) => Math.abs(a - b)],
			];
			for (const [outKey, prodKey, deltaOf] of fields) {
				if (!prod || !Number.isFinite(prod[prodKey])) {
					rows.push({ field: `${id}.${outKey}`, status: 'NOT_COMPARABLE', reason: 'absent from HISTORICAL-GOLDEN' });
					continue;
				}
				if (!got || !Number.isFinite(got[outKey])) {
					rows.push({ field: `${id}.${outKey}`, status: 'UNAVAILABLE' });
					continue;
				}
				const delta = deltaOf(got[outKey], prod[prodKey]);
				const status = classify(delta, ARCSEC);
				rows.push({
					field: `${id}.${outKey}`,
					historical: prod[prodKey],
					browser: got[outKey],
					delta,
					deltaArcsec: delta * 3600,
					status,
					cause: status === 'FAIL' ? 'UNKNOWN' : null,
				});
			}
			if (prod && Number.isFinite(prod.lonspeed) && got) {
				const retro = got.retrograde === (prod.lonspeed < 0);
				rows.push({
					field: `${id}.retrograde`,
					historical: prod.lonspeed < 0,
					browser: got.retrograde,
					status: retro ? 'PASS' : 'FAIL',
					cause: retro ? null : 'HOROSA_DERIVATION',
				});
			}
		}

		const house = chart.houses;
		const asc = byId(golden.chart.objects, 'Asc');
		const mc = byId(golden.chart.objects, 'MC');
		const desc = byId(golden.chart.objects, 'Desc');
		const ic = byId(golden.chart.objects, 'IC');
		for (const [field, actual, expected] of [
			['ASC', house.asc, asc && asc.lon],
			['MC', house.mc, mc && mc.lon],
			['DSC', house.dsc, desc && desc.lon],
			['IC', house.ic, ic && ic.lon],
		]) {
			if (!Number.isFinite(expected)) {
				rows.push({ field, status: 'NOT_COMPARABLE' });
				continue;
			}
			const delta = angSep(actual, expected);
			rows.push({
				field,
				historical: expected,
				browser: actual,
				delta,
				deltaArcsec: delta * 3600,
				status: classify(delta, ARCSEC),
			});
		}
		for (let i = 1; i <= 12; i += 1) {
			const id = `House${i}`;
			const prod = byId(golden.chart.houses, id);
			const actual = house.cusps[id];
			if (!prod) {
				rows.push({ field: id, status: 'NOT_COMPARABLE' });
				continue;
			}
			const delta = angSep(actual, prod.lon);
			rows.push({
				field: `${id}.cusp`,
				historical: prod.lon,
				browser: actual,
				delta,
				deltaArcsec: delta * 3600,
				status: classify(delta, ARCSEC),
			});
		}

		const placidus = eph.computeChart({
			jd: historicalJd,
			lat: golden.chart.geo.lat,
			lon: golden.chart.geo.lon,
			hsysIndex: 3,
		});

		const rangeProbe = [1700, 1800, 1900, 1950, 1976, 1990, 2000, 2026, 2400, 2500].map((year) => {
			const jd = eph.julianDayUt({ year, month: 1, day: 1, hour: 12, minute: 0, second: 0, zoneOffsetHours: 0 });
			const sun = eph.computeChart({ jd, lat: 0, lon: 0, hsysIndex: 3 }).planets.Sun;
			return { year, jd, sunLongitude: sun && sun.longitude, finite: !!(sun && Number.isFinite(sun.longitude)) };
		});
		const edge = {
			midnight: eph.julianDayUt({ year: 1990, month: 6, day: 15, hour: 0, minute: 0, second: 0, zoneOffsetHours: 8 }),
			beforeMidnight: eph.julianDayUt({ year: 1990, month: 6, day: 15, hour: 23, minute: 59, second: 0, zoneOffsetHours: 8 }),
			nextMidnight: eph.julianDayUt({ year: 1990, month: 6, day: 16, hour: 0, minute: 0, second: 0, zoneOffsetHours: 8 }),
			zonePlus9: eph.julianDayUt({ year: 1990, month: 6, day: 15, hour: 10, minute: 30, second: 0, zoneOffsetHours: 9 }),
		};

		const report = {
			source: 'browser-sweph-experiment',
			label: 'HISTORICAL-GOLDEN',
			testEnvironment: 'node',
			package: 'swisseph-wasm@0.1.0',
			flags: 'SEFLG_SWIEPH | SEFLG_SPEED',
			declination: 'SEFLG_EQUATORIAL second calc_ut, index 1',
			toleranceDeg: ARCSEC,
			initMs: eph.initMs,
			calcMs: chart.calcMs,
			jd: chart.jd,
			jdFromCalendar: fromCalendar,
			sidereal: {
				status: 'NOT_COMPARABLE',
				reason: 'historical chart zodiacal is Tropical and siderealAyanamsa is empty',
				ayanamsaUtLahiriDefault: eph.ayanamsaUt(historicalJd),
			},
			houses: {
				regiomontanus: house.system,
				placidus: 'COMPUTED letter P; this golden is Regiomontanus, so Placidus cusps are NOT_COMPARABLE',
				placidusAsc: placidus.houses.asc,
				placidusMc: placidus.houses.mc,
			},
			dates: edge,
			ephemerisRangeProbe: rangeProbe,
			ephemerisDocumentedRange: 'swisseph-wasm README: bundled se1 approximately 1800-2400. Years outside that window are EPHEMERIS_DATA_RANGE_GAP even if calc_ut returns a number.',
			dst: 'Adapter uses the caller zone offset. This golden stores +08:00. No DST rules database.',
			rows,
			planets: chart.planets,
		};
		mkdirSync(join(here, 'results'), { recursive: true });
		writeFileSync(join(here, 'results', 'phase5a3-1990.json'), JSON.stringify(report, null, 2));

		const failed = rows.filter((row) => row.status === 'FAIL');
		assert.equal(failed.length, 0, JSON.stringify(failed, null, 2));
		assert.equal(golden.chart.zodiacal, 'Tropical');
		assert.ok(edge.beforeMidnight < edge.nextMidnight);
		assert.ok(Math.abs(Math.abs(edge.zonePlus9 - fromCalendar) - (1 / 24)) < 1e-9);
	} finally {
		await eph.close();
	}
});
