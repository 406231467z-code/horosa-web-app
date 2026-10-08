/**
 * Experimental chart JSON v2. Derived fields are calculated from the chart JSON.
 * Unfinished layers stay status objects.
 */
import { deriveAspects } from './aspectsBrowser.js';
import { deriveDeclParallel } from './declinationBrowser.js';
import { FIXED_STAR_STATUS, NAKSHATRA_STATUS, PARANS_STATUS } from './feasibility.js';
import { deriveLots } from './lotsBrowser.js';
import { deriveReception } from './receptionBrowser.js';
import { readSyzygy } from './syzygyBrowser.js';
import { deriveGuoStarSect } from './guoStarSectBrowser.js';
import { fixedStarsCapability } from './fixedStarsCapability.js';
import { qizhengMansionCapability } from './qizhengMansionCapability.js';
import { calculateSu28 } from './su28Browser.js';

export function deriveExperimentalChart(chart) {
	const aspects = deriveAspects(chart);
	const lots = deriveLots(chart);
	const reception = deriveReception(chart);
	const declParallel = deriveDeclParallel(chart);
	return {
		meta: {
			source: 'browser',
			stage: 'derived-experimental',
			goldenType: 'WEB-EXPERIMENTAL-RESULT',
			legalReviewRequired: true,
		},
		jd: chart.jd,
		objects: chart.objects,
		ascmc: chart.ascmc,
		houses: chart.houses,
		derived: {
			aspects: {
				status: aspects.status,
				normalAsp: aspects.normalAsp,
				signAsp: aspects.signAsp,
				immediateAsp: aspects.immediateAsp,
			},
			lots: {
				status: lots.status,
				diurnal: lots.diurnal,
				items: lots.lots,
			},
			receptions: {
				status: reception.status,
				normal: reception.receptions.normal,
				abnormal: reception.receptions.abnormal,
			},
			mutuals: {
				status: reception.status,
				normal: reception.mutuals.normal,
				abnormal: reception.mutuals.abnormal,
			},
			declParallel: {
				status: declParallel.status,
				parallel: declParallel.parallel,
				contraParallel: declParallel.contraParallel,
			},
			syzygy: readSyzygy(chart),
			parans: PARANS_STATUS,
			fixedStars: FIXED_STAR_STATUS,
			nakshatras: NAKSHATRA_STATUS,
			guoStarSect: deriveGuoStarSect(chart),
			su28: calculateSu28(chart),
			fixedStarsCapability: fixedStarsCapability(),
			qizhengCapability: qizhengMansionCapability(),
		},
	};
}
