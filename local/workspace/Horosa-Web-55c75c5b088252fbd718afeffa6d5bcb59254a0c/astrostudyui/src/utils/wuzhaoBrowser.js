// 五兆：vendor/kinwuzhao/kinwuzhao.py 的揲筮、孤虚、关籥，
// 关籥的地转天盘只取 kinliuren.Liuren.sky_n_earth_list（月将加时支）。
// 四柱与节气用浏览器历。分干支按 config.minutes_jiazi_d（五狗遁）。
import { createPythonRandom } from './pythonRandom';
import { buildLocalBaziResult } from './baziLunarLocal';
import { unsupportedStatus } from './calcStatus';
import { Solar } from 'lunar-javascript';

const GAN = '甲乙丙丁戊己庚辛壬癸';
const ZHI = '子丑寅卯辰巳午未申酉戌亥';
const POSITION_ORDER = ['兆', '木鄉', '火鄉', '土鄉', '金鄉', '水鄉'];
const POSITIONS = [
	['巽宮', '兆'], ['震宮', '木鄉'], ['離宮', '火鄉'], ['中宮', '土鄉'], ['兌宮', '金鄉'], ['坎宮', '水鄉'],
];
const POSITION_LABELS = { 兆: '兆', 木鄉: '木乡', 火鄉: '火乡', 土鄉: '土乡', 金鄉: '金乡', 水鄉: '水乡' };
const FLAG_NAMES = ['孤', '虛', '關', '籥', '將軍', '六獸死', '六獸害'];
const FLAG_LABELS = { 孤: '孤', 虛: '虚', 關: '关', 籥: '籥', 將軍: '将军', 六獸死: '六兽死', 六獸害: '六兽害' };
const MODE_LABELS = {
	ganzhi: '干支起盘', day: '日干起盘', hour: '时干起盘', minute: '分干起盘',
	tang: '唐代正法揲筮', dunhuang: '敦煌校录揲筮', qian: '以钱代筮', zhushu: '直输五兆数',
};
const NUM_TO_ELEMENT = { 1: '水', 2: '火', 3: '木', 4: '金', 5: '土' };
const ELEM_TO_NUM = { 水: 1, 火: 2, 木: 3, 金: 4, 土: 5 };
const RELATION_TO_LIUQIN = { 尅我: '官鬼', 我尅: '妻財', 比和: '兄弟', 生我: '父母', 我生: '子孫' };
const WUXING_GROUPS = [
	['火水', '金火', '木金', '水土', '土木'],
	['水火', '火金', '金木', '土水', '木土'],
	['火火', '金金', '木木', '土土', '水水'],
	['火木', '水金', '木水', '土火', '金土'],
	['木火', '金水', '水木', '火土', '土金'],
];
const WUXING_NAMES = ['尅我', '我尅', '比和', '生我', '我生'];
const BEASTS = ['青龍', '朱雀', '螣蛇', '勾陳', '白虎', '玄武'];
const DAY_GAN_BEAST = { 甲: '青龍', 乙: '青龍', 丙: '朱雀', 丁: '朱雀', 戊: '勾陳', 己: '勾陳', 庚: '白虎', 辛: '白虎', 壬: '玄武', 癸: '玄武' };
const BEAST_WEAK = {
	青龍: ['坤', '兌'], 朱雀: ['坎', '巽'], 螣蛇: ['坎', '巽'], 勾陳: ['巽', '巽'], 白虎: ['坎', '離'], 玄武: ['巽', '震'],
};
const ZHI2GUA = {
	子: '坎', 寅: '震', 卯: '震', 辰: '巽', 巳: '巽', 午: '離', 申: '兌', 酉: '兌', 戌: '乾', 亥: '乾', 丑: '中', 未: '中',
};
const GENERAL = { 子: '子', 丑: '酉', 寅: '午', 卯: '卯', 辰: '子', 巳: '酉', 午: '午', 未: '卯', 申: '子', 酉: '酉', 戌: '午', 亥: '卯' };
const SOLAR_LOCK = [
	[['立春', '雨水', '驚蟄', '春分', '清明', '穀雨'], { 關: '丑', 籥: '巳' }],
	[['立夏', '小滿', '芒種', '夏至', '小暑', '大暑'], { 關: '辰', 籥: '申' }],
	[['立秋', '處暑', '白露', '秋分', '寒露', '霜降'], { 關: '未', 籥: '亥' }],
	[['立冬', '小雪', '大雪', '冬至', '小寒', '大寒'], { 關: '戌', 籥: '寅' }],
];
const MOON_GENERAL = [
	[['雨水', '驚蟄'], '亥'], [['春分', '清明'], '戌'], [['穀雨', '立夏'], '酉'], [['小滿', '芒種'], '申'],
	[['夏至', '小暑'], '未'], [['大暑', '立秋'], '午'], [['處暑', '白露'], '巳'], [['秋分', '寒露'], '辰'],
	[['霜降', '立冬'], '卯'], [['小雪', '大雪'], '寅'], [['冬至', '小寒'], '丑'], [['大寒', '立春'], '子'],
];
const JIEQI_GROUPS = [
	['立春', '雨水', '驚蟄'], ['春分', '清明', '穀雨'], ['立夏', '小滿', '芒種'], ['夏至', '小暑', '大暑'],
	['立秋', '處暑', '白露'], ['秋分', '寒露', '霜降'], ['立冬', '小雪', '大雪'], ['冬至', '小寒', '大寒'],
];
const TRIGRAMS = Array.from('艮震巽離坤兌乾坎');
const WANGXIANG = Array.from('王相胎沒死囚廢休');
const GUXU_ROWS = [
	{ 陽: { 孤: '戌', 虛: '辰' }, 陰: { 孤: '亥', 虛: '巳' } },
	{ 陽: { 孤: '申', 虛: '寅' }, 陰: { 孤: '酉', 虛: '卯' } },
	{ 陽: { 孤: '午', 虛: '子' }, 陰: { 孤: '未', 虛: '丑' } },
	{ 陽: { 孤: '辰', 虛: '戌' }, 陰: { 孤: '巳', 虛: '亥' } },
	{ 陽: { 孤: '寅', 虛: '申' }, 陰: { 孤: '卯', 虛: '酉' } },
	{ 陽: { 孤: '子', 虛: '午' }, 陰: { 孤: '丑', 虛: '未' } },
];
const YANG_STEMS = '甲丙戊庚壬';
const JIEQI_ALIAS = { 惊蛰: '驚蟄', 谷雨: '穀雨', 小满: '小滿', 芒种: '芒種', 处暑: '處暑' };
const QIAN_YANG_TO_ELEM = { 4: '火', 3: '金', 2: '土', 1: '木', 0: '水' };
const QIAN_KE = { 火: '水', 金: '火', 土: '木', 木: '金', 水: '土' };
const FIVE_DOGS = { 甲: '甲戌', 己: '甲戌', 乙: '丙戌', 庚: '丙戌', 丙: '戊戌', 辛: '戊戌', 丁: '庚戌', 壬: '庚戌', 戊: '壬戌', 癸: '壬戌' };

