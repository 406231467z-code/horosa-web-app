/**
 * PHASE 5-A.5 declination-parallel parity.
 * The algorithm is checked against historical declinations, then against browser declinations.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { deriveExperimentalChart } from './derived/chartV2.js';
import { deriveDeclParallel } from './derived/declinationBrowser.js';
import { experimentRoot, golden, historicalChart } from './derived/testlib.js';

function sameGroups(a, b) {
	return JSON.stringify(a) === JSON.stringify(b);
}

test('1990 declination parallels follow perchart.getParallel', async () => {
	const replayInput = {
		objects: Object.fromEntries(golden.chart.objects.filter((obj) => typeof obj.decl === 'number').map((obj) => [obj.id, obj])),
		ascmc: {},
		houses: { cusps: {} },
	};
	const replay = deriveDeclParallel(replayInput);
	const ruleRows = [
		{
			field: 'declParallel.parallel',
			expected: golden.declParallel.parallel,
			actual: replay.parallel,
			delta: 0,
			status: sameGroups(golden.declParallel.parallel, replay.parallel) ? 'PASS' : 'FAIL',
			failureClass: 'DECLINATION',
		},
		{
			field: 'declParallel.contraParallel',
			expected: golden.declParallel.contraParallel,
			actual: replay.contraParallel,
			delta: 0,
			status: sameGroups(golden.declParallel.contraParallel, replay.contraParallel) ? 'PASS' : 'FAIL',
			failureClass: 'DECLINATION',
		},
	];

	const { eph, chart } = await historicalChart();
	try {
		const actual = deriveDeclParallel(chart);
		const present = new Set(actual.bodies);
		const rows = [...ruleRows];
		for (const group of golden.declParallel.parallel) {
			const inside = group.every((id) => present.has(id));
			if (!inside) {
				rows.push({
					field: `parallel.${group.join('+')}`,
					expected: group,
					actual: null,
					delta: null,
					status: 'NOT_COMPARABLE',
					reason: 'group includes a body that is not on the browser chart',
				});
				continue;
			}
			const found = actual.parallel.some((got) => sameGroups(got, group));
			rows.push({
				field: `parallel.${group.join('+')}`,
				expected: group,
				actual: found ? group : actual.parallel,
				delta: found ? 0 : null,
				status: found ? 'PASS' : 'FAIL',
				failureClass: found ? undefined : 'DECLINATION',
			});
		}
		for (const group of actual.parallel) {
			const exact = golden.declParallel.parallel.some((got) => sameGroups(got, group));
			const subset = golden.declParallel.parallel.some((got) => group.every((id) => got.includes(id)));
			if (exact) continue;
			rows.push({
				field: `browser.parallel.${group.join('+')}`,
				expected: subset ? 'partial of a historical group' : null,
				actual: group,
				delta: null,
				status: subset ? 'NOT_COMPARABLE' : 'FAIL',
				failureClass: subset ? undefined : 'DECLINATION',
				reason: subset ? 'historical group also contains bodies absent from the browser chart' : 'pair is not a historical parallel',
			});
		}

		const v2 = deriveExperimentalChart(chart);
		assert.equal(v2.meta.stage, 'derived-experimental');
		assert.equal(v2.meta.legalReviewRequired, true);
		assert.equal(v2.derived.parans.status, 'RULE-INCOMPLETE');
		assert.equal(v2.derived.fixedStars.status, 'RULE-INCOMPLETE');
		assert.equal(v2.derived.nakshatras.status, 'NAKSHATRA_DATA_DEPENDENCY');
		assert.equal(Array.isArray(v2.derived.parans), false);
		assert.notEqual(v2.derived.aspects.status, 'NOT_IMPLEMENTED');

		const report = {
			label: 'WEB-EXPERIMENTAL-RESULT',
			oracle: 'HISTORICAL-GOLDEN',
			toleranceSource: actual.toleranceSource,
			rows,
			parans: v2.derived.parans,
			fixedStars: v2.derived.fixedStars,
			nakshatras: v2.derived.nakshatras,
		};
		mkdirSync(join(experimentRoot, 'results'), { recursive: true });
		writeFileSync(join(experimentRoot, 'results', 'phase5a5-1990-declparallel.json'), JSON.stringify(report, null, 2));
		const fails = rows.filter((row) => row.status === 'FAIL');
		assert.equal(fails.length, 0, JSON.stringify(fails, null, 2));
	} finally {
		eph.close();
	}
});
