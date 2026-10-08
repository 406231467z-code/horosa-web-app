// 地占盾牌：移植 astropy/astrostudy/geomancy/shield.py、house.py、figures.py、
// random_source.py 与 CPython Modules/_randommodule.c 的 MT19937。
// 图形目录是仓内 figures.json 的盘面字段，不是新写的传统表。
import FIG from './geomancyFigures.slim.json';
import { ephemerisLicenseStatus } from './calcStatus';
import { createPythonRandom } from './pythonRandom';

const GOLDEN_DAWN_HOUSES = [10, 1, 4, 7, 11, 2, 5, 8, 12, 3, 6, 9];

function add(a, b){
	return (a ^ b) & 15;
}

function points(fig){
	let n = 0;
	for(let b = 0; b < 4; b += 1){
		n += (fig >> b) & 1 ? 1 : 2;
	}
	return n;
}

function daughtersFromMothers(mothers){
	const daughters = [];
	for(let j = 0; j < 4; j += 1){
		let f = 0;
		for(let k = 0; k < 4; k += 1){
			const bit = (mothers[k] >> (3 - j)) & 1;
			f |= bit << (3 - k);
		}
		daughters.push(f);
	}
	return daughters;
}

function castShieldFromMothers(mothers){
	if(!mothers || mothers.length !== 4){
		throw new Error('geomancy.mothers');
	}
	const daughters = daughtersFromMothers(mothers);
	const nieces = [
		add(mothers[0], mothers[1]),
		add(mothers[2], mothers[3]),
		add(daughters[0], daughters[1]),
		add(daughters[2], daughters[3]),
	];
	const rightWitness = add(nieces[0], nieces[1]);
	const leftWitness = add(nieces[2], nieces[3]);
	const judge = add(rightWitness, leftWitness);
	if(points(judge) % 2 !== 0){
		throw new Error('geomancy.judge.parity');
	}
	return {
		mothers,
		daughters,
		nieces,
		rightWitness,
		leftWitness,
		judge,
		reconciler: add(judge, mothers[0]),
	};
}

function mothersFromBits(bits, fill){
	const mothers = [0, 0, 0, 0];
	for(let i = 0; i < 4; i += 1){
		let f = 0;
		for(let k = 0; k < 4; k += 1){
			const b = bits[i * 4 + k] & 1;
			f |= b << (fill === 'bottom_up' ? k : (3 - k));
		}
		mothers[i] = f;
	}
	return mothers;
}

function mothersFromNumbers(numbers){
	if(!Array.isArray(numbers) || numbers.length !== 16){
		throw new Error('geomancy.numbers');
	}
	const mothers = [0, 0, 0, 0];
	for(let i = 0; i < 4; i += 1){
		let f = 0;
		for(let k = 0; k < 4; k += 1){
			if(Math.abs(Number(numbers[i * 4 + k])) % 2 === 1){
				f |= 1 << (3 - k);
			}
		}
		mothers[i] = f;
	}
	return mothers;
}

function freshSeed(){
	if(typeof crypto !== 'undefined' && crypto.getRandomValues){
		const buf = new Uint32Array(1);
		crypto.getRandomValues(buf);
		return buf[0];
	}
	return Math.floor(Math.random() * 0x100000000);
}

function figDict(n){
	const f = FIG[String(n & 15)];
	if(!f){
		return null;
	}
	return {
		int: f.int,
		nameEn: f.latin,
		nameZh: f.name_zh,
		dots: f.bits.slice(),
		element: f.element_inner,
		elementZh: f.element_inner_zh,
		planet: f.planet,
		planetZh: f.planet_zh,
		quality: f.quality,
		qualityZh: f.quality_zh,
		keywordsZh: f.nature,
		points: f.points,
		tone: f.tone,
	};
}

