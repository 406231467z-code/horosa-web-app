import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { deriveExperimentalChart } from '../derived/chartV2.js';
import { historicalChart } from '../derived/testlib.js';
import {
	calculateSu28,
	doubingMansionAt,
	doubingWidths,
	mansionAt,
} from '../derived/su28Browser.js';
import { MOIRA_CURRENT_STELLAR_DEGREES, MOIRA_KAIXI_STELLAR_DEGREES, SU28_ID_BY_NAME } from '../derived/su28Tables.js';

const here = dirname(fileURLToPath(import.meta.url));

test('su28 keeps each mode separate and blocks the star-catalog modes', async () => {
	const blocked0 = calculateSu28({ jd: 2448057.6, obliquityDeg: 23.4 }, 0);
	const blocked5 = calculateSu28({ jd: 2448057.6 }, 5);
	assert.equal(blocked0.status, 'LICENSE_BLOCKED');
	assert.equal(Object.prototype.hasOwnProperty.call(blocked0, 'entries'), false);
	assert.equal(blocked5.status, 'LICENSE_BLOCKED');
	assert.equal(calculateSu28({ jd: 1 }).mode, 0);
	assert.equal(calculateSu28({ jd: 1 }).status, 'LICENSE_BLOCKED');

	const widths = doubingWidths();
	assert.equal(widths.length, 28);
	const spanSum = widths.reduce((sum, row) => sum + row.spanDegrees, 0);
	assert.ok(Math.abs(spanSum - 360) < 1e-9);
	const mode1 = calculateSu28({}, 1);
	assert.equal(mode1.status, 'LICENSE_BLOCKED');
	assert.equal(mode1.placementStatus, 'LICENSE_BLOCKED');
	assert.equal(mode1.tableStatus, 'EXPERIMENTAL');
	assert.equal(Object.prototype.hasOwnProperty.call(mode1, 'entries'), false);
	const firstEnd = widths[0].spanDegrees;
	assert.equal(doubingMansionAt(0, 0), widths[0].name);
	assert.equal(doubingMansionAt(0, firstEnd - 1e-6), widths[0].name);
	assert.equal(doubingMansionAt(0, firstEnd), widths[1].name);

	const { eph, chart } = await historicalChart();
	try {
		const obliquityDeg = eph.obliquity(chart.jd);
		const ayanamsaDeg = eph.moiraAyanamsa(chart.jd);
		assert.equal(Number.isFinite(obliquityDeg), true);
		assert.equal(Number.isFinite(ayanamsaDeg), true);

		const mode2 = calculateSu28({ jd: chart.jd, obliquityDeg }, 2);
		const mode3 = calculateSu28({ ayanamsaDeg }, 3);
		const mode4 = calculateSu28({ ayanamsaDeg }, 4);
		const mode6 = calculateSu28({ year: 1990, precess: false }, 6);
		const mode6on = calculateSu28({ year: 1990, precess: true }, 6);
		const mode7 = calculateSu28({ anchor: 'dongzhi' }, 7);
		const mode7cf = calculateSu28({ anchor: 'chunfen' }, 7);
		const mode8 = calculateSu28({ jd: chart.jd, liveRaByName: { 牛: 0 } }, 8);

		for (const got of [mode2, mode3, mode4, mode6, mode7]) {
			assert.equal(got.status, 'EXPERIMENTAL', got.modeName);
			assert.equal(got.productionReady, false);
			assert.equal(got.entries.length, 28);
			assert.equal(got.entries.some((row) => row.name === '牛'), true);
		}
		assert.equal(mode2.reason, 'LICENSE_REVIEW_REQUIRED');
		assert.equal(mode2.productionReady, false);
		assert.equal(mode3.reason, 'LICENSE_REVIEW_REQUIRED');
		assert.equal(mode3.ayanamsaSource, 'caller');
		assert.equal(mode4.ayanamsaApplied, false);
		assert.equal(mode4.entries.find((row) => row.name === '娄').lon, MOIRA_CURRENT_STELLAR_DEGREES[0]);
		const kaixiLou = mode3.entries.find((row) => row.name === '娄').lon;
		const rawKaixi = ((MOIRA_KAIXI_STELLAR_DEGREES[0] + ayanamsaDeg) % 360 + 360) % 360;
		assert.ok(Math.abs(kaixiLou - rawKaixi) < 1e-9);
		assert.notEqual(mode2.entries[0].lon, mode4.entries[0].lon);
		assert.notEqual(mode6.entries[0].lon, mode6on.entries[0].lon);
		assert.equal(mode7.precess, false);
		assert.notEqual(mode7.entries[0].lon, mode7cf.entries[0].lon);
		assert.equal(mode8.status, 'LICENSE_BLOCKED');
		assert.equal(Object.prototype.hasOwnProperty.call(mode8, 'entries'), false);

		const sun = mansionAt(mode2.entries, chart.objects.Sun.lon);
		assert.equal(typeof sun.name, 'string');
		assert.equal(SU28_ID_BY_NAME[sun.name] != null, true);

		const v2 = deriveExperimentalChart(chart);
		assert.equal(v2.derived.fixedStars.status, 'RULE-INCOMPLETE');
		assert.equal(v2.derived.nakshatras.status, 'NAKSHATRA_DATA_DEPENDENCY');
		assert.equal(v2.derived.su28.status, 'LICENSE_BLOCKED');
		assert.equal(v2.derived.fixedStarsCapability.status, 'LICENSE_BLOCKED');
		assert.equal(v2.derived.qizhengCapability.productionReady, false);

		mkdirSync(join(here, '..', 'results'), { recursive: true });
		writeFileSync(join(here, '..', 'results', 'phase5a8-su28.json'), JSON.stringify({
			label: 'WEB-EXPERIMENTAL-RESULT',
			historicalSu28: 'REFERENCE-ONLY',
			copiedHistoricalStars: false,
			mode0: blocked0.status,
			mode1: { status: mode1.status, tableStatus: mode1.tableStatus, placementStatus: mode1.placementStatus },
			mode2: mode2.status,
			mode3: mode3.status,
			mode4: mode4.status,
			mode5: blocked5.status,
			mode6: mode6.status,
			mode7: mode7.status,
			mode8: mode8.status,
		}, null, 2));
	} finally {
		await eph.close();
	}
});
