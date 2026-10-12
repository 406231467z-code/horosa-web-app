import { extractDocxText } from '../../utils/docxText';

describe('browser-local DOCX text extraction', ()=>{
	test('preserves paragraphs, real tabs, and explicit line breaks', ()=>{
		const xml = [
			'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
			'<w:body>',
			'<w:p><w:r><w:t>First</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>Column</w:t></w:r></w:p>',
			'<w:p><w:r><w:t>Second</w:t></w:r><w:r><w:br/></w:r><w:r><w:t>line</w:t></w:r></w:p>',
			'</w:body></w:document>',
		].join('');
		expect(extractDocxText(xml)).toBe('First\tColumn\nSecond\nline');
	});

	test('rejects malformed WordprocessingML instead of returning misleading text', ()=>{
		expect(()=>extractDocxText('<w:document><w:p>broken')).toThrow('DOCX 文档 XML 格式无效');
	});

	test('returns an empty string for a valid document with no paragraphs', ()=>{
		expect(extractDocxText('<document><body /></document>')).toBe('');
	});
});
