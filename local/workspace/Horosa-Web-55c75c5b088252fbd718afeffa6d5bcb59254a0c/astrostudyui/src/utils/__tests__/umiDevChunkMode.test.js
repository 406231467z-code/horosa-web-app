const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadUmiConfig(env){
	const root = path.resolve(__dirname, '../../../');
	const configPath = path.join(root, '.umirc.js');
	const source = fs.readFileSync(configPath, 'utf8').replace('export default', 'module.exports =');
	const module = { exports: {} };
	vm.runInNewContext(source, {
		module,
		exports: module.exports,
		process: { env: env || {} },
	}, { filename: configPath });
	return module.exports;
}

describe('mobile LAN development chunk mode', ()=>{
	test('runner explicitly communicates dev mode to Umi', ()=>{
		const root = path.resolve(__dirname, '../../../');
		const runner = fs.readFileSync(path.join(root, 'scripts/umi-runner.js'), 'utf8');
		expect(runner).toContain("HOROSA_UMI_MODE: mode === 'dev' ? 'development' : 'production'");
	});

	test('development disables route chunks even if the parent shell sets NODE_ENV=production', ()=>{
		const config = loadUmiConfig({ NODE_ENV: 'production', HOROSA_UMI_MODE: 'development' });
		expect(config.dynamicImport).toBe(false);
		expect(config.publicPath).toBe('/');
	});

	test('direct Umi development invocation still disables route chunks', ()=>{
		const config = loadUmiConfig({ NODE_ENV: 'development' });
		expect(config.dynamicImport).toBe(false);
	});

	test('production mode stays production when the parent shell sets NODE_ENV=development', ()=>{
		const config = loadUmiConfig({ NODE_ENV: 'development', HOROSA_UMI_MODE: 'production' });
		expect(config.dynamicImport).toEqual({});
		expect(config.publicPath).toBe('/static/');
	});

	test('production keeps route-level dynamic imports and the production asset path', ()=>{
		const config = loadUmiConfig({ NODE_ENV: 'production', HOROSA_UMI_MODE: 'production' });
		expect(config.dynamicImport).toEqual({});
		expect(config.publicPath).toBe('/static/');
	});
});
