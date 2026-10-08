/**
 * PHASE 5-A.4 experimental chart builder.
 * TEST_ENVIRONMENT=node. Oracle: HISTORICAL-GOLDEN, tolerance from field-map.json.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { openEphemeris } from './browserEphemerisAdapter.js';
import { buildChart, buildSiderealReference, ChartBuilderError, NOT_IMPLEMENTED } from './browserChartBuilder.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const golden = JSON.parse(readFileSync(join(
	repoRoot,
	'local', 'workspace', 'Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c',
	'astrostudyui', 'src', 'divination', 'engine', '__tests__', 'fixtures', 'realChartResult.json',
), 'utf8'));
const fieldMap = JSON.parse(readFileSync(join(here, 'field-map.json'), 'utf8'));
const ARCSEC = fieldMap.tolerance.longitudeDeg;
const HISTORICAL = {
	date: '1990-06-15',
	time: '10:30:00',
	timezone: '+08:00',
	latitude: golden.chart.geo.lat,
	longitude: golden.chart.geo.lon,
	zodiacal: 'Tropical',
	siderealAyanamsa: '',
	houseSystem: golden.params.hsys,
	westNodeType: false,
	westLilithType: false,
};

function angSep(a, b) {
	let d = Math.abs(a - b) % 360;
	if (d > 180) d = 360 - d;
	return d;
}

function byId(list, id) {
	return (list || []).find((row) => row && row.id === id) || null;
}

function row(field, expected, actual, circular) {
	const delta = circular ? angSep(actual, expected) : Math.abs(actual - expected);
	return {
		field,
		historical: expected,
		browser: actual,
		delta,
		deltaArcsec: delta * 3600,
		status: delta <= ARCSEC ? 'PASS' : 'FAIL',
	};
}

test('experimental chart JSON matches the 1990 historical bodies and Regiomontanus houses', async () => {
	const eph = await openEphemeris();
	try {
		assert.throws(() => buildChart(eph, { ...HISTORICAL, timezone: 'Asia/Shanghai' }), (err) => err instanceof ChartBuilderError && err.code === 'INVALID_DATE');
		assert.throws(() => buildChart(eph, { ...HISTORICAL, houseSystem: 8 }), (err) => err instanceof ChartBuilderError && err.code === 'UNSUPPORTED_HOUSE');
		assert.throws(() => buildChart(eph, { ...HISTORICAL, zodiacal: 'Sidereal', siderealAyanamsa: 'lahiri' }), (err) => err.code === 'SIDEREAL_USE_REFERENCE');

		const chart = buildChart(eph, HISTORICAL);
		const again = JSON.parse(JSON.stringify(chart));
		assert.deepEqual(again, chart);
		assert.equal(chart.jd, golden.chart.date.jd);
		assert.equal(chart.meta.goldenType, 'EXPERIMENTAL');
		assert.equal(chart.meta.legacyReference, 'HISTORICAL-GOLDEN');
		for (const key of Object.keys(NOT_IMPLEMENTED)) assert.equal(chart.capability[key], 'NOT_IMPLEMENTED');
		assert.equal(JSON.stringify(chart).includes('"aspects":[]'), false);

		const rows = [];
		for (const id of ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'Dark Moon']) {
			const prod = byId(golden.chart.objects, id);
			const got = chart.objects[id];
			rows.push(row(`objects.${id}.lon`, prod.lon, got.lon, true));
			rows.push(row(`objects.${id}.lat`, prod.lat, got.lat, false));
			rows.push(row(`objects.${id}.lonspeed`, prod.lonspeed, got.lonspeed, false));
			rows.push(row(`objects.${id}.decl`, prod.decl, got.decl, false));
			rows.push({
				field: `objects.${id}.retrograde`,
				historical: prod.lonspeed < 0,
				browser: got.retrograde,
				delta: 0,
				status: got.retrograde === (prod.lonspeed < 0) ? 'PASS' : 'FAIL',
			});
		}
		for (const id of ['Asc', 'MC', 'Desc', 'IC']) {
			rows.push(row(`ascmc.${id}.lon`, byId(golden.chart.objects, id).lon, chart.ascmc[id].lon, true));
		}
		for (let i = 1; i <= 12; i += 1) {
			const id = `House${i}`;
			rows.push(row(`houses.cusps.${id}.lon`, byId(golden.chart.houses, id).lon, chart.houses.cusps[id].lon, true));
		}

		const placidus = buildChart(eph, { ...HISTORICAL, houseSystem: 3 });
		assert.equal(placidus.houses.system, 'Placidus');
		assert.equal(placidus.houses.letter, 'P');
		assert.ok(Number.isFinite(placidus.ascmc.Asc.lon));
		assert.notEqual(placidus.meta.siderealStatus, 'PARITY-PASS');

		const sidereal = buildSiderealReference(eph, HISTORICAL);
		assert.equal(sidereal.status, 'REFERENCE-ONLY');
		assert.notEqual(sidereal.sun.lon, chart.objects.Sun.lon);

		const smoke = {};
		for (const year of [1900, 1950, 1976, 1990, 2000, 2026]) {
			const built = buildChart(eph, {
				date: `${year}-01-01`,
				time: '12:00:00',
				timezone: '+00:00',
				latitude: 31.233333333333334,
				longitude: 121.46666666666667,
				zodiacal: 'Tropical',
				siderealAyanamsa: '',
				houseSystem: 3,
			});
			smoke[year] = {
				jd: built.jd,
				sun: built.objects.Sun.lon,
				moon: built.objects.Moon.lon,
				asc: built.ascmc.Asc.lon,
				mc: built.ascmc.MC.lon,
				houses: built.houses.system,
				status: year === 1990 ? 'PARITY-PASS on the June chart only; this January row is SMOKE' : 'SMOKE',
			};
			assert.ok(Number.isFinite(built.jd));
			assert.ok(Number.isFinite(built.objects.Sun.lon));
			assert.ok(Number.isFinite(built.objects.Moon.lon));
			assert.ok(Number.isFinite(built.ascmc.Asc.lon));
			assert.ok(Number.isFinite(built.ascmc.MC.lon));
			assert.equal(Object.keys(built.houses.cusps).length, 12);
		}

		const failed = rows.filter((item) => item.status !== 'PASS');
		mkdirSync(join(here, 'results'), { recursive: true });
		writeFileSync(join(here, 'results', 'phase5a4-1990.json'), JSON.stringify({
			label: 'EXPERIMENTAL',
			legacyReference: 'HISTORICAL-GOLDEN',
			rows,
			placidus: { system: placidus.houses.system, asc: placidus.ascmc.Asc.lon, mc: placidus.ascmc.MC.lon, parity: 'NOT_COMPARABLE' },
			sidereal,
			smoke,
		}, null, 2));
		assert.equal(failed.length, 0, JSON.stringify(failed, null, 2));
		assert.equal(chart.houses.system, 'Regiomontanus');
	} finally {
		await eph.close();
	}
});
