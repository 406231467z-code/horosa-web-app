/**
 * Both providers expose calculateChart. Errors carry code, message, capability, and provider.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAstrologyCalculationService } from '../integration/astrologyCalculationService.js';
import { browserAstrologyProvider } from '../integration/browserAstrologyProvider.js';
import { getAstrologyCapabilities } from '../integration/capabilities.js';
import { createLegacyAstrologyProvider } from '../integration/legacyAstrologyProvider.js';
import { HISTORICAL } from '../derived/testlib.js';

test('legacy and browser providers share the calculation contract', async () => {
	const calls = [];
	const legacy = createLegacyAstrologyProvider(async (input, options) => {
		calls.push({ input, options });
		return { Result: { chart: { objects: [] }, params: input } };
	});
	const service = createAstrologyCalculationService({
		legacy,
		browser: browserAstrologyProvider,
		browserEnabled: false,
	});

	await assert.rejects(
		() => legacy.calculateChart({}),
		(err) => err.code === 'MISSING_INPUT' && err.capability === 'input' && err.provider === 'legacy',
	);
	await assert.rejects(
		() => browserAstrologyProvider.calculateChart({}),
		(err) => err.code === 'MISSING_INPUT' && err.provider === 'browser' && typeof err.message === 'string',
	);

	const legacyOut = await service.calculateChart({ date: '1990/06/15', time: '10:30:00' });
	assert.equal(legacyOut.provider, 'legacy');
	assert.equal(legacyOut.status, 'OK');
	assert.equal(legacyOut.response.Result.params.date, '1990/06/15');
	assert.equal(calls.length, 1);

	calls.length = 0;
	await assert.rejects(
		() => service.calculateChart(HISTORICAL, { provider: 'browser' }),
		(err) => err.code === 'LICENSE_REVIEW_REQUIRED' && err.capability === 'ephemeris' && err.provider === 'browser',
	);
	assert.equal(calls.length, 0);

	const fallback = await service.calculateChart(
		{ date: '1990/06/15', time: '10:30:00' },
		{ provider: 'browser', allowLegacyFallback: true },
	);
	assert.equal(fallback.provider, 'legacy');
	assert.equal(fallback.fallbackFrom, 'browser');
	assert.equal(fallback.fallbackReason, 'BROWSER_UNAVAILABLE');
	assert.equal(calls.length, 1);

	const caps = getAstrologyCapabilities();
	assert.equal(caps.defaultProvider, 'legacy');
	assert.equal(caps.browserProviderStatus, 'GATED');
	assert.equal(caps.browserEnabled, false);
	assert.ok(caps.implemented.includes('nakshatra'));
	assert.ok(caps.gated.includes('ephemeris'));
	assert.ok(caps.blocked.includes('fixedStars'));
	assert.ok(caps['legacy-only'].includes('post /chart'));

	const browser = await browserAstrologyProvider.calculateChart(HISTORICAL);
	assert.equal(typeof browserAstrologyProvider.calculateChart, 'function');
	assert.equal(typeof legacy.calculateChart, 'function');
	assert.equal(browser.status, 'GATED');
	assert.equal(browser.chart.meta.schema, 'internal-astrology-chart');
	assert.equal(browser.chart.fixedStars.status, 'LICENSE_BLOCKED');
	assert.equal(browser.chart.fixedStarsCapability.status, 'LICENSE_BLOCKED');
	assert.equal(browser.chart.syzygy.status, 'COMPUTED');
	assert.equal(browserAstrologyProvider.getCapabilities().browserProviderStatus, 'GATED');
	assert.equal(legacy.getCapabilities().chart, 'LEGACY_ONLY');
});
