/**
 * Internal chart model for the existing astrology UI.
 * The UI keeps reading North Node and Dark Moon. Node and Lilith are those same bodies.
 */
import { fixedStarsCapability } from '../derived/fixedStarsCapability.js';
import { qizhengMansionCapability } from '../derived/qizhengMansionCapability.js';

const UI_IDS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'Dark Moon'];

export function browserToHorosaChart(v2, mansion, input) {
	const objects = {};
	for (const id of UI_IDS) {
		if (v2.objects && v2.objects[id]) objects[id] = v2.objects[id];
	}
	const derived = v2.derived || {};
	const mansionDerived = (mansion && mansion.derived) || {};
	const stars = fixedStarsCapability();
	return {
		input,
		objects,
		ascmc: v2.ascmc,
		houses: v2.houses,
		aspects: {
			normalAsp: derived.aspects && derived.aspects.normalAsp,
			signAsp: derived.aspects && derived.aspects.signAsp,
			immediateAsp: derived.aspects && derived.aspects.immediateAsp,
			status: derived.aspects && derived.aspects.status,
		},
		lots: derived.lots,
		receptions: derived.receptions,
		mutuals: derived.mutuals,
		declParallel: derived.declParallel,
		syzygy: derived.syzygy,
		nakshatras: mansionDerived.nakshatras,
		guoStarSect: mansionDerived.guoStarSect,
		su28: mansionDerived.su28,
		fixedStars: { status: stars.status, productionReady: stars.productionReady },
		fixedStarsCapability: stars,
		qizheng: {
			status: qizhengMansionCapability().status,
			productionReady: false,
		},
		parans: { status: 'NOT_IMPLEMENTED' },
		meta: {
			provider: 'browser',
			status: 'GATED',
			productionReady: false,
			legalReviewRequired: true,
			schema: 'internal-astrology-chart',
			sourceSchema: 'browserChart.v2',
			jd: v2.jd,
			objectIds: {
				Node: 'North Node',
				Lilith: 'Dark Moon',
			},
		},
	};
}
