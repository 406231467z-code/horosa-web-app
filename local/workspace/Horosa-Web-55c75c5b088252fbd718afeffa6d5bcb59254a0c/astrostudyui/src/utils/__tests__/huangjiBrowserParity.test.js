import {
	HuangJiBrowserEngine,
	computeCycles,
	minuteGanzhi,
	numberQigua,
	directionQigua,
	wanjiFourGua,
} from '../huangjiBrowser';
import { Solar } from 'lunar-javascript';
import { buildLocalBaziResult } from '../baziLunarLocal';

function compare(field, expected, actual){
	const delta = expected === actual ? 0 : 1;
	return { field, expected, actual, delta, status: delta === 0 ? 'PASS' : 'FAIL' };
}

function pillarsFor(year, month, day, hour, minute){
	const built = buildLocalBaziResult({
		date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
		time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
		zone: '+08:00',
	});
	const fc = built.bazi.fourColumns;
	const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
	return {
		year, month, day, hour, minute,
		lunar: {
			year: lunar.getYear(),
			month: Math.abs(lunar.getMonth()),
			day: lunar.getDay(),
		},
		pillars: {
			year: fc.year.ganzi,
			month: fc.month.ganzi,
			day: fc.day.ganzi,
			hour: fc.time.ganzi,
		},
	};
}

describe('huangji browser parity', ()=>{
	test('cycle numbers match kinwangji._compute_cycles for 2025', ()=>{
		const cycles = computeCycles(2025);
		const rows = [
			compare('acum', 69042, cycles.acum),
			compare('hui', 7, cycles.hui),
			compare('yun', 192, cycles.yun),
			compare('shi', 2302, cycles.shi),
		];
		rows.forEach((row)=> expect(row).toEqual(expect.objectContaining({ status: 'PASS', delta: 0 })));
		expect(computeCycles(-100).acum).toBe(66918);
		expect(computeCycles(-100).shi).toBe(Math.floor(66918 / 30) + 2);
	});

	test('minute pillar follows the two-minute jiazi cycle', ()=>{
		expect(compare('0:0', '甲子', minuteGanzhi(0, 0)).status).toBe('PASS');
		expect(compare('10:30', '己卯', minuteGanzhi(10, 30)).status).toBe('PASS');
	});

	test('xinyi number and direction match the vendor examples', ()=>{
		expect(compare('number.本卦', '中孚', numberQigua(5, 10).本卦).status).toBe('PASS');
		expect(compare('direction.本卦', '離', directionQigua('離', '南', 14).本卦).status).toBe('PASS');
		expect(numberQigua(5, 10).動爻).toBe(3);
	});

	test('2025-06-15 10:30 pan uses browser calendar and source cycle', ()=>{
		const out = HuangJiBrowserEngine.calculate({
			year: 2025, month: 6, day: 15, hour: 10, minute: 30, historyYear: 2025,
		});
		expect(out.status).toBe('SUCCESS');
		const raw = out.result.raw;
		const direct = wanjiFourGua(pillarsFor(2025, 6, 15, 10, 30));
		const rows = [
			compare('會', 7, raw.會),
			compare('運', 192, raw.運),
			compare('世', 2302, raw.世),
			compare('分柱', '己卯', raw.干支[4]),
			compare('正卦', '大過', raw.正卦),
			compare('運卦', direct.運卦, raw.運卦),
			compare('世卦', direct.世卦, raw.世卦),
			compare('旬卦', direct.旬卦, raw.旬卦),
			compare('年卦', direct.年卦, raw.年卦),
			compare('月卦', direct.月卦, raw.月卦),
			compare('日卦', direct.日卦, raw.日卦),
			compare('時卦', direct.時卦, raw.時卦),
			compare('分卦', direct.分卦, raw.分卦),
		];
		rows.forEach((row)=>{
			expect(row.actual).toBeTruthy();
			expect(row.status).toBe('PASS');
		});
		const early = HuangJiBrowserEngine.calculate({ year: 2025, month: 6, day: 15, hour: 10, minute: 0 });
		expect(early.result.raw.分卦).not.toBe(raw.分卦);
		expect(out.result.engine).toBe('browser');
		expect(out.getCapabilities ? null : out.meta.pillarSource).toBe('buildLocalBaziResult');
	});
});
