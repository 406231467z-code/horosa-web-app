import * as AstroConst from '../constants/AstroConst';

const SIGN_ORDER = AstroConst.LIST_SIGNS;
const CHALDEAN_ORDER = ['Saturn','Jupiter','Mars','Sun','Venus','Mercury','Moon'];
const SIGN_RULERS = {
	Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon', Leo:'Sun', Virgo:'Mercury',
	Libra:'Venus', Scorpio:'Mars', Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter',
};

const LUNAR_MANSIONS = [
	['Al-Sharatain','初星','吉','出行·开端'],
	['Al-Butain','腹星','凶','不宜动土'],
	['Al-Thurayya','昴聚','参半','炼金·种植'],
	['Al-Dabaran','随星','凶','破败·冲突'],
	['Al-Haqah','冠星','吉','建造·和合'],
	['Al-Hanah','印星','吉','狩猎·围攻'],
	['Al-Dhira','臂星','吉','增益·收获'],
	['Al-Nathrah','气星','吉','远行·释囚'],
	['Al-Tarf','目星','凶','损耗·疾病'],
	['Al-Jabhah','额星','吉','建造·恩宠'],
	['Al-Zubrah','鬃星','吉','荣升·丰收'],
	['Al-Sarfah','转星','凶','宜破·不宜立'],
	['Al-Awwa','吠星','吉','婚姻·旅行'],
	['Al-Simak','独星','参半','掘井·和睦/亦主分离'],
	['Al-Ghafr','覆星','凶','掘井·亦主败'],
	['Al-Zubana','螯星','凶','赎金·离散'],
	['Al-Iklil','冕星','吉','婚姻·修好'],
	['Al-Qalb','心星','参半','攻伐·复仇'],
	['Al-Shaulah','尾星','凶','围攻·毒害'],
	['Al-Naaim','鸵星','凶','驯兽·亦主险'],
	['Al-Baldah','荒星','平','耕作·建造'],
	['Sad al-Dhabih','屠者吉','吉','医疗·脱困'],
	['Sad Bula','吞者吉','凶','和解·亦主散'],
	['Sad al-Suud','至吉','吉','婚姻·商旅'],
	['Sad al-Akhbiyah','帐吉','凶','围攻·囚禁'],
	['Al-Fargh al-Muqaddam','前泻','凶','不宜立约'],
	['Al-Fargh al-Muakhkhar','后泻','吉','增益·得利'],
	['Batn al-Hut','鱼腹','吉','行船·商贸·和合'],
];
const LUNAR_MANSION_WIDTH = 360 / 28;

const MASCULINE_DEGREES = {
	Aries:[[1,7],[16,22],[30,30]], Taurus:[[8,22]], Gemini:[[7,17],[24,27]],
	Cancer:[[1,2],[8,10],[22,26],[30,30]], Leo:[[1,5],[8,13],[24,30]],
	Virgo:[[8,12],[21,30]], Libra:[[1,5],[11,21],[29,30]], Scorpio:[[1,4],[11,14],[24,30]],
	Sagittarius:[[1,2],[6,12],[25,30]], Capricorn:[[1,11],[20,30]], Aquarius:[[1,5],[13,18],[26,30]],
	Pisces:[[1,10],[21,23],[29,30]],
};

