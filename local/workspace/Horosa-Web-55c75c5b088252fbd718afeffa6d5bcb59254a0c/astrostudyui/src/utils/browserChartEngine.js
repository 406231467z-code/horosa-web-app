import { Engine } from 'caelus/dist/src/index.js';
import { julianDay, jdTT, equatorial, trueObliquity } from 'caelus/dist/src/core.js';
import { embeddedData } from 'caelus/dist/src/data-embedded.js';
import vestaPack from 'caelus/data/vesta_cheb.json';
import pallasPack from 'caelus/data/pallas_cheb.json';
import junoPack from 'caelus/data/juno_cheb.json';
import ceresPack from 'caelus/data/ceres_cheb.json';
import pholusPack from 'caelus/data/pholus_cheb.json';
import intpApogPack from 'caelus/data/intp_apog_cheb.json';
import * as AstroConst from '../constants/AstroConst';
import { HELLENISTIC } from '../divination/data/hellenisticData';
import { mansionOf, degreeGender, monomoiriaRuler, ninthPartSign, darijanRuler, degreeQuality, specialDegree } from './browserClassicalTables';

const DEG = Math.PI / 180;
const SUPPORTED_HOUSES = {
	0: 'whole_sign',
	1: 'alcabitius',
	2: 'regiomontanus',
	3: 'placidus',
	4: 'koch',
	5: 'vehlow',
	6: 'polich_page',
	9: 'porphyry',
	10: 'campanus',
	11: 'equal',
	13: 'meridian',
	15: 'morinus',
};
const SUPPORTED_AYANAMSA = new Set([
	'lahiri', 'fagan_bradley', 'krishnamurti', 'raman', 'yukteshwar',
	'galcent_0sag', 'true_citra',
]);
const BODY_DEFS = [
	['sun', 'Sun'], ['moon', 'Moon'], ['mercury', 'Mercury'], ['venus', 'Venus'],
	['mars', 'Mars'], ['jupiter', 'Jupiter'], ['saturn', 'Saturn'], ['uranus', 'Uranus'],
	['neptune', 'Neptune'], ['pluto', 'Pluto'], ['chiron', 'Chiron'],
	['ceres', 'Ceres'], ['pallas', 'Pallas'], ['juno', 'Juno'], ['vesta', 'Vesta'],
	['pholus', 'Pholus'], ['intp_apog', 'Intp_Apog'],
	['mean_lilith', 'Dark Moon'], ['true_lilith', 'True Lilith'],
];
const ASPECTS = [
	{ name: 'conjunction', deg: 0 }, { name: 'semisextile', deg: 30 },
	{ name: 'semisquare', deg: 45 }, { name: 'sextile', deg: 60 },
	{ name: 'square', deg: 90 }, { name: 'trine', deg: 120 },
	{ name: 'sesquiquadrate', deg: 135 }, { name: 'quincunx', deg: 150 },
	{ name: 'opposition', deg: 180 },
];
const RULERS = {
	Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
	Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
	Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};
const EXALTATIONS = {
	Aries: 'Sun', Taurus: 'Moon', Cancer: 'Jupiter', Virgo: 'Mercury',
	Libra: 'Saturn', Capricorn: 'Mars', Pisces: 'Venus',
};
let engineSingleton = null;

function mod(value, period){
	const remainder = value % period;
	return remainder < 0 ? remainder + period : remainder;
}

function getEngine(){
	if(!engineSingleton){
		engineSingleton = new Engine({
			...embeddedData,
			chebPacks: {
				...(embeddedData.chebPacks || {}),
				ceres: ceresPack,
				pallas: pallasPack,
				juno: junoPack,
				vesta: vestaPack,
				pholus: pholusPack,
			},
			intpApog: intpApogPack,
		});
	}
	return engineSingleton;
}

function parseCoordinate(raw, axis){
	const name = axis === 'lat' ? '纬度' : '经度';
	if(raw === undefined || raw === null || raw === ''){
		throw new Error('出生地点' + name + '缺失。');
	}
	if(typeof raw === 'number'){
		if(!Number.isFinite(raw)){ throw new Error('出生地点' + name + '不是有效数字。'); }
		return raw;
	}
	const value = String(raw).trim().toLowerCase().replace(/[°º]/g, '');
	const directional = value.match(/^([+-]?\d+(?:\.\d+)?)(?:\s*([nsew])\s*(\d+(?:\.\d+)?))?$/);
	let result;
	if(directional){
		const degrees = Number(directional[1]);
		const minutes = Number(directional[3] || 0);
		if(minutes >= 60){ throw new Error('出生地点' + name + '分值必须小于 60。'); }
		result = Math.abs(degrees) + minutes / 60;
		if(degrees < 0 || directional[2] === 's' || directional[2] === 'w'){ result = -result; }
	}else{
		result = Number(value);
	}
	if(!Number.isFinite(result) || (axis === 'lat' && Math.abs(result) > 90) || (axis === 'lon' && Math.abs(result) > 180)){
		throw new Error('出生地点' + name + '超出范围或无法解析：' + raw);
	}
	return result;
}

function parseZoneHours(raw){
	if(typeof raw === 'number'){
		if(Number.isFinite(raw) && raw >= -14 && raw <= 14){ return raw; }
		throw new Error('出生时区超出范围：' + raw);
	}
	const value = String(raw == null ? '' : raw).trim().toUpperCase().replace(/^(UTC|GMT)\s*/, '');
	const match = value.match(/^([+-])?(\d{1,2})(?::?(\d{2}))?$/);
	if(!match){ throw new Error('无法解析出生时区：' + raw); }
	const hour = Number(match[2]);
	const minute = Number(match[3] || 0);
	if(hour > 14 || minute >= 60 || (hour === 14 && minute > 0)){ throw new Error('出生时区超出范围：' + raw); }
	return (match[1] === '-' ? -1 : 1) * (hour + minute / 60);
}

function parseBirth(values){
	let date = String(values.date || '').trim();
	let time = String(values.time || '').trim();
	if(!date && values.birth){
		const both = String(values.birth).trim().match(/^([+-]?\d{4,6})[/-](\d{1,2})[/-](\d{1,2})[ T](\d{1,2}:\d{1,2}(?::\d+(?:\.\d+)?)?)$/);
		if(both){ date = both[1] + '-' + both[2] + '-' + both[3]; time = both[4]; }
	}
	const match = date.match(/^([+-]?\d{4,6})[/-](\d{1,2})[/-](\d{1,2})$/);
	if(!match){ throw new Error('无法解析出生日期：' + (date || '未知')); }
	const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
	if(year < 1000 || year > 3000){
		throw new Error('浏览器占星引擎当前验证范围为公元 1000–3000 年；当前输入不能作为已验证结果显示。');
	}
	const timeMatch = time.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}(?:\.\d+)?))?$/);
	if(!timeMatch){ throw new Error('无法解析出生时间：' + (time || '未知')); }
	const hour = Number(timeMatch[1]), minute = Number(timeMatch[2]), second = Number(timeMatch[3] || 0);
	if(month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second >= 60){
		throw new Error('出生日期或时间无效。');
	}
	const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
	if(day > days){ throw new Error('出生日期无效。'); }
	return { year, month, day, hour, minute, second, zone: parseZoneHours(values.zone) };
}

