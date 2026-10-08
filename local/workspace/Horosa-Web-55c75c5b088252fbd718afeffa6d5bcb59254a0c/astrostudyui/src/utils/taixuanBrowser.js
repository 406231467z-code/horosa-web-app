// 太玄：vendor/taixuanshifa/taixuanshifa.py qigua_number / yearsu，
// 盘面形状对齐 webtaixuansrv._calculate。卦辞来自仓内 taixuandict.p。
import DICT from './taixuanDict.slim.json';
import { createPythonRandom } from './pythonRandom';
import { buildLocalBaziResult } from './baziLunarLocal';
import { unsupportedStatus } from './calcStatus';
import { Solar } from 'lunar-javascript';

const POSITION_LABELS = ['方', '州', '部', '家'];
const DIGIT_LABELS = { 1: '一', 2: '二', 3: '三' };
const LINE_SYMBOLS = {
	1: '▅▅▅▅▅▅▅▅▅▅',
	2: '▅▅▅▅  ▅▅▅▅',
	3: '▅▅  ▅▅  ▅▅',
};
const LINE_ORDER = ['初一', '次二', '次三', '次四', '次五', '次六', '次七', '次八', '上九'];
const PERIOD_LINES = {
	旦: ['初一', '次五', '次七'],
	夕: ['次三', '次四', '次八'],
	日中: ['次二', '次六', '上九'],
	夜中: ['次二', '次六', '上九'],
};
const DIVINE_YINYANG = {
	旦陽: ['旦筮阳首', '一从二从三从', '大休'],
	日中陰: ['日中筮阴首', '一从二从三违', '始中休终咎'],
	夜中陰: ['夜中筮阴首', '一从二从三违', '始中休终咎'],
	夕陰: ['夕筮阴首', '一违二从三从', '始咎中终休'],
	日中陽: ['日中筮阳首', '一违二违三从', '始中咎终休'],
	夜中陽: ['夜中阳首', '一违二违三从', '始中咎终休'],
	夕陽: ['夕筮阳首', '一从二违三违', '始休中终咎'],
	旦陰: ['旦筮阴首', '一违二违三违', '大咎'],
};
const XZ = {
	一家: 1, 二家: 2, 三家: 3,
	一部: 0, 二部: 3, 三部: 6,
	一州: 0, 二州: 9, 三州: 18,
	一方: 0, 二方: 27, 三方: 54,
};
const CHIN = Array.from('角亢氐房心尾箕斗牛女虛危室壁奎婁胃昴畢觜參井鬼柳星張翼軫');
const LODGE_DEGREES = [8, 12, 10, 17, 16, 9, 16, 12, 14, 11, 16, 2, 9, 33, 4, 15, 7, 18, 18, 17, 12, 9, 15, 5, 5, 18, 11, 26];

function an2cn(n){
	const d = '零一二三四五六七八九';
	if(n < 10){
		return d[n];
	}
	if(n === 10){
		return '十';
	}
	if(n < 20){
		return `十${d[n - 10]}`;
	}
	const tens = Math.floor(n / 10);
	const ones = n % 10;
	return `${d[tens]}十${ones ? d[ones] : ''}`;
}

function rotate(list, head){
	const at = list.indexOf(head);
	return list.slice(at).concat(list.slice(0, at));
}

const YEARS_U = (function buildYearsu(){
	const names = rotate(CHIN, '牛');
	const out = [];
	names.forEach((name, i)=>{
		const count = LODGE_DEGREES[i];
		for(let k = 1; k <= count; k += 1){
			out.push(name + an2cn(k));
		}
	});
	return out;
}());

function sample1(rng, lo, hiExclusive){
	return rng.randint(lo, hiExclusive - 1);
}

function mod3(n){
	const r = n % 3;
	return r === 0 ? 3 : r;
}

export function qiguaNumber(seed){
	const rng = createPythonRandom(seed);
	const waiDict = { 7: 1, 8: 2, 9: 3 };
	const digits = [];
	const wai = [];
	for(let i = 0; i < 4; i += 1){
		const stalksFirst = 36 - 3 - 1;
		const divider = sample1(rng, 25, stalksFirst);
		const left = mod3(divider - 10);
		const right = mod3((stalksFirst + 10) - divider);
		const stalksSecond = stalksFirst - left - right;
		const divider2 = sample1(rng, 25, stalksSecond);
		const left2 = mod3(divider2 - 10);
		const right2 = mod3((stalksSecond + 10) - divider2);
		const stalksThird = stalksSecond - left2 - right2;
		const outer = stalksThird / 3;
		digits.push(waiDict[outer]);
		wai.push(outer);
	}
	let zhan = (wai[0] + wai[1] + wai[2] + wai[3]) % 9;
	if(zhan === 0){
		zhan = 9;
	}
	const zhou = digits.join('');
	return { zhou, zhan: zhan | 0, digits };
}

