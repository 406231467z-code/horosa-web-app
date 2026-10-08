import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const git = process.env.GIT_EXE || 'git';

function sh(cmd) {
	try {
		return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
	} catch (err) {
		return '';
	}
}

function classify(rel) {
	const n = rel.replace(/\\/g, '/');
	if (/^local\/runtime\//.test(n)) return 'RUNTIME';
	if (/node_modules/.test(n)) return 'RUNTIME';
	if (/^experiments\//.test(n)) return 'EXPERIMENT';
	if (/^(dist|dist-file)(\/|$)/.test(n) || /\/dist\//.test(n) || /\/dist-file\//.test(n)) return 'GENERATED';
	if (/^tests\/final-parity\/.*\.json$/.test(n)) return 'GENERATED';
	if (/^docs\//.test(n)) return 'DOC';
	if (/^tests\//.test(n) || /__tests__\//.test(n) || /\.test\.(js|jsx)$/.test(n)) return 'TEST';
	if (/^local\/workspace\/.*\/astrostudyui\/src\//.test(n)) return 'SOURCE';
	if (/\.(md|MD)$/.test(n)) return 'DOC';
	if (/\.(jar|exe|msi|dll)$/i.test(n)) return 'LEGACY';
	return 'SOURCE';
}

const dirtyRaw = sh(`"${git}" status --short`);
const dirty = dirtyRaw ? dirtyRaw.split('\n').filter(Boolean).map((line) => line.slice(3)) : [];
const untrackedRaw = sh(`"${git}" ls-files --others --exclude-standard`);
const untracked = untrackedRaw ? untrackedRaw.split('\n').filter(Boolean) : [];

const buckets = {};
function add(bucket, file) {
	if (!buckets[bucket]) buckets[bucket] = [];
	if (buckets[bucket].length < 5000) buckets[bucket].push(file);
}

dirty.forEach((f) => add(classify(f), f));
untracked.forEach((f) => add(classify(f), f));

const summary = Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length]));
const nodeModulesUntracked = untracked.filter((f) => f.includes('node_modules')).length;

const releaseStagingPass = nodeModulesUntracked === 0 && !untracked.some((f) => /experiments\/.*\/node_modules/.test(f.replace(/\\/g, '/')));

const out = {
	root: ROOT,
	dirtyCount: dirty.length,
	untrackedCount: untracked.length,
	untrackedNodeModules: nodeModulesUntracked,
	summary,
	releaseStagingPass,
	releaseStaging: {
		ship: ['release/CLEAN_RELEASE_BUILD/dist-web', 'release/CLEAN_RELEASE_BUILD/dist-file', 'RELEASE_MANIFEST.json'],
		localOnly: ['dirty tracked SOURCE (commit or stash before publish)', 'experiments/', 'local/runtime', 'tests/final-parity/*.json'],
		exclude: ['experiments/**/node_modules', 'local/runtime', 'Java/Python/vendor trees', 'Electron/NSIS/exe artifacts'],
	},
	note: nodeModulesUntracked > 0
		? 'Untracked node_modules under experiments/ — add experiments/.gitignore (node_modules) so release audit is not dominated by install artifacts.'
		: '',
};

const outPath = path.resolve('tests/final-parity/release-tree-audit.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({
	dirty: out.dirtyCount,
	untracked: out.untrackedCount,
	untrackedNodeModules: out.untrackedNodeModules,
	releaseStagingPass: out.releaseStagingPass,
	summary: out.summary,
}));