function jiaziList(){
	const out = [];
	for(let i = 0; i < 60; i += 1){
		out.push(GAN[i % 10] + ZHI[i % 12]);
	}
	return out;
}

const JIAZI = jiaziList();
const JIAZI_NUM = {};
JIAZI.forEach((name, idx)=>{ JIAZI_NUM[name] = idx + 1; });
const XUN = [0, 10, 20, 30, 40, 50].map((start)=>JIAZI.slice(start, start + 10));

function rotate(list, head){
	const at = list.indexOf(head);
	if(at < 0){
		return list.slice();
	}
	return list.slice(at).concat(list.slice(0, at));
}

function tradJieqi(name){
	return JIEQI_ALIAS[name] || name || '';
}

function elementRelation(mine, target){
	const pair = `${mine}${target}`;
	for(let i = 0; i < WUXING_GROUPS.length; i += 1){
		if(WUXING_GROUPS[i].indexOf(pair) >= 0){
			return RELATION_TO_LIUQIN[WUXING_NAMES[i]] || '';
		}
	}
	return '';
}

function arrangeBeasts(dayGan){
	if(!DAY_GAN_BEAST[dayGan]){
		return null;
	}
	const start = BEASTS.indexOf(DAY_GAN_BEAST[dayGan]);
	return [0, 1, 2, 3, 4, 5].map((i)=>BEASTS[(start + i) % 6]);
}

