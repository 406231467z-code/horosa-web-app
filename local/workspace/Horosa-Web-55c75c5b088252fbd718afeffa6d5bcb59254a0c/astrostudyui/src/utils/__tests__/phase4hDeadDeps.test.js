const fs = require('fs');
const path = require('path');

const REMOVED = ['fastclick', 'qrcode.react', 'mammoth', 'print-js'];
const KEPT = ['d3', 'lunar-javascript', 'docx', 'pdf-lib', '@monaco-editor/react', '@amap/amap-jsapi-loader', 'node-forge', 'js-rsa'];

describe('phase 4-H dead dependency removal', ()=>{
	test('removed packages are absent and KEEP packages stay', ()=>{
		const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf8'));
		const deps = pkg.dependencies || {};
		REMOVED.forEach((name)=>{
			expect(deps[name]).toBeUndefined();
		});
		KEPT.forEach((name)=>{
			expect(deps[name]).toBeTruthy();
		});
		expect((pkg.devDependencies || {})['puppeteer-core']).toBeTruthy();
	});

	test('helper no longer imports print-js', ()=>{
		const helper = fs.readFileSync(path.join(__dirname, '../helper.js'), 'utf8');
		expect(helper).not.toContain('print-js');
		expect(helper).not.toContain('printArea');
	});

	test('production sources do not name the removed packages or printArea', ()=>{
		const roots = [
			path.join(__dirname, '../..'),
			path.join(__dirname, '../../../scripts'),
		];
		const needles = ['fastclick', 'qrcode.react', 'mammoth', 'print-js', 'printJS', 'printArea'];
		const hits = [];
		const walk = (dir)=>{
			if(!fs.existsSync(dir)){
				return;
			}
			fs.readdirSync(dir).forEach((name)=>{
				if(name === 'node_modules' || name === '__tests__' || name === '.umi' || name === 'dist' || name === 'dist-file'){
					return;
				}
				const full = path.join(dir, name);
				const st = fs.statSync(full);
				if(st.isDirectory()){
					walk(full);
					return;
				}
				if(!/\.(js|jsx|ts|tsx|less|ejs)$/.test(name)){
					return;
				}
				const text = fs.readFileSync(full, 'utf8');
				needles.forEach((needle)=>{
					if(text.indexOf(needle) >= 0){
						hits.push(`${path.relative(path.join(__dirname, '../../..'), full)} :: ${needle}`);
					}
				});
			});
		};
		roots.forEach(walk);
		expect(hits).toEqual([]);
	});

	test('chart modules do not import printArea', ()=>{
		const circle = fs.readFileSync(path.join(__dirname, '../../components/astro/AstroChartCircle.js'), 'utf8');
		const reng = fs.readFileSync(path.join(__dirname, '../../components/lrzhan/RengChart.js'), 'utf8');
		expect(circle).not.toContain('printArea');
		expect(reng).not.toContain('printArea');
		expect(circle).toContain('distanceInCircleAbs');
		expect(reng).toContain('formatDate');
	});
});
