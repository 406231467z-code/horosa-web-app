/**
 * Chart fixed-star capability. Does not call swe_fixstar_ut.
 * The 1995 election table is not this catalog.
 */
export function fixedStarsCapability() {
	return {
		status: 'LICENSE_BLOCKED',
		source: 'Swiss fixed-star catalog',
		productionReady: false,
	};
}
