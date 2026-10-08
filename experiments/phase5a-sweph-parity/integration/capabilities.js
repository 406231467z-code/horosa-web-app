/**
 * Capability snapshot for the browser engine.
 * Ephemeris stays under review, so the provider status is GATED.
 */
export const ASTROLOGY_BROWSER_ENABLED = false;

export const ASTROLOGY_BROWSER_CAPABILITIES = {
	ephemeris: { status: 'LICENSE_REVIEW_REQUIRED' },
	derived: {
		aspects: 'AVAILABLE',
		lots: 'AVAILABLE',
		receptions: 'AVAILABLE',
		declParallel: 'AVAILABLE',
	},
	mansion: {
		nakshatra: 'AVAILABLE',
		guoStarSect: 'AVAILABLE',
		su28: 'MIXED',
	},
	su28Modes: {
		0: 'LICENSE_BLOCKED',
		1: 'MIXED',
		2: 'GATED',
		3: 'GATED',
		4: 'EXPERIMENTAL',
		5: 'LICENSE_BLOCKED',
		6: 'EXPERIMENTAL',
		7: 'EXPERIMENTAL',
		8: 'LICENSE_BLOCKED',
	},
	fixedStars: { status: 'LICENSE_BLOCKED', productionReady: false },
	qizheng: { status: 'LICENSE_BLOCKED', productionReady: false },
	parans: { status: 'NOT_IMPLEMENTED' },
};

export function getAstrologyCapabilities() {
	return {
		legalReviewRequired: true,
		browserEnabled: ASTROLOGY_BROWSER_ENABLED,
		defaultProvider: 'legacy',
		browserProviderStatus: 'GATED',
		productionReady: false,
		capabilities: ASTROLOGY_BROWSER_CAPABILITIES,
		implemented: ['aspects', 'lots', 'receptions', 'declParallel', 'nakshatra', 'guoStarSect'],
		gated: ['ephemeris', 'su28.mode2', 'su28.mode3'],
		blocked: ['fixedStars', 'qizheng', 'su28.mode0', 'su28.mode1', 'su28.mode5', 'su28.mode8', 'parans'],
		experimental: ['su28.mode4', 'su28.mode6', 'su28.mode7'],
		'legacy-only': ['post /chart', 'primaryDirection', 'predictives'],
	};
}
