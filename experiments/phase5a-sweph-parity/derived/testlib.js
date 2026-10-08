/**
 * Shared 1990 historical fixture for derived-layer tests.
 * Expected values are read from HISTORICAL-GOLDEN. Actual values are computed.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openEphemeris } from '../browserEphemerisAdapter.js';
import { buildChart } from '../browserChartBuilder.js';

const here = dirname(fileURLToPath(import.meta.url));
export const experimentRoot = join(here, '..');
export const repoRoot = join(experimentRoot, '..', '..');

export const golden = JSON.parse(readFileSync(join(
	repoRoot,
	'local', 'workspace', 'Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c',
	'astrostudyui', 'src', 'divination', 'engine', '__tests__', 'fixtures', 'realChartResult.json',
), 'utf8'));

export const ARCSEC = JSON.parse(readFileSync(join(experimentRoot, 'field-map.json'), 'utf8')).tolerance.longitudeDeg;

export const HISTORICAL = {
	date: '1990-06-15',
	time: '10:30:00',
	timezone: '+08:00',
	latitude: golden.chart.geo.lat,
	longitude: golden.chart.geo.lon,
	zodiacal: 'Tropical',
	siderealAyanamsa: '',
	houseSystem: golden.params.hsys,
	westNodeType: false,
	westLilithType: false,
};

export async function historicalChart() {
	const eph = await openEphemeris();
	try {
		return { eph, chart: buildChart(eph, HISTORICAL) };
	} catch (err) {
		eph.close();
		throw err;
	}
}

export function angSep(a, b) {
	let d = Math.abs(a - b) % 360;
	if (d > 180) d = 360 - d;
	return d;
}

export function numericRow(field, expected, actual, circular, failureClass) {
	const delta = circular ? angSep(actual, expected) : Math.abs(actual - expected);
	return {
		field,
		expected,
		actual,
		delta,
		deltaArcsec: delta * 3600,
		status: delta <= ARCSEC ? 'PASS' : 'FAIL',
		failureClass: delta <= ARCSEC ? undefined : failureClass,
	};
}
