import { qizhengLicenseStatus, ephemerisLicenseStatus } from '../utils/calcStatus';

// 七政表 LICENSE_BLOCKED。择日盘的宫头位置另依赖星历 LICENSE_REVIEW_REQUIRED。
// 两个状态都在这里返回，不请求 /qizheng、/qizhengkin、/qizhengelection。

export function stableMoiraKey(values){
	try{
		const v = values || {};
		return JSON.stringify({ params: v.params || null, transitParams: v.transitParams || null });
	}catch(e){
		return '';
	}
}

export function fetchMoiraQizhengRules(){
	return Promise.resolve(qizhengLicenseStatus('qizheng-moira'));
}

export function fetchKinastroQizheng(){
	return Promise.resolve(qizhengLicenseStatus('qizhengkin'));
}

export function fetchQizhengElection(){
	return Promise.resolve({
		...ephemerisLicenseStatus('qizheng-election'),
		qizheng: qizhengLicenseStatus('qizheng-election'),
	});
}

export function fetchQizhengEclipses(){
	return Promise.resolve(ephemerisLicenseStatus('qizheng-eclipses'));
}

export function fetchQizhengAzimuthSearch(){
	return Promise.resolve(ephemerisLicenseStatus('qizheng-azimuth'));
}
