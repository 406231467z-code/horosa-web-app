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
	test('main natal chart routes through the local engine while retained other tabs keep their own route', ()=>{
		const model = withoutComments(read('models/astro.js'));
		const service = withoutComments(read('services/astro.js'));
		expect(model).toContain("canonicalizeTabKey(state.currentTab) === 'astrochart'");
		expect(model).toContain('opts.browserNative = true');
		expect(service).toContain("if(opts.browserNative === true)");
		expect(service).toContain("import('../utils/browserChartEngine')");
	});

	test('AI analysis transport is browser-to-provider only, including legacy proxy profiles', ()=>{
		const transport = withoutComments(read('utils/aiDirectTransport.js'));
		const service = withoutComments(read('services/aianalysis.js'));
		const settings = withoutComments(read('components/aianalysis/AIAnalysisMain.js'));
		expect(transport).toContain('const mode = AI_TRANSPORT_DIRECT');
		expect(transport).not.toMatch(/mode:\s*AI_TRANSPORT_PROXY|proxyValues:\s*stripAiTransport/);
		expect(service).toContain('fetch(plan.url, {');
		expect(service).toContain('fetch(vendor.url, {');
		expect(service).not.toMatch(/ServerRoot|\/aianalysis\/(chat|chat\/stream|diagnose|providers\/models|embeddings|materials\/extract)/);
		expect(settings).toContain("aiTransport: 'direct'");
		expect(settings).toContain("providerOptions.aiTransport = 'direct'");
		expect(settings).not.toContain('经本机 Java 代理');
		expect(settings).toContain('浏览器跨域访问（CORS）设置');
	});

	test('Qimen main path calculates with calcDunJia and has no Kentang/ServerRoot transport', ()=>{
		const main = withoutComments(read('components/dunjia/DunJiaMain.js'));
		const engine = withoutComments(read('components/dunjia/DunJiaCalc.js'));
		expect(main).toContain('return this.getCachedPan(fields, nongli, options, displaySolarTime)');
		expect(engine).toContain('export function calcDunJia(');
		expect(main).not.toMatch(/\bfetchQimenPan\b|normalizeKinqimenData|ServerRoot|cachedKentangFetch|request\s*\(/);
		expect(engine).not.toMatch(/\bfetchQimenPan\b|normalizeKinqimenData|ServerRoot|cachedKentangFetch|request\s*\(/);
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
		expect(source).toContain('仅支持公元');
		expect(source).not.toMatch(/ServerRoot|request\s*\(/);
	});

	test('Ziwei birth calculation has no remote birth endpoint fallback', ()=>{
		const source = withoutComments(read('utils/ziweiBirthLocal.js'));
		expect(source).toContain('const local = localZiweiBirthEnvelope(params)');
		expect(source).toContain('未请求远程服务');
		expect(source).not.toMatch(/ServerRoot|request\s*\(|cachedPost|\/ziwei\/birth/);
	});

	test('precise calendar bridge only computes locally and rejects unsupported domains', ()=>{
		const source = withoutComments(read('utils/preciseCalcBridge.js'));
		expect(source).toContain('buildLocalNongliFallback(reqParams)');
		expect(source).toContain('buildLocalJieqiYearFallback(reqParams)');
		expect(source).not.toMatch(/ServerRoot|request\s*\(|\/nongli\/time|\/jieqi\/year/);
	});

	test('divination time bridge does not fetch historical month/jieqi tables from Kentang', ()=>{
		const source = withoutComments(read('utils/divinationTimeDraft.js'));
		expect(source).toContain('export function deriveNongliUniversalSync(fields)');
		expect(source).not.toMatch(/cachedKentangFetch|buildKentangEndpoint|postJieqi\s*\(/);
	});

	test('JinKou run-year is derived locally and no longer imports request transport', ()=>{
		const source = withoutComments(read('components/jinkou/JinKouMain.js'));
		expect(source).toContain('calcRunYearLocal(');
		expect(source).toContain('setLiurengRunyearLocalCache(runyearKey, clonePlain(result))');
		expect(source).not.toMatch(/request\s*\(|Constants\.ServerRoot/);
	});

	test('standalone LiuReng run-year is also browser-local', ()=>{
		const source = withoutComments(read('components/lrzhan/LiuRengMain.js'));
		expect(source).toContain('calcRunYearLocal(');
		expect(source).toContain('setLiurengRunyearLocalCache(runyearKey, clonePlain(result))');
		expect(source).not.toMatch(/request\s*\(|Constants\.ServerRoot/);
	});
});
