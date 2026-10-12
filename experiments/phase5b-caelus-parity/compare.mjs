/**
 * PHASE 5-B: probe an MIT clean-room candidate against the one captured Horosa chart.
 * Isolated from astrostudyui; never used by production code.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine } from 'caelus';
import { embeddedData } from 'caelus/data-embedded';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const goldenPath = join(
  repoRoot,
  'local', 'workspace', 'Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c',
  'astrostudyui', 'src', 'divination', 'engine', '__tests__', 'fixtures', 'realChartResult.json',
);
const outPath = join(here, 'results', 'historical-1990.json');
const ARCSEC = 1 / 3600;
const CORE = [
  ['Sun', 'sun'], ['Moon', 'moon'], ['Mercury', 'mercury'], ['Venus', 'venus'],
  ['Mars', 'mars'], ['Jupiter', 'jupiter'], ['Saturn', 'saturn'],
  ['Uranus', 'uranus'], ['Neptune', 'neptune'], ['Pluto', 'pluto'],
];

function angularDistance(a, b) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function byId(rows, id) {
  return (rows || []).find((row) => row && row.id === id) || null;
}

function isFiniteValue(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function compareNumber(field, production, candidate, tolerance, unit) {
  if (!isFiniteValue(production) || !isFiniteValue(candidate)) {
    return { field, production: production ?? null, candidate: candidate ?? null, status: 'MISSING' };
  }
  const delta = Math.abs(Number(production) - Number(candidate));
  return {
    field,
    production: Number(production),
    candidate: Number(candidate),
    delta,
    deltaArcsec: delta * 3600,
    toleranceArcsec: tolerance * 3600,
    unit,
    status: delta <= tolerance ? 'PASS' : 'FAIL',
  };
}

function compareLongitude(field, production, candidate) {
  if (!isFiniteValue(production) || !isFiniteValue(candidate)) {
    return { field, production: production ?? null, candidate: candidate ?? null, status: 'MISSING' };
  }
  const delta = angularDistance(Number(production), Number(candidate));
  return {
    field,
    production: Number(production),
    candidate: Number(candidate),
    delta,
    deltaArcsec: delta * 3600,
    toleranceArcsec: 1,
    unit: 'degrees longitude',
    status: delta <= ARCSEC ? 'PASS' : 'FAIL',
  };
}

async function main() {
  const golden = JSON.parse(readFileSync(goldenPath, 'utf8'));
  const chart = golden.chart;
  if (!chart || !chart.date || !Number.isFinite(chart.date.jd) || !chart.geo) {
    throw new Error('Historical chart fixture is missing chart.date.jd or chart.geo.');
  }

  const engine = new Engine(embeddedData);
  const candidate = engine.chartAt(
    chart.date.jd,
    chart.geo.lat,
    chart.geo.lon,
    { houseSystem: 'regiomontanus', zodiac: 'tropical' },
  );

  const fields = [];
  const productionObjects = chart.objects || [];
  for (const [horosaId, engineId] of CORE) {
    const production = byId(productionObjects, horosaId);
    const body = candidate.bodies && candidate.bodies[engineId];
    if (!production || !body) {
      fields.push({ field: horosaId, status: 'MISSING', productionPresent: !!production, candidatePresent: !!body });
      continue;
    }
    fields.push(compareLongitude(`${horosaId}.lon`, production.lon, body.lon));
    fields.push(compareNumber(`${horosaId}.lat`, production.lat, body.lat, ARCSEC, 'degrees latitude'));
    fields.push(compareNumber(`${horosaId}.lonspeed`, production.lonspeed, body.speed, ARCSEC, 'degrees/day'));
  }

  for (const [id, key] of [['Asc', 'asc'], ['MC', 'mc']]) {
    const production = byId(productionObjects, id);
    fields.push(compareLongitude(`${id}.lon`, production && production.lon, candidate.angles && candidate.angles[key]));
  }

  const productionHouses = chart.houses || [];
  for (let n = 1; n <= 12; n += 1) {
    const production = byId(productionHouses, `House${n}`);
    fields.push(compareLongitude(`House${n}.lon`, production && production.lon, candidate.cusps && candidate.cusps[n - 1]));
  }

  const counts = {
    PASS: fields.filter((row) => row.status === 'PASS').length,
    FAIL: fields.filter((row) => row.status === 'FAIL').length,
    MISSING: fields.filter((row) => row.status === 'MISSING').length,
  };
  const report = {
    experiment: 'PHASE 5-B candidate feasibility; not production',
    verdict: counts.FAIL === 0 && counts.MISSING === 0 ? 'CANDIDATE_CORE_PARITY_ON_ONE_HISTORICAL_CHART' : 'BLOCKED',
    candidate: {
      package: 'caelus@0.25.0 (MIT, clean-room engine)',
      advertisedCoreBodyRange: '1000–3000 CE; vendor documentation only, not independently proven by this one fixture',
    },
    golden: {
      type: 'HISTORICAL_GOLDEN',
      file: 'astrostudyui/src/divination/engine/__tests__/fixtures/realChartResult.json',
      birth: golden.params && golden.params.birth,
      location: chart.geo,
      zodiac: chart.zodiacal,
      houseSystem: chart.hsys,
      jdUt: chart.date.jd,
    },
    toleranceArcsec: 1,
    counts,
    completeHorosaSchemaCompared: false,
    unsupportedScope: [
      'Horosa PerChart response adaptation',
      'Arabic lots and Horosa-specific derived fields',
      'fixed-star and lunar-mansion IDs',
      'sidereal/ayanamsa variants',
      'house placements and classical dignity payload',
      'primary directions, Jyotish, Qizheng, Three Styles, and Yi methods',
      'independent real charts and wider date coverage',
      'full 1000–3000 CE range and any dates outside the candidate library\'s advertised core-body range',
      'production bundle, browser worker/offline and mobile testing',
    ],
    fields,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ verdict: report.verdict, candidate: report.candidate, counts, report: outPath }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
