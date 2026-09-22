import { isLunarJsYearReliable } from './lunarDomainGuard';
import { calcZiwei } from '../components/ziwei/ZiweiCalc';
import { detectPatterns } from '../components/ziwei/ziweiPatterns';
import request from './request';
import { ServerRoot, ResultKey } from './constants';
import { techniqueResultCacheEnabled } from './perfFlags';
import { cachedPost } from '../services/_requestCache';

// 与 ziweiLocalParity 的 Java 兼容档相同：正月换年、日历农历日、命主按生年支。
const ZIWEI_JAVA_COMPAT_OPTS = Object.freeze({
	yearBoundary: 'lunar_1_1',
	ziweiLunarBasis: 'calendar',
	lifeMasterBy: 'year_branch',
});

// PHASE 4-C: 可靠域起盘走已对拍的 ZiweiCalc（Java 兼容三键）。域外或公元前仍请求 /ziwei/birth。

function solarYearOf(params){
	const date = `${params && params.date || ''}`.trim();
	const neg = date.startsWith('-');
	const year = parseInt(neg ? date.slice(1) : date, 10);
	return { year, neg };
}

export function localZiweiBirthEnvelope(params, extraOpts){
	const src = params || {};
	const { year, neg } = solarYearOf(src);
	const ad = Number(src.ad);
	if(neg || ad < 0 || !isLunarJsYearReliable(year)){
		return null;
	}
	const birth = {
		date: src.date,
		time: src.time,
		zone: src.zone,
		lon: src.lon,
		lat: src.lat,
		gpsLon: src.gpsLon,
		gpsLat: src.gpsLat,
		ad: src.ad != null ? src.ad : 1,
		gender: src.gender,
	};
	const opts = {
		timeAlg: src.timeAlg,
		after23NewDay: src.after23NewDay,
		lateZiHourUseNextDay: src.lateZiHourUseNextDay,
		...ZIWEI_JAVA_COMPAT_OPTS,
		...(extraOpts || {}),
	};
	let chart = null;
	try{
		chart = calcZiwei(birth, opts);
	}catch(e){
		return null;
	}
	if(!chart || !Array.isArray(chart.houses) || chart.houses.length !== 12){
		return null;
	}
	if(!chart.birth){
		chart.birth = src.date;
	}
	if(chart.gender === undefined || chart.gender === null){
		chart.gender = src.gender;
	}
	let patterns = [];
	try{
		const found = detectPatterns(chart);
		if(Array.isArray(found)){
			patterns = found;
		}
	}catch(e){ /* 格局失败不冒充空成功盘：盘仍返回，格局留空数组 */ }
	return {
		[ResultKey]: {
			chart,
			patterns,
			local: true,
		},
	};
}

export function fetchZiweiBirth(params, requestOpts){
	const local = localZiweiBirthEnvelope(params);
	if(local){
		return Promise.resolve(local);
	}
	const opts = {
		body: JSON.stringify(params || {}),
		...(requestOpts || {}),
	};
	if(techniqueResultCacheEnabled()){
		return cachedPost(`${ServerRoot}/ziwei/birth`, params, opts, { ns: 'ziwei/birth' });
	}
	return request(`${ServerRoot}/ziwei/birth`, opts);
}
