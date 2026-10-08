/**
 * Audits only. These layers are not calculated in PHASE 5-A.5.
 */
export const PARANS_STATUS = {
	status: 'RULE-INCOMPLETE',
	dependency: 'astrostudyui paransLocal.js is a Brady axis-contact approximation (obliquity 23.4367, default orb 2°). Production /chart declParallel is perchart.getParallel and is a different algorithm. Star parans need the Swiss fixed-star catalog. No production paran payload is reproduced here.',
};

export const FIXED_STAR_STATUS = {
	status: 'RULE-INCOMPLETE',
	dataDependency: 'flatlib chart.getFixedStars reads const.LIST_FIXED_STARS through the Swiss star catalog at the chart epoch. fixedStarSu28 and guoStarSect further depend on mansion catalogs, epoch tables, and precession modes in perchart and guo74.',
};

export const PARANS_REQUIRED_INPUTS = [
	'planet ecliptic longitude',
	'planet ecliptic latitude (paransLocal defaults missing latitude to 0)',
	'declination derived inside paransLocal by a fixed obliquity 23.4367, separate from objects[].decl',
	'geographic latitude',
	'right ascension and hour angle of the four axes (rise, set, MC, IC)',
	'fixed-star ecliptic longitude and declination from a star catalog',
	'orb, default 2° in paransLocal.js',
];

export const FIXED_STAR_REQUIRED_INPUTS = [
	'Swiss fixed-star catalog (sefstars) and const.LIST_FIXED_STARS',
	'chart Julian day as the epoch',
	'precession applied inside Swiss at that epoch',
	'zodiac of the chart, including sidereal mode when the chart is sidereal',
	'star longitude, latitude, right ascension, and declination',
	'fixedStarSu28: mansion catalog, width table, and the selected su28 mode (ecliptic or equatorial, tropical or sidereal)',
	'guoStarSect: planet mansion index from that su28 placement, plus guotables',
];

export const NAKSHATRA_REQUIRED_INPUTS = [
	'sidereal longitude',
	'ayanamsa that produced that sidereal longitude',
	'27-mansion table in astrostudy/nakshatra.py, each span 13°20′',
];

export const NAKSHATRA_STATUS = {
	status: 'NAKSHATRA_DATA_DEPENDENCY',
	dataDependency: 'astrostudy/nakshatra.py maps a sidereal longitude into 27 spans of 13°20′. The experimental chart is tropical. Sidereal longitude is REFERENCE-ONLY and is not an input to this layer.',
};