const DEGREE_QUALITY = {
	Aries:[['D',3],['B',5],['D',8],['B',4],['E',4],['B',5],['E',1]],
	Taurus:[['D',3],['B',7],['E',2],['B',8],['D',5],['B',3],['E',2]],
	Gemini:[['B',7],['D',3],['B',5],['E',2],['B',6],['D',5],['E',2]],
	Cancer:[['B',12],['D',2],['E',4],['S',2],['B',8],['E',2]],
	Leo:[['D',10],['S',6],['E',5],['B',9]],
	Virgo:[['D',6],['B',3],['E',2],['B',6],['S',4],['E',5],['D',4]],
	Libra:[['B',5],['D',5],['B',8],['D',3],['B',6],['E',3]],
	Scorpio:[['D',3],['B',5],['E',6],['B',6],['S',2],['E',5],['D',3]],
	Sagittarius:[['B',9],['D',3],['B',7],['S',4],['B',7]],
	Capricorn:[['D',7],['B',3],['S',5],['B',4],['D',2],['E',4],['D',5]],
	Aquarius:[['S',4],['B',5],['D',4],['B',8],['E',4],['B',5]],
	Pisces:[['D',6],['B',6],['D',6],['B',4],['E',3],['B',3],['D',2]],
};
const PITTED = {
	Aries:[6,9,11,17,24,29], Taurus:[5,13,18,24,25,29], Gemini:[2,12,17,26,30],
	Cancer:[12,17,23,26,30], Leo:[6,13,15,22,23,28], Virgo:[8,13,16,21,25],
	Libra:[1,7,20,30], Scorpio:[9,10,22,23,27], Sagittarius:[7,12,15,24,27,30],
	Capricorn:[2,7,17,22,24,28], Aquarius:[1,12,17,23,29], Pisces:[4,9,24,27,28],
};
const AZEMENE = {
	Taurus:[6,7,8,10], Cancer:[9,10,11,12,13,14,15], Leo:[18,27,28], Scorpio:[19,29],
	Sagittarius:[1,7,8,18,19], Capricorn:[26,27,28,29], Aquarius:[10,18,19],
};
const FORTUNE_DEGREES = {
	Aries:[19], Taurus:[3,15,27], Gemini:[11], Cancer:[1,2,3,14,15],
	Leo:[3,5,7,17], Virgo:[3,12,20], Libra:[3,5,21], Scorpio:[7,12,20],
	Sagittarius:[13,20], Capricorn:[12,13,14,20], Aquarius:[7,17,20], Pisces:[13,20],
};

export function mansionOf(longitude){
	const lon = Number(longitude);
	if(!Number.isFinite(lon)){ return null; }
	const normalized = ((lon % 360) + 360) % 360;
	const idx = Math.min(27,Math.floor(normalized/LUNAR_MANSION_WIDTH));
	const row = LUNAR_MANSIONS[idx];
	return { idx: idx + 1, name: row[0], cn: row[1], nature: row[2], use: row[3], startDeg: Number((idx*LUNAR_MANSION_WIDTH).toFixed(4)) };
}

export function degreeGender(sign, signlon){
	const degree = Math.floor(Number(signlon)) + 1;
	if(!Number.isFinite(degree)){ return null; }
	const ranges = MASCULINE_DEGREES[sign];
	if(!ranges){ return null; }
	return ranges.some(([lo,hi])=>degree >= lo && degree <= hi) ? 'masculine' : 'feminine';
}

export function monomoiriaRuler(longitude){
	const lon = Number(longitude);
	return Number.isFinite(lon) ? CHALDEAN_ORDER[Math.floor(((lon%360)+360)%360)%7] : null;
}

export function ninthPartSign(longitude){
	const lon = Number(longitude);
	return Number.isFinite(lon) ? SIGN_ORDER[Math.floor(((lon%360)+360)%360/(10/3))%12] : null;
}

export function darijanRuler(sign, signlon){
	const idx = SIGN_ORDER.indexOf(sign);
	const degree = Number(signlon);
	if(idx < 0 || !Number.isFinite(degree)){ return null; }
	const decan = Math.max(0,Math.min(2,Math.floor(degree/10)));
	return SIGN_RULERS[SIGN_ORDER[(idx+decan*4)%12]] || null;
}

export function degreeQuality(sign, signlon){
	const runs = DEGREE_QUALITY[sign];
	const value = Number(signlon);
	if(!runs || !Number.isFinite(value)){ return null; }
	const bounded = Math.max(0,Math.min(29.999,value));
	let cursor = 0;
	for(const [quality,length] of runs){
		cursor += length;
		if(bounded < cursor){ return quality; }
	}
	return runs[runs.length-1][0];
}

export function specialDegree(sign, signlon){
	const value = Number(signlon);
	if(!Number.isFinite(value)){ return null; }
	const degree = Math.max(1,Math.min(30,Math.floor(value)+1));
	const result = {};
	if((PITTED[sign] || []).includes(degree)){ result.pitted = true; }
	if((AZEMENE[sign] || []).includes(degree)){ result.azemene = true; }
	if((FORTUNE_DEGREES[sign] || []).includes(degree)){ result.fortune = true; }
	return Object.keys(result).length ? result : null;
}
