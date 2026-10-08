// 皇极经世：vendor/kinwangji wanji.wanji_four_gua、xinyi、jieqi.gong_wangzhuai、history.pkl。
// 四柱与农历月走 buildLocalBaziResult / lunar-javascript，不另写一套历法。
// 六十四卦码来自 kinwangji/data/data.pkl 的「數字排六十四卦」。
import { Solar } from 'lunar-javascript';
import { buildLocalBaziResult } from './baziLunarLocal';
import { unsupportedStatus } from './calcStatus';
import GUA_TABLE from './huangjiGuaCodes.json';
import HISTORY from './huangjiHistory.json';

const GAN = '甲乙丙丁戊己庚辛壬癸';
const ZHI = '子丑寅卯辰巳午未申酉戌亥';
const WANGJI_60 = '復,頤,屯,益,震,噬嗑,隨,無妄,明夷,賁,既濟,家人,豐,革,同人,臨,損,節,中孚,歸妹,睽,兌,履,泰,大畜,需,小畜,大壯,大有,夬,姤,大過,鼎,恆,巽,井,蠱,升,訟,困,未濟,解,渙,蒙,師,遯,咸,旅,小過,漸,蹇,艮,謙,否,萃,晉,豫,觀,比,剝'.split(',');
const SPECIAL_NEIGHBOR = { 乾: '姤', 坤: '復', 離: '革', 坎: '蒙' };
const XUN_HEADS = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'];
const CODES = GUA_TABLE.codes;
const PRIMARY = GUA_TABLE.primary;
const JIEQI_ALIAS = { 惊蛰: '驚蟄', 谷雨: '穀雨', 小满: '小滿', 芒种: '芒種', 处暑: '處暑' };
const WANG_STATES = '旺相胎沒死囚休廢'.split('');
const WANG_TRIGRAMS = '震巽離坤兌乾坎艮'.split('');
const JIEQI_SEASON = [
	[['春分', '清明', '穀雨'], '春分'],
	[['立夏', '小滿', '芒種'], '立夏'],
	[['夏至', '小暑', '大暑'], '夏至'],
	[['立秋', '處暑', '白露'], '立秋'],
	[['秋分', '寒露', '霜降'], '秋分'],
	[['立冬', '小雪', '大雪'], '立冬'],
	[['冬至', '小寒', '大寒'], '冬至'],
	[['立春', '雨水', '驚蟄'], '立春'],
];
const SEASON_LEAD = { 春分: '震', 立夏: '巽', 夏至: '離', 立秋: '坤', 秋分: '兌', 立冬: '乾', 冬至: '坎', 立春: '艮' };
const TRIGRAM_CODE = { 乾: '777', 兌: '778', 離: '787', 震: '788', 巽: '877', 坎: '878', 艮: '887', 坤: '888' };
const XIANTIAN = { 1: '乾', 2: '兌', 3: '離', 4: '震', 5: '巽', 6: '坎', 7: '艮', 8: '坤' };
const GUA_WUXING = { 乾: '金', 兌: '金', 離: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土' };
const SHENG = { 金: '水', 水: '木', 木: '火', 火: '土', 土: '金' };
const KE = { 金: '木', 木: '土', 土: '水', 水: '火', 火: '金' };
const HOUTIAN_NUM = { 坎: 1, 坤: 2, 震: 3, 巽: 4, 乾: 6, 兌: 7, 艮: 8, 離: 9 };
const DIRECTION_GUA = { 北: '坎', 西南: '坤', 東: '震', 东南: '巽', 東南: '巽', 南: '離', 中: '坤', 西北: '乾', 西: '兌', 东北: '艮', 東北: '艮' };
const GUA_UNICODE = {
	乾: '䷀', 坤: '䷁', 屯: '䷂', 蒙: '䷃', 需: '䷄', 訟: '䷅', 師: '䷆', 比: '䷇', 小畜: '䷈', 履: '䷉',
	泰: '䷊', 否: '䷋', 同人: '䷌', 大有: '䷍', 謙: '䷎', 豫: '䷏', 隨: '䷐', 蠱: '䷑', 臨: '䷒', 觀: '䷓',
	噬嗑: '䷔', 賁: '䷕', 剝: '䷖', 復: '䷗', 無妄: '䷘', 大畜: '䷙', 頤: '䷚', 大過: '䷛', 坎: '䷜', 離: '䷝',
	咸: '䷞', 恆: '䷟', 遯: '䷠', 大壯: '䷡', 晉: '䷢', 明夷: '䷣', 家人: '䷤', 睽: '䷥', 蹇: '䷦', 解: '䷧',
	損: '䷨', 益: '䷩', 夬: '䷪', 姤: '䷫', 萃: '䷬', 升: '䷭', 困: '䷮', 井: '䷯', 革: '䷰', 鼎: '䷱',
	震: '䷲', 艮: '䷳', 漸: '䷴', 歸妹: '䷵', 豐: '䷶', 旅: '䷷', 巽: '䷸', 兌: '䷹', 渙: '䷺', 節: '䷻',
	中孚: '䷼', 小過: '䷽', 既濟: '䷾', 未濟: '䷿',
};
const CLASSIC_META = [
	{ key: 'huangji_jingshi_shu', title: '皇極經世書', author: '（宋）邵雍' },
	{ key: 'xinyi_fawei', title: '皇極經世心易發微', author: '（明）楊體仁（野厓）' },
	{ key: 'guanwu_yanyi', title: '皇極經世觀物外篇衍義', author: '（宋）張行成' },
];
const SENSITIVE = ['中華人民共和國', '中华人民共和国', '中华人民', '中華人民'];

function pad(n){
	return String(n).padStart(2, '0');
}

function toInt(value, fallback){
	const n = parseInt(value, 10);
	return Number.isFinite(n) ? n : fallback;
}

function jiazi(){
	const out = [];
	for(let i = 0; i < 60; i += 1){
		out.push(GAN[i % 10] + ZHI[i % 12]);
	}
	return out;
}

function pyRound(n){
	const sign = n < 0 ? -1 : 1;
	const abs = Math.abs(n);
	const floor = Math.floor(abs);
	const frac = abs - floor;
	let rounded = floor;
	if(frac > 0.5){
		rounded = floor + 1;
	}else if(frac === 0.5){
		rounded = floor % 2 === 0 ? floor : floor + 1;
	}
	return sign * rounded;
}

export function computeCycles(year){
	const y = year === 0 ? 1 : year;
	const acum = y < 0 ? 67017 + y + 1 : 67017 + y;
	return {
		acum,
		hui: Math.floor(acum / 10800) + 1,
		yun: Math.floor(acum / 360) + 1,
		shi: Math.floor(acum / 30) + (y < 0 ? 2 : 1),
	};
}

export function minuteGanzhi(hour, minute){
	const idx = (hour * 60 + minute);
	return jiazi()[Math.floor(idx / 2) % 60];
}

function changeLine(code, yao){
	const at = { 6: 5, 5: 4, 4: 3, 3: 2, 2: 1, 1: 0 }[yao];
	if(at === undefined){
		throw new Error('yao');
	}
	const chars = String(code).split('');
	if(chars[at] === '7'){
		chars[at] = '8';
	}else if(chars[at] === '8'){
		chars[at] = '7';
	}else{
		throw new Error('line');
	}
	return chars.join('');
}

function guaByCode(code){
	const text = String(code);
	return CODES[text] || CODES[text.replace(/9/g, '7').replace(/6/g, '8')] || null;
}

function normalizeCode(code){
	return String(code || '').replace(/9/g, '7').replace(/6/g, '8');
}

function rotate60(target){
	const actual = SPECIAL_NEIGHBOR[target] || target;
	const at = WANGJI_60.indexOf(actual);
	if(at < 0){
		throw new Error('rotate');
	}
	return WANGJI_60.slice(at).concat(WANGJI_60.slice(0, at));
}

function zipJiazi(guaName){
	const rotated = rotate60(guaName);
	const map = {};
	jiazi().forEach((gz, i)=>{ map[gz] = rotated[i]; });
	return map;
}

function deriveMonths(yearCode){
	const ny = normalizeCode(yearCode).split('');
	const tog = (ch)=> (ch === '7' ? '8' : '7');
	const first = [tog(ny[0])].concat(ny.slice(1));
	const second = [tog(first[0]), tog(first[1])].concat(first.slice(2));
	const third = [second[0], tog(second[1]), tog(second[2])].concat(second.slice(3));
	const forth = [third[0], third[1], tog(third[2]), tog(third[3])].concat(third.slice(4));
	const fifth = forth.slice(0, 3).concat([tog(forth[3]), tog(forth[4]), forth[5]]);
	const sixth = fifth.slice(0, 4).concat([tog(fifth[4]), tog(fifth[5])]);
	const list = [first, first, second, second, third, third, forth, forth, fifth, fifth, sixth, sixth];
	const out = {};
	list.forEach((chars, i)=>{ out[i + 1] = guaByCode(chars.join('')); });
	return out;
}

function closestPrev(list, k){
	let best = 0;
	let bestAbs = Infinity;
	list.forEach((v, i)=>{
		const d = Math.abs(v - k);
		if(d < bestAbs){
			bestAbs = d;
			best = i;
		}
	});
	return best === 0 ? list[list.length - 1] : list[best - 1];
}

function jiaziYears(){
	const years = [];
	for(let i = 0; i < 100; i += 1){
		years.push(-56 - 60 * i);
		years.push(4 + 60 * i);
	}
	years.sort((a, b)=> a - b);
	return years;
}

function xunHead(yearGz){
	const idx = jiazi().indexOf(yearGz);
	if(idx < 0){
		return null;
	}
	return XUN_HEADS[Math.floor(idx / 10)];
}

function tradJieqi(name){
	return JIEQI_ALIAS[name] || name || '';
}

function wangxiang(jieqi){
	let season = '';
	for(let i = 0; i < JIEQI_SEASON.length; i += 1){
		if(JIEQI_SEASON[i][0].indexOf(jieqi) >= 0){
			season = JIEQI_SEASON[i][1];
			break;
		}
	}
	const lead = SEASON_LEAD[season];
	if(!lead){
		return { byTrigram: {}, byState: {} };
	}
	const at = WANG_TRIGRAMS.indexOf(lead);
	const order = WANG_TRIGRAMS.slice(at).concat(WANG_TRIGRAMS.slice(0, at));
	const byTrigram = {};
	const byState = {};
	order.forEach((gua, i)=>{
		byTrigram[gua] = WANG_STATES[i];
		byState[WANG_STATES[i]] = gua;
	});
	return { byTrigram, byState };
}

function pillarsOf(data, year, month, day, hour, minute, second){
	const abs = Math.abs(year);
	const built = buildLocalBaziResult({
		date: data.date || `${year < 0 ? '-' : ''}${abs}-${pad(month)}-${pad(day)}`,
		time: data.time || `${pad(hour)}:${pad(minute)}:${pad(second)}`,
		zone: data.zone || '+08:00',
		after23NewDay: data.after23NewDay,
		lateZiHourUseNextDay: data.lateZiHourUseNextDay,
	});
	const fc = built && built.bazi && built.bazi.fourColumns;
	const nongli = built && built.bazi && built.bazi.nongli;
	if(!fc || !fc.year || !fc.day || !fc.time){
		return null;
	}
	return {
		year: fc.year.ganzi,
		month: fc.month && fc.month.ganzi,
		day: fc.day.ganzi,
		hour: fc.time.ganzi,
		lunarMonth: nongli && nongli.monthNum,
		lunarDay: nongli && nongli.dayNum,
		lunarYear: nongli && nongli.year,
	};
}

function lunarOf(year, month, day, hour, minute){
	const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
	const lunar = solar.getLunar();
	let jieqi = '';
	try{
		jieqi = tradJieqi(lunar.getPrevJieQi().getName());
	}catch(e){
		jieqi = '';
	}
	return {
		year: lunar.getYear(),
		month: Math.abs(lunar.getMonth()),
		day: lunar.getDay(),
		jieqi,
		text: `${lunar.getYear()}年${Math.abs(lunar.getMonth())}月${lunar.getDay()}日`,
	};
}

export function wanjiFourGua(parts){
	let year = parts.year;
	const month = parts.month;
	const day = parts.day;
	const hour = parts.hour;
	const minute = parts.minute;
	if(year < -12999 || year > 16799 || month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59){
		return null;
	}
	const lunar = parts.lunar;
	let lmonth = lunar.month;
	if(lmonth === 12 && month === 1){
		year -= 1;
	}
	const pillars = parts.pillars;
	const ygz = pillars.year;
	const dgz = pillars.day;
	const hgz = pillars.hour;
	const fgz = minuteGanzhi(hour, minute);
	const cycles = computeCycles(year === 0 ? 1 : year);
	const mainIndex = pyRound(cycles.acum / 2160);
	const mainGua = WANGJI_60[mainIndex - 1];
	if(!mainGua || !PRIMARY[mainGua]){
		return null;
	}
	const base = normalizeCode(PRIMARY[mainGua]);
	const yunYao = cycles.yun % 6 === 0 ? 6 : cycles.yun % 6;
	const yunCode = changeLine(base, yunYao);
	const yunGua = guaByCode(yunCode);
	const shiYao = Math.floor(cycles.shi / 2) % 6 || 6;
	const shiCode = changeLine(yunCode, shiYao);
	const shiGua = guaByCode(shiCode);
	const head = xunHead(ygz);
	const shunYao = head ? XUN_HEADS.indexOf(head) + 1 : null;
	const shunCode = shunYao ? changeLine(shiCode, shunYao) : null;
	const shunGua = shunCode ? guaByCode(shunCode) : null;
	let yearGua = null;
	try{
		yearGua = zipJiazi(shiGua)[ygz] || null;
	}catch(e){
		const years = jiaziYears();
		const close = years.indexOf(year) >= 0 ? year : closestPrev(years, year);
		const map = {};
		WANGJI_60.forEach((name, i)=>{ map[close + i] = name; });
		yearGua = map[lunar.year] || null;
	}
	const yearCode = PRIMARY[yearGua];
	const monthGua = yearCode ? deriveMonths(yearCode)[lmonth] : null;
	let dayGua = null;
	let hourGua = null;
	try{
		if(monthGua){
			dayGua = zipJiazi(monthGua)[dgz] || null;
		}
		if(dayGua){
			hourGua = zipJiazi(dayGua)[hgz] || null;
		}
	}catch(e){
		dayGua = dayGua || null;
		hourGua = hourGua || null;
	}
	const cycle = WANGJI_60.slice();
	let baseIdx = hourGua ? cycle.indexOf(hourGua) : 0;
	if(baseIdx < 0){
		baseIdx = 0;
	}
	let fenOffset = jiazi().indexOf(fgz);
	if(fenOffset < 0){
		fenOffset = 0;
	}
	const fenGua = cycle[((baseIdx + fenOffset) % 60 + minute) % 60];
	if(!yunGua || !shiGua || !shunGua || !yearGua || !monthGua || !dayGua || !hourGua || !fenGua){
		return null;
	}
	return {
		日期: `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`,
		干支: [ygz, pillars.month, dgz, hgz, fgz],
		會: cycles.hui,
		運: cycles.yun,
		世: cycles.shi,
		運卦動爻: yunYao,
		世卦動爻: shiYao,
		旬卦動爻: shunYao,
		正卦: mainGua,
		運卦: yunGua,
		世卦: shiGua,
		旬卦: shunGua,
		年卦: yearGua,
		月卦: monthGua,
		日卦: dayGua,
		時卦: hourGua,
		分卦: fenGua,
	};
}

function numTrigram(n){
	let r = n % 8;
	if(r === 0){
		r = 8;
	}
	return XIANTIAN[r];
}

function movingLine(total){
	const r = total % 6;
	return r === 0 ? 6 : r;
}

function buildXinyi(upper, lower, yao){
	const hex = TRIGRAM_CODE[lower] + TRIGRAM_CODE[upper];
	const ben = guaByCode(hex);
	const bian = guaByCode(changeLine(hex, yao));
	const norm = normalizeCode(hex);
	const hu = guaByCode(norm.slice(1, 4) + norm.slice(2, 5));
	const ti = yao <= 3 ? upper : lower;
	const yong = yao <= 3 ? lower : upper;
	const tiWx = GUA_WUXING[ti];
	const yongWx = GUA_WUXING[yong];
	let relation = '';
	if(tiWx === yongWx){
		relation = '比和';
	}else if(SHENG[yongWx] === tiWx){
		relation = '用生體';
	}else if(SHENG[tiWx] === yongWx){
		relation = '體生用';
	}else if(KE[yongWx] === tiWx){
		relation = '用克體';
	}else if(KE[tiWx] === yongWx){
		relation = '體克用';
	}
	return {
		本卦: ben,
		變卦: bian,
		動爻: yao,
		上卦: upper,
		下卦: lower,
		體卦: ti,
		用卦: yong,
		互卦: hu,
		體用五行: `體${ti}(${tiWx}) ${relation} 用${yong}(${yongWx})`,
	};
}

export function numberQigua(upperNum, lowerNum){
	if(upperNum < 1 || lowerNum < 1){
		return null;
	}
	return buildXinyi(numTrigram(upperNum), numTrigram(lowerNum), movingLine(upperNum + lowerNum));
}

function shichenOf(hour){
	if(hour === 23 || hour === 0) return 1;
	return Math.floor((hour + 1) / 2) + 1;
}

export function datetimeQigua(lunarYear, lunarMonth, lunarDay, hour){
	const branch = ((lunarYear - 4) % 12 + 12) % 12 + 1;
	const upperSum = branch + lunarMonth + lunarDay;
	const lowerSum = upperSum + shichenOf(hour);
	return buildXinyi(numTrigram(upperSum), numTrigram(lowerSum), movingLine(lowerSum));
}

export function directionQigua(objectGua, direction, hour){
	if(!TRIGRAM_CODE[objectGua] || !DIRECTION_GUA[direction]){
		return null;
	}
	const lowerName = DIRECTION_GUA[direction];
	const yao = movingLine((HOUTIAN_NUM[objectGua] || 1) + (HOUTIAN_NUM[lowerName] || 1) + shichenOf(hour));
	return buildXinyi(objectGua, lowerName, yao);
}

function historyForYear(year){
	return HISTORY.filter((rec)=> rec.start_year <= year && year < rec.start_year + rec.duration).map((rec)=>{
		const blob = `${rec.dynasty || ''}${rec.title || ''}${rec.name || ''}${rec.era || ''}`;
		if(SENSITIVE.some((item)=> blob.indexOf(item) >= 0)){
			return { start_year: rec.start_year, duration: rec.duration, dynasty: '无', title: '无', name: '无', era: '无' };
		}
		return rec;
	});
}

function row(label, value){
	const text = value === undefined || value === null || value === '' ? '—' : `${value}`;
	return { label, value: text };
}

function guaRow(label, name, moving){
	if(!name){
		return row(label, '—');
	}
	let text = `${GUA_UNICODE[name] || ''} ${name}`.trim();
	if(moving){
		text = `${text}，动爻：${moving}`;
	}
	return row(label, text);
}

function cyclePos(value, length){
	return ((value - 1) % length) + 1;
}

function buildSections(result, jieqi, states, history, lunarText){
	const gz = result.干支 || [];
	const sections = [
		{
			title: '起盘',
			rows: [
				row('起卦时间', result.日期),
				row('农历', lunarText),
				row('节气', jieqi),
				row('旺', states.旺),
				row('相', states.相),
				row('年柱', gz[0]),
				row('月柱', gz[1]),
				row('日柱', gz[2]),
				row('时柱', gz[3]),
				row('分柱', gz[4]),
			],
		},
		{
			title: '元会运世',
			rows: [
				row('会', `${result.會}（${cyclePos(result.會, 12)}/12）`),
				row('运', `${result.運}（${cyclePos(result.運, 30)}/30）`),
				row('世', `${result.世}（${cyclePos(result.世, 12)}/12）`),
			],
		},
		{
			title: '天道卦',
			rows: [
				guaRow('正卦', result.正卦),
				guaRow('运卦', result.運卦, result.運卦動爻),
				guaRow('世卦', result.世卦, result.世卦動爻),
				guaRow('旬卦', result.旬卦, result.旬卦動爻),
			],
		},
		{
			title: '人事卦',
			rows: [
				guaRow('年卦', result.年卦),
				guaRow('月卦', result.月卦),
				guaRow('日卦', result.日卦),
				guaRow('时卦', result.時卦),
				guaRow('分卦', result.分卦),
			],
		},
	];
	const historyRows = [];
	(history || []).forEach((rec)=>{
		historyRows.push(row('年代', `${rec.start_year}起，${rec.duration}年`));
		historyRows.push(row('朝代', rec.dynasty));
		historyRows.push(row('称号', rec.title));
		historyRows.push(row('名讳', rec.name));
		historyRows.push(row('年号', rec.era));
	});
	sections.push({ title: '历史年表', rows: historyRows.length ? historyRows : [row('历史年表', '无')] });
	return sections;
}

export function classicCatalog(classicKey){
	const selected = CLASSIC_META.some((item)=> item.key === classicKey) ? classicKey : CLASSIC_META[0].key;
	const meta = CLASSIC_META.find((item)=> item.key === selected);
	return {
		meta: CLASSIC_META,
		selectedKey: selected,
		withContent: true,
		sections: [{ level: 1, title: meta.title, content: '' }],
	};
}

export function xinyiFromPayload(data){
	const method = (data && data.method) || 'number';
	let result = null;
	let used = method;
	if(method === 'datetime'){
		const lunar = lunarOf(toInt(data.year, 2025), toInt(data.month, 1), toInt(data.day, 1), toInt(data.hour, 0), 0);
		result = datetimeQigua(lunar.year, lunar.month, lunar.day, toInt(data.hour, 0));
	}else if(method === 'direction'){
		result = directionQigua(data.objectGua || '乾', data.direction || '北', toInt(data.hour, 0));
	}else if(method === 'character'){
		used = 'character';
		result = numberQigua(Math.max(1, toInt(data.upperStrokes, 5)), Math.max(1, toInt(data.lowerStrokes, 8)));
	}else{
		used = 'number';
		result = numberQigua(Math.max(1, toInt(data.upperNum, 5)), Math.max(1, toInt(data.lowerNum, 10)));
	}
	if(!result || !result.本卦){
		return null;
	}
	return {
		method: used,
		result,
		sections: [{ title: '心易发微', rows: Object.keys(result).map((key)=> row(key, result[key])) }],
	};
}

function parseInput(data){
	const src = data || {};
	const year = toInt(src.year, NaN);
	const month = toInt(src.month, NaN);
	const day = toInt(src.day, NaN);
	const hour = toInt(src.hour, 0);
	const minute = toInt(src.minute, 0);
	const second = toInt(src.second, 0);
	if(!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)){
		return null;
	}
	return { ...src, year, month, day, hour, minute, second };
}

