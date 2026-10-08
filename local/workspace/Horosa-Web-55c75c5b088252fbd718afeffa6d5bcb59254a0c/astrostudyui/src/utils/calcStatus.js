export function ephemerisLicenseStatus(feature){
	return {
		status: 'LICENSE_REVIEW_REQUIRED',
		provider: 'browser',
		code: 'EPHEMERIS_LICENSE',
		feature: feature || 'astrology',
		productionReady: false,
		message: '行星位置依赖星历。星历许可证未放行，浏览器不请求计算后端。',
	};
}

export function qizhengLicenseStatus(feature){
	return {
		status: 'LICENSE_BLOCKED',
		provider: 'browser',
		code: 'QIZHENG_TABLES',
		feature: feature || 'qizheng',
		productionReady: false,
		message: '七政表未获许可证。不复制表，不请求 /chart。',
	};
}

export function unsupportedStatus(feature, code, message){
	return {
		status: 'UNSUPPORTED',
		provider: 'browser',
		code: code || 'ALGORITHM_NOT_PORTED',
		feature: feature || 'unknown',
		productionReady: false,
		message: message || '仓内没有可移植的算法，浏览器不请求计算后端，也不给出空盘冒充结果。',
	};
}

export function isCalcStatus(value){
	if(!value || typeof value !== 'object'){
		return false;
	}
	return value.status === 'LICENSE_REVIEW_REQUIRED'
		|| value.status === 'LICENSE_BLOCKED'
		|| value.status === 'UNSUPPORTED'
		|| value.status === 'INVALID_INPUT'
		|| value.status === 'CALCULATION_ERROR';
}

export function formatCalcStatus(value){
	if(!isCalcStatus(value)){
		return '';
	}
	return [
		`status: ${value.status}`,
		`provider: ${value.provider || 'browser'}`,
		`code: ${value.code || ''}`,
		`feature: ${value.feature || ''}`,
		value.message || '',
	].filter((line)=>line !== '').join('\n');
}
