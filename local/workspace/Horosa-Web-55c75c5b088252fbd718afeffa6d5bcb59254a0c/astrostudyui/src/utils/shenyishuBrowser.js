// 神易数：vendor/shenyishu/shenyishu.py 的数码、神煞、兵占评分。
// 四柱用与八字同一套浏览器历（buildLocalBaziResult）。贵人表只载甲/乙，其余保持原表未载。
import { buildLocalBaziResult } from './baziLunarLocal';
import { unsupportedStatus } from './calcStatus';

const JIAZI_CODE = {
	甲子: 84, 乙丑: 162, 丙寅: 10, 丁卯: 42, 戊辰: 54, 己巳: 70,
	庚午: 72, 辛未: 182, 壬申: 221, 癸酉: 170, 甲戌: 117, 乙亥: 289,
	丙子: 28, 丁丑: 54, 戊寅: 72, 己卯: 81, 庚辰: 66, 辛巳: 54,
	壬午: 91, 癸未: 136, 甲申: 221, 乙酉: 170, 丙戌: 100, 丁亥: 187,
	戊子: 24, 己丑: 35, 庚寅: 108, 辛卯: 99, 壬辰: 195, 癸巳: 84,
	甲午: 91, 乙未: 136, 丙申: 117, 丁酉: 36, 戊戌: 204, 己亥: 169,
	庚子: 48, 辛丑: 70, 壬寅: 130, 癸卯: 221, 甲辰: 195, 乙巳: 84,
	丙午: 50, 丁未: 180, 戊申: 187, 己酉: 60, 庚戌: 238, 辛亥: 135,
	壬子: 84, 癸丑: 162, 甲寅: 130, 乙卯: 221, 丙辰: 63, 丁巳: 48,
	戊午: 56, 己未: 156, 庚申: 78, 辛酉: 80, 壬戌: 117, 癸亥: 289,
};

const DISPLAY = [
	['時', '时'], ['總', '总'], ['連', '连'], ['歸', '归'], ['兌', '兑'], ['離', '离'],
	['陽', '阳'], ['陰', '阴'], ['數', '数'], ['強', '强'], ['於', '于'], ['將', '将'],
	['賊', '贼'], ['個', '个'], ['軍', '军'], ['判斷', '判断'], ['參', '参'], ['謹', '谨'],
	['擇', '择'], ['臨', '临'], ['貴', '贵'], ['驛', '驿'], ['馬', '马'], ['財', '财'],
	['祿', '禄'], ['殺', '杀'], ['寶', '宝'], ['帶', '带'],
];

function show(value){
	if(value === undefined || value === null){
		return '';
	}
	let text = `${value}`;
	DISPLAY.forEach(([from, to])=>{
		text = text.split(from).join(to);
	});
	return text;
}

function numToGua(num){
	const map = { 1: '艮', 2: '兌', 3: '坎', 4: '離', 5: '震', 6: '巽', 7: '巽', 8: '坤', 9: '乾', 0: '艮' };
	return map[Number(num)] || '艮';
}

function lianshan(num){
	const map = { 1: '艮', 2: '兌', 3: '坎', 4: '離', 5: '震', 6: '巽', 7: '巽', 8: '坤', 9: '乾', 10: '艮' };
	let n = Number(num) % 10;
	if(n === 0){
		n = 10;
	}
	return map[n] || '艮';
}

function guicang(num){
	const map = { 1: '山', 2: '金', 3: '水', 4: '火', 5: '木', 6: '巽', 7: '巽', 8: '坤', 9: '乾' };
	let n = Number(num) % 9;
	if(n === 0){
		n = 9;
	}
	return map[n] || '山';
}

function stemBranchElement(ch){
	const map = {
		甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
		子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
	};
	return map[ch] || '';
}

