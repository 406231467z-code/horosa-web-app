import request from '../utils/request';
import { ServerRoot } from '../utils/constants';

// Pole 高级输出:POST /predict/pdpoles(Java PredictiveController /pdpoles 转发)。
// 幂等纯计算,轻量(每应星一极点),不做内存缓存(随组合变化,fetch 端已由列开关节流)。
// /predict/pd3d 前端 wrapper 已删除:3D 主限天球不再是产品表面。非 3D 主限仍走
// /predict/pd | /predict/pdchart | /predict/pdpoles 与 pdMath。

function unwrapPdResponse(rsp){
	if(rsp && typeof rsp === 'object' && rsp.Result && typeof rsp.Result === 'object'){
		return rsp.Result;
	}
	return rsp;
}

export function fetchPdPoles(values, requestOptions){
	return request(`${ServerRoot}/predict/pdpoles`, {
		method: 'POST',
		body: JSON.stringify(values || {}),
		...(requestOptions || {}),
	}).then(unwrapPdResponse);
}