function judgeGuxu(gz){
	const xun = XUN.findIndex((group)=>group.indexOf(gz) >= 0);
	if(xun < 0){
		return null;
	}
	const yy = YANG_STEMS.indexOf(gz[0]) >= 0 ? '陽' : '陰';
	const cell = GUXU_ROWS[xun][yy];
	return [ZHI2GUA[cell['孤']], ZHI2GUA[cell['虛']]];
}

export function minuteGanzhi(ziHourPillar, hour, minute){
	const start = FIVE_DOGS[ziHourPillar && ziHourPillar[0]];
	if(!start){
		return '';
	}
	const cycle = rotate(JIAZI, start);
	return cycle[((hour * 60) + minute) % 60];
}

export function skyEarth(jieqi, hourBranch){
	const moon = MOON_GENERAL.find((item)=>item[0].indexOf(jieqi) >= 0);
	if(!moon || ZHI.indexOf(hourBranch) < 0){
		return null;
	}
	const earth = rotate(Array.from(ZHI), hourBranch);
	const sky = rotate(Array.from(ZHI), moon[1]);
	const inverse = {};
	earth.forEach((branch, idx)=>{
		inverse[sky[idx]] = branch;
	});
	return inverse;
}

export function lockKeyGeneral(jieqi, hourBranch){
	const plate = skyEarth(jieqi, hourBranch);
	const lockRow = SOLAR_LOCK.find((item)=>item[0].indexOf(jieqi) >= 0);
	if(!plate || !lockRow || !GENERAL[hourBranch]){
		return null;
	}
	const lockBranch = plate[lockRow[1]['關']];
	const keyBranch = plate[lockRow[1]['籥']];
	const generalBranch = plate[GENERAL[hourBranch]];
	if(!lockBranch || !keyBranch || !generalBranch){
		return null;
	}
	return [ZHI2GUA[lockBranch], ZHI2GUA[keyBranch], ZHI2GUA[generalBranch]];
}

function wangxiang(jieqi, gongChar){
	const lookup = gongChar === '中' ? '坤' : gongChar;
	const groupIndex = JIEQI_GROUPS.findIndex((group)=>group.indexOf(jieqi) >= 0);
	if(groupIndex < 0){
		return '';
	}
	const rotated = TRIGRAMS.slice(groupIndex).concat(TRIGRAMS.slice(0, groupIndex));
	const at = rotated.indexOf(lookup);
	return at < 0 ? '' : WANGXIANG[at];
}

function buildPosition(gong, label, zhaoNum, beast, myElement, idx, jieqi, lock, key, generalGong, gu, xu){
	const gongChar = gong[0];
	const element = NUM_TO_ELEMENT[zhaoNum];
	return {
		宮位: label,
		旺相: wangxiang(jieqi, gongChar),
		宮位1: gongChar,
		數字: zhaoNum,
		五行: element,
		六獸: beast,
		六獸死: (BEAST_WEAK[beast] && BEAST_WEAK[beast][0] === gongChar) ? '死' : '',
		六獸害: (BEAST_WEAK[beast] && BEAST_WEAK[beast][1] === gongChar) ? '害' : '',
		六親: idx === 0 ? '' : elementRelation(myElement, element),
		孤: gu === gongChar ? '孤' : '',
		虛: xu === gongChar ? '虛' : '',
		關: lock === gongChar ? '關' : '',
		籥: key === gongChar ? '籥' : '',
		將軍: generalGong === gongChar ? '將軍' : '',
	};
}

