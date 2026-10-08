import { ephemerisLicenseStatus } from './calcStatus';

// 印占生产路径：Java IndiaChartController → webindiasrv → jyotish_engine.build_jyotish。
// jyotish_engine 经 flatlib.ephem.eph 使用 Swiss 恒星黄道（Lahiri 等 ayanamsa）与分盘。
// 浏览器不复制受限星历，也不请求 /india/chart。

function indiaLicenseStatus(input){
	const status = ephemerisLicenseStatus('indiachart');
	status.code = 'INDIA_SIDEREAL_EPHEMERIS';
	status.message = '印占盘使用 Swiss 恒星黄道与分盘。星历许可证未放行，浏览器不请求 /india/chart。';
	status.input = input || null;
	return status;
}

export const IndiaBrowserEngine = {
	calculate(input){
		return indiaLicenseStatus(input);
	},
	getCapabilities(){
		return {
			provider: 'browser',
			feature: 'indiachart',
			productionReady: false,
			status: 'LICENSE_REVIEW_REQUIRED',
			code: 'INDIA_SIDEREAL_EPHEMERIS',
		};
	},
};

export const IndiaCalculationProvider = {
	calculate(input){
		return IndiaBrowserEngine.calculate(input);
	},
};
