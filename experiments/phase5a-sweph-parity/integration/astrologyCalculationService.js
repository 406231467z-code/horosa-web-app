/**
 * Provider selection. The default is legacy.
 * A browser failure does not call the legacy provider unless the caller sets allowLegacyFallback.
 */
import { getAstrologyCapabilities } from './capabilities.js';
import { astrologyError } from './astrologyError.js';

export function createAstrologyCalculationService({ legacy, browser, browserEnabled = false }) {
	return {
		getAstrologyCapabilities,
		async calculateChart(input, options = {}) {
			const requested = options.provider || 'legacy';
			if (requested === 'browser') {
				if (!browserEnabled || !browser) {
					if (options.allowLegacyFallback === true) {
						const out = await legacy.calculateChart(input, options);
						return {
							...out,
							provider: 'legacy',
							fallbackFrom: 'browser',
							fallbackReason: 'BROWSER_UNAVAILABLE',
						};
					}
					throw astrologyError('LICENSE_REVIEW_REQUIRED', 'Browser provider is gated', 'ephemeris', 'browser');
				}
				return browser.calculateChart(input, options);
			}
			if (requested !== 'legacy') {
				throw astrologyError('UNSUPPORTED', `Unknown provider ${requested}`, 'provider', requested);
			}
			return legacy.calculateChart(input, options);
		},
	};
}
