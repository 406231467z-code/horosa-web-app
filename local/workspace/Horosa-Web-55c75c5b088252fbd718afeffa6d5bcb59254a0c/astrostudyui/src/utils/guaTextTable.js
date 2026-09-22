import index from './data/guaTextIndex.json';

// PHASE 4-B: classpath 卦辞/梅花易静态表。键与 Java GuaHelper 一致：爻象二进制、卦名、简称、宫名。
// 表内没有的名字返回空，不补造卦辞。

function yaoKey(gua){
	const yao = gua && Array.isArray(gua.yao) ? gua.yao : null;
	return yao ? yao.join('') : '';
}

function indexGuaList(list){
	const map = new Map();
	(list || []).forEach((gua)=>{
		if(!gua){
			return;
		}
		[yaoKey(gua), gua.name, gua.abrname, gua.guaname].forEach((key)=>{
			if(key === undefined || key === null || `${key}` === ''){
				return;
			}
			map.set(`${key}`, gua);
		});
	});
	return map;
}

const guaMap = indexGuaList(index.gua);
const meiyiMap = indexGuaList(index.meiyi);

function lookup(map, name){
	if(name === undefined || name === null || `${name}` === ''){
		return undefined;
	}
	return map.get(`${name}`);
}

export function lookupGua(name){
	return lookup(guaMap, name);
}

export function lookupMeiyiGua(name){
	return lookup(meiyiMap, name);
}

function lookupMap(map, names){
	const out = {};
	(Array.isArray(names) ? names : []).forEach((name)=>{
		const hit = lookup(map, name);
		if(hit){
			out[name] = hit;
		}
	});
	return out;
}

export function lookupGuaDescMap(names){
	return lookupMap(guaMap, names);
}

export function lookupMeiyiDescMap(names){
	return lookupMap(meiyiMap, names);
}

export function guaTextTableCounts(){
	return {
		gua: Array.isArray(index.gua) ? index.gua.length : 0,
		meiyi: Array.isArray(index.meiyi) ? index.meiyi.length : 0,
	};
}
