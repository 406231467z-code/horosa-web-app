import fs from 'fs';
import path from 'path';

const root = path.resolve('local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui/dist');
const needles = [':9999', ':8899', 'localhost', '127.0.0.1', '/predict/pd', '/india/chart', 'fetchChart'];
function walk(dir, out){
	for(const name of fs.readdirSync(dir)){
		const full = path.join(dir, name);
		if(fs.statSync(full).isDirectory()) walk(full, out);
		else if(name.endsWith('.js')) out.push(full);
	}
}
const files = [];
walk(root, files);
for(const needle of needles){
	let shown = 0;
	for(const file of files){
		const text = fs.readFileSync(file, 'utf8');
		let from = 0;
		while(shown < 2){
			const at = text.indexOf(needle, from);
			if(at < 0) break;
			const slice = text.slice(Math.max(0, at - 70), at + needle.length + 70).replace(/\s+/g, ' ');
			console.log(needle + ' | ' + path.basename(file) + ' | ' + slice);
			shown += 1;
			from = at + needle.length;
		}
		if(shown >= 2) break;
	}
}