function resolveZodiac(values){
	const raw = String(values.zodiacal == null ? '0' : values.zodiacal).trim().toLowerCase();
	if(raw === '0' || raw === 'tropical' || raw === '回归黄道'){
		return { zodiac: 'tropical', label: 'Tropical', ayanamsa: '' };
	}
	if(raw !== '1' && raw !== 'sidereal' && raw !== '恒星黄道'){
		throw new Error('当前黄道设置无法识别：' + values.zodiacal);
	}
	const key = String(values.siderealAyanamsa || 'lahiri').trim().toLowerCase().replace(/[\s-]+/g, '_');
	if(!SUPPORTED_AYANAMSA.has(key)){
		throw new Error('浏览器引擎尚未验证恒星黄道「' + key + '」；未生成替代命盘。');
	}
	return { zodiac: 'sidereal:' + key, label: 'Sidereal', ayanamsa: key };
}

function resolveHouseSystem(raw){
	const key = String(raw == null ? 1 : raw).trim();
	const houseSystem = Object.prototype.hasOwnProperty.call(SUPPORTED_HOUSES, key)
		? SUPPORTED_HOUSES[key] : (Object.values(SUPPORTED_HOUSES).includes(key.toLowerCase()) ? key.toLowerCase() : null);
	if(!houseSystem){ throw new Error('浏览器引擎暂未移植所选宫制「' + raw + '」；未生成替代命盘。'); }
	return houseSystem;
}

function nonDefault(value){
	return value !== undefined && value !== null && value !== '' && value !== false && value !== 0 && value !== '0';
}

export function canCalculateBrowserChart(values){
	const p = values || {};
	if(nonDefault(p.includePrimaryDirection) || nonDefault(p.pdtype)){
		return { ok: false, reason: '主限预测计算仍需独立迁移。' };
	}
	if(nonDefault(p.tradition) || nonDefault(p.strongRecption) || nonDefault(p.simpleAsp) || nonDefault(p.virtualPointReceiveAsp)){
		return { ok: false, reason: '当前包含传统/自定义盘式选项，浏览器引擎尚未覆盖全部规则。' };
	}
	if(nonDefault(p.doubingSu28) || nonDefault(p.trueSolarTime) || nonDefault(p.guolaoNodeType) || nonDefault(p.guolaoLilithType) || nonDefault(p.guolaoAyanamsa)){
		return { ok: false, reason: '当前参数属于七政四余，不在此西占引擎范围内。' };
	}
	if(nonDefault(p.orbs) || nonDefault(p.orbScale) || nonDefault(p.termsVariant)){
		return { ok: false, reason: '自定义容许度或界限选项尚未完成浏览器端对齐。' };
	}
	try{
		parseBirth(p); parseCoordinate(p.lat, 'lat'); parseCoordinate(p.lon, 'lon');
		resolveZodiac(p); resolveHouseSystem(p.hsys);
		return { ok: true, reason: '' };
	}catch(error){
		return { ok: false, reason: error && error.message ? error.message : String(error) };
	}
}

function equatorialFor(longitude, latitude, jde){
	const [ra, dec] = equatorial(longitude * DEG, latitude * DEG, trueObliquity(embeddedData, jde));
	return { ra: mod(ra / DEG, 360), dec: dec / DEG };
}

function localSiderealHours(jdUt, longitude){
	const t = (jdUt - 2451545) / 36525;
	return mod(280.46061837 + 360.98564736629 * (jdUt - 2451545)
		+ 0.000387933 * t * t - t * t * t / 38710000 + longitude, 360);
}

function horizontal(ra, dec, jdUt, geo){
	const lat = geo.lat * DEG, delta = dec * DEG;
	const h = mod(localSiderealHours(jdUt, geo.lon) - ra + 180, 360) - 180;
	const hourAngle = h * DEG;
	const sinAlt = Math.sin(lat) * Math.sin(delta) + Math.cos(lat) * Math.cos(delta) * Math.cos(hourAngle);
	const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG;
	const az = mod(Math.atan2(-Math.sin(hourAngle), Math.tan(delta) * Math.cos(lat) - Math.sin(lat) * Math.cos(hourAngle)) / DEG + 180, 360);
	return { azimuth: az, altitude: alt };
}

function signOf(lon){
	return AstroConst.LIST_SIGNS[Math.floor(mod(lon, 360) / 30)] || 'Aries';
}

function houseIndex(longitude, cusps){
	const lon = mod(longitude, 360);
	for(let i=0;i<12;i++){
		const span = mod(cusps[(i+1)%12] - cusps[i], 360);
		if(mod(lon - cusps[i], 360) < span){ return i + 1; }
	}
	return 1;
}

function wholeSignHouse(lon, asc){
	return mod(Math.floor(mod(lon, 360) / 30) - Math.floor(mod(asc, 360) / 30), 12) + 1;
}

function mansion27(lon){
	const sign = signOf(lon);
	const degree = mod(lon, 30);
	const rows = AstroConst.TERM_SU27 && AstroConst.TERM_SU27[sign];
	const match = Array.isArray(rows) && rows.find((row)=>degree >= Number(row[1]) && degree < Number(row[2]));
	return match ? match[0] : '';
}

function angularDistance(a,b){
	const delta = mod(Math.abs(a-b),360);
	return Math.min(delta,360-delta);
}

function classicalSignData(longitude, planetId){
	const signIndex = Math.floor(mod(longitude,360)/30);
	const signName = signOf(longitude);
	const degree = mod(longitude,30);
	const opposite = mod(signIndex+6,12);
	const exaltEntry = Object.entries(HELLENISTIC.exaltation || {}).find((entry)=>entry[1] && !entry[1].optional && Number(entry[1].sign) === signIndex);
	const fallEntry = Object.entries(HELLENISTIC.exaltation || {}).find((entry)=>entry[1] && !entry[1].optional && Number(entry[1].sign) === opposite);
	const elementEntry = Object.entries(HELLENISTIC.elements || {}).find((entry)=>Array.isArray(entry[1]) && entry[1].includes(signIndex));
	const tri = elementEntry && HELLENISTIC.triplicity && HELLENISTIC.triplicity.Dorothean
		? HELLENISTIC.triplicity.Dorothean[elementEntry[0]] : null;
	const termRows = HELLENISTIC.bounds_egyptian && HELLENISTIC.bounds_egyptian[String(signIndex)];
	const term = Array.isArray(termRows) ? termRows.find((row)=>degree >= Number(row[1]) && degree < Number(row[2])) : null;
	const faces = HELLENISTIC.faces_chaldean && HELLENISTIC.faces_chaldean[String(signIndex)];
	const face = Array.isArray(faces) ? faces[Math.min(2,Math.floor(degree/10))] : null;
	const dignities = {
		ruler: (HELLENISTIC.domicile || [])[signIndex] || null,
		exalt: exaltEntry ? exaltEntry[0] : null,
		dayTrip: tri && tri.day || null,
		nightTrip: tri && tri.night || null,
		partTrip: tri && tri.participating || null,
		term: term ? term[0] : null,
		face: face || null,
		exile: (HELLENISTIC.domicile || [])[opposite] || null,
		fall: fallEntry ? fallEntry[0] : null,
	};
	const self = [];
	const points = { ruler: 5, exalt: 4, dayTrip: 3, nightTrip: 3, partTrip: 3, term: 2, face: 1 };
	let score = 0;
	Object.keys(points).forEach((key)=>{
		if(dignities[key] && dignities[key] === planetId){
			self.push(key);
			score += points[key];
		}
	});
	if(dignities.exile === planetId){ score -= 5; }
	if(dignities.fall === planetId){ score -= 4; }
	const ninthIndex = mod(signIndex*9 + Math.floor(degree/(30/9)),12);
	return {
		signIndex, signName, degree, dignities, selfDignity: self, score,
		degreeGender: (HELLENISTIC.sign_gender || [])[signIndex] === 'M' ? 'masculine' : 'feminine',
		ninthPart: (HELLENISTIC.signs || [])[ninthIndex] || '',
		joyHouse: (HELLENISTIC.joys || {})[planetId] || null,
	};
}