function analyzeZongshu(total){
	const bai = Math.floor(total / 100) % 10;
	const shi = Math.floor(total / 10) % 10;
	const ge = total % 10;
	const baiMap = { 8: '艮', 9: '乾', 2: '兌', 1: '坎', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兌', 0: '坤' };
	const shiMap = { 9: '乾', 2: '兌', 1: '離', 3: '坤', 4: '震', 5: '巽', 6: '中', 7: '乾', 8: '兌', 0: '離' };
	const geMap = { 2: '兌', 8: '艮', 1: '坎', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兌', 9: '離', 0: '乾' };
	const yang = (n)=>[1, 3, 5, 7, 9].indexOf(n) >= 0;
	return {
		百位: { 數: bai, 卦: baiMap[bai] || '坤', 陰陽: yang(bai) ? '陽' : '陰' },
		十位: { 數: shi, 卦: shiMap[shi] || '離', 陰陽: yang(shi) ? '陽' : '陰' },
		個位: { 數: ge, 卦: geMap[ge] || '乾', 陰陽: yang(ge) ? '陽' : '陰' },
	};
}

function zhukeOf(zongshu){
	const bai = zongshu['百位']['數'];
	const shi = zongshu['十位']['數'];
	const ge = zongshu['個位']['數'];
	const result = [];
	let jieguo = '';
	if(bai > shi){
		result.push('主將強於我兵');
		jieguo = '主將威明';
	}else if(shi > bai){
		result.push('我兵強於主將');
		jieguo = '兵強勇捍';
	}else{
		result.push('主將與我兵相當');
		jieguo = '和';
	}
	if([1, 3, 5, 7, 9].indexOf(ge) >= 0){
		result.push('陽數賊寇衰弱');
		jieguo += ' - 陽數吉利';
	}else{
		result.push('陰數賊寇強盛');
		jieguo += ' - 陰數主凶';
	}
	if(bai === 0){
		result.push('百位歸坤');
	}
	if(shi === 0){
		result.push('十位歸離');
	}
	if(ge === 0){
		result.push('個位歸乾');
	}
	return { 結論: jieguo, 分析: result };
}

function stemOf(gz){
	return gz && gz.length ? gz[0] : '';
}
function branchOf(gz){
	return gz && gz.length > 1 ? gz[1] : '';
}

function guiren(yearGz){
	const map = {
		甲子: '艮', 甲丑: '坎', 甲寅: '乾', 甲卯: '乾', 甲辰: '艮', 甲巳: '坤',
		甲午: '艮', 甲未: '艮', 甲申: '震', 甲酉: '震', 甲戌: '震', 甲亥: '震',
		乙子: '坤', 乙丑: '坤', 乙寅: '兑', 乙卯: '兑', 乙辰: '坤', 乙巳: '坎',
		乙午: '離', 乙未: '離', 乙申: '巽', 乙酉: '巽', 乙戌: '巽', 乙亥: '巽',
	};
	return Object.prototype.hasOwnProperty.call(map, yearGz) ? map[yearGz] : null;
}

function lookupStem(map, gz, fallback){
	return map[stemOf(gz)] || fallback;
}
function lookupBranch(map, gz, fallback){
	return map[branchOf(gz)] || fallback;
}

function yima(gz){
	return lookupBranch({
		申: '坤', 子: '乾', 辰: '巽', 午: '乾', 寅: '乾', 戌: '乾', 卯: '巽', 酉: '艮', 亥: '巽', 巳: '艮', 丑: '巽', 未: '地',
	}, gz, '坤');
}
function xueguang(gz){
	return lookupStem({ 甲: '坤', 乙: '坤', 丙: '乾', 丁: '乾', 戊: '艮', 己: '巽', 庚: '坎', 辛: '地', 壬: '乾', 癸: '艮' }, gz, '坤');
}
function tiancai(gz){
	return lookupStem({ 甲: '艮', 乙: '艮', 丙: '乾', 丁: '乾', 戊: '坎', 己: '震', 庚: '離', 辛: '離', 壬: '震', 癸: '離' }, gz, '艮');
}
function kuiyuan(gz){
	return lookupStem({ 甲: '震', 乙: '震', 丙: '乾', 丁: '乾', 戊: '坤', 己: '坤', 庚: '兑', 辛: '兑', 壬: '坎', 癸: '坎' }, gz, '震');
}
function yangren(gz){
	return lookupStem({ 甲: '震', 乙: '巽', 丙: '離', 丁: '離', 戊: '坤', 己: '坤', 庚: '兑', 辛: '乾', 壬: '坎', 癸: '艮' }, gz, '震');
}
function zhenglu(gz){
	return lookupStem({ 甲: '艮', 乙: '震', 丙: '巽', 丁: '離', 戊: '巽', 己: '離', 庚: '坤', 辛: '兑', 壬: '乾', 癸: '坎' }, gz, '艮');
}
function baihu(gz){
	return lookupStem({ 甲: '金', 乙: '震', 丙: '木', 丁: '西', 戊: '火', 己: '坎', 庚: '水', 辛: '離', 壬: '上', 癸: '離' }, gz, '金');
}
function poSui(gz){
	const dz = branchOf(gz);
	if('子午卯酉'.indexOf(dz) >= 0){ return '巽'; }
	if('寅申巳亥'.indexOf(dz) >= 0){ return '兑'; }
	if('辰戌丑未'.indexOf(dz) >= 0){ return '艮'; }
	return '艮';
}
function jieSha(gz){
	const dz = branchOf(gz);
	if('寅午戌'.indexOf(dz) >= 0){ return '乾'; }
	if('申子辰'.indexOf(dz) >= 0){ return '巽'; }
	if('亥卯未'.indexOf(dz) >= 0){ return '坤'; }
	if('巳酉丑'.indexOf(dz) >= 0){ return '艮'; }
	return '乾';
}
function changsheng(gan){
	const order = ['長生', '沐浴', '冠帶', '臨官', '帝旺', '衰', '病', '死', '墓', '絕', '胎', '養'];
	const idx = { 甲: 0, 乙: 6, 丙: 3, 丁: 3, 戊: 5, 己: 5, 庚: 6, 辛: 0, 壬: 3, 癸: 3 }[gan];
	const at = idx === undefined ? 0 : idx;
	return order.slice(at, at + 4);
}
function maDaiDao(gz){
	return yima(gz) === yangren(gz);
}
function baoma(gz){
	return guiren(gz) === zhenglu(gz) && ['乾', '艮', '巽'].indexOf(yima(gz)) >= 0;
}
function yinquan(gz){
	return ['坎', '震', '巽'].indexOf(yima(gz)) >= 0;
}

function jixiongOf(shensha, activeGua){
	let score = 0;
	const reasons = [];
	function hit(label, delta, text){
		if(shensha[label] === activeGua){
			score += delta;
			reasons.push(text);
		}
	}
	hit('貴人', 30, '貴人助力(+30)');
	hit('天財', 20, '天財加持(+20)');
	hit('魁元', 15, '魁元照臨(+15)');
	const horse = shensha['驛馬'];
	if(horse === activeGua && ['乾', '艮', '巽'].indexOf(horse) >= 0){
		score += 15;
		reasons.push('驛馬得地(+15)');
	}
	hit('血光', -30, '血光之災(-30)');
	hit('白虎', -25, '白虎凶煞(-25)');
	hit('破碎', -20, '破碎殺伐(-20)');
	hit('劫殺', -15, '劫殺顯現(-15)');
	if(maDaiDao(shensha['年干'] || '')){
		score -= 40;
		reasons.push('馬帶刀凶兆(-40)');
	}
	if(baoma(shensha['年干'] || '')){
		score += 30;
		reasons.push('寶馬吉兆(+30)');
	}
	if(yinquan(shensha['年干'] || '')){
		score += 15;
		reasons.push('飲泉食谷(+15)');
	}
	let level = '大凶';
	let detail = '兵佔大凶，切勿妄動';
	if(score >= 40){
		level = '大吉';
		detail = '出征大吉，諸事順利';
	}else if(score >= 20){
		level = '吉';
		detail = '出兵有利，可行軍事';
	}else if(score >= 0){
		level = '平';
		detail = '吉凶參半，謹慎行事';
	}else if(score >= -20){
		level = '凶';
		detail = '不宜出兵，另擇吉日';
	}
	return { level, score, detail, reasons };
}

function seasonOf(data, month){
	const manual = data.seasonSource === 'manual' ? `${data.manualSeason || data.season || ''}` : '';
	if(['春', '夏', '秋', '冬'].indexOf(manual) >= 0){
		return manual;
	}
	if([3, 4, 5].indexOf(month) >= 0){ return '春'; }
	if([6, 7, 8].indexOf(month) >= 0){ return '夏'; }
	if([9, 10, 11].indexOf(month) >= 0){ return '秋'; }
	return '冬';
}

function strength(season){
	const map = {
		春: { 旺: '木', 相: '火', 休: '水', 囚: '金', 死: '土' },
		夏: { 旺: '火', 相: '土', 休: '木', 囚: '水', 死: '金' },
		秋: { 旺: '金', 相: '水', 休: '土', 囚: '火', 死: '木' },
		冬: { 旺: '水', 相: '木', 休: '金', 囚: '土', 死: '火' },
	};
	return map[season] || {};
}

function row(label, value){
	const text = value === undefined || value === null || value === '' ? '—' : `${Array.isArray(value) ? value.join('、') : value}`;
	return { label, value: text };
}

function pillarsFrom(data){
	const hour = Number(data.hour) || 0;
	const minute = Number(data.minute) || 0;
	const second = Number(data.second) || 0;
	const year = Number(data.year);
	const abs = Math.abs(year);
	const built = buildLocalBaziResult({
		date: data.date || `${year < 0 ? '-' : ''}${abs}-${String(data.month).padStart(2, '0')}-${String(data.day).padStart(2, '0')}`,
		time: data.time || `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
		zone: data.zone || '+08:00',
		after23NewDay: data.after23NewDay,
		lateZiHourUseNextDay: data.lateZiHourUseNextDay,
	});
	const fc = built.bazi.fourColumns;
	return {
		年: fc.year.ganzi,
		月: fc.month.ganzi,
		日: fc.day.ganzi,
		時: fc.time.ganzi,
	};
}

export function scoreShenyiFromPillars(gz){
	const total = ['年', '月', '日', '時'].reduce((sum, key)=>sum + (JIAZI_CODE[gz[key]] || 0), 0);
	const zongshu = analyzeZongshu(total);
	const zhuke = zhukeOf(zongshu);
	const yearGz = gz['年'];
	const shensha = {
		年干: yearGz,
		貴人: guiren(yearGz),
		驛馬: yima(yearGz),
		血光: xueguang(yearGz),
		天財: tiancai(yearGz),
		魁元: kuiyuan(yearGz),
		羊刃: yangren(yearGz),
		正祿: zhenglu(yearGz),
		白虎: baihu(yearGz),
		破碎: poSui(yearGz),
		劫殺: jieSha(yearGz),
		馬帶刀: maDaiDao(yearGz) ? '是' : '否',
		寶馬: baoma(yearGz) ? '是' : '否',
	};
	const active = lianshan(`${total}`);
	return {
		total,
		zongshu,
		zhuke,
		shensha,
		lianshan: active,
		guicang: guicang(`${total}`),
		bagua: `${total}`.split('').map((ch)=>numToGua(ch)),
		wuxing: {
			年: stemBranchElement(gz['年'][0]) + stemBranchElement(gz['年'][1]),
			月: stemBranchElement(gz['月'][0]) + stemBranchElement(gz['月'][1]),
			日: stemBranchElement(gz['日'][0]) + stemBranchElement(gz['日'][1]),
			時: stemBranchElement(gz['時'][0]) + stemBranchElement(gz['時'][1]),
		},
		changsheng: {
			年: changsheng(gz['年'][0]),
			月: changsheng(gz['月'][0]),
			日: changsheng(gz['日'][0]),
		},
		jixiong: jixiongOf(shensha, active),
	};
}

export const ShenyiBrowserEngine = {
	calculate(input){
		const data = input || {};
		const year = Number(data.year);
		const month = Number(data.month);
		const day = Number(data.day);
		let hour = Number(data.hour);
		if(data.hourSource === 'manual' && Number.isFinite(Number(data.manualHour))){
			hour = Number(data.manualHour);
		}
		if(!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(hour)){
			const meta = unsupportedStatus('shenyishu', 'INVALID_INPUT', '起盘需要年月日时。');
			meta.status = 'INVALID_INPUT';
			return { status: 'INVALID_INPUT', provider: 'browser', input: data, result: null, meta };
		}
		let gz;
		try{
			gz = pillarsFrom({ ...data, hour });
		}catch(e){
			const meta = unsupportedStatus('shenyishu', 'LUNAR_DOMAIN', e && e.message);
			return { status: 'UNSUPPORTED', provider: 'browser', input: data, result: null, meta };
		}
		const scored = scoreShenyiFromPillars(gz);
		const season = seasonOf(data, month);
		const labels = { 年: '年柱', 月: '月柱', 日: '日柱', 時: '时柱' };
		const pillars = ['年', '月', '日', '時'].map((key)=>({
			key,
			label: labels[key],
			ganzhi: gz[key],
			wuxing: show(scored.wuxing[key]),
			code: JIAZI_CODE[gz[key]] || 0,
		}));
		const roleNames = { 百位: '主将', 十位: '我兵', 個位: '贼寇' };
		const roleLabels = { 百位: '百位', 十位: '十位', 個位: '个位' };
		const roles = ['百位', '十位', '個位'].map((key)=>{
			const item = scored.zongshu[key];
			return {
				key: roleLabels[key],
				role: roleNames[key],
				number: item['數'],
				gua: show(item['卦']),
				yinyang: show(item['陰陽']),
			};
		});
		const shenshaItems = Object.keys(scored.shensha).map((key)=>({
			label: show(key),
			value: show(scored.shensha[key]) || '原表未载',
		}));
		shenshaItems.push({ label: '正禄羊刃', value: show(`${zhenglu(gz['年'])}/${yangren(gz['年'])}`) });
		shenshaItems.push({ label: '饮泉食谷', value: yinquan(gz['年']) ? '是' : '否' });
		const formula = pillars.map((item)=>`${item.label} ${item.ganzhi}=${item.code}`).join(' + ');
		const seasonStrength = Object.keys(strength(season)).map((key)=>({ label: key, value: strength(season)[key] }));
		const pan = {
			source: 'shenyishu',
			engine: 'browser',
			dateStr: data.date || '',
			timeStr: data.time || '',
			hour,
			hourSource: data.hourSource === 'manual' ? 'manual' : 'auto',
			seasonSource: data.seasonSource === 'manual' ? 'manual' : 'auto',
			season,
			birth: `${year}年${month}月${day}日${hour}时`,
			shenyishu: {
				pillars,
				total: scored.total,
				totalFormula: formula,
				digitGua: `${scored.total}`.split('').map((ch)=>({ digit: Number(ch), gua: show(numToGua(ch)) })),
				roles,
				zhuke: {
					結論: show(scored.zhuke['結論']),
					分析: scored.zhuke['分析'].map(show),
				},
				lianshan: show(scored.lianshan),
				guicang: show(scored.guicang),
				bagua: scored.bagua.map(show),
				wuxing: scored.wuxing,
				wuxingRules: {
					sheng: ['金生水', '水生木', '木生火', '火生土', '土生金'],
					ke: ['金克木', '木克土', '土克水', '水克火', '火克金'],
					season,
					seasonStrength,
				},
				shensha: shenshaItems,
				changsheng: ['年', '月', '日'].map((key)=>({
					label: labels[key],
					value: scored.changsheng[key].map(show),
				})),
				jixiong: {
					level: show(scored.jixiong.level),
					score: scored.jixiong.score,
					detail: show(scored.jixiong.detail),
					reasons: scored.jixiong.reasons.map(show),
				},
			},
		};
		const ss = pan.shenyishu;
		pan.sections = [
			{ title: '起盘', rows: [
				row('起盘时间', `${pan.dateStr} ${pan.timeStr}`.trim()),
				row('生辰', pan.birth),
				row('计时', pan.hourSource === 'manual' ? '手动小时' : '自动取小时'),
				row('入式小时', `${hour}时`),
				row('季令', `${season}（${pan.seasonSource === 'manual' ? '手动' : '自动'}）`),
			] },
			{ title: '干支与五行', rows: pillars.map((item)=>row(item.label, `${item.ganzhi}（${item.wuxing}，数码 ${item.code}）`)) },
			{ title: '神卦', rows: [
				row('总数', ss.total),
				row('数码公式', ss.totalFormula),
				row('连山卦', ss.lianshan),
				row('归藏卦', ss.guicang),
				row('八卦', ss.bagua),
			] },
			{ title: '兵占', rows: roles.map((item)=>row(item.role, `${item.key} ${item.number} → ${item.gua}，${item.yinyang}数`)) },
			{ title: '主客判断', rows: [row('结论', ss.zhuke['結論']), row('分析', ss.zhuke['分析'])] },
			{ title: '神煞', rows: shenshaItems.map((item)=>row(item.label, item.value)) },
			{ title: '吉凶', rows: [row('等级', ss.jixiong.level), row('评分', ss.jixiong.score), row('结论', ss.jixiong.detail)] },
		];
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
			meta: { feature: 'shenyishu', source: 'shenyishu.py', pillarSource: 'buildLocalBaziResult' },
		};
	},
	getCapabilities(){
		return {
			status: 'SUCCESS',
			provider: 'browser',
			inputs: ['year', 'month', 'day', 'hour'],
			outputs: ['pillars', 'total', 'lianshan', 'shensha', 'jixiong'],
			productionReady: true,
			guiren: '甲乙原表，其余原表未载',
		};
	},
};

export function ShenyiCalculationProvider(){
	return ShenyiBrowserEngine;
}
