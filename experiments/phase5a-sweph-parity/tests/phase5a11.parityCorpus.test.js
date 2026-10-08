/**
 * PHASE 5-A.11 astrology parity corpus.
 * Only the 1990-06-15 tropical Regiomontanus chart has a HISTORICAL-GOLDEN oracle.
 * Other rows are browser calculations with no expected value.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { experimentRoot, HISTORICAL } from '../derived/testlib.js';
import { browserAstrologyProvider } from '../integration/browserAstrologyProvider.js';

function base(overrides) {
	return { ...HISTORICAL, ...overrides };
}

const CASES = [
	{ id: '1900-06-15', input: base({ date: '1900-06-15' }) },
	{ id: '1950-06-15', input: base({ date: '1950-06-15' }) },
	{ id: '1976-06-15', input: base({ date: '1976-06-15' }) },
	{ id: '2000-06-15', input: base({ date: '2000-06-15' }) },
	{ id: '2026-06-15', input: base({ date: '2026-06-15' }) },
	{ id: '1990-00:00', input: base({ time: '00:00:00' }) },
	{ id: '1990-23:59', input: base({ time: '23:59:00' }) },
	{ id: 'explicit-offset-+02', input: base({ timezone: '+02:00' }) },
	{ id: 'high-latitude', input: base({ latitude: 69.65, longitude: 18.96, timezone: '+01:00' }) },
	{ id: 'southern', input: base({ latitude: -33.8688, longitude: 151.2093, timezone: '+10:00' }) },
	{ id: 'placidus', input: base({ houseSystem: 3 }) },
];

test('parity corpus keeps 1990 as the only historical oracle and records the other charts', async () => {
	const rows = [];
	for (const item of CASES) {
		const got = await browserAstrologyProvider.calculateChart(item.input);
		assert.equal(got.status, 'GATED');
		assert.equal(got.productionReady, false);
		assert.ok(Number.isFinite(got.chart.meta.jd), item.id);
		assert.ok(Number.isFinite(got.chart.objects.Sun.lon), item.id);
		assert.ok(Number.isFinite(got.chart.ascmc.Asc.lon), item.id);
		assert.equal(Object.keys(got.chart.houses.cusps).length, 12, item.id);
		rows.push({
			field: item.id,
			expected: null,
			actual: {
				jd: got.chart.meta.jd,
				sun: got.chart.objects.Sun.lon,
				asc: got.chart.ascmc.Asc.lon,
			},
			delta: null,
			status: 'NOT_COMPARABLE',
			classification: 'DATA_SOURCE',
			reason: 'HISTORICAL-GOLDEN contains only 1990-06-15 10:30 +08:00 Regiomontanus',
			goldenType: 'WEB-EXPERIMENTAL',
		});
	}
	await assert.rejects(
		() => browserAstrologyProvider.calculateChart(base({ zodiacal: 'Sidereal', siderealAyanamsa: 'lahiri' })),
		(err) => err.code === 'UNSUPPORTED' && err.provider === 'browser',
	);
	rows.push({
		field: 'sidereal-lahiri',
		expected: null,
		actual: 'UNSUPPORTED',
		delta: null,
		status: 'NOT_COMPARABLE',
		classification: 'DATA_SOURCE',
		reason: 'no sidereal historical oracle; Lahiri stays reference-only',
		goldenType: 'WEB-EXPERIMENTAL',
	});
	mkdirSync(join(experimentRoot, 'results'), { recursive: true });
	writeFileSync(join(experimentRoot, 'results', 'phase5a11-parity-corpus.json'), JSON.stringify({
		label: 'WEB-EXPERIMENTAL',
		oracle: 'HISTORICAL-GOLDEN is 1990 only; see phase5a9.providerParity.test.js',
		liveGolden: 0,
		rows,
	}, null, 2));
	assert.equal(rows.filter((row) => row.status === 'NOT_COMPARABLE').length, rows.length);
	assert.equal(rows.some((row) => row.goldenType === 'LIVE-GOLDEN'), false);
});