function isClassicalPlanetId(id){
	return ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'].includes(id);
}

const DIGNITY_KEYS = ['ruler','exalt','dayTrip','nightTrip','partTrip','term','face','exile','fall'];
const STRONG_DIGNITIES = ['ruler','exalt'];
const CLASSICAL_PLANETS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
const NONTRADITIONAL_PLANETS = ['Uranus','Neptune','Pluto'];

function selectedPlanetRows(objects, options){
	const traditional = nonDefault(options && options.tradition);
	const allowed = traditional ? CLASSICAL_PLANETS : CLASSICAL_PLANETS.concat(NONTRADITIONAL_PLANETS);
	return (objects || []).filter((obj)=>obj && allowed.includes(obj.id) && obj.type === 'Planet');
}

function buildReceptions(objects, options){
	const planets = selectedPlanetRows(objects,options);
	const normal = [], abnormal = [];
	const strict = nonDefault(options && options.strongRecption);
	planets.forEach((supplier)=>{
		planets.forEach((beneficiary)=>{
			if(supplier.id === beneficiary.id){ return; }
			const received = DIGNITY_KEYS.filter((key)=>beneficiary.dignities && beneficiary.dignities[key] === supplier.id);
			const filtered = received.filter((key)=>key !== 'exile' && key !== 'fall');
			if(!filtered.length){ return; }
			if(!filtered.includes('exalt') && !filtered.includes('ruler') && (strict || filtered.length <= 1)){ return; }
			const row = {
				beneficiary: beneficiary.id,
				supplier: supplier.id,
				beneficiaryDignity: (beneficiary.selfDignity || []).slice(),
				supplierRulerShip: filtered,
			};
			if(row.beneficiaryDignity.includes('exile') || row.beneficiaryDignity.includes('fall')){
				abnormal.push(row);
			}else{
				normal.push(row);
			}
		});
	});
	return { normal, abnormal };
}

function buildMutuals(objects, options){
	const planets = selectedPlanetRows(objects,options);
	const result = [];
	const strict = nonDefault(options && options.strongRecption);
	for(const a of planets){
		for(const b of planets){
			if(a.id === b.id || result.some((item)=>item.mutual.includes(a.id) && item.mutual.includes(b.id))){ continue; }
			// inDignities(A,B): dignities held by A at B's sign; reverse inDignities(B,A) likewise.
			const aReceivesB = DIGNITY_KEYS.filter((key)=>b.dignities && b.dignities[key] === a.id);
			const bReceivesA = DIGNITY_KEYS.filter((key)=>a.dignities && a.dignities[key] === b.id);
			const aFiltered = aReceivesB.filter((key)=>key !== 'exile' && key !== 'fall');
			const bFiltered = bReceivesA.filter((key)=>key !== 'exile' && key !== 'fall');
			const aGood = aFiltered.some((key)=>STRONG_DIGNITIES.includes(key));
			const bGood = bFiltered.some((key)=>STRONG_DIGNITIES.includes(key));
			const qualifies = strict
				? aGood && bGood
				: ((aFiltered.length > 1 && bFiltered.length > 1)
					|| (aGood && bGood)
					|| (aGood && bFiltered.length > 1)
					|| (aFiltered.length > 1 && bGood));
			if(!qualifies){ continue; }
			// Match Horosa's legacy ordering: planet A receives rulerShip in B's place, then B in A's.
			const aRulerShip = strict ? aReceivesB.filter((key)=>key !== 'exile' && key !== 'fall') : bReceivesA;
			const bRulerShip = strict ? bReceivesA.filter((key)=>key !== 'exile' && key !== 'fall') : aReceivesB;
			result.push({ mutual:[a.id,b.id], dignity:[aRulerShip,bRulerShip] });
		}
	}
	const normal = [], abnormal = [];
	result.forEach((item)=>{
		const row = {
			planetA:{ id:item.mutual[0], rulerShip:item.dignity[0] },
			planetB:{ id:item.mutual[1], rulerShip:item.dignity[1] },
		};
		if(item.dignity.some((keys)=>keys.some((key)=>key === 'exile' || key === 'fall'))){
			abnormal.push(row);
		}else{
			normal.push(row);
		}
	});
	return { normal, abnormal };
}

function buildDeclParallel(objects){
	const eligible = (objects || []).filter((obj)=>obj && obj.type !== 'Arabic Part' && Number.isFinite(Number(obj.decl)));
	const adjacency = new Map(eligible.map((obj)=>[obj.id,new Set()]));
	const contraParallel = {};
	for(let i=0;i<eligible.length;i++){
		for(let j=i+1;j<eligible.length;j++){
			const a=eligible[i], b=eligible[j];
			if(Math.abs(Number(a.decl)-Number(b.decl)) <= 1){
				adjacency.get(a.id).add(b.id);
				adjacency.get(b.id).add(a.id);
			}
			if(Math.abs(Number(a.decl)+Number(b.decl)) <= 1){
				if(!contraParallel[a.id]){ contraParallel[a.id]=[]; }
				if(!contraParallel[b.id]){ contraParallel[b.id]=[]; }
				contraParallel[a.id].push(b.id);
				contraParallel[b.id].push(a.id);
			}
		}
	}
	const parallel=[], visited=new Set();
	for(const obj of eligible){
		if(visited.has(obj.id) || !(adjacency.get(obj.id)||new Set()).size){ continue; }
		const stack=[obj.id], component=[];
		visited.add(obj.id);
		while(stack.length){
			const id=stack.pop();
			component.push(id);
			(adjacency.get(id)||new Set()).forEach((neighbor)=>{
				if(!visited.has(neighbor)){ visited.add(neighbor); stack.push(neighbor); }
			});
		}
		if(component.length>1){ parallel.push(component.sort()); }
	}
	return { parallel, contraParallel };
}

function buildOrientOccidental(objects){
	const ids=CLASSICAL_PLANETS;
	const byId={};
	(objects || []).forEach((obj)=>{ if(obj && obj.id){ byId[obj.id]=obj; } });
	const result={};
	ids.forEach((id)=>{
		const planet=byId[id];
		if(!planet){ return; }
		const pntA=mod(planet.lon,360), pntB=mod(pntA+180,360);
		const row={ oriental:[], occidental:[] };
		ids.forEach((otherId)=>{
			if(otherId===id || !byId[otherId]){ return; }
			const otherLon=mod(byId[otherId].lon,360);
			const oriental=(pntB < otherLon && otherLon < pntA)
				|| (otherLon >= 0 && otherLon < pntA && pntB > 180)
				|| (pntB > 180 && otherLon > pntB);
			if(oriental){
				row.oriental.push({id:otherId,delta:mod(pntA-otherLon,360)});
			}else{
				row.occidental.push({id:otherId,delta:mod(otherLon-pntA,360)});
			}
		});
		row.oriental.sort((a,b)=>a.delta-b.delta);
		row.occidental.sort((a,b)=>a.delta-b.delta);
		result[id]=row;
	});
	return result;
}

function buildSurroundPlanets(orientOccident){
	const result={ Sun:[], Moon:[], BySunMoon:null };
	const ids=CLASSICAL_PLANETS;
	ids.forEach((id)=>{
		const entry=orientOccident && orientOccident[id];
		if(!entry || !entry.oriental.length || !entry.occidental.length){ return; }
		const orient=entry.oriental[0], occi=entry.occidental[0];
		if(orient.delta+occi.delta>90){ return; }
		const pair=[orient,occi];
		if(id==='Sun' || id==='Moon'){
			result[id]=pair;
		}else if((pair[0].id==='Sun' && pair[1].id==='Moon') || (pair[0].id==='Moon' && pair[1].id==='Sun')){
			result[id]={id,SunMoon:pair};
		}
	});
	return result;
}

