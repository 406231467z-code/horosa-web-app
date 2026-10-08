/**
 * PHASE 5-A.6 declination inputs and full parallel membership.
 * The parallel threshold stays at 1°.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { completeChartInputs } from './derived/completeInputs.js';
import { deriveDeclParallel } from './derived/declinationBrowser.js';
import {
	FIXED_STAR_REQUIRED_INPUTS,
	NAKSHATRA_REQUIRED_INPUTS,
	PARANS_REQUIRED_INPUTS,
} from './derived/feasibility.js';
import { ARCSEC, experimentRoot, golden, historicalChart } from './derived/testlib.js';

const MATRIX_IDS = [
	['Sun', 'Sun'],
	['Moon', 'Moon'],
	['Mercury', 'Mercury'],
	['Venus', 'Venus'],
	['Mars', 'Mars'],
	['Jupiter', 'Jupiter'],
	['Saturn', 'Saturn'],
	['Uranus', 'Uranus'],
	['Neptune', 'Neptune'],
	['Pluto', 'Pluto'],
	['Node', 'North Node'],
	['Lilith', 'Dark Moon'],
	['South Node', 'South Node'],
	['Chiron', 'Chiron'],
	['Pholus', 'Pholus'],
	['Ceres', 'Ceres'],
	['Pallas', 'Pallas'],
	['Juno', 'Juno'],
	['Vesta', 'Vesta'],
	['Intp_Apog', 'Intp_Apog'],
	['Intp_Perg', 'Intp_Perg'],
	['Syzygy', 'Syzygy'],
	['Pars Fortuna', 'Pars Fortuna'],
	['Purple Clouds', 'Purple Clouds'],
	['Asc', 'Asc'],
	['MC', 'MC'],
	['Desc', 'Desc'],
	['IC', 'IC'],
];

function historical(id) {
	return golden.chart.objects.find((row) => row.id === id) || null;
}

function browserDecl(chart, id) {
	const direct = chart.objects[id];
	if (direct && Number.isFinite(direct.decl)) return direct.decl;
	const extra = chart.inputs && chart.inputs.declinationBodies && chart.inputs.declinationBodies[id];
	if (extra && Number.isFinite(extra.decl)) return extra.decl;
	if (id === 'Syzygy' && chart.inputs && chart.inputs.syzygy && Number.isFinite(chart.inputs.syzygy.declination)) {
		return chart.inputs.syzygy.declination;
	}
	return null;
}

test('1990 declination inputs and complete parallel groups', async () => {
	const { eph, chart } = await historicalChart();
	try {
		const completed = completeChartInputs(eph, chart);
		const matrix = MATRIX_IDS.map(([label, id]) => {
			const prod = historical(id);
			const actual = browserDecl(completed, id);
			const present = actual != null;
			let status = 'MISSING_EPHEMERIS_INPUT';
			let delta = null;
			if (prod && present) {
				delta = Math.abs(actual - prod.decl);
				status = delta <= ARCSEC ? 'PASS' : 'FAIL';
			} else if (!prod) {
				status = 'NOT_COMPARABLE';
			}
			return {
				body: label,
				id,
				historicalDecl: prod ? prod.decl : null,
				browserDecl: actual,
				present,
				delta,
				deltaArcsec: delta == null ? null : delta * 3600,
				status,
			};
		});

		const derived = deriveDeclParallel(completed);
		const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
		const parallelPass = same(derived.parallel, golden.declParallel.parallel);
		const contraPass = same(derived.contraParallel, golden.declParallel.contraParallel);
		const report = {
			label: 'WEB-EXPERIMENTAL-RESULT',
			oracle: 'HISTORICAL-GOLDEN',
			toleranceDeg: 1,
			matrix,
			parallel: { expected: golden.declParallel.parallel, actual: derived.parallel, status: parallelPass ? 'PASS' : 'FAIL' },
			contraParallel: { expected: golden.declParallel.contraParallel, actual: derived.contraParallel, status: contraPass ? 'PASS' : 'FAIL' },
			paransRequiredInputs: PARANS_REQUIRED_INPUTS,
			fixedStarRequiredInputs: FIXED_STAR_REQUIRED_INPUTS,
			nakshatraRequiredInputs: NAKSHATRA_REQUIRED_INPUTS,
		};
		mkdirSync(join(experimentRoot, 'results'), { recursive: true });
		writeFileSync(join(experimentRoot, 'results', 'phase5a6-1990-declination.json'), JSON.stringify(report, null, 2));
		const fails = matrix.filter((row) => row.status === 'FAIL');
		assert.equal(fails.length, 0, JSON.stringify(fails, null, 2));
		assert.equal(parallelPass, true, JSON.stringify({ actual: derived.parallel, expected: golden.declParallel.parallel }, null, 2));
		assert.equal(contraPass, true);
		assert.ok(PARANS_REQUIRED_INPUTS.length >= 5);
		assert.ok(FIXED_STAR_REQUIRED_INPUTS.some((row) => row.includes('fixedStarSu28')));
		assert.ok(NAKSHATRA_REQUIRED_INPUTS.some((row) => row.includes('sidereal')));
	} finally {
		eph.close();
	}
});
