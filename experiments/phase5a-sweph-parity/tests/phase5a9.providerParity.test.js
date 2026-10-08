/**
 * Browser provider against the 1990 historical chart.
 * Expected values are read from HISTORICAL-GOLDEN. Actual values come from the provider.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ARCSEC, HISTORICAL, golden, numericRow } from '../derived/testlib.js';
import { browserAstrologyProvider } from '../integration/browserAstrologyProvider.js';

function byId(rows, id) {
	return rows.find((row) => row.id === id);
}

test('browser provider matches the 1990 golden positions and keeps the gated status', async () => {
	const got = await browserAstrologyProvider.calculateChart(HISTORICAL);
	assert.equal(got.provider, 'browser');
	assert.equal(got.status, 'GATED');
	assert.equal(got.productionReady, false);
	const chart = got.chart;
	const rows = [numericRow('jd', golden.chart.date.jd, chart.meta.jd, false)];
	for (const id of ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'Dark Moon']) {
		rows.push(numericRow(`objects.${id}.lon`, byId(golden.chart.objects, id).lon, chart.objects[id].lon, true));
	}
	assert.equal(chart.meta.objectIds.Node, 'North Node');
	assert.equal(chart.meta.objectIds.Lilith, 'Dark Moon');
	for (const id of ['Asc', 'MC']) {
		rows.push(numericRow(`ascmc.${id}.lon`, byId(golden.chart.objects, id).lon, chart.ascmc[id].lon, true));
	}
	for (let i = 1; i <= 12; i += 1) {
		const id = `House${i}`;
		rows.push(numericRow(`houses.${id}.lon`, byId(golden.chart.houses, id).lon, chart.houses.cusps[id].lon, true));
	}
	assert.equal(chart.aspects.status, 'COMPUTED');
	assert.ok(chart.aspects.normalAsp.Sun);
	assert.equal(chart.lots.status, 'COMPUTED');
	assert.ok(chart.lots.items.length >= 31);
	assert.equal(chart.receptions.status, 'COMPUTED');
	assert.ok(Array.isArray(chart.receptions.normal));
	assert.ok(Array.isArray(chart.mutuals.normal));
	assert.equal(chart.declParallel.status, 'COMPUTED');
	assert.equal(chart.nakshatras, null);
	assert.equal(chart.guoStarSect.status, 'COMPUTED');
	for (const id of ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
		assert.equal(chart.guoStarSect.su[id], byId(golden.chart.objects, id).su, id);
	}
	assert.equal(chart.su28.status, 'LICENSE_BLOCKED');
	assert.equal(chart.su28.mode, 0);
	assert.equal(chart.syzygy.status, 'COMPUTED');
	rows.push(numericRow('syzygy.longitude', byId(golden.chart.objects, 'Syzygy').lon, chart.syzygy.longitude, true));
	assert.deepEqual(chart.fixedStars, { status: 'LICENSE_BLOCKED', productionReady: false });
	assert.equal(chart.qizheng.status, 'LICENSE_BLOCKED');
	assert.equal(chart.parans.status, 'NOT_IMPLEMENTED');
	const fails = rows.filter((row) => row.status !== 'PASS');
	assert.equal(fails.length, 0, JSON.stringify(fails.slice(0, 6), null, 2));
	assert.ok(rows.every((row) => row.delta <= ARCSEC || row.status === 'PASS'));
});
