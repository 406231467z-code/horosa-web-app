/**
 * Experimental browser provider. Status stays GATED while the ephemeris license is open.
 * This module is not imported by the production bundle.
 */
import { openEphemeris } from '../browserEphemerisAdapter.js';
import { buildChart } from '../browserChartBuilder.js';
import { deriveExperimentalChart } from '../derived/chartV2.js';
import { completeChartInputs } from '../derived/completeInputs.js';
import { deriveMansionChart } from '../derived/mansionChart.js';
import { getAstrologyCapabilities } from './capabilities.js';
import { adaptBrowserInput } from './browserInputAdapter.js';
import { astrologyError } from './astrologyError.js';
import { browserToHorosaChart } from './browserToHorosaChartAdapter.js';

export const browserAstrologyProvider = {
	id: 'browser',
	getCapabilities() {
		return getAstrologyCapabilities();
	},
	async calculateChart(input) {
		const normalized = adaptBrowserInput(input);
		if (normalized.zodiacal === 'Sidereal') {
			throw astrologyError('UNSUPPORTED', 'sidereal browser charts stay reference-only', 'zodiacal', 'browser');
		}
		const eph = await openEphemeris();
		try {
			const built = buildChart(eph, normalized);
			const completed = completeChartInputs(eph, built);
			const v2 = deriveExperimentalChart(completed);
			const mansion = deriveMansionChart(completed, { mode: normalized.doubingSu28 });
			const chart = browserToHorosaChart(v2, mansion, normalized);
			return {
				provider: 'browser',
				status: 'GATED',
				productionReady: false,
				legalReviewRequired: true,
				chart,
			};
		} catch (err) {
			if (err && err.name === 'AstrologyCalculationError') throw err;
			throw astrologyError(
				(err && err.code) || 'EPHEMERIS_INIT_FAILED',
				(err && err.message) || 'browser calculation failed',
				'ephemeris',
				'browser',
			);
		} finally {
			eph.close();
		}
	},
};
