// Browser-native primary-direction pole calculations.
// Port of astrostudy.pd_engine pole functions + PerPredict.getPdPoles output contract.
// This endpoint is metadata for the optional Pole column; it must never call a service.

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const CORE_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
const EXTRA_CUSPS = ['House2', 'House3', 'House5', 'House6', 'House8', 'House9', 'House11', 'House12'];

function finite(value){
	return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function norm360(value){
	return ((Number(value) % 360) + 360) % 360;
}

function norm180(value){
	return ((Number(value) + 180) % 360 + 360) % 360 - 180;
}

function sinD(value){ return Math.sin(Number(value) * DEG); }
function cosD(value){ return Math.cos(Number(value) * DEG); }
function tanD(value){ return Math.tan(Number(value) * DEG); }
function asinD(value){ return Math.asin(Math.max(-1, Math.min(1, value))) * RAD; }
function atanD(value){ return Math.atan(value) * RAD; }
function atan2D(y, x){ return Math.atan2(y, x) * RAD; }

function parseCoordinate(value){
	if(finite(value)){ return Number(value); }
	const text = String(value || '').trim();
	if(!text){ return NaN; }
	const m = text.match(/^([+-])?\s*(\d{1,3})(?:[°:\s])?\s*([NSEWnsew])?\s*(\d{1,2}(?:\.\d+)?)?\s*(?:['′:]?\s*(\d{1,2}(?:\.\d+)?))?/);
	if(m && (m[2] !== undefined)){
		const degree = Number(m[2]);
		const minute = Number(m[4] || 0);
		const second = Number(m[5] || 0);
		let sign = m[1] === '-' ? -1 : 1;
		if(m[3] && /[SW]/i.test(m[3])){ sign = -1; }
		return sign * (degree + minute / 60 + second / 3600);
	}
	const n = Number(text);
	return Number.isFinite(n) ? n : NaN;
}

function parseZoneHours(value){
	const text = String(value == null ? '+00:00' : value).trim();
	const m = text.match(/^(?:UTC|GMT)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i);
	if(!m){ return 0; }
	const sign = m[1] === '-' ? -1 : 1;
	return sign * (Number(m[2]) + Number(m[3] || 0) / 60);
}

function julianDayFromOptions(params){
	const rawDate = String(params.date || params.birth || '').trim();
	const datePart = rawDate.split(/\s+/)[0].replace(/\//g, '-');
	const d = datePart.match(/^(\d{1,4})-(\d{1,2})-(\d{1,2})$/);
	if(!d){ return NaN; }
	const timePart = String(params.time || (rawDate.split(/\s+/)[1]) || '00:00:00');
	const t = timePart.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}(?:\.\d+)?))?$/);
	const hour = t ? Number(t[1]) : 0;
	const minute = t ? Number(t[2]) : 0;
	const second = t ? Number(t[3] || 0) : 0;
	const localMs = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), hour, minute, second);
	const utcMs = localMs - parseZoneHours(params.zone) * 3600000;
	return utcMs / 86400000 + 2440587.5;
}

function meanObliquity(jd){
	// Laskar/Meeus mean obliquity; pole values are displayed to 0.0001 degree.
	const t = (Number(jd) - 2451545) / 36525;
	const arcsec = 21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813));
	return 23 + (26 + arcsec / 60) / 60;
}

function eclipticToEquatorial(lon, lat, eps){
	const l = Number(lon) * DEG;
	const b = Number(lat) * DEG;
	const e = Number(eps) * DEG;
	const ra = Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l)) * RAD;
	const decl = Math.asin(Math.max(-1, Math.min(1,
		Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l)
	))) * RAD;
	return { ra: norm360(ra), decl };
}

function meanSiderealAtGreenwich(jd){
	const t = (jd - 2451545) / 36525;
	return norm360(280.46061837 + 360.98564736629 * (jd - 2451545)
		+ 0.000387933 * t * t - t * t * t / 38710000);
}

