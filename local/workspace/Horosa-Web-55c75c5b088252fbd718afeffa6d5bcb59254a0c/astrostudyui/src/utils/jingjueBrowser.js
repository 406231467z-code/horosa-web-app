// 荆诀：webjingjuesrv._cast + vendor/jingjue/gua_dict.py。
// 分揲用 CPython random.sample(k=1)，与 Random.randint 闭区间同序。
import { createPythonRandom } from './pythonRandom';
import { unsupportedStatus } from './calcStatus';

const POSITION_LABELS = ['上分', '中分', '下分'];
const REMAINDER_LABELS = { 1: '一', 2: '二', 3: '三', 4: '四' };
const GUA_KEYWORDS = {
	甲: { keyword: '穷奇升天，中道而惊', english: 'Danger mid-journey; beware of powerful spirits' },
	乙: { keyword: '龙处于泽，欲登于天', english: 'Dragon ascending from the marsh; joyful occasion' },
	丙: { keyword: '有鸟将来，文身翠翼', english: 'Colorful bird arriving; happiness without limit' },
	丁: { keyword: '百事顺成，美人相知', english: 'All affairs succeed; a beautiful meeting of minds' },
	戊: { keyword: '冥冥之海，独得其光', english: 'Light amid darkness; noble arrival foretold' },
	己: { keyword: '泰官甚敬，身独遇恶', english: 'Honours without, hardship within; inauspicious' },
	壬: { keyword: '凤鸟不处，洋洋四国', english: 'The Phoenix alights nowhere; efforts go unrewarded' },
	癸: { keyword: '玄鸟朝飞，洋洋翠羽', english: 'The dark swallow soars; a person of promise draws near' },
	子: { keyword: '善哉首，如登高台', english: 'A fine beginning; a distant traveller returns' },
	丑: { keyword: '道路瞩望，美人不来', english: 'Watching the road in vain; obstacles block the way' },
	寅: { keyword: '山有玄木，劳心将死', english: 'Dark wood on the mountain; toil without recognition' },
	卯: { keyword: '蔼蔼者云，蔽天白日', english: 'Clouds veil the sun; desired meeting fails' },
	辰: { keyword: '玄龙在渊，嘉宾将来', english: 'Black dragon in the deep; honoured guest arrives' },
	巳: { keyword: '时命将合，百事皆成', english: 'Destined union; all endeavours meet with success' },
	午: { keyword: '前如凶，后乃吉光', english: 'Hardship before, brightness after; a turning point' },
	未: { keyword: '释哉心乎，翩翩飞鹄', english: 'The heart unsettled; prayers go unanswered' },
};

