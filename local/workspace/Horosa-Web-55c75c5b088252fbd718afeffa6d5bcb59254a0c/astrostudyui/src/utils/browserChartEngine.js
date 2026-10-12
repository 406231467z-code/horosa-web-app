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
	if(nonDefault(p.predictive) || nonDefault(p.includePrimaryDirection) || nonDefault(p.pdtype)){
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
	const exaltEntry = Object.entries(HELLENISTIC.exaltation || {}).find((entry)=>entry[1] && Number(entry[1].sign) === signIndex);
	const fallEntry = Object.entries(HELLENISTIC.exaltation || {}).find((entry)=>entry[1] && Number(entry[1].sign) === opposite);
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

function buildReceptions(objects){
	const planets = objects.filter((obj)=>isClassicalPlanetId(obj.id));
	const normal = [], abnormal = [];
	const dignityKeys = ['ruler','exalt','dayTrip','nightTrip','partTrip','term','face','exile','fall'];
	const majorKeys = ['ruler','exalt'];
	planets.forEach((beneficiary)=>{
		planets.forEach((supplier)=>{
			if(beneficiary.id === supplier.id){ return; }
			const supplierRulerShip = dignityKeys.filter((key)=>beneficiary.dignities && beneficiary.dignities[key] === supplier.id);
			if(!supplierRulerShip.length){ return; }
			const beneficiaryDignity = (beneficiary.selfDignity || []).slice();
			const row = { beneficiary: beneficiary.id, supplier: supplier.id, beneficiaryDignity, supplierRulerShip };
			if(supplierRulerShip.some((key)=>majorKeys.includes(key)) && beneficiaryDignity.length){
				normal.push(row);
			}else{
				abnormal.push(row);
			}
		});
	});
	return { normal, abnormal };
}

function buildMutuals(objects){
	const planets = objects.filter((obj)=>isClassicalPlanetId(obj.id));
	const normal = [], abnormal = [];
	const keys = ['ruler','exalt','dayTrip','nightTrip','partTrip','term','face','exile','fall'];
	const hasMajor = (items)=>items.some((item)=>item === 'ruler' || item === 'exalt');
	for(let i=0;i<planets.length;i++){
		for(let j=i+1;j<planets.length;j++){
			const a = planets[i], b = planets[j];
			const aRulerShip = keys.filter((key)=>a.dignities && a.dignities[key] === b.id);
			const bRulerShip = keys.filter((key)=>b.dignities && b.dignities[key] === a.id);
			if(!aRulerShip.length || !bRulerShip.length){ continue; }
			const row = { planetA: { id: a.id, rulerShip: aRulerShip }, planetB: { id: b.id, rulerShip: bRulerShip } };
			if(hasMajor(aRulerShip) && hasMajor(bRulerShip)){ normal.push(row); }else{ abnormal.push(row); }
		}
	}
	return { normal, abnormal };
}

function buildDeclParallel(objects){
	const eligible = objects.filter((obj)=>obj && obj.type !== 'Arabic Part' && Number.isFinite(Number(obj.decl)));
	const parallel = [], contraParallel = {};
	for(let i=0;i<eligible.length;i++){
		for(let j=i+1;j<eligible.length;j++){
			const a=eligible[i], b=eligible[j];
			if(Math.abs(Number(a.decl)-Number(b.decl)) <= 1){
				parallel.push([a.id,b.id]);
			}
			if(Math.abs(Number(a.decl)+Number(b.decl)) <= 1){
				if(!contraParallel[a.id]){ contraParallel[a.id]=[]; }
				if(!contraParallel[b.id]){ contraParallel[b.id]=[]; }
				contraParallel[a.id].push(b.id);
				contraParallel[b.id].push(a.id);
			}
		}
	}
	return { parallel, contraParallel };
}

function buildSurroundPlanets(objects){
	const ids=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
	const planets=objects.filter((obj)=>ids.includes(obj.id) && Number.isFinite(Number(obj.lon))).sort((a,b)=>a.lon-b.lon);
	const result={};
	if(planets.length<3){ return result; }
	planets.forEach((planet,index)=>{
		const before=planets[(index-1+planets.length)%planets.length];
		const after=planets[(index+1)%planets.length];
		result[planet.id]=[
			{ id: before.id, delta: angularDistance(planet.lon,before.lon) },
			{ id: after.id, delta: angularDistance(planet.lon,after.lon) },
		];
	});
	return result;
}

function createObject(id, type, lon, lat, ra, dec, speed, cusps, asc, jdUt, geo, dignity){
	lon = mod(lon, 360);
	const eq = { ra, dec };
	const horiz = horizontal(eq.ra, eq.dec, jdUt, geo);
	const whole = 180 - lon;
	const antisciaLon = mod(whole, 360);
	const cantisciaLon = mod(lon + 180, 360);
	const outOfBounds = Math.abs(dec) > 23.4367;
	const obj = {
		id, type, lon, lat: Number(lat) || 0, ra: mod(ra,360), decl: Number(dec) || 0,
		sign: signOf(lon), signlon: mod(lon,30), azimuth: horiz.azimuth,
		altitudeTrue: horiz.altitude, altitudeAppa: horiz.altitude,
		lonspeed: Number(speed) || 0,
		movedir: speed < -0.00001 ? 'Retrograde' : speed > 0.00001 ? 'Direct' : 'Stationary',
		outOfBounds, oobDelta: outOfBounds ? (dec < 0 ? dec + 23.4367 : dec - 23.4367) : 0,
		wholeSignHouse: wholeSignHouse(lon, asc),
		house: 'House' + houseIndex(lon, cusps),
		antisciaPoint: { lon: antisciaLon, sign: signOf(antisciaLon), signlon: mod(antisciaLon,30) },
		cantisciaPoint: { lon: cantisciaLon, sign: signOf(cantisciaLon), signlon: mod(cantisciaLon,30) },
		su: mansion27(lon),
		dignities: dignity || [],
	};
	return obj;
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
	const zodiacOptions = { houseSystem, zodiac: zodiac.zodiac, bodies: ['chiron','ceres','pallas','juno','vesta','pholus','intp_apog','mean_lilith'] };
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
	const lotsRaw = [
		['Pars Fortuna',fortune],
		['Pars Spirit',spirit],
		['Pars Eros',ascLon+bodyIndex.venus.lon-spirit],
		['Pars Necessity',ascLon+fortune-bodyIndex.mercury.lon],
		['Pars Courage',ascLon+fortune-bodyIndex.mars.lon],
		['Pars Victory',ascLon+bodyIndex.jupiter.lon-spirit],
		['Pars Nemesis',ascLon+fortune-bodyIndex.saturn.lon],
	];
	const lots = lotsRaw.map(([id,longitude])=>{
		const lon=mod(longitude,360), house=houseIndex(lon,cusps);
		return { id, type:'Arabic Part', lon, lat:0, ra:0, decl:0, sign:signOf(lon), signlon:mod(lon,30), azimuth:0, altitudeTrue:0, altitudeAppa:0, house:'House'+house, wholeSignHouse:wholeSignHouse(lon,ascLon) };
	});
	const fortuna = lots.find((item)=>item.id==='Pars Fortuna');
	objectRows.push({ ...fortuna, type:'Planet' });
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
	const objectIds = objectRows.map((obj)=>obj.id);
	const aspects = makeAspectBuckets(objectIds,chart.aspects);
	const fixedStars = makeFixedStarRows(engine,chart,geo);
	const stars = makeStarConjunctions(engine,chart,objectIds);
	const signsRA = makeSignsRA(jde);
	const chartResult = {
		zodiacal: zodiac.label,
		date: { date: { jdn: Math.floor(jdUt+0.5) }, time: { value: birth.hour+birth.minute/60+birth.second/3600 }, utcoffset: { value: birth.zone }, jd: jdUt },
		geo, hsys: label, houses, objects: objectRows, nakshatras: null,
		siderealAyanamsa: zodiac.ayanamsa, isDiurnal: day,
		antiscias: {
			antiscia: objectRows.reduce((acc,obj)=>{ acc[obj.id]=obj.antisciaPoint; return acc; },{}),
			cantiscia: objectRows.reduce((acc,obj)=>{ acc[obj.id]=obj.cantisciaPoint; return acc; },{}),
		},
		stars, orientOccident: {}, displayCoord: 'equatorial',
		fixedStarSu28: [], fixedStars, signsRA,
		signsRaDoubingSu28: [], su28Adjust: [], su28Virtual: [], beidou: [], beiji: [],
		timerStar: null, dayerStar: null, dayofweek: '',
		sunRiseTime: '', sunSetTime: '',
		browserEngine: {
			name: 'Caelus', version: '0.25.0',
			warnings: chart.warnings || [], unavailable: chart.unavailable || [],
			features: ['core ephemeris', 'major aspects', 'supported quadrant/whole-sign houses', 'core lots and midpoints'],
			notYetPorted: ['primary-direction PerChart data', 'Horosa 28-mansion star catalogs', 'full receptions/mutuals/surround/guoStarSect', 'custom aspects and dignity variants', 'sunrise/sunset selectors'],
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
			receptions: { normal: [], abnormal: [] },
			mutuals: { normal: [], abnormal: [] },
			declParallel: { parallel: [], contraParallel: [] },
			surround: { planets: {}, attacks: {}, houses: {}, besiegement: {} },
			guoStarSect: { houses: [] },
			localEngine: 'caelus@0.25.0',
		},
	};
}

export default calculateBrowserChart;
