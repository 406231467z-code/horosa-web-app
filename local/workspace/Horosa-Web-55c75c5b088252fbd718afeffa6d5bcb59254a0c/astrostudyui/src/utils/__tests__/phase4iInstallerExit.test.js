const fs = require('fs');
const path = require('path');

function findRepoRoot(start){
	let dir = start;
	for(let i = 0; i < 12; i += 1){
		if(fs.existsSync(path.join(dir, 'START_HERE.bat')) && fs.existsSync(path.join(dir, 'README.md'))){
			return dir;
		}
		const parent = path.dirname(dir);
		if(parent === dir){
			break;
		}
		dir = parent;
	}
	throw new Error('repo root not found from ' + start);
}

describe('phase 4-I installer exit', ()=>{
	const uiRoot = path.join(__dirname, '../../..');
	const repoRoot = findRepoRoot(__dirname);
	const projectRoot = path.join(uiRoot, '..');

	test('the client entry is the browser launcher, not an installer', ()=>{
		const start = fs.readFileSync(path.join(repoRoot, 'START_HERE.bat'), 'utf8');
		expect(start).toContain('Horosa_Local_Windows.bat');
		expect(start).toContain('Does not install Horosa.exe');
		expect(start).not.toContain('Horosa-Setup');
		['README.md', 'README_ZH.md', 'README_EN.md'].forEach((name)=>{
			const text = fs.readFileSync(path.join(repoRoot, name), 'utf8');
			expect(text).not.toContain('Horosa-Setup');
			expect(text).toContain('START_HERE.bat');
		});
	});

	test('Electron is not a frontend dependency and the installer tree is absent', ()=>{
		const pkg = JSON.parse(fs.readFileSync(path.join(uiRoot, 'package.json'), 'utf8'));
		const names = Object.assign({}, pkg.dependencies, pkg.devDependencies);
		expect(names.electron).toBeUndefined();
		expect(names['electron-builder']).toBeUndefined();
		expect(fs.existsSync(path.join(repoRoot, 'desktop_installer_bundle'))).toBe(false);
		const ps1 = fs.readFileSync(path.join(repoRoot, 'local', 'Horosa_Local_Windows.ps1'), 'utf8');
		expect(ps1).toContain('--app=');
		expect(ps1).not.toContain('Horosa-Setup');
		expect(ps1).toContain('Does not install Horosa.exe');
	});

	test('Java and Python backends stay, and production UI does not import electron', ()=>{
		expect(fs.existsSync(path.join(projectRoot, 'astrostudysrv'))).toBe(true);
		expect(fs.existsSync(path.join(projectRoot, 'astropy'))).toBe(true);
		const src = path.join(uiRoot, 'src');
		const hits = [];
		const walk = (dir)=>{
			fs.readdirSync(dir).forEach((name)=>{
				if(name === 'node_modules' || name === '__tests__' || name === '.umi' || name === 'dist' || name === 'dist-file'){
					return;
				}
				const full = path.join(dir, name);
				if(fs.statSync(full).isDirectory()){
					walk(full);
					return;
				}
				if(!/\.(js|jsx|ts|tsx)$/.test(name)){
					return;
				}
				const text = fs.readFileSync(full, 'utf8');
				if(text.indexOf("require('electron')") >= 0 || text.indexOf('require("electron")') >= 0 || text.indexOf("from 'electron'") >= 0 || text.indexOf('from "electron"') >= 0){
					hits.push(path.relative(uiRoot, full));
				}
			});
		};
		walk(src);
		expect(hits).toEqual([]);
	});
});
