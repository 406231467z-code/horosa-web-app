jest.mock('../request', ()=>jest.fn());

import request from '../request';
import { ziweirulesCached, clearZiweiRulesCache } from '../../services/rules';
import { getZiweiRulesEnvelope } from '../ziweiRulesLocal';

describe('ziweirulesCached 前端静态规则', ()=>{
	beforeEach(()=>{
		request.mockReset();
		clearZiweiRulesCache();
		window.localStorage.clear();
	});

	it('相同 body 复用本地静态规则缓存，不发送 HTTP 请求', async ()=>{
		const a = await ziweirulesCached({});
		const b = await ziweirulesCached({});
		expect(a).toBe(b);
		expect(a).toEqual(getZiweiRulesEnvelope());
		expect(request).not.toHaveBeenCalled();
	});

	it('并发首次读取共享同一个本地 Promise', async ()=>{
		const [a, b] = await Promise.all([
			ziweirulesCached({}),
			ziweirulesCached({}),
		]);
		expect(a).toBe(b);
		expect(a.Result.ZWRules).toBeDefined();
		expect(request).not.toHaveBeenCalled();
	});

	it('静态规则表可直接使用且包含四化规则', async ()=>{
		const data = await ziweirulesCached({});
		expect(data.Result.ZWRules).toBeDefined();
		expect(data.Result.ZWRuleSihua).toBeDefined();
		expect(request).not.toHaveBeenCalled();
	});

	it('按 body 分键缓存，不同参数不会复用同一个 envelope', async ()=>{
		const a = await ziweirulesCached({});
		const b = await ziweirulesCached({ school: 'x' });
		expect(a).not.toBe(b);
		expect(a.Result.ZWRules).toBe(b.Result.ZWRules);
		expect(request).not.toHaveBeenCalled();
	});

	it('clearZiweiRulesCache 使下次读取重新创建 envelope', async ()=>{
		const a = await ziweirulesCached({});
		clearZiweiRulesCache();
		const b = await ziweirulesCached({});
		expect(a).not.toBe(b);
		expect(request).not.toHaveBeenCalled();
	});

	it('kill-switch 关闭缓存时仍只读取本地数据', async ()=>{
		window.localStorage.setItem('horosa.perf.ziweiRulesCache', '0');
		const a = await ziweirulesCached({});
		const b = await ziweirulesCached({});
		expect(a).not.toBe(b);
		expect(a.Result).toEqual(b.Result);
		expect(request).not.toHaveBeenCalled();
	});
});