const GUA_DICT = {
	433: ['甲', '窮奇。欲登於天，浮雲如人。既已行之，乘雲冥冥。行遇大神，其高如城，太息如雷，中道而驚。泰父為祟，欲求犧牲，凶。'],
	411: ['乙', '龍處於澤，欲登於天。吉日嘉時，登高矚望，相須以色。今日何日，吉樂無極？津橋既行，願欲中意。吉，外為祟。'],
	343: ['丙', '有鳥將來，文身翠翼。今日何日，吉樂獨極。釋怒亡憂，適中我意。有人將來，嘉喜毋極。吉，祟百厲。'],
	424: ['丁', '善哉善哉，百事順成。得天之時，弗召自來。翩翩飛鳥，止陽之枝。美人將來，與我相知。中心愛之，不知其疵。吉。'],
	312: ['戊', '冥冥之海，吾獨得其光。雷電大陰，吾獨得陽。有人將至，貴如公王。樹木未產，其葉青青 ， 凶事盡除，吉事順成。吉。'],
	334: ['己', '泰官甚敬，身獨遇惡。且恐且懼，身毋定處。中心不樂，相追道路。請謁不得，獨留系舍。先求其祟，後乃毋故。凶。'],
	231: ['壬', '鳳鳥不處，洋洋四國。我欲見之，多害不得。疾飛哀鳴，憂心默默。勞身毋功，其事不得。凶，祟外、死不葬。'],
	222: ['癸', '玄鳥朝飛，洋洋翠羽。與人偕行，其身獨處。請謁雲諾，有欲弗許。今日何日，吉人將來。日夜望之，責求會期。吉，祟王父母，小吉。'],
	213: ['子', '善哉首，如登高台。甫有美人，弗召自來。齊其翠羽，又舉旌旗。非以為首，如登高丘，安而毋咎。今日何日，遠人將來。吉，祟在司命。'],
	141: ['丑', '沛沛羽蓋乎，吾誰與持之？道路矚望，美人不來。 既大又小，如羊與牛。 所求不得，或為之患，雖欲行作，有閉於關。祟陽。'],
	132: ['寅', '山有玄木，其葉披離。勞心將死，人莫之知。欲與美會，其後必離。有隱者雲，雲胡滿滿。晨鳴不會，直為人笑。祟行、灶、百厲，凶。'],
	321: ['卯', '藹藹者雲，蔽天白日。美人不來，曰心疾。翩翩飛鳥，間關浮雲。吾召不來，或為是恨。以車馳之，壹反壹傾。欲會美人，其事不成。凶，祟行、灶。'],
	123: ['辰', '玄龍在淵，雲待在天。嘉賓將來，以我為親。往來如矢，人莫之止。今日何如，如得父母。盈意中欲，其後不悔。吉，祟社。'],
	114: ['巳', '海有琅玕，南山有植。時命將合，不期而相得。同心不去，結志不離。有人將來，直其遄盈。今日何日，百事皆成。吉，祟泰父母。'],
	442: ['午', '玄鳥朝食，南山之陽。奮羽將飛，路毋關梁。前如凶，後乃吉光。有人將至，甚好以良。笑言夷色，美人懌極。吉。'],
	244: ['未', '釋哉心乎，何憂而不已？雖欲行作，關梁之止。翩翩飛鵠，不 飲 不食。疾飛哀鳴，所求不得。藹藹者雲，乍陰乍陽。效人祠祀，百鬼莫嘗。凶，祟巫、位、社。'],
};

function sample1(rng, lo, hiExclusive){
	return rng.randint(lo, hiExclusive - 1);
}

function verdict(text){
	const t = `${text || ''}`.trim();
	const m = t.match(/([大小]?[吉凶])[。．\s]*$/);
	if(m){
		return m[1];
	}
	const hasJi = t.indexOf('吉') >= 0;
	const hasXiong = t.indexOf('凶') >= 0;
	if(hasJi && hasXiong){
		return '吉凶并见';
	}
	if(hasJi){
		return '吉';
	}
	if(hasXiong){
		return '凶';
	}
	return '未明';
}

function spiritNote(text){
	const t = text || '';
	if(t.indexOf('祟') < 0){
		return '—';
	}
	const sentences = t.split('。').map((seg)=>seg.replace(/^[，；; ]+|[，；; ]+$/g, '')).filter((seg)=>seg.indexOf('祟') >= 0);
	if(!sentences.length){
		return '—';
	}
	return sentences.join('。').replace(/[。，；; ]+$/g, '');
}

function guaTable(){
	return Object.keys(GUA_DICT).map((key)=>{
		const name = GUA_DICT[key][0];
		const text = GUA_DICT[key][1];
		const meta = GUA_KEYWORDS[name] || {};
		return {
			key,
			name,
			verdict: verdict(text),
			spirit: spiritNote(text),
			keyword: meta.keyword || text.split('。', 1)[0],
			english: meta.english || '',
			text,
			summary: text.split('。', 1)[0],
		};
	});
}

function castWithRng(rng, seed){
	const stalksFirst = 30;
	const divider = sample1(rng, 10, stalksFirst);
	let topCount = divider - 10;
	if(topCount < 1){
		topCount = sample1(rng, 1, 20);
	}
	const remainderPool = stalksFirst - topCount;
	let lowerCut = sample1(rng, 1, 17);
	if(remainderPool - lowerCut < 1){
		lowerCut = sample1(rng, 1, Math.max(2, remainderPool));
	}
	const middleCount = remainderPool - lowerCut;
	const bottomCount = lowerCut;
	const counts = [topCount, middleCount, bottomCount];
	const remainders = counts.map((count)=>(count % 4) || 4);
	const key = remainders.join('');
	const gua = GUA_DICT[key];
	if(!gua){
		return unsupportedStatus('jingjue', 'JINGJUE_GUA_MISSING', `卦键 ${key} 不在仓内十六卦表。`);
	}
	const name = gua[0];
	const text = gua[1];
	const guaMeta = GUA_KEYWORDS[name] || {};
	const groups = counts.map((count, idx)=>{
		const rem = remainders[idx];
		return {
			key: POSITION_LABELS[idx],
			count,
			remainder: rem,
			label: `${POSITION_LABELS[idx]}：${count}算，余${REMAINDER_LABELS[rem] || rem}`,
		};
	});
	return {
		seed,
		method: '三十算分三',
		key,
		divider,
		lowerCut,
		groups,
		remainders,
		gua: {
			name,
			text,
			verdict: verdict(text),
			spirit: spiritNote(text),
			keyword: guaMeta.keyword || text.split('。', 1)[0],
			english: guaMeta.english || '',
		},
		allGua: guaTable(),
	};
}

