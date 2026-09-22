// PHASE 1 product surface. Tabs/drawers not listed here must not reappear
// via leftover localStorage, hash, or homepage picker.

export const DEFAULT_TAB = 'astrochart';

export const KEEP_TAB_KEYS = [
	'astrochart',
	'direction',
	'bazi',
	'ziwei',
	'guolao',
	'indiachart',
	'auxchart',
	'relativechart',
	'shusuan',
	'mingother',
	'jieqichart',
	'sanshiunited',
	'liureng',
	'dunjia',
	'guazhan',
	'taiyi',
	'cnyibu',
	'aianalysis',
];

export const TAB_ALIASES = {
	yanqin: 'mingother',
};

export const REMOVED_TAB_KEYS = [
	'fengshui',
	'planetarium',
	'astrochart3D',
	'calendar',
	'cntradition',
	'xuanshi',
	'astrodata',
	'zeri',
	'astroreader',
	'liveplayer',
	'admintools',
	'tarot',
	'primarydirsphere',
];

export const KEEP_DRAWER_KEYS = [
	'query',
	'selectplanet',
	'selectchartdisplay',
	'selectasp',
	'selectorb',
	'chartlist',
	'chartedit',
	'chartadd',
	'homepage',
];

export const REMOVED_DRAWER_KEYS = [
	'register',
	'login',
	'resetpwd',
	'changepwd',
	'changeparams',
	'caselist',
	'caseedit',
	'caseadd',
	'chartdeeplearn',
	'memo',
	'chartsgps',
	'commtools',
];

export const CHARTS_NAV_KEY = '__charts__';

export function canonicalizeTabKey(key){
	if(!key){
		return DEFAULT_TAB;
	}
	const aliased = TAB_ALIASES[key] || key;
	if(KEEP_TAB_KEYS.indexOf(aliased) >= 0){
		return aliased;
	}
	return DEFAULT_TAB;
}

export function isKeepTabKey(key){
	return KEEP_TAB_KEYS.indexOf(TAB_ALIASES[key] || key) >= 0;
}

export function isKeepDrawerKey(key){
	return KEEP_DRAWER_KEYS.indexOf(key) >= 0;
}

// User-visible AI export / mount selectors must not offer these.
// Snapshot parsers may still recognize the keys when reading historical JSON.
// huangli = 老黄历日课 (removed calendar page). huangji = 皇极经世 (KEEP).
export const REMOVED_AI_TECHNIQUE_KEYS = [
	'fengshui',
	'calendar',
	'huangli',
	'tongshu',
	'tarot',
	'tianxing',
	'qimenzeri',
	'huanglizeri',
	'bazizeri',
	'taiyizeri',
	'ziweizeri',
	'liurengzeri',
	'sanshizeri',
	'qizhengzeri',
	'indiazeri',
];

export function isRemovedAiTechniqueKey(key){
	return REMOVED_AI_TECHNIQUE_KEYS.indexOf(key) >= 0;
}
