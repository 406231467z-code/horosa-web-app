jest.mock('../../services/aianalysis', ()=>({
	extractMaterialContent: jest.fn(),
}));

import { guessKind, parseMaterialFile } from '../aiAnalysisMaterial';

describe('pure-browser AI material import', ()=>{
	test.each([
		['chart.pdf', 'PDF 在纯浏览器模式下暂不支持解析'],
		['legacy.doc', '旧版 DOC 在纯浏览器模式下暂不支持解析'],
	])('%s is rejected before FileReader/Base64 work begins', async (name, expected)=>{
		// A minimal file-like object is sufficient: unsupported types must be rejected
		// before touching file bytes or requiring browser-only FileReader APIs.
		await expect(parseMaterialFile({ name })).rejects.toThrow(expected);
	});

	test('DOCX remains a supported extractable file type', ()=>{
		expect(guessKind({ name: 'notes.docx' })).toBe('docx');
	});

	test('plain text and Markdown stay supported', ()=>{
		expect(guessKind({ name: 'notes.txt' })).toBe('txt');
		expect(guessKind({ name: 'notes.markdown' })).toBe('md');
	});
});
