import fs from 'fs';
import path from 'path';

const root = path.resolve('local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui/src');
const needles = [
	'/chart', '/predict/pd', '/predict/pdchart', '/predict/pdpoles',
	'/india/chart', '/india/rectify', '/wangji', '/taixuan', '/jingjue',
	'/shenyishu', '/wuzhao', '/geomancy', '/qimen', '/taiyi', '/jinkou',
	'/liureng', '/nongli/time', '/ziwei/birth', '/bazi/birth',
	':9999', ':8899', ':8892', 'localhost', '127.0.0.1',
	'ServerRoot', 'buildKentangEndpoint', 'cachedKentangFetch', 'fetchChart',
];

function walk(dir, out){
	for(const name of fs.readdirSync(dir)){
		const full = path.join(dir, name);
		const st = fs.statSync(full);
		if(st.isDirectory()){
			if(name === 'node_modules') continue;
			walk(full, out);
		}else if(/\.(js|jsx|ts|tsx)$/.test(name)){
			out.push(full);
		}
	}
}

function classify(file){
	const rel = file.split('src' + path.sep).pop().replace(/\\/g, '/');
	if(rel.includes('__tests__/') || rel.endsWith('.test.js')) return 'TEST-ONLY';
	return 'SOURCE';
}

const files = [];
walk(root, files);
const counts = {};
for(const needle of needles){
	counts[needle] = { 'TEST-ONLY': 0, SOURCE: 0, files: [] };
}
for(const file of files){
	const text = fs.readFileSync(file, 'utf8');
	const kind = classify(file);
	for(const needle of needles){
		if(text.includes(needle)){
			counts[needle][kind] += 1;
			if(kind === 'SOURCE' && counts[needle].files.length < 8){
				counts[needle].files.push(file.split('astrostudyui' + path.sep).pop());
			}
		}
	}
}
const summary = {};
for(const needle of needles){
	summary[needle] = {
		sourceFiles: counts[needle].SOURCE,
		testFiles: counts[needle]['TEST-ONLY'],
		sample: counts[needle].files,
	};
}
fs.writeFileSync('tests/final-parity/network-scan.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
