/**
 * Declination parallel. perchart.getParallel.
 * Same-sign |decl| difference <= 1° is parallel.
 * Opposite signs with the same absolute difference are contra-parallel.
 * This is not paransLocal.
 */
import { chartBodies } from './chartBodies.js';

export const PARALLEL_ORB_DEG = 1;

const POINT_ORDER = [
	'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
	'Uranus', 'Neptune', 'Pluto', 'Chiron', 'North Node', 'South Node',
	'Syzygy', 'Pars Fortuna', 'Dark Moon', 'Purple Clouds',
	'Pholus', 'Ceres', 'Pallas', 'Juno', 'Vesta', 'Intp_Apog', 'Intp_Perg',
	'MC', 'IC', 'Asc', 'Desc',
];

export function deriveDeclParallel(chart) {
	const bodies = chartBodies(chart);
	const extra = (chart.inputs && chart.inputs.declinationBodies) || {};
	for (const [id, obj] of Object.entries(extra)) {
		const prev = bodies.get(id);
		if (prev && typeof prev.decl === 'number' && Number.isFinite(prev.decl)) continue;
		if (obj && typeof obj.decl === 'number' && Number.isFinite(obj.decl)) {
			bodies.set(id, { ...(prev || {}), ...obj, id });
		}
	}
	const present = POINT_ORDER.filter((id) => {
		const body = bodies.get(id);
		return body && typeof body.decl === 'number' && Number.isFinite(body.decl);
	});
	const parallel = [];
	const contra = {};
	for (const idA of present) {
		const a = bodies.get(idA);
		for (const idB of present) {
			if (idA === idB) continue;
			const b = bodies.get(idB);
			const delta = Math.abs(a.decl - b.decl);
			const sameSign = a.decl * b.decl > 0;
			if (delta <= PARALLEL_ORB_DEG && sameSign) {
				let found = false;
				for (const group of parallel) {
					if (group.includes(idA)) {
						group.push(idB);
						found = true;
						break;
					}
				}
				if (!found) parallel.push([idA, idB]);
			} else if (!sameSign && Math.abs(Math.abs(a.decl) - Math.abs(b.decl)) <= PARALLEL_ORB_DEG) {
				if (!contra[idA]) contra[idA] = [];
				contra[idA].push(idB);
			}
		}
	}
	const parallelOut = parallel
		.map((group) => [...new Set(group)].sort())
		.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
	const contraOut = {};
	for (const id of Object.keys(contra)) contraOut[id] = [...new Set(contra[id])].sort();
	return {
		implementation: 'derived/declinationBrowser.js',
		toleranceSource: 'perchart.getParallel literal threshold delta <= 1 degree',
		toleranceDeg: PARALLEL_ORB_DEG,
		status: 'COMPUTED',
		bodies: present,
		parallel: parallelOut,
		contraParallel: contraOut,
	};
}
