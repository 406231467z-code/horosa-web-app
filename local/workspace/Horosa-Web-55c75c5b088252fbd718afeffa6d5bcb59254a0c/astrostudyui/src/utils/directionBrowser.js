import { ephemerisLicenseStatus } from './calcStatus';

// 生产主限是 Python getPrimaryDirectionByZ → astrostudy.pd_engine。
// 该核使用 Swiss Ephemeris 的黄赤交角、恒星时和星位。
// flatlib primarydirections.py 是 getPrimaryDirectionByZLegacy，不是默认核。
// 仓内没有可对照的 pdlist 金样。这里不发明弧长，也不请求 /predict/pd。

function directionLicenseStatus(input){
	const status = ephemerisLicenseStatus('direction');
	status.code = 'PRIMARY_DIRECTION_EPHEMERIS';
	status.message = '主限推运的生产路径使用 Swiss Ephemeris 的黄赤交角、恒星时和星位。星历许可证未放行，浏览器不请求 /predict/pd、/predict/pdchart、/predict/pdpoles。';
	status.input = input || null;
	return status;
}

export const DirectionBrowserEngine = {
	calculate(input){
		return directionLicenseStatus(input);
	},
	getCapabilities(){
		return {
			provider: 'browser',
			feature: 'direction',
			productionReady: false,
			status: 'LICENSE_REVIEW_REQUIRED',
			code: 'PRIMARY_DIRECTION_EPHEMERIS',
		};
	},
};

export const DirectionCalculationProvider = {
	calculate(input){
		return DirectionBrowserEngine.calculate(input);
	},
};
