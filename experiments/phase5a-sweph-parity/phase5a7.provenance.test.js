/**
 * PHASE 5-A.7 provenance checks.
 * Confirms sources, counts, and field names. Does not calculate stars, mansions, or parans.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { golden } from './derived/testlib.js';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const workspace = join(repo, 'local', 'workspace', 'Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c');
const provenance = JSON.parse(readFileSync(join(here, 'data', 'phase5a7-provenance.json'), 'utf8'));
const schema = JSON.parse(readFileSync(join(here, 'schemas', 'phase5a7.provenance.schema.json'), 'utf8'));

function requireKeys(obj, keys) {
	for (const key of keys) assert.equal(Object.prototype.hasOwnProperty.call(obj, key), true, key);
}

test('fixed-star, mansion, nakshatra, and parans sources are recorded without calculated positions', () => {
	requireKeys(provenance, schema.required);
	assert.equal(provenance.label, 'DATA-PROVENANCE');
	assert.equal(provenance.notActual, true);
	assert.equal(provenance.fixedStars.status, 'CONFIRMED');
	assert.equal(provenance.su28.status, 'CONFIRMED');
	assert.equal(provenance.nakshatra.status, 'CONFIRMED');
	assert.equal(provenance.guoStarSect.status, 'CONFIRMED');
	assert.equal(provenance.su28.doNotChooseAMode, true);
	assert.equal(provenance.su28.modes.length, 9);
	assert.equal(provenance.nakshatra.spanRule, '360 / 27');
	assert.equal(provenance.nakshatra.boundaries.length, 28);
	assert.equal(provenance.nakshatra.pada.present, true);
	assert.equal(provenance.guoStarSect.entries, 27);
	assert.equal(provenance.guoStarSect.includesNiu, false);
	assert.equal(provenance.parans.localApproximation.status, 'LEGACY-LOCAL-APPROXIMATION');
	assert.match(provenance.parans.chartJson, /ABSENT/);

	const catalogPath = join(repo, provenance.fixedStars.catalog.path);
	assert.equal(existsSync(catalogPath), true);
	const starText = readFileSync(catalogPath, 'utf8');
	const records = starText.split(/\n/).filter((line) => line.trim() && !line.startsWith('#')).length;
	assert.equal(records, provenance.fixedStars.catalog.records);
	assert.equal(existsSync(join(here, '..', 'phase4d-sweph-wasm', 'node_modules', 'swisseph-wasm', 'src', 'swisseph.js')), true);
	assert.equal(existsSync(join(here, '..', 'phase4d-sweph-wasm', 'node_modules', 'swisseph-wasm', 'sefstars.txt')), false);
	assert.equal(provenance.fixedStars.siblingFilesNotSubstituted.length, 3);
	assert.equal(existsSync(join(workspace, 'flatlib-ctrad2', 'flatlib', 'resources', 'swefiles', 'sefstars-2.txt')), true);
	assert.equal(existsSync(join(workspace, 'flatlib-ctrad2', 'flatlib', 'resources', 'swefiles', 'fixstars.cat')), true);

	const constants = readFileSync(join(workspace, 'flatlib-ctrad2', 'flatlib', 'const.py'), 'utf8');
	const ids = [...constants.match(/LIST_FIXED_STARS = \[([\s\S]*?)\]/)[1].matchAll(/STAR_[A-Z0-9_]+/g)].map((item) => item[0]);
	assert.equal(ids.length, provenance.fixedStars.subset.listedIds);
	assert.equal(new Set(ids).size, provenance.fixedStars.subset.uniqueIds);
	const su28 = [...constants.match(/LIST_FIXED_SU28_NAME = \[([\s\S]*?)\]/)[1].matchAll(/'[^']+'/g)];
	assert.equal(su28.length, provenance.su28.count);

	const nak = readFileSync(join(workspace, 'astropy', 'astrostudy', 'nakshatra.py'), 'utf8');
	assert.equal((nak.match(/\('[^']+', '[^']+', '[^']+'\)/g) || []).length, provenance.nakshatra.entries);
	assert.match(nak, /360\.0 \/ 27\.0/);
	assert.match(nak, /pada/);

	const guo = readFileSync(join(workspace, 'astropy', 'astrostudy', 'guostarsect', 'guotables.py'), 'utf8');
	assert.match(guo, /TERM_SU27/);
	assert.equal(guo.includes("'牛'"), false);
	const qz = provenance.su28.qizhengKinNotChartPath;
	assert.equal(qz.notChartFixedStarSu28, true);
	assert.equal(qz.tables.length, 3);
	const qzText = readFileSync(join(workspace, 'vendor', 'kinastro', 'astro', 'qizheng', 'constants.py'), 'utf8');
	assert.equal((qzText.match(/"start_lon":/g) || []).length, 84);
	assert.match(readFileSync(join(workspace, 'vendor', 'kinastro', 'astro', 'qizheng', 'calculator.py'), 'utf8'), /_TANG_EPOCH_AYANAMSA_AT_J2000 = 29\.185/);
	const election = readFileSync(join(workspace, 'astrostudyui', 'src', 'divination', 'data', 'fixedStars.js'), 'utf8');
	assert.equal((election.match(/name_en:/g) || []).length, provenance.fixedStars.electionTable.entries);
	assert.match(election, /50\.27/);

	assert.equal(golden.chart.nakshatras, null);
	assert.equal(Array.isArray(golden.chart.fixedStars), true);
	assert.ok(golden.chart.fixedStarSu28);
	assert.equal(Array.isArray(golden.chart.stars), true);
	assert.ok(golden.guoStarSect && Array.isArray(golden.guoStarSect.houses));
	assert.equal(Object.prototype.hasOwnProperty.call(golden, 'parans'), false);

	const report = {
		label: 'DATA-PROVENANCE',
		notActual: true,
		fixedStars: provenance.fixedStars.status,
		su28Modes: provenance.su28.modes.length,
		nakshatraEntries: provenance.nakshatra.entries,
		guoEntries: provenance.guoStarSect.entries,
		paransChart: provenance.parans.chartJson,
		historicalNakshatras: golden.chart.nakshatras,
		copiedStarLongitudes: false,
	};
	mkdirSync(join(here, 'results'), { recursive: true });
	writeFileSync(join(here, 'results', 'phase5a7-provenance.json'), JSON.stringify(report, null, 2));
});
