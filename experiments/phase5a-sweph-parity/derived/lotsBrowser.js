/**
 * Arabic parts from chart JSON.
 * Formulas: flatlib/tools/arabicparts.py. Day/night from diurnalBrowser.
 * Pars Life and Pars Radix use Syzygy when chart.inputs.syzygy is present.
 * Day and night formulas for those two lots are the same.
 */
import { fillLots } from '../productionRules.js';
import { chartBodies } from './chartBodies.js';
import { isDiurnalChart } from './diurnalBrowser.js';
import { readSyzygy } from './syzygyBrowser.js';

export const LOT_IDS = [
	'Pars Spirit',
	'Pars Faith',
	'Pars Substance',
	'Pars Wedding [Male]',
	'Pars Wedding [Female]',
	'Pars Sons',
	'Pars Father',
	'Pars Mother',
	'Pars Brothers',
	'Pars Diseases',
	'Pars Death',
	'Pars Travel',
	'Pars Friends',
	'Pars Enemies',
	'Pars Saturn',
	'Pars Jupiter',
	'Pars Mars',
	'Pars Venus',
	'Pars Mercury',
	'Pars Horsemanship',
	'Pars Life',
	'Pars Radix',
	'Pars Eros',
	'Pars Necessity',
	'Pars Courage',
	'Pars Victory',
	'Pars Nemesis',
	'Pars Basis',
	'Pars Exaltation',
	'Pars Sons Valens',
	'Pars Daughters',
	'Pars Praxis',
	'Pars Wedding Dorothean',
];

const SYZYGY_LOTS = new Set(['Pars Life', 'Pars Radix']);

export function deriveLots(chart) {
	const day = isDiurnalChart(chart);
	if (day.status !== 'COMPUTED') {
		return {
			implementation: 'derived/lotsBrowser.js',
			formulaSource: 'flatlib/tools/arabicparts.py',
			status: 'LOT_RULE_UNRESOLVED',
			reason: day.reason,
			lots: [],
		};
	}
	const bodies = chartBodies(chart);
	const syzygy = readSyzygy(chart);
	if (syzygy.status === 'COMPUTED') {
		bodies.set('Syzygy', {
			id: 'Syzygy',
			lon: syzygy.longitude,
			lat: syzygy.latitude,
			lonspeed: syzygy.speed || 0,
			decl: syzygy.declination,
			type: 'Planet',
		});
	}
	const computed = fillLots(bodies, day.diurnal, LOT_IDS);
	const lots = computed.map((row) => {
		if (row.missing && SYZYGY_LOTS.has(row.id)) {
			return { id: row.id, status: 'MISSING_INPUT', missing: 'Syzygy' };
		}
		if (row.missing) {
			return { id: row.id, status: 'LOT_RULE_UNRESOLVED' };
		}
		const item = { id: row.id, lon: row.lon, status: 'COMPUTED' };
		if (row.id === 'Pars Life') {
			item.source = 'flatlib/tools/arabicparts.py FORMULAS[Pars Life] = [Syzygy, Moon, Asc] for both day and night';
			item.derivedFrom = ['Syzygy', 'Moon', 'Asc'];
		}
		if (row.id === 'Pars Radix') {
			item.source = 'flatlib/tools/arabicparts.py FORMULAS[Pars Radix] = [Moon, Syzygy, Asc] for both day and night';
			item.derivedFrom = ['Moon', 'Syzygy', 'Asc'];
		}
		return item;
	});
	return {
		implementation: 'derived/lotsBrowser.js',
		formulaSource: 'flatlib/tools/arabicparts.py FORMULAS, day/night via chart.isDiurnal, zodiac wrap (c+b-a) mod 360',
		diurnalSource: day.source,
		diurnal: day.diurnal,
		status: 'COMPUTED',
		lots,
	};
}