export const HuangJiBrowserEngine = {
	calculate(data){
		const input = parseInput(data);
		if(!input){
			return unsupportedStatus('huangji', 'HUANGJI_INPUT', '皇极起盘需要年月日。');
		}
		let lunar = null;
		let pillars = null;
		try{
			lunar = lunarOf(input.year, input.month, input.day, input.hour, input.minute);
			pillars = pillarsOf(input, input.year, input.month, input.day, input.hour, input.minute, input.second);
		}catch(e){
			return unsupportedStatus('huangji', 'HUANGJI_CALENDAR', '共享历无法给出这组时间的干支。');
		}
		if(!pillars || !lunar){
			return unsupportedStatus('huangji', 'HUANGJI_CALENDAR', '共享历无法给出这组时间的干支。');
		}
		const raw = wanjiFourGua({ ...input, lunar, pillars });
		if(!raw){
			return unsupportedStatus('huangji', 'HUANGJI_GUA', '仓内卦表无法排出这组元会运世卦。');
		}
		const states = wangxiang(lunar.jieqi).byState;
		const historyYear = Number.isFinite(toInt(input.historyYear, NaN)) ? toInt(input.historyYear, input.year) : input.year;
		const history = historyForYear(historyYear);
		const pan = {
			source: 'kinwangji',
			engine: 'browser',
			dateStr: input.date || raw.日期.split(' ')[0],
			timeStr: input.time || raw.日期.split(' ')[1],
			raw,
			lunarDate: { year: lunar.year, month: lunar.month, day: lunar.day, text: lunar.text },
			solarTerm: lunar.jieqi,
			wangxiang: states,
			historyYear,
			history,
			classics: classicCatalog(input.classicKey),
			guaUnicode: GUA_UNICODE,
		};
		pan.sections = buildSections(raw, lunar.jieqi, states, history, lunar.text);
		return {
			status: 'SUCCESS',
			provider: 'browser',
			input,
			result: pan,
			meta: {
				feature: 'huangji',
				source: 'kinwangji.wanji.wanji_four_gua',
				pillarSource: 'buildLocalBaziResult',
			},
		};
	},
	getCapabilities(){
		return {
			status: 'SUCCESS',
			provider: 'browser',
			inputs: ['date', 'time', 'year', 'month', 'day', 'hour', 'minute', 'historyYear', 'classicKey'],
			outputs: ['hui', 'yun', 'shi', 'nineHexagrams', 'gangzhi', 'solarTerm', 'history', 'xinyi'],
			productionReady: true,
		};
	},
};

export function HuangJiCalculationProvider(){
	return HuangJiBrowserEngine;
}
