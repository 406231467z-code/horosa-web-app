const fs = require('fs');
const path = require('path');

const componentPath = path.join(__dirname, '../KinAstroMain.js');
const dataPath = path.join(__dirname, '../cetianYiyuTexts.json');
const componentSource = fs.readFileSync(componentPath, 'utf8');
const texts = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

describe('Cetian classical texts run locally in the browser', ()=>{
	test('bundled texts preserve the complete backend catalogue and reader contract', ()=>{
		expect(Object.keys(texts)).toEqual([
			'zhaodan', 'taiyuan', 'wuxing', 'qili', 'feixing', 'liming', 'yunxian',
			'shengsi', 'keying', 'xianglun', 'jinjing', 'shenming', 'ruyuan',
		]);
		Object.keys(texts).forEach((key)=>{
			const doc = texts[key];
			expect(typeof doc.title).toBe('string');
			expect(Array.isArray(doc.sections)).toBe(true);
			expect(doc.sections.length).toBeGreaterThan(0);
			doc.sections.forEach((section)=>{
				expect(typeof section.subtitle).toBe('string');
				expect(typeof section.body).toBe('string');
				expect(section.body.length).toBeGreaterThan(0);
			});
		});
	});

	test('the reader loads the bundled data without requesting the retired endpoint', ()=>{
		expect(componentSource).toContain("import CETIAN_YIYU_TEXTS from './cetianYiyuTexts.json';");
		const start = componentSource.indexOf('loadCetianTexts =');
		const end = componentSource.indexOf('renderCetianZiliao()', start);
		expect(start).toBeGreaterThanOrEqual(0);
		expect(end).toBeGreaterThan(start);
		const loader = componentSource.slice(start, end);
		expect(loader).toContain('cetianTexts: CETIAN_YIYU_TEXTS');
		expect(loader).not.toContain('fetch(');
		expect(loader).not.toContain('cachedKentangFetch');
		expect(loader).not.toContain('/cetian/texts');
	});
});
