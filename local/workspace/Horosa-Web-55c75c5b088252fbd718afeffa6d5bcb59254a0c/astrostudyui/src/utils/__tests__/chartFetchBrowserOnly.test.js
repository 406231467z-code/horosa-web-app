jest.mock('../constants', () => ({
	isBrowserOnlyEnv: () => true,
}));

import { fetchChartWithRetry } from '../chartFetch';

describe('chartFetch pure browser guard', () => {
	let originalFetch;

	beforeEach(() => {
		originalFetch = global.fetch;
		global.fetch = jest.fn();
	});

	afterEach(() => {
		global.fetch = originalFetch;
		jest.clearAllMocks();
	});

	test('rejects an unmigrated chart endpoint before calling fetch', async () => {
		await expect(fetchChartWithRetry('http://127.0.0.1:8899/qimen/pan', {
			method: 'POST',
			body: JSON.stringify({ date: '2000-01-01' }),
		})).rejects.toMatchObject({
			code: 'HOROSA_BROWSER_CALC_NOT_MIGRATED',
		});

		expect(global.fetch).not.toHaveBeenCalled();
	});

	test('does not expose a fallback response as a successful calculation', async () => {
		await expect(fetchChartWithRetry('/taiyi/pan', {})).rejects.toThrow(
			'未请求后端，也未生成结果',
		);
		expect(global.fetch).not.toHaveBeenCalled();
	});
});
