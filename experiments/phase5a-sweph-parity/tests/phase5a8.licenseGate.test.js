import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { deriveMansionChart, PARANS_DEFERRED } from '../derived/mansionChart.js';
import { fixedStarsCapability } from '../derived/fixedStarsCapability.js';
import { qizhengMansionCapability } from '../derived/qizhengMansionCapability.js';

const here = dirname(fileURLToPath(import.meta.url));

test('fixed stars and qizheng stay license-blocked and parans stays deferred', () => {
	const stars = fixedStarsCapability();
	assert.deepEqual(stars, {
		status: 'LICENSE_BLOCKED',
		source: 'Swiss fixed-star catalog',
		productionReady: false,
	});

	const qizheng = qizhengMansionCapability();
	assert.deepEqual(qizheng, {
		status: 'LICENSE_BLOCKED',
		source: 'vendor/kinastro/astro/qizheng/constants.py',
		productionReady: false,
	});

	const chart = deriveMansionChart({
		jd: 2448057.6,
		zodiacal: 'Tropical',
		objects: { Sun: { lon: 84 }, Moon: { lon: 200 } },
	});
	assert.equal(chart.derived.nakshatras, null);
	assert.equal(chart.derived.fixedStarsCapability.status, 'LICENSE_BLOCKED');
	assert.equal(chart.derived.qizhengCapability.status, 'LICENSE_BLOCKED');
	assert.equal(chart.derived.su28.status, 'LICENSE_BLOCKED');
	assert.equal(chart.derived.su28.mode, 0);
	assert.deepEqual(chart.derived.parans, PARANS_DEFERRED);
	assert.notEqual(chart.derived.parans.status, 'COMPLETE');

	const source = readFileSync(join(here, '..', 'derived', 'fixedStarsCapability.js'), 'utf8');
	assert.equal(source.includes('readFile'), false);
	const qz = readFileSync(join(here, '..', 'derived', 'qizhengMansionCapability.js'), 'utf8');
	assert.equal(/\d+\.\d{3,}/.test(qz), false);
});
