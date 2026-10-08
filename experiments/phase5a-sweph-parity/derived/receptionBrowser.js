/**
 * Reception and mutual reception.
 * perchart.getReceptions / getMutuals, tradition false, strongRecption true.
 * receives(): B aspects A by a major aspect inside B's orb, and B sits in A's dignities.
 * isAspecting uses a strict orb test (orb < body orb).
 */
import { MAJOR, orbOf, rawAspect } from '../productionRules.js';
import { chartBodies } from './chartBodies.js';
import { inDignities, selfDignity } from './dignityTables.js';

const PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

function isAspecting(starter, target) {
	const dict = rawAspect(starter, target, MAJOR);
	if (!dict) return false;
	return dict.orb < orbOf(starter.id);
}

function receives(bodies, supplierId, beneficiaryId) {
	const supplier = bodies.get(supplierId);
	const beneficiary = bodies.get(beneficiaryId);
	if (!supplier || !beneficiary) return [];
	if (!isAspecting(beneficiary, supplier)) return [];
	return inDignities(beneficiary, supplierId);
}

function excludeBad(name) {
	return name !== 'exile' && name !== 'fall';
}

function isStrongGood(name) {
	return name === 'exalt' || name === 'ruler';
}

export function deriveReception(chart) {
	const bodies = chartBodies(chart);
	const receptions = { normal: [], abnormal: [] };
	const mutuals = { normal: [], abnormal: [] };
	const seen = [];

	for (const supplierId of PLANETS) {
		for (const beneficiaryId of PLANETS) {
			if (supplierId === beneficiaryId) continue;
			const beneficiary = bodies.get(beneficiaryId);
			if (!beneficiary) continue;
			const rec = receives(bodies, supplierId, beneficiaryId);
			if (rec.length === 0) continue;
			const list = rec.filter(excludeBad);
			if (list.includes('exalt') || list.includes('ruler')) {
				const dig = selfDignity(beneficiaryId, beneficiary);
				const obj = {
					beneficiary: beneficiaryId,
					supplier: supplierId,
					beneficiaryDignity: dig,
					supplierRulerShip: rec,
				};
				if (dig.includes('exile') || dig.includes('fall')) receptions.abnormal.push(obj);
				else receptions.normal.push(obj);
			}
		}
	}

	for (const itemA of PLANETS) {
		for (const itemB of PLANETS) {
			if (itemA === itemB) continue;
			if (seen.some((pair) => pair.includes(itemA) && pair.includes(itemB))) continue;
			const bodyA = bodies.get(itemA);
			const bodyB = bodies.get(itemB);
			if (!bodyA || !bodyB) continue;
			const orgab = inDignities(bodyA, itemB);
			const orgba = inDignities(bodyB, itemA);
			const ablist = orgab.filter(excludeBad);
			const balist = orgba.filter(excludeBad);
			const abgood = ablist.filter(isStrongGood);
			const bagood = balist.filter(isStrongGood);
			if (abgood.length > 0 && bagood.length > 0) {
				seen.push([itemA, itemB]);
				const dignity = [balist, ablist];
				const elm = {
					planetA: { id: itemA, rulerShip: dignity[0] },
					planetB: { id: itemB, rulerShip: dignity[1] },
				};
				const abnormal = dignity[0].some((name) => name === 'exile' || name === 'fall')
					|| dignity[1].some((name) => name === 'exile' || name === 'fall');
				if (abnormal) mutuals.abnormal.push(elm);
				else mutuals.normal.push(elm);
			}
		}
	}

	return {
		implementation: 'derived/receptionBrowser.js',
		rulerSource: 'flatlib/dignities/tables.py ESSENTIAL_DIGNITIES + EGYPTIAN_TERMS + CHALDEAN_FACES; perchart.getReceptions strongRecption=true',
		status: 'COMPUTED',
		receptions,
		mutuals,
	};
}
