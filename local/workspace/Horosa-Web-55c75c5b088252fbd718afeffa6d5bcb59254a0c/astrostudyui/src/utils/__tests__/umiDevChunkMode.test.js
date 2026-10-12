const fs = require('fs');
const path = require('path');

describe('mobile LAN development chunk mode', ()=>{
	test('Umi runner explicitly marks dev mode even when the parent shell has NODE_ENV=production', ()=>{
		const root = path.resolve(__dirname, '../../../');
		const runner = fs.readFileSync(path.join(root, 'scripts/umi-runner.js'), 'utf8');
		const config = fs.readFileSync(path.join(root, '.umirc.js'), 'utf8');

		expect(runner).toContain("HOROSA_UMI_MODE: mode === 'dev' ? 'development' : 'production'");
		expect(config).toContain("process.env.HOROSA_UMI_MODE === 'development'");
		expect(config).toContain("dynamicImport: isDevelopment ? false : {}");
	});

	test('production builds retain route-level dynamic imports', ()=>{
		const root = path.resolve(__dirname, '../../../');
		const config = fs.readFileSync(path.join(root, '.umirc.js'), 'utf8');
		expect(config).toContain("process.env.NODE_ENV === 'development'");
		expect(config).toContain("dynamicImport: isDevelopment ? false : {}");
	});
});