function assemble(nums, jieqi, gz1, gz2){
	const beasts = arrangeBeasts(gz1[0]);
	const plate = lockKeyGeneral(jieqi, gz2[1]);
	const guxu = judgeGuxu(gz2);
	if(!beasts || !plate || !guxu){
		return null;
	}
	const result = {};
	let myElement = '';
	POSITIONS.forEach((pair, idx)=>{
		const num = nums[idx];
		if(idx === 0){
			myElement = NUM_TO_ELEMENT[num];
		}
		result[pair[1]] = buildPosition(pair[0], pair[1], num, beasts[idx], myElement, idx, jieqi, plate[0], plate[1], plate[2], guxu[0], guxu[1]);
	});
	return result;
}

function mod5(n){
	const r = n % 5;
	return r === 0 ? 5 : r;
}

function splitsFrom(rng, manual){
	let remain = 36;
	const nums = [];
	for(let i = 0; i < 6; i += 1){
		let left;
		if(manual && i < manual.length){
			left = Math.max(1, Math.min(manual[i], remain > 1 ? remain - 1 : 1));
		}else{
			left = remain <= 1 ? 1 : rng.randint(1, remain - 1);
		}
		nums.push(mod5(left));
		remain -= left;
		if(remain <= 0){
			while(nums.length < 6){
				nums.push(5);
			}
			break;
		}
	}
	return nums;
}

export function gangzhiNumbers(pillars, number){
	const partsList = [
		[pillars[0], pillars[1], pillars[2], pillars[3], pillars[4], number],
		[pillars[1], pillars[2], pillars[3], pillars[4], number],
		[pillars[2], pillars[3], pillars[4], number],
		[pillars[3], pillars[4], number],
		[pillars[4], number],
		[number],
	];
	return partsList.map((parts)=>{
		const total = parts.reduce((sum, item)=>sum + (typeof item === 'number' ? item : (JIAZI_NUM[item] || 0)), 0);
		return mod5(total);
	});
}

function qianNumbers(throws, auto, rng){
	const values = [];
	for(let i = 0; i < 6; i += 1){
		if(auto || i >= throws.length){
			values.push(rng.randint(0, 1) + rng.randint(0, 1) + rng.randint(0, 1) + rng.randint(0, 1));
		}else{
			values.push(Math.max(0, Math.min(4, throws[i] | 0)));
		}
	}
	return values.map((yang)=>{
		const coin = QIAN_YANG_TO_ELEM[yang] || '土';
		return ELEM_TO_NUM[QIAN_KE[coin] || coin] || 5;
	});
}

function dunhuangOne(rng){
	let remain = 36;
	for(let step = 0; step < 4; step += 1){
		if(remain <= 1){
			break;
		}
		remain -= 1;
		const left = remain > 1 ? rng.randint(1, remain - 1) : remain;
		const right = remain - left;
		const drop = step === 0
			? (left % 5) + (right % 5)
			: ((left % 5) || 5) + ((right % 5) || 5);
		remain = Math.max(0, remain - drop);
	}
	return remain;
}

function dunhuangNumbers(variant, rng){
	const nums = [];
	for(let i = 0; i < 6; i += 1){
		const remain = dunhuangOne(rng);
		const quotient = Math.floor(remain / 5);
		let num = variant === 'jiaolu' ? (quotient || 5) : (quotient + 1);
		num = Math.max(1, Math.min(5, num));
		nums.push(num);
	}
	return nums;
}

function freshSeed(){
	if(typeof crypto !== 'undefined' && crypto.getRandomValues){
		const buf = new Uint32Array(1);
		crypto.getRandomValues(buf);
		return buf[0];
	}
	return Math.floor(Math.random() * 0xffffffff);
}

function clockInput(data, hour, minute, second){
	const year = Number(data.year);
	const abs = Math.abs(year);
	return {
		date: `${year < 0 ? '-' : ''}${abs}-${String(data.month).padStart(2, '0')}-${String(data.day).padStart(2, '0')}`,
		time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
		zone: data.zone || '+08:00',
		after23NewDay: data.after23NewDay,
		lateZiHourUseNextDay: data.lateZiHourUseNextDay,
	};
}

