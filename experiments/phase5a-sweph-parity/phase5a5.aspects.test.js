/**
 * PHASE 5-A.5 aspect parity.
 * Actual aspects are computed from the browser chart. Historical normalAsp is expected only.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildChart } from './browserChartBuilder.js';
import { deriveAspects } from './derived/aspectsBrowser.js';
import { ARCSEC, HISTORICAL, experimentRoot, golden, historicalChart, numericRow } from './derived/testlib.js';

const BUCKETS = ['Exact', 'Applicative', 'Separative', 'None', 'Obvious'];
const PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

function pairKey(row) {
	return `${row.id}|${row.asp}`;
}

test('1990 browser aspects match historical normalAsp for bodies on the chart', async () => {
	const { eph, chart } = await historicalChart();
	try {
		const actual = deriveAspects(chart);
		const expected = golden.aspects.normalAsp;
		const rows = [];
		for (const id of Object.keys(expected)) {
			if (!PLANETS.includes(id)) {
				rows.push({
					field: `normalAsp.${id}`,
					expected: 'historical starter',
					actual: null,
					delta: null,
					status: 'NOT_COMPARABLE',
					failureClass: 'PLANET_MAPPING',
					reason: 'starter is not in the experimental chart JSON',
				});
				continue;
			}
			const got = actual.normalAsp[id] || {};
			for (const bucket of BUCKETS) {
				const left = new Map((expected[id][bucket] || []).map((row) => [pairKey(row), row]));
				const right = new Map((got[bucket] || []).map((row) => [pairKey(row), row]));
				const keys = new Set([...left.keys(), ...right.keys()]);
				for (const key of keys) {
					const exp = left.get(key);
					const act = right.get(key);
					const field = `normalAsp.${id}.${bucket}.${key}`;
					if (!exp || !act) {
						const other = BUCKETS.some((name) => name !== bucket && (expected[id][name] || []).some((row) => pairKey(row) === key)
							!== (got[name] || []).some((row) => pairKey(row) === key));
						rows.push({
							field,
							expected: exp || null,
							actual: act || null,
							delta: null,
							status: 'FAIL',
							failureClass: other ? 'APPLYING_RULE' : 'ASPECT_RULE',
						});
						continue;
					}
					rows.push(numericRow(field, exp.orb, act.orb, false, 'ORB_RULE'));
					if (exp.asp !== act.asp) {
						rows.push({ field: `${field}.asp`, expected: exp.asp, actual: act.asp, delta: null, status: 'FAIL', failureClass: 'ASPECT_RULE' });
					}
				}
			}
		}

		const signRows = [];
		for (const id of Object.keys(golden.aspects.signAsp)) {
			const exp = golden.aspects.signAsp[id];
			const act = actual.signAsp[id] || [];
			signRows.push({
				field: `signAsp.${id}`,
				expected: exp,
				actual: act,
				delta: 0,
				status: JSON.stringify(exp) === JSON.stringify(act) ? 'PASS' : 'FAIL',
				failureClass: JSON.stringify(exp) === JSON.stringify(act) ? undefined : 'ASPECT_RULE',
			});
		}

		const immRows = [];
		for (const id of Object.keys(golden.aspects.immediateAsp)) {
			if (!actual.immediateAsp[id]) {
				immRows.push({
					field: `immediateAsp.${id}`,
					expected: golden.aspects.immediateAsp[id],
					actual: null,
					delta: null,
					status: PLANETS.includes(id) ? 'FAIL' : 'NOT_COMPARABLE',
					failureClass: PLANETS.includes(id) ? 'APPLYING_RULE' : 'PLANET_MAPPING',
				});
				continue;
			}
			const exp = golden.aspects.immediateAsp[id];
			const act = actual.immediateAsp[id];
			for (let i = 0; i < 2; i += 1) {
				const same = exp[i] && act[i] && exp[i].id === act[i].id && exp[i].asp === act[i].asp;
				immRows.push({
					field: `immediateAsp.${id}.${i}`,
					expected: exp[i],
					actual: act[i],
					delta: same ? Math.abs(exp[i].orb - act[i].orb) : null,
					status: same && Math.abs(exp[i].orb - act[i].orb) <= ARCSEC ? 'PASS' : 'FAIL',
					failureClass: same ? 'ORB_RULE' : 'APPLYING_RULE',
				});
			}
		}

		const smoke = {};
		const comparableFail = rows.concat(signRows, immRows).filter((row) => row.status === 'FAIL');
		if (comparableFail.length === 0) {
			for (const year of [1900, 1950, 1976, 2000, 2026]) {
				const built = buildChart(eph, {
					date: `${year}-01-01`,
					time: '12:00:00',
					timezone: '+00:00',
					latitude: HISTORICAL.latitude,
					longitude: HISTORICAL.longitude,
					zodiacal: 'Tropical',
					siderealAyanamsa: '',
					houseSystem: 2,
				});
				const derived = deriveAspects(built);
				smoke[year] = {
					jd: built.jd,
					sun: built.objects.Sun.lon,
					asc: built.ascmc.Asc.lon,
					mc: built.ascmc.MC.lon,
					house1: built.houses.cusps.House1.lon,
					aspectStarter: 'Sun',
					aspectCount: BUCKETS.reduce((sum, name) => sum + (derived.normalAsp.Sun[name] || []).length, 0),
					parity: 'NOT_COMPARABLE',
				};
				assert.ok(Number.isFinite(built.objects.Sun.lon));
				assert.ok(Number.isFinite(built.ascmc.Asc.lon));
				assert.ok(derived.normalAsp.Sun);
			}
		}

		const report = {
			label: 'WEB-EXPERIMENTAL-RESULT',
			oracle: 'HISTORICAL-GOLDEN',
			rule: actual.ruleSource,
			rows,
			signRows,
			immRows,
			smoke,
		};
		mkdirSync(join(experimentRoot, 'results'), { recursive: true });
		writeFileSync(join(experimentRoot, 'results', 'phase5a5-1990-aspects.json'), JSON.stringify(report, null, 2));
		assert.equal(comparableFail.length, 0, JSON.stringify(comparableFail.slice(0, 8), null, 2));
	} finally {
		eph.close();
	}
});
