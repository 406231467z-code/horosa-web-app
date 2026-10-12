// fetchByFields:纯前端 chartFree 页面不得发送共享 /chart 请求。
// 本组手摇 generator 验证指令序，避免未来优化回归时重新引入隐藏后端依赖。
import model from '../astro';
import { select, call, put } from 'redux-saga/effects';

const fetchByFields = model.effects.fetchByFields;

function mkFields(){
	const dt = { ad: 1, zone: '+08:00', format: (f) => (f === 'YYYY/MM/DD' ? '2026/07/15' : '20:00:00'), clone(){ return this; } };
	const v = (x) => ({ value: x });
	return {
		cid: v(null), date: { value: dt }, time: { value: dt },
		lat: v('26n04'), lon: v('119e19'), gpsLat: v(26.07), gpsLon: v(119.31),
		hsys: v(1), southchart: v(0), zodiacal: v(0), tradition: v(false),
		doubingSu28: v(0), strongRecption: v(false), simpleAsp: v(false),
		virtualPointReceiveAsp: v(true), predictive: v(true), pdaspects: v('[]'),
		name: v('测'), pos: v(''),
	};
}
function mkState({ chartFree } = {}){
	return {
		predictHook: { bazi: { fun: () => {}, ...(chartFree ? { chartFree: true } : {}) } },
		currentTab: 'bazi',
		currentSubTab: null,
		chartObj: { chartId: 'OLD', params: {} },
	};
}
const RSP = { Result: { params: {}, chart: { ok: 1 } } };

function crank(gen, { state, rsp }){
	const effects = [];
	let step = gen.next();
	while(!step.done){
		const eff = step.value || {};
		if(eff.SELECT){
			step = gen.next(eff.SELECT.selector({ astro: state }, ...(eff.SELECT.args || [])));
		}else if(eff.CALL){
			effects.push({ CALL: true });
			step = gen.next(rsp);
		}else if(eff.PUT){
			effects.push(eff.PUT.action);
			step = gen.next();
		}else{
			step = gen.next();
		}
	}
	return effects;
}

test('redux-saga effect 真形与 crank 假设一致', () => {
	expect(typeof select((s) => s).SELECT.selector).toBe('function');
	expect(call(() => {}).CALL).toBeTruthy();
	expect(put({ type: 'x' }).PUT.action.type).toBe('x');
});

afterEach(() => { window.localStorage.removeItem('horosa.perf.fieldsFastCommit'); });

describe('chartFree 本地页：计算/钩子运行，不调用共享 /chart', () => {
	test('提交 fields → doHook，不发网络请求，不伪造 chartObj', () => {
		const gen = fetchByFields({ payload: mkFields() }, { call, put, select });
		const effects = crank(gen, { state: mkState({ chartFree: true }), rsp: RSP });
		const kinds = effects.map((p) => (p.CALL ? 'CALL' : `${p.type}:${Object.keys(p.payload).sort().join(',')}`));
		expect(kinds).toEqual(['save:fields', 'doHook:chartObj,fields']);
		expect(effects.some((p) => p.CALL)).toBe(false);
		const doHook = effects.find((p) => p.type === 'doHook');
		expect(doHook.payload.chartObj.chartId).toBe('OLD');
		expect(effects.some((p) => p.type === 'save' && Object.prototype.hasOwnProperty.call(p.payload || {}, 'chartObj'))).toBe(false);
	});

	test('共享后端不可用时，本地 fields 仍提交且不弹 chart 服务错误', () => {
		const gen = fetchByFields({ payload: mkFields() }, { call, put, select });
		const effects = crank(gen, { state: mkState({ chartFree: true }), rsp: undefined });
		expect(effects.map((p) => (p.CALL ? 'CALL' : p.type))).toEqual(['save', 'doHook']);
		expect(effects.some((p) => p.CALL)).toBe(false);
	});

	test('关闭 fieldsFastCommit 优化后，chartFree 仍保持无网络路径', () => {
		window.localStorage.setItem('horosa.perf.fieldsFastCommit', '0');
		const gen = fetchByFields({ payload: mkFields() }, { call, put, select });
		const effects = crank(gen, { state: mkState({ chartFree: true }), rsp: RSP });
		expect(effects.map((p) => (p.CALL ? 'CALL' : p.type))).toEqual(['save', 'doHook']);
		expect(effects.some((p) => p.CALL)).toBe(false);
	});
});

describe('共享 chartObj 的页面：继续显式标记为尚未迁移的后端计算路径', () => {
	test('非 chartFree 页面仍调用当前计算器并原子提交结果', () => {
		const gen = fetchByFields({ payload: mkFields() }, { call, put, select });
		const effects = crank(gen, { state: mkState({}), rsp: RSP });
		const kinds = effects.map((p) => (p.CALL ? 'CALL' : `${p.type}:${Object.keys(p.payload).sort().join(',')}`));
		expect(kinds).toEqual(['CALL', 'save:chartObj,fields', 'doHook:chartObj,fields']);
	});
});
