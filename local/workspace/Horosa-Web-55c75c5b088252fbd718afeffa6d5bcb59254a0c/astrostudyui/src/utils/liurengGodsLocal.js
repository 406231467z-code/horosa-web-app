import gods from './data/gods.json';
import taisui from './data/taisui.json';
import { buildLocalNongliLite } from './baziLunarLocal';
import { isLunarJsYearReliable } from './lunarDomainGuard';
import request from './request';
import { ServerRoot, ResultKey } from './constants';

// PHASE 4-C: 六壬神煞与旬日。公式对齐 LiuReng.fillGods / fillXun 与 GodsHelper.findGods、findTaiSuiGods。
// 四柱来自既有本地农历。域外抛错则返回 null，由调用方改走 /liureng/gods。

const GAN = '甲乙丙丁戊己庚辛壬癸'.split('');
const ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('');
const JIAZI = [];
for(let i = 0; i < 60; i += 1){
	JIAZI.push(`${GAN[i % 10]}${ZHI[i % 12]}`);
}
const JIAZI_INDEX = {};
JIAZI.forEach((gz, i)=>{ JIAZI_INDEX[gz] = i; });
const ZHI_INDEX = {};
ZHI.forEach((z, i)=>{ ZHI_INDEX[z] = i; });
const XUN_EMPTY = ['戌亥', '申酉', '午未', '辰巳', '寅卯', '子丑'];
const DING_INDEX = 3;

const LIURENG_GOD_NAMES = {
	month: ['天德', '月德', '月破'],
	gan: ['长生(水土同)', '干墓(水土同)', '游都'],
	zi: ['金神', '亡神', '劫煞', '咸池', '华盖', '支将', '日破'],
	base: ['日德', '禄勋'],
	yima: ['驿马'],
};

const ruleMap = new Map();
(Array.isArray(gods) ? gods : []).forEach((rule)=>{
	if(!rule || !rule.name){
		return;
	}
	const names = `${rule.name}`.split('/');
	names.forEach((name)=>{
		if(name){
			ruleMap.set(name, rule);
		}
	});
	ruleMap.set(rule.name, rule);
});

function lookupGod(name, key){
	const rule = ruleMap.get(name);
	if(!rule || !rule.rule){
		return null;
	}
	const hit = rule.rule[key];
	if(hit === undefined || hit === null){
		return [];
	}
	return Array.isArray(hit) ? hit.slice() : [hit];
}

function lookupGodMap(names, key){
	const out = {};
	for(let i = 0; i < names.length; i += 1){
		const name = names[i];
		const hit = lookupGod(name, key);
		if(hit === null){
			return null;
		}
		out[name] = hit;
	}
	return out;
}

export function fillXun(dayGanZi){
	const idx = JIAZI_INDEX[dayGanZi];
	if(idx === undefined){
		return null;
	}
	const gan = dayGanZi.charAt(0);
	const ganIdx = GAN.indexOf(gan);
	if(ganIdx < 0){
		return null;
	}
	const delta = DING_INDEX - ganIdx;
	const ding = JIAZI[idx + delta];
	if(!ding){
		return null;
	}
	const xunIdx = Math.floor(idx / 10);
	return {
		'旬丁': ding,
		'遁丁': ding.charAt(1),
		'旬空': XUN_EMPTY[xunIdx],
		'旬首': JIAZI[xunIdx * 10],
		'旬尾': JIAZI[xunIdx * 10 + 9],
	};
}

export function findTaiSuiGods(yearZi){
	const yearZiIdx = ZHI_INDEX[yearZi];
	if(yearZiIdx === undefined){
		return null;
	}
	const maps = [{}, {}, {}];
	const tables = [taisui.gods1, taisui.gods2, taisui.gods3];
	for(let i = 0; i < 12; i += 1){
		const zi = ZHI[i];
		const idx = (i - yearZiIdx + 12) % 12;
		for(let t = 0; t < 3; t += 1){
			const name = tables[t] && tables[t][idx];
			if(name){
				maps[t][name] = zi;
			}
		}
	}
	return { taisui1: maps[0], taisui2: maps[1], taisui3: maps[2] };
}

function yearOf(params){
	const date = `${params && params.date || ''}`.trim();
	const neg = date.startsWith('-');
	return { year: parseInt(neg ? date.slice(1) : date, 10), neg };
}

export function buildLocalLiureng(params){
	const src = params || {};
	const { year, neg } = yearOf(src);
	const ad = Number(src.ad);
	if(neg || ad < 0 || !isLunarJsYearReliable(year)){
		return null;
	}
	let lite = null;
	try{
		lite = buildLocalNongliLite({
			date: src.date,
			time: src.time,
			zone: src.zone,
			lon: src.lon,
			lat: src.lat,
			gpsLon: src.gpsLon,
			gpsLat: src.gpsLat,
			ad: src.ad != null ? src.ad : 1,
			gender: src.gender,
			timeAlg: src.timeAlg,
			after23NewDay: src.after23NewDay,
			lateZiHourUseNextDay: src.lateZiHourUseNextDay,
		});
	}catch(e){
		return null;
	}
	const four = lite && lite.bazi && lite.bazi.fourColumns;
	if(!four || !four.day || !four.day.ganzi || !four.year || !four.year.ganzi || !four.month){
		return null;
	}
	const dayGanZi = four.day.ganzi;
	const xun = fillXun(dayGanZi);
	const godsYear = findTaiSuiGods(four.year.ganzi.charAt(1));
	const godsMonth = lookupGodMap(LIURENG_GOD_NAMES.month, four.month.ganzi.charAt(1));
	const godsGan = lookupGodMap(LIURENG_GOD_NAMES.gan, dayGanZi.charAt(0));
	const godsZi = lookupGodMap(LIURENG_GOD_NAMES.zi, dayGanZi.charAt(1));
	const gods = lookupGodMap(LIURENG_GOD_NAMES.base, dayGanZi.charAt(0));
	const yima = lookupGodMap(LIURENG_GOD_NAMES.yima, dayGanZi.charAt(1));
	if(!xun || !godsYear || !godsMonth || !godsGan || !godsZi || !gods || !yima){
		return null;
	}
	gods['驿马'] = yima['驿马'];
	return {
		fourColumns: four,
		nongli: {
			...(lite.bazi.nongli || {}),
			dayGanZi,
			monthGanZi: four.month.ganzi,
			yearGanZi: four.year.ganzi,
			timeGanZi: four.time ? four.time.ganzi : '',
			yearJieqi: four.year.ganzi,
		},
		xun,
		gods,
		godsGan,
		godsZi,
		godsMonth,
		godsYear,
		local: true,
	};
}

export function fetchLiurengGods(params, requestOpts){
	const local = buildLocalLiureng(params);
	if(local){
		return Promise.resolve({ [ResultKey]: { liureng: local } });
	}
	const opts = {
		body: JSON.stringify(params || {}),
		...(requestOpts || {}),
	};
	return request(`${ServerRoot}/liureng/gods`, opts);
}
