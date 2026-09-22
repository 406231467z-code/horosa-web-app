// [制度化] 🔴 主导航×AI导出覆盖哨兵(L3):每个主导航技法 key 必须在三分类表之一——
//   ①归一表(NAV_KEY_EXPORT_LABEL:短名≠判定词,以结构化 key 归一为长名)
//   ②自命中(导航 label 本身即判定链认识的词,文本直配)
//   ③豁免(无顶栏导出语义/走独立导出链,理由成文)
// 病史:导航「印度占星」改短「印占」后判定链全失配,印占/七政/三式/分至页顶栏 AI 导出
// 报「当前页面没有可导出文本」。导航新增/改名而未登记 → 本哨兵当场红。
import fs from 'fs';
import path from 'path';

const read = (rel)=>fs.readFileSync(path.join(__dirname, rel), 'utf8');

function extractNavEntries(){
	const src = read('../../pages/index.js');
	const entries = [];
	const re = /\{ label: '([^']+)', key: '(\w+)', icon: '[^']+', group: '([^']+)'/g;
	let m;
	while((m = re.exec(src))){ entries.push({ label: m[1], key: m[2], group: m[3] }); }
	return entries;
}
function extractNormalizeMap(){
	const src = read('../aiExport.js');
	const i = src.indexOf('const NAV_KEY_EXPORT_LABEL = {');
	const seg = src.slice(i, src.indexOf('};', i));
	const map = {};
	const re = /(\w+): '([^']+)'/g;
	let m;
	while((m = re.exec(seg))){ map[m[1]] = m[2]; }
	return map;
}

// ② 自命中:label 即判定链认识的词(label 变更会破坏文本直配 → 断言 label 钉死)
const SELF_MATCHING = {
	direction: '星运', bazi: '八字', ziwei: '紫微', auxchart: '辅盘', relativechart: '合盘',
	liureng: '六壬', dunjia: '遁甲',
	guazhan: '六爻', taiyi: '太乙',
};
const EXEMPT = {
	aianalysis: 'AI 分析页自带报告导出链,不走顶栏通用导出',
	shusuan: '数算页导出走 store fallback(历史现状;顶栏链如需接入另立项)',
	mingother: '命·其他(演禽/一掌经)导出走 store fallback(历史现状;顶栏链如需接入另立项)',
	__charts__: '命盘管理是本地抽屉,不走顶栏技法导出',
};

describe('[制度化] 主导航×AI导出三分类全覆盖哨兵', ()=>{
	const nav = extractNavEntries();
	const normalizeMap = extractNormalizeMap();

	test('提取自证:导航≥25 项、归一表≥6 键(正则漂移塌缩必红)', ()=>{
		expect(nav.length).toBeGreaterThanOrEqual(15);
		expect(Object.keys(normalizeMap).length).toBeGreaterThanOrEqual(6);
	});

	test('🔴 全覆盖:每个导航 key ∈ 归一 ∪ 自命中 ∪ 豁免(新增/漏登当场红)', ()=>{
		const missing = nav.filter((n)=>!normalizeMap[n.key] && !SELF_MATCHING[n.key] && !EXEMPT[n.key]);
		expect(missing.map((n)=>`${n.key}(${n.label})`)).toEqual([]);
	});

	test('🔴 自命中键的 label 钉死(改短名必须迁入归一表)', ()=>{
		const navByKey = {};
		nav.forEach((n)=>{ navByKey[n.key] = n.label; });
		Object.keys(SELF_MATCHING).forEach((k)=>{
			expect(`${k}:${navByKey[k]}`).toBe(`${k}:${SELF_MATCHING[k]}`);
		});
	});

	test('三分类互斥:一个键不得同时在两表', ()=>{
		const inTwo = [];
		nav.forEach((n)=>{
			const c = [normalizeMap[n.key], SELF_MATCHING[n.key], EXEMPT[n.key]].filter(Boolean).length;
			if(c > 1){ inTwo.push(n.key); }
		});
		expect(inTwo).toEqual([]);
	});

	test('归一表词有效性:每个归一长名必须真的出现在 aiExport 判定链里(防归一到无人认识的词)', ()=>{
		const src = read('../aiExport.js');
		const i = src.indexOf('const NAV_KEY_EXPORT_LABEL = {');
		const rest = src.slice(0, i) + src.slice(src.indexOf('};', i));
		Object.entries(normalizeMap).forEach(([k, label])=>{
			expect(`${k}:${rest.includes(`'${label}'`)}`).toBe(`${k}:true`);
		});
	});
});
