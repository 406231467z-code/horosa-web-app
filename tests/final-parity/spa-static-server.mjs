import fs from 'node:fs';
import path from 'node:path';

const MIME = {
	'.html': 'text/html',
	'.js': 'application/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ico': 'image/x-icon',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.map': 'application/json',
};

const ASSET_EXT = new Set(['.js', '.css', '.json', '.map', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ico']);

function resolveDistFile(root, relPath) {
	const rel = relPath.startsWith('/') ? relPath.slice(1) : relPath;
	let file = path.normalize(path.join(root, rel));
	if (!file.startsWith(root)) return null;
	if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
	// Umi web build: publicPath /static/ but async chunks often live at dist root (see umi-runner).
	if (relPath.startsWith('/static/')) {
		const bare = relPath.replace(/^\/static\//, '');
		file = path.normalize(path.join(root, bare));
		if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) return file;
	}
	return null;
}

/** Production static hosting: unknown paths → index.html (SPA), assets served as files. */
export function createSpaStaticServer(distRoot, options = {}) {
	const root = path.resolve(distRoot);
	const indexFile = path.join(root, 'index.html');
	if (!fs.existsSync(indexFile)) {
		throw new Error(`dist missing index.html: ${root}`);
	}
	return new Promise((resolve, reject) => {
		import('node:http').then(({ default: http }) => {
			const server = http.createServer((req, res) => {
				let rel = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
				if (rel === '/') {
					rel = '/index.html';
				}
				const serveIndex = () => {
					res.setHeader('Content-Type', 'text/html; charset=utf-8');
					fs.createReadStream(indexFile).pipe(res);
				};
				const ext = path.extname(rel).toLowerCase();
				const file = resolveDistFile(root, rel === '/index.html' ? rel : rel);
				if (file) {
					res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
					fs.createReadStream(file).pipe(res);
					return;
				}
				if (ASSET_EXT.has(ext)) {
					res.statusCode = 404;
					res.end('not found');
					return;
				}
				serveIndex();
			});
			const port = options.port || 0;
			server.listen(port, options.host || '127.0.0.1', () => {
				const addr = server.address();
				resolve({
					server,
					port: typeof addr === 'object' ? addr.port : port,
					origin: `http://${options.host || '127.0.0.1'}:${typeof addr === 'object' ? addr.port : port}/`,
					close: () => new Promise((r) => server.close(() => r())),
				});
			});
			server.on('error', reject);
		}).catch(reject);
	});
}
