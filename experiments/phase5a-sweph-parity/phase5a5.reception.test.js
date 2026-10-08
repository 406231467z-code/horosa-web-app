/**
 * PHASE 5-A.5 reception parity.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { deriveReception } from './derived/receptionBrowser.js';
import { experimentRoot, golden, historicalChart } from './derived/testlib.js';

function canon(list) {
	return JSON.stringify([...(list || [])].map((row) => JSON.stringify(row)).sort());
}

function row(field, expected, actual) {
	const same = canon(expected) === canon(actual);
	return {
		field,
		expected,
		actual,
		delta: same ? 0 : null,
		status: same ? 'PASS' : 'FAIL',
		failureClass: same ? undefined : 'RULER_TABLE',
	};
}

test('1990 browser receptions and mutuals match the historical chart', async () => {
	const { eph, chart } = await historicalChart();
	try {
		const actual = deriveReception(chart);
		const rows = [
			row('receptions.normal', golden.receptions.normal, actual.receptions.normal),
			row('receptions.abnormal', golden.receptions.abnormal, actual.receptions.abnormal),
			row('mutuals.normal', golden.mutuals.normal, actual.mutuals.normal),
			row('mutuals.abnormal', golden.mutuals.abnormal, actual.mutuals.abnormal),
		];
		const report = {
			label: 'WEB-EXPERIMENTAL-RESULT',
			oracle: 'HISTORICAL-GOLDEN',
			rulerSource: actual.rulerSource,
			rows,
		};
		mkdirSync(join(experimentRoot, 'results'), { recursive: true });
		writeFileSync(join(experimentRoot, 'results', 'phase5a5-1990-reception.json'), JSON.stringify(report, null, 2));
		const fails = rows.filter((item) => item.status === 'FAIL');
		assert.equal(fails.length, 0, JSON.stringify(fails, null, 2));
	} finally {
		eph.close();
	}
});
