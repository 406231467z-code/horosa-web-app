import fs from 'fs';
import path from 'path';
import { calculateChart } from '../../services/astrologyCalculationService';
import { fetchChart } from '../../services/astro';
import { DirectionBrowserEngine } from '../directionBrowser';
import { IndiaBrowserEngine } from '../indiaBrowser';
import { buildLocalBaziResult } from '../baziLunarLocal';
import { fetchPreciseJieqiYear } from '../preciseCalcBridge';
import { HuangJiBrowserEngine } from '../huangjiBrowser';
import { JingjueBrowserEngine } from '../jingjueBrowser';
import { TaixuanBrowserEngine } from '../taixuanBrowser';
import { ShenyiBrowserEngine } from '../shenyishuBrowser';
import { WuzhaoBrowserEngine } from '../wuzhaoBrowser';
import { computeGeomancyReading } from '../geomancyBrowser';
import { buildJinKouData } from '../../components/jinkou/JinKouCalc';
import { buildTimeGua } from '../../components/guazhan/GuaZhanMain';
import { calcZiwei } from '../../components/ziwei/ZiweiCalc';

const ZIWEI_JAVA_COMPAT_OPTS = {
	yearBoundary: 'lunar_1_1',
	ziweiLunarBasis: 'calendar',
	lifeMasterBy: 'year_branch',
};

jest.mock('../../services/astro', () => ({
	fetchChart: jest.fn(async () => ({ ResultCode: 0, Result: { chart: { objects: [] } } })),
}));
jest.mock('../request', () => jest.fn());

const CASES = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '../../../../tests/final-parity/cases.json'), 'utf8'));
const YEARS = CASES.years;

function row(module, input, field, expected, actual, classification){
	const same = expected === actual;
	const delta = expected == null || actual == null ? null : (same ? 0 : 1);
	let status = classification;
	if(classification === 'PASS' || classification === 'FAIL'){
		status = same ? 'PASS' : 'FAIL';
	}
	return { module, input, field, expected, actual, delta, status, classification: status };
}

function birth(year, time, place){
	const p = place || CASES.places[0];
	return {
		date: `${year}/06/15`,
		time,
		zone: p.zone,
		lat: p.lat,
		lon: p.lon,
		hsys: 1,
		zodiacal: 0,
	};
}