function periodForHour(hour){
	const h = ((hour % 24) + 24) % 24;
	if(h >= 6 && h < 12){
		return '旦';
	}
	if(h >= 12 && h < 18){
		return '日中';
	}
	if(h >= 18){
		return '夕';
	}
	return '夜中';
}

function yy(num){
	return num % 2 === 1 ? '陽' : '陰';
}

function toInt(value, fallback){
	const n = Number(value);
	return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function row(label, value){
	const text = value === undefined || value === null || value === '' ? '—' : `${Array.isArray(value) ? value.join('、') : value}`;
	return { label, value: text };
}

function baziInput(data, hourOverride, minuteOverride){
	const hour = hourOverride === undefined ? (Number(data.hour) || 0) : hourOverride;
	const minute = minuteOverride === undefined ? (Number(data.minute) || 0) : minuteOverride;
	const second = hourOverride === undefined ? (Number(data.second) || 0) : 0;
	const year = Number(data.year);
	const month = Number(data.month);
	const day = Number(data.day);
	const abs = Math.abs(year);
	const date = data.date && hourOverride === undefined
		? data.date
		: `${year < 0 ? '-' : ''}${abs}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	const time = (data.time && hourOverride === undefined)
		? data.time
		: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
	return {
		date,
		time,
		zone: data.zone || '+08:00',
		after23NewDay: data.after23NewDay,
		lateZiHourUseNextDay: data.lateZiHourUseNextDay,
	};
}

function calendarBundle(data){
	try{
		const built = buildLocalBaziResult(baziInput(data));
		const fc = (built.bazi && built.bazi.fourColumns) || {};
		const nongli = (built.bazi && built.bazi.nongli) || {};
		return {
			ganzhi: {
				year: fc.year && fc.year.ganzi,
				month: fc.month && fc.month.ganzi,
				day: fc.day && fc.day.ganzi,
				hour: fc.time && fc.time.ganzi,
			},
			lunarText: [nongli.year, nongli.month, nongli.day].filter(Boolean).join(''),
			calendar: null,
		};
	}catch(e){
		return {
			ganzhi: {},
			lunarText: '',
			calendar: unsupportedStatus('taixuan', 'LUNAR_DOMAIN', e && e.message),
		};
	}
}

function winterSolstice(year, month, day){
	try{
		const solar = Solar.fromYmd(year, month, day);
		const lunar = solar.getLunar();
		const table = lunar.getJieQiTable ? lunar.getJieQiTable() : null;
		const dz = table && (table['冬至'] || table['冬至']);
		if(!dz || !dz.toYmd){
			return { date: '', days: null };
		}
		const current = Solar.fromYmd(year, month, day);
		let target = dz;
		if(current.isBefore && current.isBefore(target)){
			const prev = Solar.fromYmd(year - 1, 12, 21).getLunar().getJieQiTable()['冬至'];
			if(prev){
				target = prev;
			}
		}
		const days = current.subtract ? current.subtract(target) : null;
		return { date: target.toYmd(), days };
	}catch(e){
		return { date: '', days: null };
	}
}

export function calculateTaixuanCore(input){
	const data = input || {};
	const year = toInt(data.year, 2026);
	const month = Math.max(1, Math.min(12, toInt(data.month, 1)));
	const day = Math.max(1, Math.min(31, toInt(data.day, 1)));
	const hour = Math.max(0, Math.min(23, toInt(data.hour, 0)));
	const seed = toInt(data.seed, year * 1000000 + month * 10000 + day * 100 + hour);
	const drawn = qiguaNumber(seed);
	if(drawn.digits.some((item)=>item === undefined)){
		return unsupportedStatus('taixuan', 'TAIXUAN_STALK', '蓍草余数不在 7/8/9，仓内分揲表无法落首。');
	}
	const guaNumber = Number(drawn.zhou);
	const entry = DICT[drawn.zhou];
	if(!entry || !entry.name){
		return unsupportedStatus('taixuan', 'TAIXUAN_HEAD_MISSING', `首序 ${drawn.zhou} 不在仓内八十一首。`);
	}
	const period = periodForHour(hour);
	const cnums = drawn.digits.map((item)=>DIGIT_LABELS[item] || `${item}`);
	const head = `${cnums[0]}方${cnums[1]}州${cnums[2]}部${cnums[3]}家`;
	const xuanHead = XZ[head.slice(0, 2)] + XZ[head.slice(2, 4)] + XZ[head.slice(4, 6)] + XZ[head.slice(6, 8)];
	const xuanYinyang = yy(xuanHead);
	const headRelation = { 陽: '从', 陰: '违' }[xuanYinyang];
	const judgment = DIVINE_YINYANG[period + xuanYinyang] || ['—', '—', '—'];
	const zhanBase = (xuanHead - 1) * 9;
	const biaoBase = (xuanHead - 1) * 3;
	const xuanZan = Math.floor(zhanBase / 2);
	const lodge = YEARS_U[xuanZan] || '';
	const selectedNames = PERIOD_LINES[period] || [];
	const selectedLines = selectedNames.map((name)=>({ name, content: entry.lines[name] || '' }));
	const allLines = LINE_ORDER.map((name)=>({ name, content: entry.lines[name] || '' }));
	const fourPlaces = drawn.digits.map((value, idx)=>({
		key: POSITION_LABELS[idx],
		value,
		label: `${DIGIT_LABELS[value] || value}${POSITION_LABELS[idx]}`,
		symbol: LINE_SYMBOLS[value] || '',
	}));
	const cal = calendarBundle({ ...data, year, month, day, hour });
	const taixuan = {
		guaNumber,
		digits: drawn.digits,
		zhou: drawn.zhou,
		zhanNumber: drawn.zhan,
		gua: { name: entry.name, text: entry.text },
		period,
		fourPlaces,
		head,
		xuanHead: {
			number: xuanHead,
			yinYang: xuanYinyang,
			relation: headRelation,
			method: judgment[0],
			sequence: judgment[1],
			judgment: judgment[2],
			zhanBase,
			biaoBase,
			xuanZan,
		},
		starLodge: { text: lodge ? `${lodge}度` : '—', raw: lodge },
		selectedLines,
		allLines,
	};
	return { taixuan, cal, seed, year, month, day, hour };
}

function buildSections(pan){
	const gz = pan.ganzhi || {};
	const tx = pan.taixuan || {};
	const xh = tx.xuanHead || {};
	const winter = pan.winterSolstice || {};
	return [
		{
			title: '起盘',
			rows: [
				row('起筮时间', `${pan.dateStr} ${String(pan.hour).padStart(2, '0')}时`),
				row('农历', pan.lunarDate && pan.lunarDate.text),
				row('年柱', gz.year),
				row('月柱', gz.month),
				row('日柱', gz.day),
				row('时柱', gz.hour),
				row('起筮时段', tx.period),
				row('起筮种子', pan.seed),
				row('冬至起算', winter.date),
				row('距冬至日', winter.days === null || winter.days === undefined ? null : `${winter.days}日`),
			],
		},
		{
			title: '玄首',
			rows: [
				row('筮得', tx.zhou),
				row('首序', tx.guaNumber),
				row('占位', tx.zhanNumber),
				row('首', tx.gua && tx.gua.name),
				row('首辞', tx.gua && tx.gua.text),
				row('方州部家', tx.head),
				row('玄首', `${xh.number}，${xh.relation}`),
				row('阴阳', xh.yinYang),
				row('起筮法', xh.method),
				row('休咎序', xh.sequence),
				row('休咎', xh.judgment),
				row('赞基', xh.zhanBase),
				row('表基', xh.biaoBase),
				row('玄赞', xh.xuanZan),
				row('星宿', tx.starLodge && tx.starLodge.text),
			],
		},
		{
			title: '方州部家',
			rows: [row('筮数', tx.digits)].concat((tx.fourPlaces || []).map((item)=>row(item.key, item.label))),
		},
		{
			title: '表',
			rows: (tx.selectedLines || []).map((item)=>row(item.name, item.content)),
		},
	];
}

function snapshotOf(sections){
	const lines = [];
	sections.forEach((section)=>{
		lines.push(`[${section.title}]`);
		(section.rows || []).forEach((item)=>{
			lines.push(`${item.label}：${item.value}`);
		});
		lines.push('');
	});
	return lines.join('\n').trim();
}

export const TaixuanBrowserEngine = {
	calculate(input){
		const core = calculateTaixuanCore(input);
		if(core && core.status === 'UNSUPPORTED'){
			return { status: 'UNSUPPORTED', provider: 'browser', input: input || {}, result: null, meta: core };
		}
		const data = input || {};
		const winter = winterSolstice(core.year, core.month, core.day);
		const pan = {
			source: 'taixuanshifa',
			engine: 'browser',
			dateStr: data.date || `${core.year}-${core.month}-${core.day}`,
			timeStr: data.time || `${core.hour}:00:00`,
			year: core.year,
			month: core.month,
			day: core.day,
			hour: core.hour,
			seed: core.seed,
			lunarDate: { text: core.cal.lunarText },
			ganzhi: core.cal.ganzhi,
			winterSolstice: winter,
			taixuan: core.taixuan,
		};
		pan.sections = buildSections(pan);
		pan.snapshot = snapshotOf(pan.sections);
		return {
			status: 'SUCCESS',
			provider: 'browser',
			input: data,
			result: pan,
			meta: {
				feature: 'taixuan',
				source: 'taixuanshifa.qigua_number',
				yearsuLength: YEARS_U.length,
				calendar: core.cal.calendar,
			},
		};
	},
	getCapabilities(){
		return {
			status: 'SUCCESS',
			provider: 'browser',
			inputs: ['year', 'month', 'day', 'hour', 'seed'],
			outputs: ['zhou', 'head', 'xuanHead', 'starLodge', 'allLines'],
			productionReady: true,
			yearsuLength: YEARS_U.length,
		};
	},
};

export function TaixuanCalculationProvider(){
	return TaixuanBrowserEngine;
}
