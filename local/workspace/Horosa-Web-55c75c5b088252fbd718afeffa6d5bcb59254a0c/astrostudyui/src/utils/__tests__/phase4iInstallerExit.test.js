const fs = require('fs');
const path = require('path');

describe('Web production runtime (post legacy purge)', () => {
	const uiRoot = path.join(__dirname, '../../..');
	const projectRoot = path.join(uiRoot, '..');

	test('no desktop installer / Electron packaging tree in repo', () => {
		const pkg = JSON.parse(fs.readFileSync(path.join(uiRoot, 'package.json'), 'utf8'));
		const names = Object.assign({}, pkg.dependencies, pkg.devDependencies);
		expect(names.electron).toBeUndefined();
		expect(names['electron-builder']).toBeUndefined();
		expect(fs.existsSync(path.join(projectRoot, 'desktop_installer_bundle'))).toBe(false);
		expect(fs.existsSync(path.join(projectRoot, 'START_HERE.bat'))).toBe(false);
	});

	test('Java/Python backend trees removed from workspace project root', () => {
		expect(fs.existsSync(path.join(projectRoot, 'astrostudysrv'))).toBe(false);
		expect(fs.existsSync(path.join(projectRoot, 'astropy'))).toBe(false);
		expect(fs.existsSync(path.join(projectRoot, 'vendor'))).toBe(false);
	});

	test('production UI does not import electron', () => {
		const src = path.join(uiRoot, 'src');
		const hits = [];
		const walk = (dir) => {
			fs.readdirSync(dir).forEach((name) => {
				if (name === 'node_modules' || name === '__tests__' || name === '.umi' || name === 'dist' || name === 'dist-file') {
					return;
				}
				const full = path.join(dir, name);
				if (fs.statSync(full).isDirectory()) {
					walk(full);
					return;
				}
				if (!/\.(js|jsx|ts|tsx)$/.test(name)) {
					return;
				}
				const text = fs.readFileSync(full, 'utf8');
				if (
					/(?:require\s*\(\s*['"]electron|from\s+['"]electron|import\s+[^'"]*['"]electron)/i.test(text)
				) {
					hits.push(path.relative(uiRoot, full));
				}
			});
		};
		walk(src);
		expect(hits).toEqual([]);
	});
});
