/**
 * Legacy provider. The fetch implementation is injected so this file does not import production UI code.
 */
import { astrologyError } from './astrologyError.js';

export function createLegacyAstrologyProvider(fetchChart) {
	if (typeof fetchChart !== 'function') {
		throw astrologyError('MISSING_INPUT', 'legacy provider needs fetchChart', 'legacy', 'legacy');
	}
	return {
		id: 'legacy',
		getCapabilities() {
			return {
				provider: 'legacy',
				chart: 'LEGACY_ONLY',
				endpoint: 'POST /chart',
			};
		},
		async calculateChart(input, options) {
			if (!input || input.date == null || input.time == null) {
				throw astrologyError('MISSING_INPUT', 'date and time are required', 'input', 'legacy');
			}
			const response = await fetchChart(input, options);
			return {
				provider: 'legacy',
				status: 'OK',
				response,
			};
		},
	};
}
