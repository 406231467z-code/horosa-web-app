/**
 * Extract readable text from WordprocessingML. Keep DOCX control elements as real
 * whitespace so downstream AI prompts receive paragraph breaks, tabs and line breaks.
 */
export function extractDocxText(xmlText){
	const xml = new DOMParser().parseFromString(`${xmlText || ''}`, 'application/xml');
	if(xml.getElementsByTagName('parsererror').length){
		throw new Error('DOCX 文档 XML 格式无效');
	}
	const paragraphs = Array.from(xml.getElementsByTagName('*')).filter((node)=>node.localName === 'p');
	return paragraphs.map((paragraph)=>{
		return Array.from(paragraph.getElementsByTagName('*')).map((node)=>{
			if(node.localName === 't'){ return node.textContent || ''; }
			if(node.localName === 'tab'){ return '\t'; }
			if(node.localName === 'br' || node.localName === 'cr'){ return '\n'; }
			return '';
		}).join('');
	}).join('\n').trim();
}