function row(label, value){
	const text = value === undefined || value === null || value === '' ? '—' : `${Array.isArray(value) ? value.join('、') : value}`;
	return { label, value: text };
}

function buildSections(payload){
	const cast = payload.jingjue || {};
	const gua = cast.gua || {};
	const groups = cast.groups || [];
	return [
		{
			title: '起课',
			rows: [
				row('起课时间', `${payload.dateStr || ''} ${payload.timeStr || ''}`.trim()),
				row('起课方式', cast.method),
				row('起筮种子', payload.seed),
				row('卦键', cast.key),
				row('三分余数', cast.remainders),
				row('第一次分界', cast.divider),
				row('下分截数', cast.lowerCut),
			],
		},
		{
			title: '卦辞',
			rows: [
				row('干卦', gua.name),
				row('吉凶', gua.verdict),
				row('关键词', gua.keyword),
				row('英文提示', gua.english),
				row('祟提示', gua.spirit),
				row('卦义', gua.text),
			],
		},
		{
			title: '三分',
			rows: groups.map((item)=>row(item.key, item.label)),
		},
		{
			title: '十六卦',
			rows: (cast.allGua || []).map((item)=>row(item.name, `${item.key}｜${item.verdict}｜${item.keyword}`)),
		},
	];
}

function snapshotOf(sections){
	const lines = [];
	(sections || []).forEach((section)=>{
		lines.push(`[${section.title || ''}]`);
		(section.rows || []).forEach((item)=>{
			lines.push(`${item.label}：${item.value}`);
		});
		lines.push('');
	});
	return lines.join('\n').trim();
}

function toInt(value, fallback){
	const n = Number(value);
	return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function castJingjue(seed){
	const rng = createPythonRandom(seed);
	return castWithRng(rng, seed);
}

export const JingjueBrowserEngine = {
	calculate(input){
		const data = input || {};
		let seed = toInt(data.seed, NaN);
		if(!Number.isFinite(seed)){
			seed = toInt(data.year, 0) * 1000000 + toInt(data.month, 0) * 10000 + toInt(data.day, 0) * 100 + toInt(data.hour, 0);
		}
		seed = Math.max(0, Math.min(999999999, seed));
		const cast = castJingjue(seed);
		if(cast && cast.status === 'UNSUPPORTED'){
			return {
				status: 'UNSUPPORTED',
				provider: 'browser',
				input: data,
				result: null,
				meta: cast,
			};
		}
		const year = toInt(data.year, 0);
		const month = toInt(data.month, 0);
		const day = toInt(data.day, 0);
		const hour = toInt(data.hour, 0);
		const minute = toInt(data.minute, 0);
		const second = toInt(data.second, 0);
		const dateStr = data.date || (year && month && day ? `${year}-${month}-${day}` : '');
		const timeStr = data.time || `${hour}:${minute}:${second}`;
		const pan = {
			source: 'jingjue',
			engine: 'browser',
			dateStr,
			timeStr,
			seed,
			jingjue: cast,
		};
		pan.sections = buildSections(pan);
		pan.snapshot = snapshotOf(pan.sections);
		return {
			status: 'SUCCESS',
			provider: 'browser',
			input: data,
			result: pan,
			meta: { feature: 'jingjue', source: 'webjingjuesrv._cast' },
		};
	},
	getCapabilities(){
		return {
			status: 'SUCCESS',
			provider: 'browser',
			inputs: ['seed', 'date', 'time'],
			outputs: ['gua', 'key', 'remainders', 'groups', 'allGua'],
			productionReady: true,
		};
	},
};

export function JingjueCalculationProvider(){
	return JingjueBrowserEngine;
}
