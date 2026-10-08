import fs from 'fs';
import path from 'path';

const root = path.resolve('local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui/dist');
const needles = [':9999', ':8899', ':8892', 'localhost', '127.0.0.1', 'child_process', 'node:fs', 'Electron', '/predict/pd', '/india/chart', 'fetchChart', 'buildKentangEndpoint'];
const counts = {};
needles.forEach((n) => { counts[n] = 0; });
let files = 0;
function walk(dir){
	for(const name of fs.readdirSync(dir)){
		const full = path.join(dir, name);
		const st = fs.statSync(full);
		if(st.isDirectory()) walk(full);
		else if(/\.(js|css|html|json|map)$/.test(name)){
			files += 1;
			const text = fs.readFileSync(full, 'utf8');
			for(const n of needles){
				if(text.includes(n)) counts[n] += 1;
			}
		}
	}
}
walk(root);
console.log(JSON.stringify({ files, counts }, null, 2));
