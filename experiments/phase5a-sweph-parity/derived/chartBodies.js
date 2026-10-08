/**
 * Body map for derived layers. Reads chart JSON only.
 */
import { norm, signOf } from '../productionRules.js';

export function chartBodies(chart) {
	const bodies = new Map();
	for (const obj of Object.values(chart.objects || {})) {
		const lon = obj.lon;
		bodies.set(obj.id, {
			...obj,
			type: 'Planet',
			sign: signOf(lon),
			signlon: norm(lon) % 30,
		});
	}
	for (const ang of Object.values(chart.ascmc || {})) {
		bodies.set(ang.id, {
			...ang,
			type: 'Angle',
			lat: 0,
			lonspeed: 0,
			sign: signOf(ang.lon),
			signlon: norm(ang.lon) % 30,
		});
	}
	for (const house of Object.values((chart.houses && chart.houses.cusps) || {})) {
		bodies.set(house.id, {
			...house,
			type: 'House',
			sign: signOf(house.lon),
			signlon: norm(house.lon) % 30,
		});
	}
	return bodies;
}
