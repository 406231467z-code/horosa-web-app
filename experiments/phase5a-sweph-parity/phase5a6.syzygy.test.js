/**
 * PHASE 5-A.6 Syzygy, Pars Life, and Pars Radix.
 * The search uses adapter longitudes. The lot longitudes are recomputed.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { completeChartInputs } from './derived/completeInputs.js';
import { deriveLots } from './derived/lotsBrowser.js';
import { experimentRoot, golden, historicalChart, numericRow } from './derived/testlib.js';

function byId(id) {
	return golden.chart.objects.find((row) => row.id === id);
}

test('1990 syzygy and the two syzygy lots match the historical chart', async () => {
	const { eph, chart } = await historicalChart();
	try {
		const plain = deriveLots(chart);
		for (const id of ['Pars Life', 'Pars Radix']) {
			const row = plain.lots.find((item) => item.id === id);
			assert.equal(row.status, 'MISSING_INPUT');
			assert.equal(Object.prototype.hasOwnProperty.call(row, 'lon'), false);
		}

		const completed = completeChartInputs(eph, chart);
		const syzygy = completed.inputs.syzygy;
		const expected = byId('Syzygy');
		assert.ok(expected);
		assert.equal(syzygy.status, 'COMPUTED');
		assert.ok(syzygy.syzygyType === 'new-moon' || syzygy.syzygyType === 'full-moon');
		const rows = [
			numericRow('syzygy.longitude', expected.lon, syzygy.longitude, true, 'EPHEMERIS'),
			numericRow('syzygy.latitude', expected.lat, syzygy.latitude, false, 'EPHEMERIS'),
			numericRow('syzygy.declination', expected.decl, syzygy.declination, false, 'DECLINATION'),
			numericRow('syzygy.speed', expected.lonspeed, syzygy.speed, false, 'EPHEMERIS'),
		];
		const lots = deriveLots(completed);
		const expectedLots = new Map(golden.lots.map((row) => [row.id, row.lon]));
		for (const row of lots.lots) {
			if (row.status !== 'COMPUTED') {
				rows.push({ field: `lots.${row.id}`, expected: expectedLots.get(row.id), actual: row.status, delta: null, status: 'FAIL', failureClass: 'LOT_FORMULA' });
				continue;
			}
			rows.push(numericRow(`lots.${row.id}`, expectedLots.get(row.id), row.lon, true, 'LOT_FORMULA'));
		}
		const life = lots.lots.find((row) => row.id === 'Pars Life');
		const radix = lots.lots.find((row) => row.id === 'Pars Radix');
		assert.deepEqual(life.derivedFrom, ['Syzygy', 'Moon', 'Asc']);
		assert.deepEqual(radix.derivedFrom, ['Moon', 'Syzygy', 'Asc']);
		const report = {
			label: 'WEB-EXPERIMENTAL-RESULT',
			oracle: 'HISTORICAL-GOLDEN',
			syzygyType: syzygy.syzygyType,
			syzygyJd: syzygy.jd,
			ruleSource: syzygy.source,
			rows,
		};
		mkdirSync(join(experimentRoot, 'results'), { recursive: true });
		writeFileSync(join(experimentRoot, 'results', 'phase5a6-1990-syzygy.json'), JSON.stringify(report, null, 2));
		const fails = rows.filter((row) => row.status === 'FAIL');
		assert.equal(fails.length, 0, JSON.stringify(fails.slice(0, 8), null, 2));
		assert.ok(rows.filter((row) => row.field.startsWith('lots.') && row.status === 'PASS').length >= 33);
	} finally {
		eph.close();
	}
});
