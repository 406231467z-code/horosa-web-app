import fs from 'fs';
import path from 'path';

const roots = process.argv.slice(2);
if (!roots.length) {
	roots.push('local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui/dist');
}

function walk(dir, out) {
	if (!fs.existsSync(dir)) return;
	for (const name of fs.readdirSync(dir)) {
		const full = path.join(dir, name);
		if (fs.statSync(full).isDirectory()) walk(full, out);
		else if (/\.(js|css|html|json)$/.test(name)) out.push(full);
	}
}

function classify(text, needle) {
	const hits = [];
	let from = 0;
	while (from < text.length) {
		const at = text.indexOf(needle, from);
		if (at < 0) break;
		const slice = text.slice(Math.max(0, at - 40), at + needle.length + 40);
		let kind = 'UNCLASSIFIED';
		if (needle === ':9999' && /max:9999/.test(slice)) kind = 'INPUT_MAX';
		else if (needle === ':9999' && /Java|启动|heartbeat/i.test(slice)) kind = 'USER_FACING_PORT';
		else if (needle === '127.0.0.1' && /11434/.test(slice)) kind = 'EXTERNAL_API_OLLAMA';
		else if ((needle === 'localhost' || needle === '127.0.0.1') && /hostname|location\.protocol|file:/.test(slice)) kind = 'FILE_PROTOCOL_HOST_CHECK';
		else if (needle.startsWith('/predict/') || needle === '/india/chart') {
			if (/run:\(\)=>/.test(slice) || /浏览器不请求/.test(slice)) kind = 'LICENSE_OR_BROWSER_LABEL';
			else kind = 'PATH_LABEL';
		} else if (needle === 'fetchChart' && /prefetchChart/.test(slice)) kind = 'METHOD_NAME_SUBSTRING';
		hits.push({ kind, slice: slice.replace(/\s+/g, ' ') });
		from = at + needle.length;
	}
	return hits;
}

const needles = [':9999', ':8899', ':8892', 'localhost', '127.0.0.1', '/predict/pd', '/india/chart', 'fetchChart', 'child_process', 'node:fs'];
const sampleCap = {};
for (const root of roots) {
	const files = [];
	walk(path.resolve(root), files);
	const summary = {};
	for (const needle of needles) summary[needle] = {};
	for (const file of files) {
		const text = fs.readFileSync(file, 'utf8');
		for (const needle of needles) {
			if (!text.includes(needle)) continue;
			for (const hit of classify(text, needle)) {
				summary[needle][hit.kind] = (summary[needle][hit.kind] || 0) + 1;
				const sampleKey = needle + '|' + hit.kind;
				sampleCap[sampleKey] = sampleCap[sampleKey] || 0;
				if ((hit.kind === 'UNCLASSIFIED' || hit.kind === 'PATH_LABEL' || hit.kind === 'USER_FACING_PORT') && sampleCap[sampleKey] < 4) {
					sampleCap[sampleKey] += 1;
					console.log('SAMPLE ' + needle + ' ' + hit.kind + ' | ' + path.basename(file) + ' | ' + hit.slice);
				}
			}
		}
	}
	console.log(JSON.stringify({ root, files: files.length, summary }, null, 2));
}
