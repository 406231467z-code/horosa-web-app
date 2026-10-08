import { DirectionBrowserEngine } from '../utils/directionBrowser';

// /predict/pd3d 前端 wrapper 已删除:3D 主限天球不再是产品表面。
// 极点与主限表同属 Swiss 主限核。浏览器返回许可证状态，不请求计算后端。

export function fetchPdPoles(values){
	return Promise.resolve(DirectionBrowserEngine.calculate(values || {}));
}
