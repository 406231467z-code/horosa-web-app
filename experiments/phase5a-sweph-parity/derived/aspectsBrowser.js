/**
 * Aspects from a browser chart JSON.
 * Rules: flatlib aspects.py and perchart.getAspects.
 * Default: tradition false, virtualPointReceiveAsp false, orb policy perObject.
 * Aspect list is major aspects plus 45°. Does not call the ephemeris.
 */
import { chartBodies } from './chartBodies.js';
import {
	PLANETS10,
	immediateAspects,
	normalAspects,
	signAspects,
} from '../productionRules.js';

export const ASPECT_RULE = {
	implementation: 'derived/aspectsBrowser.js',
	ruleSource: 'flatlib/aspects.py _aspectDict + _aspectProperties; perchart.getAspects asp list MAJOR+[45]',
	orbRule: 'flatlib/props.py orb table; major kept when either body orb covers the separation; minor max orb 3; inOrb uses <= body orb',
	applyingRule: 'faster body is active; Exact when |orbDir| < 0.3; Applicative when (orbDir>0 and direct) or (orbDir<0 and retrograde); stationary when |lonspeed| < 0.0003; signed separation is the shortest arc',
	aspects: [0, 60, 90, 120, 180, 45],
};

function bothSides(pair) {
	return pair && pair[0] && pair[1];
}

export function deriveAspects(chart) {
	const bodies = chartBodies(chart);
	const starters = PLANETS10.filter((id) => bodies.has(id));
	const rawImmediate = immediateAspects(bodies, starters);
	const immediateAsp = {};
	for (const id of starters) {
		const pair = rawImmediate[id];
		if (bothSides(pair)) immediateAsp[id] = pair;
	}
	return {
		...ASPECT_RULE,
		status: 'COMPUTED',
		normalAsp: normalAspects(bodies, starters),
		signAsp: signAspects(bodies),
		immediateAsp,
		starters,
	};
}
