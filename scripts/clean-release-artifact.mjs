#!/usr/bin/env node
/**
 * CLEAN_RELEASE_BUILD — copy validated production dist only (no workspace runtime).
 * Does not alter build-info; reads build-info.json from source dist as-is.
 */
import fs from 'node:fs';
import path from 'node:path';

const UI = path.resolve('local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui');
const SRC_DIST = path.join(UI, 'dist');
const SRC_FILE = path.join(UI, 'dist-file');
const OUT = path.resolve('release/CLEAN_RELEASE_BUILD');

const FORBIDDEN = /\.(exe|jar|msi|dmg|deb|rpm)$/i;
const FORBIDDEN_NAME = /(electron|nsis|Horosa\.exe|python|jdk|jre)/i;

function copyTree(src, dest) {
	fs.mkdirSync(dest, { recursive: true });
	for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
		const from = path.join(src, ent.name);
		const to = path.join(dest, ent.name);
		if (ent.isDirectory()) copyTree(from, to);
		else fs.copyFileSync(from, to);
	}
}

/** Mirror dist-root chunks into /static for hosts that only expose publicPath prefix. */
function mirrorWebStaticAssets(distDir) {
	const indexPath = path.join(distDir, 'index.html');
	if (!fs.existsSync(indexPath)) return 0;
	const html = fs.readFileSync(indexPath, 'utf8');
	if (!html.includes('/static/umi.')) return 0;
	const staticDir = path.join(distDir, 'static');
	fs.mkdirSync(staticDir, { recursive: true });
	let copied = 0;
	for (const ent of fs.readdirSync(distDir, { withFileTypes: true })) {
		if (!ent.isFile() || !/\.(js|css|map|json|png|jpe?g|svg|woff2?|ico)$/i.test(ent.name)) continue;
		const target = path.join(staticDir, ent.name);
		if (!fs.existsSync(target)) {
			fs.copyFileSync(path.join(distDir, ent.name), target);
			copied += 1;
		}
	}
	return copied;
}

function scan(dir) {
	const hits = [];
	function walk(d) {
		for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
			const p = path.join(d, ent.name);
			if (ent.isDirectory()) walk(p);
			else if (FORBIDDEN.test(ent.name) || FORBIDDEN_NAME.test(ent.name)) hits.push(p);
		}
	}
	walk(dir);
	return hits;
}

function main() {
	if (!fs.existsSync(path.join(SRC_DIST, 'index.html'))) {
		console.error(JSON.stringify({ status: 'FAIL', reason: 'dist missing — run npm run build in astrostudyui' }));
		process.exit(1);
	}
	if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
	fs.mkdirSync(OUT, { recursive: true });
	copyTree(SRC_DIST, path.join(OUT, 'dist-web'));
	const mirrored = mirrorWebStaticAssets(path.join(OUT, 'dist-web'));
	if (fs.existsSync(path.join(SRC_FILE, 'index.html'))) {
		copyTree(SRC_FILE, path.join(OUT, 'dist-file'));
	}
	const forbidden = [...scan(path.join(OUT, 'dist-web')), ...(fs.existsSync(path.join(OUT, 'dist-file')) ? scan(path.join(OUT, 'dist-file')) : [])];
	const buildInfoPath = path.join(OUT, 'dist-web', 'build-info.json');
	let buildInfo = null;
	if (fs.existsSync(buildInfoPath)) {
		buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
	}
	const manifest = {
		createdAt: new Date().toISOString(),
		sourceCommit: buildInfo && buildInfo.commit,
		buildInfoDirty: buildInfo && buildInfo.dirty,
		buildInfoDirtyCount: buildInfo && buildInfo.dirtyCount,
		mirroredStaticAssets: mirrored,
		forbiddenHits: forbidden,
		status: forbidden.length === 0 ? 'PASS' : 'FAIL',
	};
	fs.writeFileSync(path.join(OUT, 'RELEASE_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);
	console.log(JSON.stringify(manifest));
	process.exitCode = manifest.status === 'PASS' ? 0 : 1;
}

main();