function buildOrientOccidentalHouses(houses, objects){
	const byId={};
	(objects || []).forEach((obj)=>{ if(obj && obj.id){ byId[obj.id]=obj; } });
	const result={};
	const houseList=(houses || []).slice().sort((a,b)=>Number(a.id.replace('House',''))-Number(b.id.replace('House','')));
	houseList.forEach((house)=>{
		const pntA=mod(house.lon,360), pntB=mod(pntA+180,360);
		const row={inHouse:[],oriental:[],occidental:[]};
		CLASSICAL_PLANETS.forEach((id)=>{
			const planet=byId[id];
			if(!planet){ return; }
			if((house.planets || []).includes(id)){
				row.inHouse.push({id,delta:Number(planet.lon)-Number(house.lon)});
				return;
			}
			const lon=mod(planet.lon,360);
			const oriental=(pntB < lon && lon < pntA)
				|| (lon >= 0 && lon < pntA && pntB > 180)
				|| (pntB > 180 && lon > pntB);
			if(oriental){ row.oriental.push({id,delta:mod(pntA-lon,360)}); }
			else{ row.occidental.push({id,delta:mod(lon-pntA,360)}); }
		});
		row.oriental.sort((a,b)=>a.delta-b.delta);
		row.occidental.sort((a,b)=>a.delta-b.delta);
		result[house.id]=row;
	});
	return result;
}

function buildSurroundHouses(houses,orientOccidentHouses){
	const result={};
	const byId={};
	(houses || []).forEach((house)=>{ byId[house.id]=house; });
	for(let i=1;i<=12;i++){
		const id='House'+i, row=orientOccidentHouses && orientOccidentHouses[id], house=byId[id];
		const previous=byId['House'+(i===1?12:i-1)], next=byId['House'+(i===12?1:i+1)];
		if(!row || !house || !previous || !next || row.inHouse.length || !row.oriental.length || !row.occidental.length){ continue; }
		const oriental=row.oriental[0], occidental=row.occidental[0];
		if(occidental.delta > Number(house.size)+Number(next.size) || oriental.delta > Number(previous.size)){ continue; }
		result[id]=[
			{id:oriental.id,delta:oriental.delta},
			{id:occidental.id,delta:occidental.delta-Number(house.size)},
		];
	}
	return result;
}

const SURROUND_ASPECTS = [-120,-90,-60,0,60,90,120,180];
const SURROUND_ORBS = {Sun:15,Moon:12,Mercury:7,Venus:8,Mars:8,Jupiter:9,Saturn:9};

function pointForAspect(planet, aspect){
	const lon=mod(Number(planet.lon)+aspect,360);
	return {lon,sign:signOf(lon),signlon:mod(lon,30)};
}

function surroundsTarget(targetLon, pointA, pointB, pairOrb, orb){
	const opposite=mod(targetLon+180,360);
	if((pointA.lon<=targetLon && targetLon<=pointB.lon && pointB.lon<=opposite)
		|| (opposite<=pointA.lon && pointA.lon<=targetLon && targetLon<=pointB.lon)
		|| (360-pairOrb<=pointA.lon && pointA.lon<=targetLon && targetLon<=360 && 0<=pointB.lon && pointB.lon<=pairOrb)
		|| (360-pairOrb<=pointA.lon && 0<=targetLon && targetLon<=pointB.lon && pointB.lon<=pairOrb)){ return true; }
	if((pointB.lon<=targetLon && targetLon<=pointA.lon && pointA.lon<=opposite)
		|| (opposite<=pointB.lon && pointB.lon<=targetLon && targetLon<=pointA.lon)
		|| (360-orb<=pointB.lon && pointB.lon<=targetLon && targetLon<=360 && 0<=pointA.lon && pointA.lon<=orb)
		|| (360-orb<=pointB.lon && 0<=targetLon && targetLon<=pointA.lon && pointA.lon<=orb)){ return true; }
	return false;
}

function buildSurroundAttack(planet, planetMap){
	const all=[];
	for(const idA of CLASSICAL_PLANETS){
		if(idA===planet.id || !planetMap[idA]){ continue; }
		const a=planetMap[idA], orbA=SURROUND_ORBS[idA];
		for(const aspA of SURROUND_ASPECTS){
			const pA=pointForAspect(a,aspA);
			const deltaA=angularDistance(pA.lon,planet.lon);
			if(deltaA>27){ continue; }
			for(const idB of CLASSICAL_PLANETS){
				if(idB===idA || idB===planet.id || !planetMap[idB]){ continue; }
				const b=planetMap[idB], orbB=SURROUND_ORBS[idB], pairOrb=orbA+orbB;
				for(const aspB of SURROUND_ASPECTS){
					const pB=pointForAspect(b,aspB);
					const deltaB=angularDistance(pB.lon,planet.lon);
					if(deltaA>pairOrb || deltaB>pairOrb){ continue; }
					if(angularDistance(pA.lon,pB.lon)>pairOrb || deltaA>orbA || deltaB>orbB){ continue; }
					if(!surroundsTarget(mod(planet.lon,360),pA,pB,pairOrb,27)){ continue; }
					all.push([
						{aspect:aspA,id:idA,lon:pA.lon,sign:pA.sign,signlon:pA.signlon,delta:deltaA},
						{aspect:aspB,id:idB,lon:pB.lon,sign:pB.sign,signlon:pB.signlon,delta:deltaB},
					]);
				}
			}
		}
	}
	all.sort((a,b)=>mod(a[1].lon-a[0].lon,360)-mod(b[1].lon-b[0].lon,360));
	const groups={SunMoon:[],VenusJupiter:[],MarsSaturn:[],MinDelta:all.length?all[0]:[]};
	all.forEach((pair)=>{
		const a=pair[0].id,b=pair[1].id;
		if((a==='Sun'&&b==='Moon')||(a==='Moon'&&b==='Sun')){ groups.SunMoon=pair; }
		else if((a==='Venus'&&b==='Jupiter')||(a==='Jupiter'&&b==='Venus')){ groups.VenusJupiter=pair; }
		else if((a==='Mars'&&b==='Saturn')||(a==='Saturn'&&b==='Mars')){ groups.MarsSaturn=pair; }
	});
	return groups;
}

function objectRulesWeakHouse(planet, houses){
	const weak=new Set(['House3','House6','House8','House12']);
	const ruled=(houses || []).filter((house)=>house.ruler===planet.id).map((house)=>house.id);
	if(ruled.some((id)=>weak.has(id))){ return false; }
	if(ruled.length){ return true; }
	return !weak.has(planet.house);
}

