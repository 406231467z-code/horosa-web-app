/**
 * Experimental mansion layer. Does not replace deriveExperimentalChart.
 * v2 nakshatra and fixed-star status strings stay as the 5-A.5 tests require.
 */
import { deriveGuoStarSect } from './guoStarSectBrowser.js';
import { nakshatrasForChart } from './nakshatraBrowser.js';
import { fixedStarsCapability } from './fixedStarsCapability.js';
import { qizhengMansionCapability } from './qizhengMansionCapability.js';
import { calculateSu28 } from './su28Browser.js';

export const PARANS_DEFERRED = {
	status: 'NOT_IMPLEMENTED',
	natalChartStatus: 'NOT_NATAL_CHART',
	acgStatus: 'AUDIT_ONLY',
	localApproximationStatus: 'LEGACY-LOCAL-APPROXIMATION',
	implementation: 'NOT_IMPLEMENTED',
};

export function deriveMansionChart(chart, options = {}) {
	const mode = options.mode == null ? 0 : options.mode;
	return {
		meta: {
			source: 'browser',
			stage: 'mansion-experimental',
			goldenType: 'WEB-EXPERIMENTAL-RESULT',
			legalReviewRequired: true,
		},
		jd: chart && chart.jd,
		derived: {
			nakshatras: nakshatrasForChart(chart),
			guoStarSect: deriveGuoStarSect(chart, options),
			su28: calculateSu28({ ...chart, ...options }, mode),
			fixedStars: fixedStarsCapability(),
			fixedStarsCapability: fixedStarsCapability(),
			qizheng: qizhengMansionCapability(),
			qizhengCapability: qizhengMansionCapability(),
			parans: PARANS_DEFERRED,
		},
	};
}
