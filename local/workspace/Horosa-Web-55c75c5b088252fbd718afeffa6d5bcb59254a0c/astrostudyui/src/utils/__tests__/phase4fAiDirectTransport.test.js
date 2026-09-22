jest.mock('js-rsa', ()=>({
	__esModule: true,
	default: {
		RSAKeyPair: function RSAKeyPair(){ this.fake = true; },
		encryptedString: ()=>'RSAENC-PHASE4F',
		RSAAPP: { PKCS1Padding: 1, RawEncoding: 2 },
	},
}));

import { sealAiProxyBody } from '../../services/aianalysis';
import {
	AI_TRANSPORT_DIRECT,
	AI_TRANSPORT_PROXY,
	bodyHasSecret,
	buildAiTransportPlan,
	createVendorSseBridge,
	extractDirectChatContent,
} from '../aiDirectTransport';

const SECRET = 'sk-phase4f-DO-NOT-LEAK';

function sample(transport){
	return {
		providerType: 'deepseek',
		apiKey: SECRET,
		baseUrl: 'https://api.deepseek.com',
		model: 'deepseek-chat',
		messages: [{ role: 'user', content: '问日主' }],
		providerOptions: {
			aiTransport: transport,
			temperature: 0.2,
			requestTimeoutMs: 120000,
		},
	};
}

describe('phase 4-F AI transport', ()=>{
	test('default stays on the Java proxy and still carries the key for that proxy', ()=>{
		const plan = buildAiTransportPlan(sample(undefined), { stream: true });
		expect(plan.mode).toBe(AI_TRANSPORT_PROXY);
		expect(plan.sealForJava).toBe(true);
		expect(plan.vendor).toBeNull();
		expect(plan.proxyValues.apiKey).toBe(SECRET);
		expect(plan.proxyValues.providerOptions.aiTransport).toBeUndefined();
		expect(plan.proxyValues.providerOptions.temperature).toBe(0.2);
	});

	test('proxy wire body is sealed and does not contain the raw key', ()=>{
		const plan = buildAiTransportPlan(sample(AI_TRANSPORT_PROXY));
		const plain = JSON.stringify(plan.proxyValues);
		expect(plain).toContain(SECRET);
		const sealed = sealAiProxyBody(plain);
		expect(sealed).not.toBe(plain);
		expect(sealed.indexOf(SECRET)).toBe(-1);
		const parts = sealed.split(',');
		expect(parts.length).toBeGreaterThanOrEqual(2);
		expect(parts[0].length).toBeGreaterThan(0);
		expect(parts[1].length).toBeGreaterThan(0);
	});

	test('direct chat posts to the vendor and keeps the key out of the body', ()=>{
		const plan = buildAiTransportPlan(sample(AI_TRANSPORT_DIRECT), { stream: true });
		expect(plan.mode).toBe(AI_TRANSPORT_DIRECT);
		expect(plan.sealForJava).toBe(false);
		expect(plan.vendor.url).toBe('https://api.deepseek.com/chat/completions');
		expect(plan.vendor.url).not.toContain('127.0.0.1:9999');
		expect(plan.vendor.headers.Authorization).toBe(`Bearer ${SECRET}`);
		expect(bodyHasSecret(plan.vendor.body, SECRET)).toBe(false);
		expect(plan.vendor.body.stream).toBe(true);
		expect(plan.vendor.body.temperature).toBe(0.2);
		expect(plan.vendor.body.aiTransport).toBeUndefined();
		expect(plan.vendor.body.requestTimeoutMs).toBeUndefined();
	});

	test('anthropic direct uses x-api-key and typed text blocks', ()=>{
		const plan = buildAiTransportPlan({
			providerType: 'anthropic',
			apiKey: SECRET,
			baseUrl: 'https://api.anthropic.com',
			model: 'claude-haiku-4-5-20251001',
			messages: [
				{ role: 'system', content: '系统' },
				{ role: 'user', content: '问' },
			],
			providerOptions: { aiTransport: 'direct', max_tokens: 1024 },
		}, { stream: false });
		expect(plan.vendor.url).toBe('https://api.anthropic.com/v1/messages');
		expect(plan.vendor.headers['x-api-key']).toBe(SECRET);
		expect(plan.vendor.headers.Authorization).toBeUndefined();
		expect(bodyHasSecret(plan.vendor.body, SECRET)).toBe(false);
		expect(plan.vendor.body.system).toBe('系统');
		expect(plan.vendor.body.messages[0].content[0]).toEqual({ type: 'text', text: '问' });
	});

	test('gemini direct puts the key in the query and not in the body', ()=>{
		const plan = buildAiTransportPlan({
			providerType: 'gemini',
			apiKey: SECRET,
			baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
			model: 'gemini-2.5-flash',
			messages: [{ role: 'user', content: '问' }],
			providerOptions: { aiTransport: 'direct' },
		}, { stream: true });
		expect(plan.vendor.url).toContain('streamGenerateContent');
		expect(plan.vendor.url).toContain(`key=${encodeURIComponent(SECRET)}`);
		expect(plan.vendor.headers.Authorization).toBeUndefined();
		expect(bodyHasSecret(plan.vendor.body, SECRET)).toBe(false);
		expect(plan.vendor.body.contents[0].role).toBe('user');
	});

	test('openai stream frames become delta and reasoning events', ()=>{
		const bridge = createVendorSseBridge('openai-compatible');
		const chunk = 'data: {"choices":[{"delta":{"reasoning_content":"想","content":"答"}}]}\n\n';
		const text = bridge.push(chunk);
		expect(text).toContain('event: reasoning');
		expect(text).toContain('"reasoning":"想"');
		expect(text).toContain('event: delta');
		expect(text).toContain('"delta":"答"');
	});

	test('direct non-stream content extract ignores the key field', ()=>{
		const content = extractDirectChatContent('openai-compatible', {
			choices: [{ message: { content: '盘面' } }],
			apiKey: SECRET,
		});
		expect(content).toBe('盘面');
	});
});