function pillarsOf(data){
	const hour = Number(data.hour) || 0;
	const minute = Number(data.minute) || 0;
	const second = Number(data.second) || 0;
	const built = buildLocalBaziResult(clockInput(data, hour, minute, second));
	const fc = built.bazi.fourColumns;
	const ziBuilt = buildLocalBaziResult(clockInput(data, 0, 0, 0));
	const zi = ziBuilt.bazi.fourColumns.time.ganzi;
	const minutePillar = minuteGanzhi(zi, hour, minute);
	let jieqi = '';
	try{
		const solar = Solar.fromYmdHms(Number(data.year), Number(data.month), Number(data.day), hour, minute, second);
		const prev = solar.getLunar().getPrevJieQi();
		jieqi = tradJieqi(prev && prev.getName ? prev.getName() : '');
	}catch(e){
		jieqi = '';
	}
	return {
		list: [fc.year.ganzi, fc.month.ganzi, fc.day.ganzi, fc.time.ganzi, minutePillar],
		jieqi,
	};
}

function normalizePositions(raw){
	return POSITION_ORDER.map((key)=>{
		const item = raw[key] || {};
		const flags = FLAG_NAMES.filter((name)=>item[name]).map((name)=>FLAG_LABELS[name] || name);
		return {
			key,
			label: POSITION_LABELS[key] || key,
			palace: item['宮位1'] || '',
			prosperity: item['旺相'] || '',
			number: item['數字'],
			element: item['五行'] || '',
			beast: item['六獸'] || '',
			relation: item['六親'] || '',
			flags,
		};
	});
}

function row(label, value){
	const text = value === undefined || value === null || value === '' ? '—' : `${Array.isArray(value) ? value.join('、') : value}`;
	return { label, value: text };
}

