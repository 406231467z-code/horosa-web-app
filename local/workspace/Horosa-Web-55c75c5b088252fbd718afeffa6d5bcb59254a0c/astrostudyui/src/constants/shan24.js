// Shared 24-mountain compass data used by KEEP 七政 (GuoLao).
// Extracted from the former fengshui module so fengshui UI can be deleted
// without breaking election/compass math.

export const SHAN_ORDER = ['壬', '子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳',
	'丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥'];

export const SHAN_CENTER_DEG = (()=>{
	const out = {};
	SHAN_ORDER.forEach((s, i)=>{ out[s] = (345 + i * 15) % 360; });
	return out;
})();

export const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const GANZHI_60 = (()=>{
	const out = [];
	for(let i = 0; i < 60; i++){
		out.push(TIANGAN[i % 10] + DIZHI[i % 12]);
	}
	return out;
})();

const XIANFA_ORIGIN = 337.5;
function normDeg(deg){
	return ((Number(deg) % 360) + 360) % 360;
}
function offsetFromOrigin(deg){
	return (normDeg(deg) - XIANFA_ORIGIN + 360) % 360;
}

export function shanAtDeg(deg){
	const idx = Math.floor(offsetFromOrigin(deg) / 15) % 24;
	return SHAN_ORDER[idx];
}
