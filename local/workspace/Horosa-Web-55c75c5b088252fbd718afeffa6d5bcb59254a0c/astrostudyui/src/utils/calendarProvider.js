import { Solar, Lunar } from 'lunar-javascript';
import { buildLocalNongliLite, applyApparentSolarTime } from './baziLunarLocal';
import { buildLocalJieqiYearSeed } from './localNongliAdapter';
import { isLunarJsYearReliable, lunarDomainNotice } from './lunarDomainGuard';
import { normalizeDayBoundary, dayBoundaryToAfter23NewDay } from './dayBoundary';

function unsupported(year){
	return {
		status: 'UNSUPPORTED',
		code: 'LUNAR_DOMAIN',
		provider: 'browser',
		local: false,
		message: lunarDomainNotice(year),
	};
}

export function solarToLunar(params){
	return buildLocalNongliLite(params);
}

export function lunarToSolar(year, month, day){
	const y = Number(year);
	if(!isLunarJsYearReliable(y)){
		return unsupported(y);
	}
	const solar = Lunar.fromYmd(y, Number(month), Number(day)).getSolar();
	return {
		year: solar.getYear(),
		month: solar.getMonth(),
		day: solar.getDay(),
		provider: 'browser',
		local: true,
	};
}

export function solarTerms(year, zone){
	const y = Number(year);
	if(!isLunarJsYearReliable(y)){
		return unsupported(y);
	}
	const seed = buildLocalJieqiYearSeed(y, zone);
	if(!seed){
		return unsupported(y);
	}
	return seed;
}

export function dayBoundary(value){
	const boundary = normalizeDayBoundary(value);
	return {
		boundary,
		after23NewDay: dayBoundaryToAfter23NewDay(boundary),
		provider: 'browser',
	};
}

export function trueSolarTime(parts, params){
	return applyApparentSolarTime(parts, params || {});
}

export function solarFromYmd(year, month, day){
	return Solar.fromYmd(Number(year), Number(month), Number(day));
}

export const CalendarProvider = {
	solarToLunar,
	lunarToSolar,
	solarTerms,
	dayBoundary,
	trueSolarTime,
};