function ascensionalDifference(dec, phi){
	return asinD(tanD(phi) * tanD(dec));
}

function semiarc(dec, phi, diurnal){
	const ad = ascensionalDifference(dec, phi);
	return diurnal ? 90 + ad : 90 - ad;
}

function isAboveHorizon(ra, dec, armc, phi){
	return Math.abs(norm180(armc - ra)) < semiarc(dec, phi, true);
}

function poleRegiomontanus(ra, dec, armc, phi){
	const h = norm180(armc - ra);
	const hE = atan2D(sinD(h), cosD(h) + tanD(phi) * tanD(dec));
	const adPole = norm180(hE - h);
	if(Math.abs(dec) < 1e-9){ return 0; }
	return atanD(sinD(adPole) / tanD(dec));
}

function poleTopocentric(ra, dec, armc, phi){
	let r;
	if(isAboveHorizon(ra, dec, armc, phi)){
		r = norm180(ra - armc) / semiarc(dec, phi, true);
	}else{
		const night = semiarc(dec, phi, false);
		r = night ? norm180(ra - (armc + 180)) / night : 0;
	}
	return atanD(Math.abs(r) * tanD(phi));
}

function polePlacidusApprox(ra, dec, armc, phi){
	const above = isAboveHorizon(ra, dec, armc, phi);
	const base = above ? armc : armc + 180;
	const sa = semiarc(dec, phi, above);
	const r = sa ? norm180(ra - (above ? armc : armc + 180)) / sa : 0;
	const mp = norm360(base + 90 * r);
	const adS = norm180(ra - mp);
	if(Math.abs(dec) < 1e-9){ return 0; }
	return atanD(sinD(adS) / tanD(dec));
}

function resolveProjection(params){
	const direct = String(params.pdProjection || params.projection || '').toLowerCase();
	if(direct){ return direct; }
	const method = String(params.pdMethod || 'core_alchabitius').toLowerCase();
	if(method.includes('regiomontanus') || method.includes('regio')){ return 'regiomontanus'; }
	if(method.includes('campanus')){ return 'campanus'; }
	if(method.includes('topocentric')){ return 'topocentric'; }
	if(method.includes('placidus')){ return 'placidus'; }
	return 'ptolemy';
}

function findById(chart, id){
	const lists = [chart.objects, chart.angles];
	for(let i = 0; i < lists.length; i++){
		const list = lists[i];
		if(Array.isArray(list)){
			const found = list.find((item)=>item && item.id === id);
			if(found){ return found; }
		}else if(list && typeof list === 'object' && list[id]){
			return list[id];
		}
	}
	return null;
}

function allObjects(chart){
	const list = [];
	[chart.objects, chart.angles].forEach((items)=>{
		if(Array.isArray(items)){ list.push(...items); }
		else if(items && typeof items === 'object'){ list.push(...Object.keys(items).map((k)=>items[k])); }
	});
	return list;
}

function localExtraPoints(chart, params){
	const keys = Array.isArray(params.pdSignificators) ? params.pdSignificators : [];
	const points = [];
	const objectIds = new Set(allObjects(chart).map((item)=>item && item.id).filter(Boolean));
	if(keys.includes('Syzygy') && objectIds.has('Syzygy')){
		const o = findById(chart, 'Syzygy');
		points.push({ id: 'Syzygy', lon: Number(o.lon), lat: Number(o.lat) || 0 });
	}
	if(keys.includes('Spirit')){
		const asc = findById(chart, 'Asc');
		const sun = findById(chart, 'Sun');
		const moon = findById(chart, 'Moon');
		if(asc && sun && moon && finite(asc.lon) && finite(sun.lon) && finite(moon.lon)){
			const isDay = chart.isDiurnal === true || chart.isDiurnal === 1 || chart.isDiurnal === '1';
			const lon = isDay ? Number(asc.lon) + Number(sun.lon) - Number(moon.lon)
				: Number(asc.lon) + Number(moon.lon) - Number(sun.lon);
			points.push({ id: 'Spirit', lon: norm360(lon), lat: 0 });
		}
	}
	if(keys.includes('Cusps') && Array.isArray(chart.houses)){
		chart.houses.forEach((house)=>{
			if(house && EXTRA_CUSPS.includes(house.id) && finite(house.lon)){
				points.push({ id: house.id, lon: Number(house.lon), lat: 0 });
			}
		});
	}
	// Fixed-star signification is not a core event-table set. Preserve only star records
	// for which this chart already has an explicit ecliptic coordinate; do not fetch a server.
	if(keys.includes('Stars') && Array.isArray(chart.fixedStars)){
		chart.fixedStars.forEach((star)=>{
			if(star && star.id && finite(star.lon)){
				points.push({ id: String(star.id), lon: Number(star.lon), lat: Number(star.lat) || 0 });
			}
		});
	}
	return points;
}