function buildBesiegement(objects,attacks,mutuals,houses){
	const byId={};
	(objects || []).forEach((obj)=>{ byId[obj.id]=obj; });
	const restrained={};
	[...(mutuals.normal||[]),...(mutuals.abnormal||[])].forEach((row)=>{
		const a=row.planetA && row.planetA.id,b=row.planetB && row.planetB.id;
		['Sun','Jupiter'].forEach((authority)=>{
			if(!byId[authority] || !objectRulesWeakHouse(byId[authority],houses)){ return; }
			if(a===authority && b){ (restrained[b]||(restrained[b]=[])).push(authority); }
			else if(b===authority && a){ (restrained[a]||(restrained[a]=[])).push(authority); }
		});
	});
	const besiegedSet=new Set(Object.keys(attacks).filter((id)=>{
		const a=attacks[id]; return a.SunMoon.length || a.VenusJupiter.length || a.MarsSaturn.length;
	}));
	const specs={
		MarsSaturn:{kind:'围攻',nature:'凶',malefic:true},
		VenusJupiter:{kind:'围荣',nature:'富',malefic:false},
		SunMoon:{kind:'围耀',nature:'贵',malefic:false},
	};
	const output=[];
	Object.keys(attacks).forEach((targetId)=>{
		const target=byId[targetId];
		if(!target){ return; }
		const targetSign=AstroConst.LIST_SIGNS.indexOf(target.sign);
		['MarsSaturn','VenusJupiter','SunMoon'].forEach((type)=>{
			const pair=attacks[targetId][type];
			if(!pair || !pair.length){ return; }
			const spec=specs[type], besiegers=[];
			pair.forEach((entry)=>{
				const body=byId[entry.id];
				if(!body){ return; }
				const offset=mod(AstroConst.LIST_SIGNS.indexOf(body.sign)-targetSign,12);
				let season='中';
				if([7,8,9,10,11].includes(offset)){ season=offset===9?'夏':'春'; }
				else if([1,2,3,4,5].includes(offset)){ season=offset===3?'冬':'秋'; }
				const item={id:entry.id,aspect:entry.aspect,season,retro:Number(body.lonspeed||0)<0,delta:Number(Number(entry.delta).toFixed(2))};
				if(spec.malefic){
					item.restrained=restrained[entry.id]||[];
					item.counterBesieged=besiegedSet.has(entry.id);
				}
				besiegers.push(item);
			});
			const severe=!!(spec.malefic && besiegers.some((item)=>item.season==='春'||item.season==='夏'));
			output.push({
				target:targetId,type,kind:spec.kind,nature:spec.nature,besiegers,
				targetRetro:Number(target.lonspeed||0)<0,
				severe:spec.malefic?severe:null,
				defense:[],
			});
		});
	});
	return output;
}

function createObject(id, type, lon, lat, ra, dec, speed, cusps, asc, jdUt, geo, dignity){
	lon = mod(lon, 360);
	const eq = { ra, dec };
	const horiz = horizontal(eq.ra, eq.dec, jdUt, geo);
	const whole = 180 - lon;
	const antisciaLon = mod(whole, 360);
	const cantisciaLon = mod(lon + 180, 360);
	const outOfBounds = Math.abs(dec) > 23.4367;
	const classicalId = id === 'North Node' ? 'NorthNode' : (id === 'South Node' ? 'SouthNode' : id);
	const meta = classicalSignData(lon,classicalId);
	const obj = {
		id, type, lon, lat: Number(lat) || 0, ra: mod(ra,360), decl: Number(dec) || 0,
		sign: signOf(lon), signlon: mod(lon,30), azimuth: horiz.azimuth,
		altitudeTrue: horiz.altitude, altitudeAppa: horiz.altitude, aboveHorizon: horiz.altitude > 0,
		lonspeed: Number(speed) || 0,
		movedir: speed < -0.00001 ? 'Retrograde' : speed > 0.00001 ? 'Direct' : 'Stationary',
		outOfBounds, oobDelta: outOfBounds ? (dec < 0 ? dec + 23.4367 : dec - 23.4367) : 0,
		wholeSignHouse: wholeSignHouse(lon, asc),
		house: 'House' + houseIndex(lon, cusps),
		antisciaPoint: { lon: antisciaLon, sign: signOf(antisciaLon), signlon: mod(antisciaLon,30) },
		cantisciaPoint: { lon: cantisciaLon, sign: signOf(cantisciaLon), signlon: mod(cantisciaLon,30) },
		su: mansion27(lon),
		mansion: mansionOf(lon),
		degreeQuality: degreeQuality(signOf(lon),mod(lon,30)),
		specialDegree: specialDegree(signOf(lon),mod(lon,30)),
		monomoiria: monomoiriaRuler(lon),
		ninthPart: ninthPartSign(lon),
		darijan: darijanRuler(signOf(lon),mod(lon,30)),
		degreeGender: degreeGender(signOf(lon),mod(lon,30)),
		dignities: meta.dignities,
		selfDignity: meta.selfDignity,
		score: meta.score,
		joyHouse: meta.joyHouse,
		joy: !!meta.joyHouse && houseIndex(lon,cusps) === Number(meta.joyHouse),
	};
	return obj;
}

function enrichClassicalPlanetData(objects, chart, jdUt){
	const sun = objects.find((obj)=>obj && obj.id === 'Sun');
	const sunLon = sun ? sun.lon : null;
	const isDay = !!(sun && sun.altitudeTrue > 0);
	const classics = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
	objects.forEach((obj)=>{
		if(!obj || classics.indexOf(obj.id) < 0){ return; }
		obj.ofSect = obj.id === 'Sun' ? isDay
			: (obj.id === 'Moon' ? !isDay
				: (obj.id === 'Jupiter' || obj.id === 'Saturn' ? isDay
					: (obj.id === 'Venus' || obj.id === 'Mars' ? !isDay
						: (sunLon === null ? false : mod(obj.lon - sunLon + 180,360) - 180 < 0))));
		if(obj.id !== 'Sun' && obj.id !== 'Moon' && sunLon !== null){
			const elong = angularDistance(obj.lon,sunLon);
			obj.phasisElong = elong;
			obj.phase = elong <= (17/60) ? 'cazimi' : (elong <= 8.5 ? 'combust' : (elong <= 15 ? 'under_beams' : 'free'));
		}
		if(obj.id !== 'Sun'){
			const relevant = (chart.aspects || []).some((aspect)=>{
				const a = BODY_DEFS.find((def)=>def[0] === aspect.a);
				const b = BODY_DEFS.find((def)=>def[0] === aspect.b);
				const idA = a ? a[1] : aspect.a, idB = b ? b[1] : aspect.b;
				return (idA === obj.id && classics.includes(idB) && idB !== obj.id)
					|| (idB === obj.id && classics.includes(idA) && idA !== obj.id);
			});
			obj.feral = !relevant;
		}
	});
	return isDay;
}

function makeAngle(id, lon, house, cusps, asc, jdUt, geo, jde){
	const eq = equatorialFor(lon, 0, jde);
	const object = createObject(id, 'Generic', lon, 0, eq.ra, eq.dec, 0, cusps, asc, jdUt, geo, []);
	object.house = 'House' + house;
	return object;
}

function makeAspectBuckets(objectIds, aspects){
	const result = {};
	objectIds.forEach((id)=>{ result[id] = { Applicative: [], Separative: [], Exact: [], None: [], Obvious: [] }; });
	(aspects || []).forEach((asp)=>{
		const one = BODY_DEFS.find((item)=>item[0] === asp.a);
		const two = BODY_DEFS.find((item)=>item[0] === asp.b);
		const id1 = one ? one[1] : asp.a, id2 = two ? two[1] : asp.b;
		if(!result[id1]){ result[id1] = { Applicative: [], Separative: [], Exact: [], None: [], Obvious: [] }; }
		const angle = ASPECTS.find((item)=>item.name === asp.aspect);
		if(!angle){ return; }
		const row = { id: id2, asp: angle.deg, orb: Number(asp.orb) };
		const group = asp.phase === 'applying' ? 'Applicative' : asp.phase === 'separating' ? 'Separative' : 'Exact';
		result[id1][group].push(row);
		if(Number(asp.orb) <= 3){ result[id1].Obvious.push(row); }
	});
	return { normalAsp: result, immediateAsp: {}, signAsp: {} };
}

