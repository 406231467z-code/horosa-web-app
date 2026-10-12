import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..', '..');
function read(relativePath){
	return fs.readFileSync(path.join(SRC, relativePath), 'utf8');
}
function withoutComments(text){
	return text
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.split(/\r?\n/)
		.map((line)=>line.replace(/\/\/.*$/, ''))
		.join('\n');
}

describe('browser-native calculation paths do not fall back to remote services', ()=>{
	test('Qimen main path calculates with calcDunJia and has no Kentang/ServerRoot transport', ()=>{
		const main = withoutComments(read('components/dunjia/DunJiaMain.js'));
		const engine = withoutComments(read('components/dunjia/DunJiaCalc.js'));
		expect(main).toContain('return this.getCachedPan(fields, nongli, options, displaySolarTime)');
		expect(engine).toContain('export function calcDunJia(');
		expect(main).not.toMatch(/fetchQimenPan|normalizeKinqimenData|ServerRoot|cachedKentangFetch|request\s*\(/);
		expect(engine).not.toMatch(/fetchQimenPan|normalizeKinqimenData|ServerRoot|cachedKentangFetch|request\s*\(/);
	});

	test('Taiyi fetch wrapper uses the local TaiYiCore calculator only', ()=>{
		const source = withoutComments(read('components/taiyi/TaiYiCalc.js'));
		expect(source).toContain('return calcTaiyi(fields, nongli, options || {})');
		expect(source).not.toMatch(/ServerRoot|cachedKentangFetch|buildKentangEndpoint|request\s*\(/);
	});

	test('JinKou uses local buildJinKouData and has no remote pan transport', ()=>{
		const main = withoutComments(read('components/jinkou/JinKouMain.js'));
		const engine = withoutComments(read('components/jinkou/JinKouCalc.js'));
		expect(main).toContain('const local = buildJinKouData(liureng');
		expect(engine).toContain('export function buildJinKouData(');
		expect(main).not.toMatch(/fetchJinKouPan|ServerRoot|cachedKentangFetch|request\s*\(/);
		expect(engine).not.toMatch(/fetchJinKouPan|ServerRoot|cachedKentangFetch|request\s*\(/);
	});

	test('LiuReng gods use local tables and explicitly reject unsupported dates', ()=>{
		const source = withoutComments(read('utils/liurengGodsLocal.js'));
		expect(source).toContain('const local = buildLocalLiureng(params)');
		expect(source).toContain('仅支持公元 1–9999 年');
		expect(source).not.toMatch(/ServerRoot|request\s*\(/);
	});

	test('Ziwei birth calculation has no remote birth endpoint fallback', ()=>{
		const source = withoutComments(read('utils/ziweiBirthLocal.js'));
		expect(source).toContain('const local = localZiweiBirthEnvelope(params)');
		expect(source).toContain('未请求远程服务');
		expect(source).not.toMatch(/ServerRoot|request\s*\(|cachedPost|\/ziwei\/birth/);
	});
});