function houseChart(shield, placement){
	const mothers = shield.mothers;
	const daughters = shield.daughters;
	const order = mothers.concat(daughters, shield.nieces);
	const map = {};
	if(placement === 'angular'){
		map[1] = mothers[0];
		map[10] = mothers[1];
		map[7] = mothers[2];
		map[4] = mothers[3];
		map[11] = daughters[0];
		map[2] = daughters[1];
		map[8] = daughters[2];
		map[5] = daughters[3];
		map[3] = add(mothers[2], daughters[1]);
		map[6] = add(mothers[1], daughters[0]);
		map[9] = add(mothers[0], daughters[3]);
		map[12] = add(mothers[3], daughters[2]);
	}else if(placement === 'golden_dawn'){
		for(let i = 0; i < 12; i += 1){
			map[GOLDEN_DAWN_HOUSES[i]] = order[i];
		}
	}else{
		for(let h = 0; h < 12; h += 1){
			map[h + 1] = order[h];
		}
	}
	const houses = [];
	for(let house = 1; house <= 12; house += 1){
		houses.push({
			house,
			figure: figDict(map[house]),
		});
	}
	return houses;
}

export function computeGeomancyReading(payload){
	const body = payload || {};
	const castMethod = body.castMethod || body.cast_method || '';
	const numbers = body.castNumbers || body.cast_numbers;
	const placement = body.housePlacement || body.house_placement || 'sequential';
	let seed = null;
	let mothers;
	if(castMethod === 'numbers'){
		try{
			mothers = mothersFromNumbers(numbers);
		}catch(e){
			return {
				status: 'INVALID_INPUT',
				provider: 'browser',
				code: 'GEOMANCY_NUMBERS',
				feature: 'geomancy',
				message: '报数起占须十六个整数。',
			};
		}
		if(body.seed === 0 || Number.isFinite(Number(body.seed))){
			seed = Number(body.seed) || 0;
		}
	}else{
		if(castMethod === 'time' && (body.timeSeed === 0 || Number.isFinite(Number(body.timeSeed)))){
			seed = Number(body.timeSeed) || 0;
		}else if(body.seed === 0 || Number.isFinite(Number(body.seed))){
			seed = Number(body.seed) || 0;
		}else{
			seed = freshSeed();
		}
		const rng = createPythonRandom(seed);
		const bits = [];
		for(let i = 0; i < 16; i += 1){
			bits.push(rng.randint01());
		}
		mothers = mothersFromBits(bits, body.fill === 'bottom_up' ? 'bottom_up' : 'top_down');
	}
	const shield = castShieldFromMothers(mothers);
	const motherFigures = shield.mothers.map(figDict);
	const daughterFigures = shield.daughters.map(figDict);
	const nieceFigures = shield.nieces.map(figDict);
	const rightWitness = figDict(shield.rightWitness);
	const leftWitness = figDict(shield.leftWitness);
	const judge = figDict(shield.judge);
	const reconciler = figDict(shield.reconciler);
	const wantsEphemeris = body.planetaryChart === true
		|| body.asc_source === 'real_chart'
		|| body.ascSource === 'real_chart'
		|| body.house_projection === 'real_ephemeris'
		|| body.houseProjection === 'real_ephemeris';
	const reading = {
		question: body.question || '',
		questionType: body.questionType || body.question_type || 'custom',
		motherFigures,
		daughterFigures,
		nieceFigures,
		rightWitness,
		leftWitness,
		judge,
		reconciler,
		figures16: motherFigures.concat(daughterFigures, nieceFigures, [rightWitness, leftWitness, judge, reconciler]),
		houses: houseChart(shield, placement),
		ascendantFigure: motherFigures[0],
		seed,
		settings: {
			cast_method: castMethod || (Number.isFinite(Number(body.seed)) ? 'manual' : 'rng'),
			cast_numbers: castMethod === 'numbers' ? numbers.slice() : undefined,
			mark_style: body.mark_style || body.markStyle || 'dots',
			house_placement: placement,
			seed,
		},
	};
	if(wantsEphemeris){
		reading.ephemeris = ephemerisLicenseStatus('geomancy-ephemeris');
	}
	return {
		status: 'SUCCESS',
		provider: 'browser',
		engine: 'geomancyBrowser',
		reading,
	};
}
