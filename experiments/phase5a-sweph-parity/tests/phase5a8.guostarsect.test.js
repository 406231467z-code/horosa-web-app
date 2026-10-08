import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { deriveGuoStarSect, suFromLon, suFromSign } from '../derived/guoStarSectBrowser.js';
import { LIST_SU, SIGNS, SU27, TERM_SU27 } from '../derived/guoTables.js';
import { golden, historicalChart } from '../derived/testlib.js';

test('GuoStarSect places planets by TERM_SU27 and keeps the Moon as lifesu', async () => {
	assert.equal(LIST_SU.includes('牛'), false);
	assert.equal(LIST_SU.length, 27);
	assert.equal(suFromLon(0), '娄');
	assert.equal(suFromSign('Aries', 13 + 20 / 60), '胃');
	assert.equal(suFromSign('Aries', 13 + 20 / 60 - 1e-9), '娄');
	assert.equal(suFromLon(359.999), '奎');

	for (const name of LIST_SU) {
		const row = SU27[name];
		assert.equal(suFromSign(row.sign, row.signlon), name, name);
		if (row.signlon > 0) {
			assert.notEqual(suFromSign(row.sign, row.signlon - 1e-9), name, name);
		} else {
			const prev = SIGNS[(SIGNS.indexOf(row.sign) + 11) % 12];
			assert.notEqual(suFromSign(prev, 30 - 1e-9), name, name);
		}
	}
	for (const sign of SIGNS) {
		assert.equal(suFromSign(sign, 0), TERM_SU27[sign][0][0]);
		const edge = TERM_SU27[sign][1][1];
		assert.equal(suFromSign(sign, edge), TERM_SU27[sign][1][0]);
		assert.equal(suFromSign(sign, edge - 1e-9), TERM_SU27[sign][0][0]);
	}

	const { eph, chart } = await historicalChart();
	try {
		const got = deriveGuoStarSect({ ...chart, zodiacal: 'Tropical' });
		assert.equal(got.status, 'COMPUTED');
		assert.equal(got.includesNiu, false);
		assert.equal(Object.prototype.hasOwnProperty.call(got.su, 'mansion'), false);
		const rows = [];
		for (const id of ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
			const expected = golden.chart.objects.find((row) => row.id === id).su;
			const actual = got.su[id];
			const status = actual === expected ? 'PASS' : 'FAIL';
			rows.push({ id, expected, actual, status });
			assert.equal(status, 'PASS', id);
		}
		assert.equal(got.lifesu, got.su.Moon);
		assert.equal(got.houses[0].id, got.lifesu);
		assert.equal(got.houses[0].relation, '命');
		assert.equal(got.houses.length, 27);
		assert.equal(got.houses.some((house) => house.id === '牛'), false);
		const moonHouse = got.houses.find((house) => house.id === got.lifesu);
		assert.equal(moonHouse.character.length, 3);
		const here = dirname(fileURLToPath(import.meta.url));
		mkdirSync(join(here, '..', 'results'), { recursive: true });
		writeFileSync(join(here, '..', 'results', 'phase5a8-guo.json'), JSON.stringify({
			label: 'WEB-EXPERIMENTAL-RESULT',
			oracle: 'HISTORICAL-GOLDEN',
			rows,
		}, null, 2));
	} finally {
		eph.close();
	}
});
