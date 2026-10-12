import fs from 'fs';
import path from 'path';

const SRC_ROOT = path.join(__dirname, '..', '..');

function readSrc(relativePath){
	return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

function stripComments(source){
	return source
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.split(/\r?\n/)
		.map((line)=>line.replace(/\/\/.*$/, ''))
		.join('\n');
}

describe('browser bootstrap is independent of legacy startup APIs', ()=>{
	test('initializes a local workspace without cloud account or server clock calls', ()=>{
		const model = stripComments(readSrc('models/app.js'));
		expect(model).toContain("type: 'initializeLocalWorkspace'");
		expect(model).not.toMatch(/type:\s*['"]checkUser['"]/);
		expect(model).not.toMatch(/type:\s*['"]getSysTime['"]/);
		expect(model).not.toMatch(/appService\.(checkUser|systime)\b/);
	});

	test('cloud-account and reader wrappers do not contain HTTP service URLs', ()=>{
		const services = [
			readSrc('services/app.js'),
			readSrc('services/user.js'),
		].join('\n');
		expect(services).not.toMatch(/\$\{ServerRoot\}\/user\//);
		expect(services).not.toMatch(/\$\{ServerRoot\}\/common\/time/);
		expect(services).not.toMatch(/\$\{ServerRoot\}\/astroreader\//);
	});

	test('Ziwei rules are read from frontend assets, not the request helper', ()=>{
		const model = readSrc('models/rules.js');
		const service = readSrc('services/rules.js');
		expect(model).toContain('getZiweiRulesEnvelope');
		expect(service).toContain('getZiweiRulesEnvelope');
		expect(service).not.toMatch(/import\s+request\s+from/);
	});

	test('Umi development config does not proxy API paths to Java/Python', ()=>{
		const config = stripComments(readSrc('../.umirc.js'));
		expect(config).not.toContain("'/backend'");
		expect(config).not.toContain("'/chart-service'");
	});
});