function makeHouses(chart, objects, label){
	const cusps = chart.cusps.map((value)=>mod(value,360));
	const rows = cusps.map((lon,index)=>{
		const next = cusps[(index+1)%12];
		const eq = equatorialFor(lon,0,chart.jdUt);
		const sign = signOf(lon);
		return {
			id: 'House' + (index+1), type: 'House', lon, lat: 0, ra: eq.ra, decl: eq.dec,
			sign, signlon: mod(lon,30), azimuth: 0, altitudeTrue: 0, altitudeAppa: 0,
			size: mod(next-lon,360), hsys: label,
			planets: objects.filter((obj)=>obj.type === 'Planet' && obj.house === 'House' + (index+1)).map((obj)=>obj.id),
			ruler: ({ Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon', Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars', Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter' })[sign],
			exalt: ({ Aries:'Sun', Taurus:'Moon', Cancer:'Jupiter', Virgo:'Mercury', Libra:'Saturn', Capricorn:'Mars', Pisces:'Venus' })[sign],
		};
	});
	return rows.sort((a,b)=>a.lon-b.lon);
}

function makeFixedStarRows(engine, chart, geo){
	const names = engine.starNames();
	const rows = [];
	for(let i=0;i<names.length;i++){
		let star;
		try{ star = engine.fixedStar(names[i], chart.jdUt, { zodiac: chart.zodiac }); }catch(e){ continue; }
		if(!Number.isFinite(Number(star.mag)) || Number(star.mag) > 4.0){ continue; }
		const horiz = horizontal(star.ra, star.dec, chart.jdUt, geo);
		rows.push({
			id: names[i], type: 'Fixed Star', lon: mod(star.lon,360), lat: star.lat,
			ra: mod(star.ra,360), decl: star.dec, sign: star.sign, signlon: star.signDeg,
			azimuth: horiz.azimuth, altitudeTrue: horiz.altitude, altitudeAppa: horiz.altitude,
			mag: [star.mag, names[i]], name: names[i],
		});
	}
	return rows.sort((a,b)=>a.lon-b.lon);
}

function makeStarConjunctions(engine, chart, objectIds){
	const grouped = {};
	objectIds.forEach((id)=>{ grouped[id] = []; });
	let matches = [];
	try{ matches = engine.starConjunctions(chart,{ orb: 1.5, maxMag: 4.0 }); }catch(e){ matches = []; }
	matches.forEach((match)=>{
		const def = BODY_DEFS.find((item)=>item[0] === match.body);
		const id = def ? def[1] : match.body;
		if(!grouped[id]){ grouped[id] = []; }
		try{
			const star = engine.fixedStar(match.star, chart.jdUt, { zodiac: chart.zodiac });
			grouped[id].push([match.star, star.sign, mod(star.lon,360), match.orb, match.star]);
		}catch(e){ /* a catalog gap must not invalidate a calculated chart */ }
	});
	return Object.keys(grouped).map((id)=>({ id, stars: grouped[id] }));
}

function makeSignsRA(jde){
	return AstroConst.LIST_SIGNS.map((id,index)=>{
		const eq = equatorialFor(index*30,0,jde);
		return { id, ra: eq.ra, decl: eq.dec };
	});
}

function formatDate(birth){
	return String(birth.year).padStart(4,'0') + '-' + String(birth.month).padStart(2,'0') + '-' + String(birth.day).padStart(2,'0');
}

function findPreviousSyzygy(engine, chart, jdUt, geo, houseSystem, zodiac){
	const moon = chart.bodies && chart.bodies.moon;
	const sun = chart.bodies && chart.bodies.sun;
	if(!moon || !sun){ return null; }
	const separation = mod(moon.lon - sun.lon,360);
	const target = separation >= 180 ? 180 : 0;
	const relativeSpeed = Number(moon.speed) - Number(sun.speed);
	if(!Number.isFinite(relativeSpeed) || relativeSpeed <= 0){ return null; }
	let candidate = jdUt - Math.max(0,(separation-target)/relativeSpeed);
	let syzygyChart = null;
	for(let iteration=0;iteration<4;iteration++){
		syzygyChart = engine.chartAt(candidate,geo.lat,geo.lon,{
			houseSystem,zodiac,bodies:['mean_lilith','true_lilith'],aspects:{},
		});
		const syzygyMoon = syzygyChart.bodies && syzygyChart.bodies.moon;
		const syzygySun = syzygyChart.bodies && syzygyChart.bodies.sun;
		if(!syzygyMoon || !syzygySun){ return null; }
		const error = mod(syzygyMoon.lon - syzygySun.lon - target + 180,360) - 180;
		const speed = Number(syzygyMoon.speed) - Number(syzygySun.speed);
		if(Math.abs(error) < 0.000001 || !Number.isFinite(speed) || speed <= 0){ break; }
		const next = candidate - error / speed;
		if(!Number.isFinite(next) || next > jdUt){ break; }
		candidate = next;
	}
	if(syzygyChart && Math.abs(Number(syzygyChart.jdUt)-candidate) > 1e-9){
		syzygyChart = engine.chartAt(candidate,geo.lat,geo.lon,{
			houseSystem,zodiac,bodies:['mean_lilith','true_lilith'],aspects:{},
		});
	}
	if(!syzygyChart || !syzygyChart.bodies || !syzygyChart.bodies.moon){ return null; }
	return { jdUt: candidate, lon: mod(syzygyChart.bodies.moon.lon,360) };
}

function legacyLotFormula(source, formula){
	if(!formula || formula.some((key)=>source[key] === undefined || source[key] === null || !Number.isFinite(Number(source[key])))){ return null; }
	const [a,b,c] = formula;
	return mod(Number(source[b]) + Number(source[c]) - Number(source[a]),360);
}

function buildLegacyLots(bodyIndex, cusps, asc, isDiurnal, fortune, spirit, syzygyLon){
	const source = {
		Sun: bodyIndex.sun && bodyIndex.sun.lon,
		Moon: bodyIndex.moon && bodyIndex.moon.lon,
		Mercury: bodyIndex.mercury && bodyIndex.mercury.lon,
		Venus: bodyIndex.venus && bodyIndex.venus.lon,
		Mars: bodyIndex.mars && bodyIndex.mars.lon,
		Jupiter: bodyIndex.jupiter && bodyIndex.jupiter.lon,
		Saturn: bodyIndex.saturn && bodyIndex.saturn.lon,
		Asc: asc,
		'Pars Fortuna': fortune,
		'Pars Spirit': spirit,
		Syzygy: syzygyLon,
		House2: cusps[1],
		House8: cusps[7],
		House9: cusps[8],
		House12: cusps[11],
	};
	[2,9,12].forEach((houseNumber)=>{
		const cusp = source['House'+houseNumber];
		const ruler = Number.isFinite(Number(cusp)) ? RULERS[signOf(cusp)] : null;
		source['LordHouse'+houseNumber] = ruler && bodyIndex[ruler.toLowerCase()] ? bodyIndex[ruler.toLowerCase()].lon : null;
	});
	const formulas = [
		{ id: AstroConst.PARS_SPIRIT, day:['Moon','Sun','Asc'], night:['Sun','Moon','Asc'] },
		{ id: AstroConst.PARS_FAITH, day:['Moon','Mercury','Asc'], night:['Mercury','Moon','Asc'] },
		{ id: AstroConst.PARS_SUBSTANCE, day:['LordHouse2','House2','Asc'], night:['LordHouse2','House2','Asc'] },
		{ id: AstroConst.PARS_WEDDING_MALE, day:['Saturn','Venus','Asc'], night:['Saturn','Venus','Asc'] },
		{ id: AstroConst.PARS_WEDDING_FEMALE, day:['Venus','Saturn','Asc'], night:['Venus','Saturn','Asc'] },
		{ id: AstroConst.PARS_SONS, day:['Jupiter','Saturn','Asc'], night:['Saturn','Jupiter','Asc'] },
		{ id: AstroConst.PARS_FATHER, day:['Sun','Saturn','Asc'], night:['Saturn','Sun','Asc'] },
		{ id: AstroConst.PARS_MOTHER, day:['Venus','Moon','Asc'], night:['Moon','Venus','Asc'] },
		{ id: AstroConst.PARS_BROTHERS, day:['Saturn','Jupiter','Asc'], night:['Saturn','Jupiter','Asc'] },
		{ id: AstroConst.PARS_DISEASES, day:['Saturn','Mars','Asc'], night:['Mars','Saturn','Asc'] },
		{ id: AstroConst.PARS_DEATH, day:['Moon','House8','Saturn'], night:['Moon','House8','Saturn'] },
		{ id: AstroConst.PARS_TRAVEL, day:['LordHouse9','House9','Asc'], night:['LordHouse9','House9','Asc'] },
		{ id: AstroConst.PARS_FRIENDS, day:['Moon','Mercury','Asc'], night:['Moon','Mercury','Asc'] },
		{ id: AstroConst.PARS_ENEMIES, day:['LordHouse12','House12','Asc'], night:['LordHouse12','House12','Asc'] },
		{ id: AstroConst.PARS_SATURN, day:['Saturn','Pars Fortuna','Asc'], night:['Pars Fortuna','Saturn','Asc'] },
		{ id: AstroConst.PARS_JUPITER, day:['Pars Spirit','Jupiter','Asc'], night:['Jupiter','Pars Spirit','Asc'] },
		{ id: AstroConst.PARS_MARS, day:['Mars','Pars Fortuna','Asc'], night:['Pars Fortuna','Mars','Asc'] },
		{ id: AstroConst.PARS_VENUS, day:['Pars Spirit','Venus','Asc'], night:['Venus','Pars Spirit','Asc'] },
		{ id: AstroConst.PARS_MERCURY, day:['Mercury','Pars Fortuna','Asc'], night:['Pars Fortuna','Mercury','Asc'] },
		{ id: AstroConst.PARS_HORSEMANSHIP, day:['Saturn','Moon','Asc'], night:['Moon','Saturn','Asc'] },
		{ id: AstroConst.PARS_LIFE, day:['Syzygy','Moon','Asc'], night:['Syzygy','Moon','Asc'] },
		{ id: AstroConst.PARS_RADIX, day:['Moon','Syzygy','Asc'], night:['Moon','Syzygy','Asc'] },
		{ id: AstroConst.PARS_EROS, day:['Venus','Pars Spirit','Asc'], night:['Pars Spirit','Venus','Asc'] },
		{ id: AstroConst.PARS_NECESSITY, day:['Mercury','Pars Fortuna','Asc'], night:['Pars Fortuna','Mercury','Asc'] },
		{ id: AstroConst.PARS_COURAGE, day:['Mars','Pars Fortuna','Asc'], night:['Pars Fortuna','Mars','Asc'] },
		{ id: AstroConst.PARS_VICTORY, day:['Jupiter','Pars Spirit','Asc'], night:['Pars Spirit','Jupiter','Asc'] },
		{ id: AstroConst.PARS_NEMESIS, day:['Saturn','Pars Fortuna','Asc'], night:['Pars Fortuna','Saturn','Asc'] },
		{ id: AstroConst.PARS_SONS_VALENS, day:['Jupiter','Mercury','Asc'], night:['Mercury','Jupiter','Asc'] },
		{ id: AstroConst.PARS_DAUGHTERS, day:['Jupiter','Venus','Asc'], night:['Venus','Jupiter','Asc'] },
		{ id: AstroConst.PARS_PRAXIS, day:['Mercury','Mars','Asc'], night:['Mars','Mercury','Asc'] },
		{ id: AstroConst.PARS_WEDDING_DOROTHEAN, day:['Sun','Venus','Asc'], night:['Venus','Sun','Asc'] },
	];
	const byId = {};
	formulas.forEach((definition)=>{
		const formula = isDiurnal ? definition.day : definition.night;
		const lon = legacyLotFormula(source,formula);
		if(lon === null){ return; }
		byId[definition.id] = {
			id: definition.id, type: 'Arabic Part', lon, lat: 0, ra: 0, decl: 0,
			sign: signOf(lon), signlon: mod(lon,30), azimuth: 0, altitudeTrue: 0, altitudeAppa: 0,
			house: 'House'+houseIndex(lon,cusps), wholeSignHouse: wholeSignHouse(lon,asc),
		};
	});
	if(Number.isFinite(Number(fortune)) && Number.isFinite(Number(spirit))){
		const delta = mod(spirit-fortune+180,360)-180;
		const basis = mod(asc + Math.abs(delta),360);
		byId[AstroConst.PARS_BASIS] = {
			id: AstroConst.PARS_BASIS, type:'Arabic Part', lon:basis, lat:0, ra:0, decl:0,
			sign:signOf(basis), signlon:mod(basis,30), azimuth:0, altitudeTrue:0, altitudeAppa:0,
			house:'House'+houseIndex(basis,cusps), wholeSignHouse:wholeSignHouse(basis,asc),
		};
	}
	const exaltationBase = isDiurnal ? 19 : 33;
	const exaltationLuminary = isDiurnal ? source.Sun : source.Moon;
	const exaltationLon = Number.isFinite(Number(exaltationLuminary)) ? mod(asc + exaltationBase - Number(exaltationLuminary),360) : null;
	if(exaltationLon !== null){
		byId[AstroConst.PARS_EXALTATION] = {
			id: AstroConst.PARS_EXALTATION, type:'Arabic Part', lon:exaltationLon, lat:0, ra:0, decl:0,
			sign:signOf(exaltationLon), signlon:mod(exaltationLon,30), azimuth:0, altitudeTrue:0, altitudeAppa:0,
			house:'House'+houseIndex(exaltationLon,cusps), wholeSignHouse:wholeSignHouse(exaltationLon,asc),
		};
	}
	return (AstroConst.LOTS || []).map((id)=>byId[id]).filter(Boolean);
}

export function calculateBrowserChart(values){
	const p = values || {};
	const eligible = canCalculateBrowserChart(p);
	if(!eligible.ok){ throw new Error(eligible.reason); }
	const birth = parseBirth(p);
	const geo = { lat: parseCoordinate(p.lat,'lat'), lon: parseCoordinate(p.lon,'lon') };
	const zodiac = resolveZodiac(p);
	const houseSystem = resolveHouseSystem(p.hsys);
	const jdUt = julianDay(birth.year,birth.month,birth.day,birth.hour-birth.zone,birth.minute,birth.second);
	const jde = jdTT(jdUt);
	const engine = getEngine();
	const zodiacOptions = { houseSystem, zodiac: zodiac.zodiac, bodies: ['chiron','ceres','pallas','juno','vesta','pholus','intp_apog','mean_lilith','true_lilith'] };
	const angleTable = {};
	ASPECTS.forEach((a)=>{ angleTable[a.name] = a.deg; });
	const chart = engine.chartAt(jdUt,geo.lat,geo.lon,{ ...zodiacOptions, aspects: angleTable });
	const cusps = chart.cusps.map((value)=>mod(value,360));
	const asc = chart.angles.asc;
	const objectRows = [];
	const bodyIndex = {};
	BODY_DEFS.forEach(([key,id])=>{
		const body = chart.bodies[key];
		if(!body){ return; }
		const object = createObject(id,'Planet',body.lon,body.lat,body.ra,body.dec,body.speed,cusps,asc,jdUt,geo,body.dignities);
		object.retrograde = !!body.retrograde;
		bodyIndex[key] = object;
		objectRows.push(object);
	});
	const nodeKey = String(p.westNodeType || '') === 'true' ? 'true_node' : 'mean_node';
	const node = chart.bodies[nodeKey];
	if(node){
		objectRows.push(createObject('North Node','Planet',node.lon,0,node.ra,node.dec,node.speed,cusps,asc,jdUt,geo,[]));
		objectRows.push(createObject('South Node','Planet',mod(node.lon+180,360),0,mod(node.ra+180,360),-node.dec,node.speed,cusps,asc,jdUt,geo,[]));
	}
	objectRows.push(
		makeAngle('Asc',chart.angles.asc,1,cusps,asc,jdUt,geo,jde),
		makeAngle('Desc',chart.angles.asc+180,7,cusps,asc,jdUt,geo,jde),
		makeAngle('MC',chart.angles.mc,10,cusps,asc,jdUt,geo,jde),
		makeAngle('IC',chart.angles.mc+180,4,cusps,asc,jdUt,geo,jde),
	);
	const day = !!(bodyIndex.sun && bodyIndex.sun.altitudeTrue > 0);
	const sun = bodyIndex.sun, moon = bodyIndex.moon, ascLon = chart.angles.asc;
	const fortune = day ? ascLon + moon.lon - sun.lon : ascLon + sun.lon - moon.lon;
	const spirit = day ? ascLon + sun.lon - moon.lon : ascLon + moon.lon - sun.lon;
	const syzygy = findPreviousSyzygy(engine,chart,jdUt,geo,houseSystem,zodiac.zodiac);
	if(syzygy){
		const syzygyEq = equatorialFor(syzygy.lon,0,jdTT(syzygy.jdUt));
		objectRows.push(createObject(AstroConst.SYZYGY,'Generic',syzygy.lon,0,syzygyEq.ra,syzygyEq.dec,0,cusps,ascLon,jdUt,geo,[]));
	}
	const lots = buildLegacyLots(bodyIndex,cusps,ascLon,day,fortune,spirit,syzygy ? syzygy.lon : null);
	const fortuna = {
		id: AstroConst.PARS_FORTUNA, type: 'Planet', lon: mod(fortune,360), lat: 0, ra: 0, decl: 0,
		sign: signOf(fortune), signlon: mod(fortune,30), azimuth: 0, altitudeTrue: 0, altitudeAppa: 0,
		house: 'House'+houseIndex(fortune,cusps), wholeSignHouse: wholeSignHouse(fortune,ascLon),
	};
	objectRows.push(fortuna);

	const mids = [
		['MoonSun','moon','sun'], ['JupiterVenus','jupiter','venus'], ['SaturnMars','saturn','mars'],
	].map(([id,a,b])=>{
		const first=bodyIndex[a], second=bodyIndex[b];
		if(!first||!second){ return null; }
		const delta=mod(second.lon-first.lon+180,360)-180;
		const lon=mod(first.lon+delta/2,360);
		const eq=equatorialFor(lon,(first.lat+second.lat)/2,jde);
		return createObject(id,'Middle',lon,(first.lat+second.lat)/2,eq.ra,eq.dec,0,cusps,ascLon,jdUt,geo,[]);
	}).filter(Boolean);
	objectRows.push(...mids);
	objectRows.sort((a,b)=>a.lon-b.lon);
	const label = AstroConst.HouseSys[String(p.hsys == null ? 1 : p.hsys)] || houseSystem;
	const houses = makeHouses(chart,objectRows,label);
	const isDiurnal = enrichClassicalPlanetData(objectRows,chart,jdUt);
	const objectIds = objectRows.map((obj)=>obj.id);
	const aspects = makeAspectBuckets(objectIds,chart.aspects);
	const receptions = buildReceptions(objectRows,p);
	const mutuals = buildMutuals(objectRows,p);
	const declParallel = buildDeclParallel(objectRows);
	const orientOccident = buildOrientOccidental(objectRows);
	const orientOccidentHouses = buildOrientOccidentalHouses(houses,objectRows);
	const attacks = {};
	CLASSICAL_PLANETS.forEach((id)=>{ const planet=objectRows.find((obj)=>obj.id===id); if(planet){ const attack=buildSurroundAttack(planet,Object.fromEntries(objectRows.map((obj)=>[obj.id,obj]))); if(attack.SunMoon.length||attack.VenusJupiter.length||attack.MarsSaturn.length||attack.MinDelta.length){ attacks[id]=attack; } } });
	const surround = { planets: buildSurroundPlanets(orientOccident), attacks, houses: buildSurroundHouses(houses,orientOccidentHouses), besiegement: [] };
	surround.besiegement = buildBesiegement(objectRows,attacks,mutuals,houses);
	const fixedStars = makeFixedStarRows(engine,chart,geo);
	const stars = makeStarConjunctions(engine,chart,objectIds);
	const signsRA = makeSignsRA(jde);
	const chartResult = {
		zodiacal: zodiac.label,
		date: { date: { jdn: Math.floor(jdUt+0.5) }, time: { value: birth.hour+birth.minute/60+birth.second/3600 }, utcoffset: { value: birth.zone }, jd: jdUt },
		geo, hsys: label, houses, objects: objectRows, nakshatras: null,
		siderealAyanamsa: zodiac.ayanamsa, isDiurnal,
		antiscias: {
			antiscia: objectRows.reduce((acc,obj)=>{ acc[obj.id]=obj.antisciaPoint; return acc; },{}),
			cantiscia: objectRows.reduce((acc,obj)=>{ acc[obj.id]=obj.cantisciaPoint; return acc; },{}),
		},
		stars, orientOccident: orientOccident, displayCoord: 'equatorial',
		fixedStarSu28: [], fixedStars, signsRA,
		signsRaDoubingSu28: [], su28Adjust: [], su28Virtual: [], beidou: [], beiji: [],
		timerStar: null, dayerStar: null, dayofweek: '',
		sunRiseTime: '', sunSetTime: '',
		browserEngine: {
			name: 'Caelus', version: '0.25.0',
			warnings: chart.warnings || [], unavailable: chart.unavailable || [],
			features: ['browser-native ephemeris', 'major aspects', 'supported houses', 'classical dignity and degree tables', 'legacy Arabic lots', 'fixed-star conjunctions', 'syzygy point'],
			notYetPorted: ['primary-direction PerChart data', 'Horosa Su28 / Beidou / Beiji catalogs', 'full receptions/mutuals/surround/guoStarSect parity', 'custom aspect/orb variants', 'sunrise/sunset and planetary-hour selectors'],
		},
	};
	const birthText = formatDate(birth) + ' ' + String(birth.hour).padStart(2,'0') + ':' + String(birth.minute).padStart(2,'0') + ':' + String(Math.floor(birth.second)).padStart(2,'0');
	const params = {
		...p, birth: birthText, date: p.date || formatDate(birth),
		time: p.time || birthText.slice(11), zone: (birth.zone>=0?'+':'-')+String(Math.floor(Math.abs(birth.zone))).padStart(2,'0')+':'+String(Math.round((Math.abs(birth.zone)%1)*60)).padStart(2,'0'),
		lat: geo.lat, lon: geo.lon, hsys: p.hsys == null ? 1 : p.hsys,
		zodiacal: zodiac.label, siderealAyanamsa: zodiac.ayanamsa,
	};
	return {
		ResultCode: 0,
		Result: {
			params, chart: chartResult, aspects, lots,
			receptions,
			mutuals,
			declParallel,
			surround,
			guoStarSect: { houses: [] },
			localEngine: 'caelus@0.25.0',
		},
	};
}

export default calculateBrowserChart;
