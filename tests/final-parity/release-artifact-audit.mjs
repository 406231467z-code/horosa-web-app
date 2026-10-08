import fs from 'node:fs';
import path from 'node:path';

const dirs = [
	path.resolve('local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui/dist'),
	path.resolve('local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui/dist-file'),
];

const forbidden = [/\.exe$/i, /electron/i, /\.jar$/i, /nsis/i, /jdk/i, /python-runtime/i, /planetarium/i, /astrochart3d/i, /fengshui/i];
const needles = [':9999', ':8899', ':8892', 'http://127.0.0.1:9999'];

function walk(dir, out = []) {
	if (!fs.existsSync(dir)) return out;
	for (const name of fs.readdirSync(dir)) {
		const full = path.join(dir, name);
		const st = fs.statSync(full);
		if (st.isDirectory()) walk(full, out);
		else out.push(full);
	}
	return out;
}

const report = [];
for (const dir of dirs) {
	const files = walk(dir);
	let bytes = 0;
	const hits = { forbidden: [], backendUrl: [] };
	for (const file of files) {
		bytes += fs.statSync(file).size;
		const base = path.basename(file);
		for (const re of forbidden) {
			if (re.test(base) || re.test(file)) hits.forbidden.push(file);
		}
		if (/\.(js|html|json|css)$/i.test(base)) {
			const text = fs.readFileSync(file, 'utf8');
			for (const needle of needles) {
				if (text.includes(needle)) hits.backendUrl.push({ file: base, needle });
			}
		}
	}
	report.push({
		dir,
		exists: fs.existsSync(dir),
		fileCount: files.length,
		totalBytes: bytes,
		totalMiB: Math.round((bytes / (1024 * 1024)) * 10) / 10,
		forbiddenSample: [...new Set(hits.forbidden.map((f) => path.basename(f)))].slice(0, 20),
		backendUrlSample: hits.backendUrl.slice(0, 15),
		classification: fs.existsSync(dir) ? 'production-build-output' : 'missing',
	});
}

fs.writeFileSync('tests/final-parity/release-artifact-audit.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.map((r) => ({ dir: path.basename(r.dir), files: r.fileCount, MiB: r.totalMiB, forbidden: r.forbiddenSample.length }))));
