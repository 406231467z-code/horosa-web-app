import { fetchChart } from './astro';
import { calculateBrowserChart } from './astronomy/browserAstronomyEngine.js';

// Production astrology is the browser Astronomy Engine. Legacy stays available
// only when the caller sets provider:'legacy' for a diagnostic comparison.
export const ASTROLOGY_BROWSER_ENABLED = true;

export function getAstrologyCapabilities(){
	return {
		legalReviewRequired: true,
		browserEnabled: ASTROLOGY_BROWSER_ENABLED,
		defaultProvider: 'browser',
		browserProviderStatus: 'PRODUCTION',
		productionReady: true,
		engine: 'astronomy-engine@2.1.19',
		implemented: ['ephemeris', 'meanNode', 'meanLilith', 'houses.alcabitius', 'houses.regiomontanus', 'houses.placidus', 'houses.porphyry', 'aspects', 'lots', 'receptions', 'declParallel', 'syzygy', 'nakshatra', 'guoStarSect'],
		gated: ['su28.mode2', 'su28.mode3'],
		blocked: ['fixedStars', 'qizheng', 'su28.mode0', 'su28.mode1', 'su28.mode5', 'su28.mode8', 'parans'],
		experimental: ['su28.mode4', 'su28.mode6', 'su28.mode7'],
		'legacy-only': ['post /chart', 'primaryDirection', 'predictives'],
		speed: {
			method: 'centered-longitude-difference',
			intervalMinutes: 30,
			units: 'degrees/day',
			signConvention: 'speed < 0 is retrograde',
		},
	};
}

function stampLegacy(rsp, fallbackReason){
	if(rsp && typeof rsp === 'object'){
		try{
			Object.defineProperty(rsp, 'calculationProvider', {
				value: 'legacy',
				enumerable: false,
				configurable: true,
			});
			if(fallbackReason){
				Object.defineProperty(rsp, 'calculationFallback', {
					value: fallbackReason,
					enumerable: false,
					configurable: true,
				});
			}
		}catch(e){ /* frozen response */ }
	}
	return rsp;
}

function requestOptionsForLegacy(requestOptions){
	if(!requestOptions){
		return requestOptions;
	}
	const next = { ...requestOptions };
	delete next.provider;
	delete next.allowLegacyFallback;
	return next;
}

function browserFailure(values, err){
	const code = (err && err.code) || 'CALCULATION_ERROR';
	return {
		ResultCode: code,
		calculationProvider: 'browser',
		Result: {
			err: code,
			status: code,
			message: err && err.message ? err.message : 'browser calculation failed',
			params: { ...(values || {}) },
			chart: { objects: [], houses: [], stars: [], fixedStarSu28: [] },
			aspects: { normalAsp: {} },
			lots: [],
			meta: { provider: 'browser', engine: 'astronomy-engine' },
		},
	};
}

/**
 * Production chart entry. The default path calculates in the browser.
 * provider:'legacy' is the only path that calls fetchChart.
 * allowLegacyFallback does not call the backend.
 */
export async function calculateChart(values, requestOptions){
	const opts = requestOptions || {};
	if(opts.provider === 'legacy'){
		const rsp = await fetchChart(values, requestOptionsForLegacy(requestOptions));
		return stampLegacy(rsp, 'EXPLICIT_LEGACY');
	}
	try{
		const Result = calculateBrowserChart(values);
		return {
			ResultCode: 0,
			calculationProvider: 'browser',
			Result,
		};
	}catch(err){
		return browserFailure(values, err);
	}
}
