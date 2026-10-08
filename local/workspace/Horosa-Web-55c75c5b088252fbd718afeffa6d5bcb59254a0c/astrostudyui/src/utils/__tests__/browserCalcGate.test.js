import { browserCalculationBlock } from '../browserCalcGate';

describe('browserCalcGate', ()=>{
	const prev = process.env.NODE_ENV;

	afterEach(()=>{
		process.env.NODE_ENV = prev;
	});

	test('jest keeps the real request path', ()=>{
		process.env.NODE_ENV = 'test';
		expect(browserCalculationBlock('http://127.0.0.1:9999/chart')).toBeNull();
	});

	test('browser blocks local calculation and leaves external APIs', ()=>{
		process.env.NODE_ENV = 'production';
		const blocked = browserCalculationBlock('http://127.0.0.1:9999/predict/solarreturn');
		expect(blocked).toMatchObject({
			status: 'UNSUPPORTED',
			provider: 'browser',
			code: 'BROWSER_NO_LOCAL_CALC',
			Result: null,
		});
		expect(browserCalculationBlock('https://api.openai.com/v1/chat/completions')).toBeNull();
	});
});