/**
 * Compute the same { projection, poles } shape as GET /predict/pdpoles used to return.
 * Returns null when the provided chart does not contain enough real calculation data.
 */
export function computePdPolesLocal(envelope, options = {}){
	const outer = envelope && envelope.Result && typeof envelope.Result === 'object'
		? envelope.Result : (envelope || {});
	const chart = outer.chart && typeof outer.chart === 'object' ? outer.chart : outer;
	const params = { ...((outer && outer.params) || {}), ...(options || {}) };
	if(!chart || typeof chart !== 'object' || !Array.isArray(chart.objects)){
		return null;
	}
	const geo = chart.geo || {};
	const phiRaw = finite(geo.lat) ? Number(geo.lat) : parseCoordinate(params.lat);
	const lonRaw = finite(geo.lon) ? Number(geo.lon) : parseCoordinate(params.lon);
	const jd = finite(chart.date && chart.date.jd) ? Number(chart.date.jd) : julianDayFromOptions(params);
	if(!Number.isFinite(phiRaw) || !Number.isFinite(lonRaw) || !Number.isFinite(jd)){
		return null;
	}
	const mc = findById(chart, 'MC');
	const armc = mc && finite(mc.ra) ? norm360(mc.ra) : norm360(meanSiderealAtGreenwich(jd) + lonRaw);
	const eps = meanObliquity(jd);
	const projection = resolveProjection(params);
	const pdtype = Number(params.pdtype || 0);
	const zodiacal = pdtype === 0;
	const poleFn = projection === 'regiomontanus' || projection === 'campanus'
		? poleRegiomontanus
		: (projection === 'topocentric' ? poleTopocentric : polePlacidusApprox);
	const poles = {
		Asc: Number(phiRaw.toFixed(4)),
		MC: 0,
		Desc: Number(phiRaw.toFixed(4)),
		IC: 0,
	};
	const names = CORE_PLANETS.concat(localExtraPoints(chart, params).map((item)=>item.id));
	const extras = localExtraPoints(chart, params);
	names.forEach((name)=>{
		if(!name || ['Asc', 'MC', 'Desc', 'IC'].includes(name)){ return; }
		let point = findById(chart, name);
		if(!point){
			point = extras.find((item)=>item.id === name) || null;
		}
		if(!point || !finite(point.lon)){ return; }
		let eq;
		if(zodiacal){
			eq = eclipticToEquatorial(Number(point.lon), 0, eps);
		}else if(finite(point.ra) && finite(point.decl)){
			eq = { ra: Number(point.ra), decl: Number(point.decl) };
		}else{
			eq = eclipticToEquatorial(Number(point.lon), Number(point.lat) || 0, eps);
		}
		try{
			const pole = poleFn(eq.ra, eq.decl, armc, phiRaw);
			if(Number.isFinite(pole)){ poles[name] = Number(pole.toFixed(4)); }
		}catch(e){ /* A singular pole is omitted, never replaced with a fabricated value. */ }
	});
	return { projection, poles, local: true };
}

export default computePdPolesLocal;