describe('final parity corpus', () => {
	test('astrology corpus keeps the browser contract', async () => {
		const rows = [];
		for(const year of YEARS){
			const input = birth(year, '10:30:00');
			const rsp = await calculateChart(input);
			fetchChart.mockClear();
			const again = await calculateChart(input);
			expect(fetchChart).not.toHaveBeenCalled();
			const sun = rsp.Result.chart.objects.find((obj) => obj.id === 'Sun');
			const sun2 = again.Result.chart.objects.find((obj) => obj.id === 'Sun');
			rows.push(row('Astrology', input, 'provider', 'browser', rsp.calculationProvider, 'PASS'));
			rows.push(row('Astrology', input, 'houses', 12, rsp.Result.chart.houses.length, 'PASS'));
			rows.push(row('Astrology', input, 'fixedStars.status', 'LICENSE_BLOCKED', rsp.Result.fixedStars.status, 'PASS'));
			rows.push(row('Astrology', input, 'parans.status', 'NOT_IMPLEMENTED', rsp.Result.parans.status, 'PASS'));
			rows.push(row('Astrology', input, 'sun.lon.repeat', sun.lon, sun2.lon, 'PASS'));
			rows.push({
				module: 'Astrology',
				input,
				field: 'sun.lon',
				expected: null,
				actual: sun.lon,
				delta: null,
				status: 'NOT_COMPARABLE',
				classification: 'NOT_COMPARABLE',
			});
		}
		for(const time of CASES.clocks){
			const input = birth(1990, time);
			const rsp = await calculateChart(input);
			rows.push(row('Astrology', input, 'houses', 12, rsp.Result.chart.houses.length, 'PASS'));
		}
		for(const place of CASES.places){
			const input = birth(1990, '10:30:00', place);
			const rsp = await calculateChart(input);
			rows.push(row('Astrology', input, 'houses', 12, rsp.Result.chart.houses.length, 'PASS'));
		}
		const failed = rows.filter((item) => item.status === 'FAIL');
		expect(failed).toEqual([]);
	});

	test('direction and india compare license state', () => {
		for(const year of YEARS){
			const input = { date: `${year}-06-15`, time: '10:30:00', zone: '+08:00' };
			const direction = DirectionBrowserEngine.calculate(input);
			const india = IndiaBrowserEngine.calculate(input);
			expect(row('Direction', input, 'status', 'LICENSE_REVIEW_REQUIRED', direction.status, 'PASS').status).toBe('PASS');
			expect(row('Direction', input, 'provider', 'browser', direction.provider, 'PASS').status).toBe('PASS');
			expect(direction.message).toContain('/predict/pd');
			expect(row('India', input, 'status', 'LICENSE_REVIEW_REQUIRED', india.status, 'PASS').status).toBe('PASS');
			expect(row('India', input, 'provider', 'browser', india.provider, 'PASS').status).toBe('PASS');
			expect(india.message).toContain('/india/chart');
		}
	});

	test('bazi pillars and published solar-term day pillars', async () => {
		for(const year of YEARS){
			for(const time of ['00:00:00', '10:30:00', '23:00:00', '23:59:00']){
				const input = { date: `${year}-06-15`, time, zone: '+08:00' };
				const built = buildLocalBaziResult(input);
				const again = buildLocalBaziResult(input);
				const fc = built.bazi.fourColumns;
				const fc2 = again.bazi.fourColumns;
				for(const key of ['year', 'month', 'day', 'time']){
					expect(row('Bazi', input, key, fc[key].ganzi, fc2[key].ganzi, 'PASS').status).toBe('PASS');
					expect(fc[key].ganzi).toHaveLength(2);
				}
				const fcNongli = {
					year: fc.year.ganzi,
					time: fc.time.ganzi,
					monthInt: built.bazi.nongli.monthNum,
					dayInt: built.bazi.nongli.dayNum,
				};
				const gua = buildTimeGua(fcNongli);
				expect(gua).toBeTruthy();
				expect(row('Liuyao', input, 'currentGua.repeat', gua.currentGua, buildTimeGua(fcNongli).currentGua, 'PASS').status).toBe('PASS');
			}
		}
		const year = await fetchPreciseJieqiYear({ year: '2026', ad: 1, zone: '+08:00' });
		const byName = {};
		year.jieqi24.forEach((item) => { byName[item.jieqi] = item; });
		expect(row('Bazi', '2026 立春', 'day', '己酉', byName['立春'].bazi.fourColumns.day.ganzi, 'PASS').status).toBe('PASS');
		expect(row('Bazi', '2026 夏至', 'day', '丙寅', byName['夏至'].bazi.fourColumns.day.ganzi, 'PASS').status).toBe('PASS');
		expect(row('Bazi', '2026 冬至', 'day', '甲子', byName['冬至'].bazi.fourColumns.day.ganzi, 'PASS').status).toBe('PASS');
		expect(row('Bazi', '2026 立春', 'time', '2026-02-04 04:02:08', byName['立春'].time, 'PASS').status).toBe('PASS');
	});

	test('ziwei historical grid years stay on the java fixture', () => {
		const grid = JSON.parse(fs.readFileSync(path.join(__dirname, '../../components/ziwei/__tests__/fixtures/ziweiJavaGrid.json'), 'utf8'));
		const wanted = new Set(YEARS.map(String));
		const picked = grid.filter((entry) => wanted.has(String(entry.params.date).slice(0, 4)));
		expect(picked.length).toBeGreaterThan(0);
		for(const entry of picked){
			const birth = {
				date: entry.params.date,
				time: entry.params.time,
				zone: entry.params.zone,
				lon: entry.params.lon,
				lat: entry.params.lat,
				gpsLon: entry.params.gpsLon,
				gpsLat: entry.params.gpsLat,
				ad: 1,
				gender: entry.params.gender,
			};
			const local = calcZiwei(birth, {
				timeAlg: entry.params.timeAlg,
				after23NewDay: entry.params.after23NewDay,
				lateZiHourUseNextDay: entry.params.lateZiHourUseNextDay,
				...ZIWEI_JAVA_COMPAT_OPTS,
			});
			expect(row('Ziwei', entry.params, 'lifeHouseIndex', entry.chart.lifeHouseIndex, local.lifeHouseIndex, 'PASS').status).toBe('PASS');
			expect(row('Ziwei', entry.params, 'bodyHouseIndex', entry.chart.bodyHouseIndex, local.bodyHouseIndex, 'PASS').status).toBe('PASS');
			expect(row('Ziwei', entry.params, 'wuxingJu', entry.chart.wuxingJu, local.wuxingJu, 'PASS').status).toBe('PASS');
		}
	});

	test('cnyibu and huangji stay successful on the year list', () => {
		for(const year of YEARS){
			const input = { year, month: 6, day: 15, hour: 10, minute: 30, historyYear: year, seed: 42 };
			expect(row('HuangJi', input, 'status', 'SUCCESS', HuangJiBrowserEngine.calculate(input).status, 'PASS').status).toBe('PASS');
			expect(row('Jingjue', input, 'status', 'SUCCESS', JingjueBrowserEngine.calculate(input).status, 'PASS').status).toBe('PASS');
			expect(row('Taixuan', input, 'status', 'SUCCESS', TaixuanBrowserEngine.calculate(input).status, 'PASS').status).toBe('PASS');
			expect(row('Shenyi', input, 'status', 'SUCCESS', ShenyiBrowserEngine.calculate(input).status, 'PASS').status).toBe('PASS');
			expect(row('Wuzhao', input, 'status', 'SUCCESS', WuzhaoBrowserEngine.calculate({ ...input, mode: 'ganzhi', number: 0 }).status, 'PASS').status).toBe('PASS');
		}
		const jingjue = JingjueBrowserEngine.calculate({ seed: 42, year: 1990, month: 6, day: 15, hour: 10 });
		expect(row('Jingjue', { seed: 42 }, 'key', '321', jingjue.result.jingjue.key, 'PASS').status).toBe('PASS');
		const taixuan = TaixuanBrowserEngine.calculate({ year: 1990, month: 6, day: 15, hour: 10, seed: 42 });
		expect(row('Taixuan', { seed: 42 }, 'head', '一方二州三部二家', taixuan.result.taixuan.head, 'PASS').status).toBe('PASS');
	});

	test('geomancy seed and jinkou published spirits', () => {
		const geo = computeGeomancyReading({ seedMode: 'manual', seed: 42, castMethod: 'manual' });
		expect(row('Geomancy', { seed: 42 }, 'mothers', 'Albus,Populus,Laetitia,Populus', geo.reading.motherFigures.map((fig) => fig.nameEn).join(','), 'PASS').status).toBe('PASS');
		expect(row('Geomancy', { seed: 42 }, 'judge', 'Populus', geo.reading.judge.nameEn, 'PASS').status).toBe('PASS');
		const gated = computeGeomancyReading({ seed: 42, house_projection: 'real_ephemeris' });
		expect(row('Geomancy', { seed: 42 }, 'ephemeris', 'LICENSE_REVIEW_REQUIRED', gated.reading.ephemeris.status, 'PASS').status).toBe('PASS');
		const pan = buildJinKouData({
			nongli: { dayGanZi: '甲辰', time: '申时', monthGanZi: '丙申' },
			fourColumns: { month: { ganzi: '丙申' } },
			xun: { '旬空': '', '旬首': '' },
			season: { '金': '囚', '木': '旺', '水': '休', '火': '相', '土': '死' },
			gods: {}, godsGan: {}, godsMonth: {}, godsZi: {}, godsYear: { taisui1: {} },
		}, { diFen: '午', zhanShi: '申', guirengType: 0, panShi: 'yin' });
		const by = {};
		pan.yinPan.liushen.forEach((item) => { by[item.wei] = item.name; });
		expect(row('Jinkou', '甲辰', '地分', '青龙', by['地分'], 'PASS').status).toBe('PASS');
		expect(row('Jinkou', '甲辰', '将神', '朱雀', by['将神'], 'PASS').status).toBe('PASS');
		expect(row('Jinkou', '甲辰', '贵神', '勾陈', by['贵神'], 'PASS').status).toBe('PASS');
		expect(row('Jinkou', '甲辰', '人元', '螣蛇', by['人元'], 'PASS').status).toBe('PASS');
	});
});
