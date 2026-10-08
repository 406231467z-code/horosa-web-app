/**
 * PHASE 5-A.5 lot parity.
 * Longitudes are recomputed. Pars Life and Pars Radix stay MISSING_INPUT.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { deriveLots } from './derived/lotsBrowser.js';
import { experimentRoot, golden, historicalChart, numericRow } from './derived/testlib.js';

test('1990 browser lots match historical Arabic parts except Syzygy lots', async () => {
	const { eph, chart } = await historicalChart();
	try {
		const actual = deriveLots(chart);
		assert.equal(actual.diurnal, golden.chart.isDiurnal);
		const expected = new Map(golden.lots.map((row) => [row.id, row.lon]));
		const rows = [];
		for (const row of actual.lots) {
			if (row.status === 'MISSING_INPUT') {
				assert.equal(Object.prototype.hasOwnProperty.call(row, 'lon'), false);
				rows.push({
					field: `lots.${row.id}`,
					expected: expected.get(row.id),
					actual: row.status,
					delta: null,
					status: 'NOT_COMPARABLE',
					failureClass: 'LOT_FORMULA',
					reason: 'Syzygy is not on the browser chart',
				});
				continue;
			}
			assert.equal(row.status, 'COMPUTED');
			rows.push(numericRow(`lots.${row.id}`, expected.get(row.id), row.lon, true, 'LOT_FORMULA'));
		}
		const report = {
			label: 'WEB-EXPERIMENTAL-RESULT',
			oracle: 'HISTORICAL-GOLDEN',
			formulaSource: actual.formulaSource,
			diurnal: actual.diurnal,
			rows,
		};
		mkdirSync(join(experimentRoot, 'results'), { recursive: true });
		writeFileSync(join(experimentRoot, 'results', 'phase5a5-1990-lots.json'), JSON.stringify(report, null, 2));
		const fails = rows.filter((row) => row.status === 'FAIL');
		assert.equal(fails.length, 0, JSON.stringify(fails.slice(0, 8), null, 2));
	} finally {
		eph.close();
	}
});
