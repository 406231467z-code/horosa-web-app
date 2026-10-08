import { calcDunJia } from '../../components/dunjia/DunJiaCalc';
import { getYueJiangByMethod } from '../../components/lrzhan/LiuRengMain';
import { applyTaiyiSchool } from '../../components/taiyi/core/taiyiSchool';
import { buildLocalBaziResult } from '../baziLunarLocal';
import { buildLocalJieqiYearSeed } from '../localNongliAdapter';

function nongliOf(date, time){
	const local = buildLocalBaziResult({
		date, time, zone: '+08:00', lon: '120e00', lat: '0n00', gpsLon: 120, gpsLat: 0, ad: 1, gender: 1, timeAlg: 1, after23NewDay: 1,
	});
	return { ...local.bazi.nongli, bazi: local.bazi };
}

function juOf(date, time, method){
	const fields = { date: { value: { format: () => date } }, time: { value: { format: () => time } }, zone: { value: '+08:00' } };
	const y = parseInt(date.slice(0, 4), 10);
	const ctx = { jieqiYearSeeds: {
		[y - 1]: buildLocalJieqiYearSeed(y - 1, '+08:00'),
		[y]: buildLocalJieqiYearSeed(y, '+08:00'),
		[y + 1]: buildLocalJieqiYearSeed(y + 1, '+08:00'),
	} };
	return calcDunJia(fields, nongliOf(date, time), { paiPanType: 3, qijuMethod: method, school: '转盘', timeAlg: 1, after23NewDay: 1 }, ctx).juText;
}

const sun = (lon) => ({ objects: [{ id: 'Sun', lon, sign: 'Aries' }], nongli: { time: '子' } });

describe('final parity closure against published oracles', () => {
	test('qimen ju text matches the published anchors', () => {
		expect(juOf('2026-02-18', '10:30:00', 'chaibu')).toBe('阳遁二局下元');
		expect(juOf('2015-12-22', '10:30:00', 'chaibu')).toBe('阴遁七局中元');
		expect(juOf('2015-12-22', '14:30:00', 'chaibu')).toBe('阳遁七局中元');
	});

	test('liuren month general matches the published longitude table', () => {
		expect([
			getYueJiangByMethod(sun(20), 'zhongqi', 2026),
			getYueJiangByMethod(sun(20), 'jieqi', 2026),
			getYueJiangByMethod(sun(20), 'richan', 2026),
		]).toEqual(['戌', '酉', '亥']);
		expect(getYueJiangByMethod(sun(24), 'richan', 1900)).toBe('戌');
		expect(getYueJiangByMethod(sun(24), 'richan', 2026)).toBe('亥');
	});

	test('taiyi inverse year-branch god matches the published branch', () => {
		const pan = {
			taiyiPalace: '艮', taiyiNum: 3, skyeyes: '申', sf: '艮', jigod: '寅',
			homeCal: 16, awayCal: 3, setCal: 22, homeGeneral: 6, awayGeneral: 3,
			kingbase: '子', officerbase: '亥', pplbase: '寅', wufuNum: 1, bigyoNum: 9, smyoNum: 9,
			kook: { num: 55, year: '阳33局' }, ganzhi: { year: '丙午' }, dateStr: '2026-06-22', tn: 0,
		};
		const recast = applyTaiyiSchool(pan, { jishen: '逆' });
		expect(recast.pan.jigod).toBe('申');
	});
});
