import fs from 'fs';
import path from 'path';

const roots = process.argv.slice(2);
const needle = 'new Function(';
for (const root of roots) {
	let files = 0;
	let hits = 0;
	const samples = [];
	function walk(dir) {
		for (const name of fs.readdirSync(dir)) {
			const full = path.join(dir, name);
			if (fs.statSync(full).isDirectory()) walk(full);
			else if (name.endsWith('.js') && !full.includes(`${path.sep}static${path.sep}static`)) {
				files += 1;
				const text = fs.readFileSync(full, 'utf8');
				let from = 0;
				while (true) {
					const at = text.indexOf(needle, from);
					if (at < 0) break;
					hits += 1;
					if (samples.length < 6) {
						samples.push(path.basename(full) + ' | ' + text.slice(Math.max(0, at - 50), at + 80).replace(/\s+/g, ' '));
					}
					from = at + needle.length;
				}
			}
		}
	}
	walk(path.resolve(root));
	console.log(JSON.stringify({ root, files, hits, samples }, null, 2));
}
