import { calculateBrowserChart } from '../../local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui/src/services/astronomy/browserAstronomyEngine.js';

const chart = calculateBrowserChart({
	date: '1990/06/15',
	time: '10:30:00',
	zone: '+08:00',
	lat: 31.233333333333334,
	lon: 121.46666666666667,
	hsys: 2,
	zodiacal: 0,
});
const ids = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'Dark Moon', 'Asc', 'MC', 'Pars Fortuna', 'Syzygy'];
const byId = Object.fromEntries(chart.chart.objects.map((o) => [o.id, o]));
const missing = ids.filter((id) => !byId[id]);
const summary = {
	provider: chart.meta.provider,
	engine: chart.meta.engine,
	house: chart.meta.houseSystem,
	houses: chart.chart.houses.length,
	aspectStatus: chart.aspects.status,
	aspectKeys: chart.aspects.normalAsp ? Object.keys(chart.aspects.normalAsp).length : 0,
	lots: chart.lots.length,
	reception: chart.receptions && chart.receptions.status,
	parallel: chart.declParallel && chart.declParallel.status,
	syzygy: chart.syzygy && chart.syzygy.syzygyType,
	pars: chart.lots.filter((l) => l.id === 'Pars Life' || l.id === 'Pars Radix').map((l) => l.id),
	missing,
	sun: byId.Sun && byId.Sun.lon,
	moon: byId.Moon && byId.Moon.lon,
	node: byId['North Node'] && byId['North Node'].lon,
	lilith: byId['Dark Moon'] && byId['Dark Moon'].lon,
	asc: byId.Asc && byId.Asc.lon,
	mc: byId.MC && byId.MC.lon,
	fixedStars: chart.fixedStars.status,
	parans: chart.parans.status,
};
console.log(JSON.stringify(summary, null, 2));
if (missing.length || chart.lots.length < 30 || chart.aspects.status !== 'COMPUTED') process.exit(1);

let unsupported = false;
try {
	calculateBrowserChart({
		date: '1990-06-15', time: '10:30:00', zone: '+08:00', lat: 31.233333333333334, lon: 121.46666666666667, hsys: 4, zodiacal: 0,
	});
} catch (err) {
	unsupported = err.code === 'UNSUPPORTED';
}
if (!unsupported) {
	console.log('koch should be UNSUPPORTED');
	process.exit(1);
}
try {
	calculateBrowserChart({
		date: '1990-06-15', time: '10:30:00', zone: '+08:00', lat: 31.233333333333334, lon: 121.46666666666667, hsys: 2, zodiacal: 1, siderealAyanamsa: 'lahiri',
	});
	console.log('named ayanamsa should be UNSUPPORTED');
	process.exit(1);
} catch (err) {
	if (err.code !== 'UNSUPPORTED') throw err;
}
const sid = calculateBrowserChart({
	date: '1990-06-15', time: '10:30:00', zone: '+08:00', lat: 31.233333333333334, lon: 121.46666666666667, hsys: 2, zodiacal: 1, siderealAyanamsa: 23.5,
});
const sidSun = sid.chart.objects.find((o) => o.id === 'Sun').lon;
const delta = ((byId.Sun.lon - 23.5 - sidSun) % 360 + 360) % 360;
if (delta > 1e-6 && Math.abs(delta - 360) > 1e-6) {
	console.log('sidereal shift', delta);
	process.exit(1);
}
console.log('smoke ok');
