import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createSpaStaticServer } from './spa-static-server.mjs';

const DIST = path.resolve(
	'local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui/dist',
);

function extractPreloadCss(indexHtml) {
	return [...indexHtml.matchAll(/href="(\/static\/[^"]+\.chunk\.css)"/g)].map((m) => m[1]);
}

function extractUmiScript(indexHtml) {
	const m = indexHtml.match(/src="(\/static\/umi\.[^"]+\.js)"/);
	return m ? m[1] : null;
}

function get(url) {
	return new Promise((resolve, reject) => {
		http.get(url, (res) => {
			const chunks = [];
			res.on('data', (c) => chunks.push(c));
			res.on('end', () => {
				const body = Buffer.concat(chunks).toString('utf8');
				resolve({
					status: res.statusCode,
					type: res.headers['content-type'] || '',
					len: body.length,
					head: body.slice(0, 80),
				});
			});
		}).on('error', reject);
	});
}

const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const cssUrls = extractPreloadCss(indexHtml);
const umiScript = extractUmiScript(indexHtml);
const targets = [
	umiScript,
	...cssUrls.slice(0, 12),
].filter(Boolean);

const spa = await createSpaStaticServer(DIST, { port: 0, host: '127.0.0.1' });
const origin = spa.origin.replace(/\/$/, '');
const results = [];
for (const rel of targets) {
	results.push({ url: rel, ...(await get(`${origin}${rel}`)) });
}
await spa.close();

const failed = results.filter(
	(r) => r.status !== 200
		|| (r.url.endsWith('.css') && !r.type.includes('text/css'))
		|| (r.url.endsWith('.js') && !r.type.includes('javascript'))
		|| r.head.startsWith('<!DOCTYPE'),
);

console.log(JSON.stringify({
	status: failed.length === 0 ? 'PASS' : 'FAIL',
	cssPreloads: cssUrls.length,
	results,
	failed,
}, null, 2));
process.exitCode = failed.length === 0 ? 0 : 1;
