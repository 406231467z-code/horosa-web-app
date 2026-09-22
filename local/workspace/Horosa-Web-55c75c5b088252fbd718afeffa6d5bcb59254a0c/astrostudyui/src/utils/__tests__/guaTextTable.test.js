import {
	guaTextTableCounts,
	lookupGua,
	lookupGuaDescMap,
	lookupMeiyiDescMap,
	lookupMeiyiGua,
} from '../guaTextTable';

describe('PHASE 4-B gua text table', ()=>{
	test('64 卦与 8 经卦齐全，乾坤卦辞与 classpath 金样一致', ()=>{
		expect(guaTextTableCounts()).toEqual({ gua: 64, meiyi: 8 });
		const qianBin = lookupGua('111111');
		const qianName = lookupGua('乾');
		expect(qianBin).toBe(qianName);
		expect(lookupGua('天天')).toBe(qianBin);
		expect(lookupGua('乾乾')).toBe(qianBin);
		expect(qianBin['卦辞']).toBe('元，亨，利，贞。');
		expect(qianBin['爻辞']).toHaveLength(7);
		expect(lookupGua('000000')['卦辞']).toBe('元亨。利牝马之贞。君子有攸往，先迷，後得主，利。西南得朋，东北丧朋。安贞吉。');
		expect(lookupGua('坤')).toBe(lookupGua('000000'));
	});

	test('梅花易按爻象与卦名取同一条', ()=>{
		const tian = lookupMeiyiGua('天');
		expect(tian).toBe(lookupMeiyiGua('111'));
		expect(tian).toBe(lookupMeiyiGua('乾'));
		expect(tian.abrname).toBe('天');
		expect(tian['梅易']).toBeTruthy();
	});

	test('表内没有的名字不补造条目', ()=>{
		expect(lookupGua('不存在')).toBeUndefined();
		expect(lookupMeiyiGua('')).toBeUndefined();
		const map = lookupGuaDescMap(['111111', '不存在', '']);
		expect(Object.keys(map)).toEqual(['111111']);
		expect(lookupMeiyiDescMap(['没有'])).toEqual({});
	});
});
