import { JingjueBrowserEngine, castJingjue } from '../jingjueBrowser';
import { TaixuanBrowserEngine, qiguaNumber } from '../taixuanBrowser';
import { ShenyiBrowserEngine, scoreShenyiFromPillars } from '../shenyishuBrowser';
import { WuzhaoBrowserEngine, lockKeyGeneral, minuteGanzhi, gangzhiNumbers } from '../wuzhaoBrowser';

describe('cnyibu browser parity', () => {
	test('jingjue seed 42 matches Python Random.sample cast', () => {
		const cast = castJingjue(42);
		expect(cast.divider).toBe(13);
		expect(cast.lowerCut).toBe(1);
		expect(cast.remainders).toEqual([3, 2, 1]);
		expect(cast.key).toBe('321');
		expect(cast.gua.name).toBe('卯');
		const out = JingjueBrowserEngine.calculate({ seed: 42, year: 1990, month: 6, day: 15, hour: 10 });
		expect(out.status).toBe('SUCCESS');
		expect(out.provider).toBe('browser');
		expect(out.result.jingjue.key).toBe('321');
		expect(out.result.sections.length).toBeGreaterThan(0);
		expect(JingjueBrowserEngine.getCapabilities().productionReady).toBe(true);
	});

	test('taixuan seed 42 matches qigua_number', () => {
		const drawn = qiguaNumber(42);
		expect(drawn.zhou).toBe('1232');
		expect(drawn.zhan).toBe(5);
		expect(drawn.digits).toEqual([1, 2, 3, 2]);
		const out = TaixuanBrowserEngine.calculate({
			year: 1990, month: 6, day: 15, hour: 10, seed: 42,
		});
		expect(out.status).toBe('SUCCESS');
		expect(out.result.taixuan.head).toBe('一方二州三部二家');
		expect(out.result.taixuan.xuanHead.number).toBe(17);
		expect(out.result.taixuan.xuanHead.yinYang).toBe('陽');
		expect(out.result.taixuan.period).toBe('旦');
		expect(out.result.taixuan.gua.name).toBe('䎡');
		expect(out.result.taixuan.starLodge.raw).toBe('奎一');
		expect(out.meta.yearsuLength).toBe(365);
		expect(out.result.taixuan.allLines).toHaveLength(9);
		expect(out.result.taixuan.allLines[0].content.length).toBeGreaterThan(0);
	});

	test('shenyi codes follow the vendor jiazi table', () => {
		const scored = scoreShenyiFromPillars({ 年: '甲子', 月: '乙丑', 日: '丙寅', 時: '丁卯' });
		expect(scored.total).toBe(84 + 162 + 10 + 42);
		expect(scored.lianshan).toBe('坤');
		expect(scored.shensha['貴人']).toBe('艮');
		expect(scored.jixiong.score).toEqual(expect.any(Number));
		const missing = scoreShenyiFromPillars({ 年: '丙寅', 月: '丁卯', 日: '戊辰', 時: '己巳' });
		expect(missing.shensha['貴人']).toBeNull();
		const out = ShenyiBrowserEngine.calculate({
			year: 1990, month: 6, day: 15, hour: 10, minute: 30,
		});
		expect(out.status).toBe('SUCCESS');
		expect(out.result.shenyishu.pillars).toHaveLength(4);
		const sum = out.result.shenyishu.pillars.reduce((n, item)=>n + item.code, 0);
		expect(out.result.shenyishu.total).toBe(sum);
	});

	test('wuzhao lock plate and minute pillar match the vendor maps', () => {
		expect(lockKeyGeneral('夏至', '子')).toEqual(['兌', '中', '巽']);
		expect(minuteGanzhi('甲子', 0, 0)).toBe('甲戌');
		expect(gangzhiNumbers(['甲子', '乙丑', '丙寅', '丁卯', '戊辰'], 0)).toEqual([5, 4, 2, 4, 5, 5]);
		const out = WuzhaoBrowserEngine.calculate({
			year: 1990, month: 6, day: 15, hour: 10, minute: 30, mode: 'ganzhi', number: 0,
		});
		expect(out.status).toBe('SUCCESS');
		expect(out.result.positions).toHaveLength(6);
		expect(out.result.ganzhi.minute).toBeTruthy();
		expect(out.result.solarTerm).toBeTruthy();
		const manual = WuzhaoBrowserEngine.calculate({
			year: 1990, month: 6, day: 15, hour: 10, minute: 0, mode: 'tang', manual: true,
			manualSplits: [18, 8, 5, 2, 1, 1], seed: 42,
		});
		expect(manual.status).toBe('SUCCESS');
		expect(manual.result.positions.map((item)=>item.number)).toEqual([3, 3, 5, 2, 1, 1]);
	});
});