export const WuzhaoBrowserEngine = {
	calculate(input){
		const data = input || {};
		const mode = MODE_LABELS[data.mode] ? data.mode : 'ganzhi';
		let number = Math.max(0, Math.min(90, Number.isFinite(Number(data.number)) ? Math.trunc(Number(data.number)) : 0));
		if(number > 9){
			number = number % 9;
		}
		let pillars;
		try{
			pillars = pillarsOf({
				year: Number(data.year),
				month: Number(data.month),
				day: Number(data.day),
				hour: Number(data.hour) || 0,
				minute: Number(data.minute) || 0,
				second: Number(data.second) || 0,
				zone: data.zone || '+08:00',
				after23NewDay: data.after23NewDay,
				lateZiHourUseNextDay: data.lateZiHourUseNextDay,
			});
		}catch(e){
			const meta = unsupportedStatus('wuzhao', 'LUNAR_DOMAIN', e && e.message);
			return { status: 'UNSUPPORTED', provider: 'browser', input: data, result: null, meta };
		}
		if(!pillars.jieqi || !pillars.list[4]){
			const meta = unsupportedStatus('wuzhao', 'WUZHAO_CALENDAR', '节气或分干支未能从浏览器历得出。');
			return { status: 'UNSUPPORTED', provider: 'browser', input: data, result: null, meta };
		}
		const gz = pillars.list;
		const jieqi = pillars.jieqi;
		const needsRandom = mode === 'dunhuang' || mode === 'qian' || ((mode === 'day' || mode === 'hour' || mode === 'minute' || mode === 'tang') && !data.manual);
		const seed = Number.isFinite(Number(data.seed)) ? Math.trunc(Number(data.seed)) : (needsRandom ? freshSeed() : 0);
		const rng = createPythonRandom(seed);
		let upper = gz[2];
		let lower = gz[3];
		let nums;
		let plateUpper = gz[2];
		let plateLower = gz[3];
		if(mode === 'ganzhi'){
			if(!arrangeBeasts(gz[4][0])){
				const meta = unsupportedStatus('wuzhao', 'WUZHAO_STEM', '分干不在十天干。');
				return { status: 'UNSUPPORTED', provider: 'browser', input: data, result: null, meta };
			}
			nums = gangzhiNumbers(gz, number);
			upper = gz[3];
			lower = gz[4];
			plateUpper = gz[4];
			plateLower = gz[4];
		}else if(mode === 'day'){
			upper = gz[1];
			lower = gz[2];
			nums = splitsFrom(rng, data.manual ? data.manualSplits : null);
		}else if(mode === 'hour'){
			upper = gz[2];
			lower = gz[3];
			nums = splitsFrom(rng, data.manual ? data.manualSplits : null);
		}else if(mode === 'minute' || mode === 'tang'){
			upper = mode === 'minute' ? gz[3] : gz[2];
			lower = mode === 'minute' ? gz[4] : gz[3];
			nums = splitsFrom(rng, data.manual ? data.manualSplits : null);
		}else if(mode === 'zhushu'){
			const raw = Array.isArray(data.zhaoNums) ? data.zhaoNums : [];
			nums = [0, 1, 2, 3, 4, 5].map((i)=>Math.max(1, Math.min(5, Number.isFinite(Number(raw[i])) ? Math.trunc(Number(raw[i])) : 5)));
		}else if(mode === 'qian'){
			nums = qianNumbers(Array.isArray(data.qianThrows) ? data.qianThrows : [], !!data.qianAuto, rng);
		}else if(mode === 'dunhuang'){
			nums = dunhuangNumbers(data.shifaVariant === 'jiaolu' ? 'jiaolu' : 'guayi', rng);
		}
		const raw = assemble(nums, jieqi, mode === 'ganzhi' ? plateUpper : upper, mode === 'ganzhi' ? plateLower : lower);
		if(!raw){
			const meta = unsupportedStatus('wuzhao', 'WUZHAO_PLATE', '关籥或孤虚未能从仓内表落下。');
			return { status: 'UNSUPPORTED', provider: 'browser', input: data, result: null, meta };
		}
		const positions = normalizePositions(raw);
		const pan = {
			source: 'kinwuzhao',
			engine: 'browser',
			mode,
			modeLabel: MODE_LABELS[mode],
			number,
			seed: needsRandom ? seed : null,
			dateStr: data.date || '',
			timeStr: data.time || '',
			solarTerm: jieqi,
			ganzhi: { year: gz[0], month: gz[1], day: gz[2], hour: gz[3], minute: gz[4] },
			upperGanzhi: upper,
			lowerGanzhi: lower,
			positions,
			qianThrows: data.qianThrows || [],
			zhaoNums: nums,
		};
		pan.sections = [
			{ title: '起盘', rows: [
				row('起盘时间', `${pan.dateStr} ${pan.timeStr}`.trim()),
				row('起盘方式', pan.modeLabel),
				row('报数', number),
				row('掷钱', mode === 'qian' ? (Array.isArray(data.qianThrows) ? data.qianThrows : []) : null),
				row('节气', jieqi),
				row('年柱', gz[0]), row('月柱', gz[1]), row('日柱', gz[2]), row('时柱', gz[3]), row('分柱', gz[4]),
			] },
		].concat(positions.map((item)=>({
			title: item.label,
			rows: [row('宫位', item.palace), row('数字', item.number), row('五行', item.element), row('六兽', item.beast), row('六亲', item.relation)],
		})));
		pan.snapshot = pan.sections.map((section)=>{
			const lines = [`[${section.title}]`];
			section.rows.forEach((item)=>lines.push(`${item.label}：${item.value}`));
			return lines.join('\n');
		}).join('\n\n');
		return {
			status: 'SUCCESS',
			provider: 'browser',
			input: data,
			result: pan,
			meta: { feature: 'wuzhao', source: 'kinwuzhao.py', plate: 'sky_n_earth_list' },
		};
	},
	getCapabilities(){
		return {
			status: 'SUCCESS',
			provider: 'browser',
			inputs: ['date', 'time', 'mode', 'number', 'seed'],
			outputs: ['positions', 'ganzhi', 'solarTerm'],
			productionReady: true,
		};
	},
};

export function WuzhaoCalculationProvider(){
	return WuzhaoBrowserEngine;
}
