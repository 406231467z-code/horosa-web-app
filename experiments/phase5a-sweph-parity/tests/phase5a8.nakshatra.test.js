import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	ABHIJIT_END,
	ABHIJIT_START,
	NAKSHATRAS,
	nakshatraFromLon,
	nakshatrasForChart,
} from '../derived/nakshatraBrowser.js';

const span = 360 / 27;

test('nakshatra follows 360/27, exact boundaries, pada, Abhijit, and the sidereal gate', () => {
	assert.equal(nakshatraFromLon(0).name, 'Ashwini');
	assert.equal(nakshatraFromLon(0).index, 1);
	assert.equal(nakshatraFromLon(0).pada, 1);
	assert.equal(nakshatraFromLon(span).name, 'Bharani');
	assert.equal(nakshatraFromLon(360).name, 'Ashwini');
	assert.equal(nakshatraFromLon(720).name, 'Ashwini');
	assert.equal(nakshatraFromLon(-1).name, nakshatraFromLon(359).name);
	assert.equal(nakshatraFromLon(359.999999).index, 27);

	for (let k = 0; k < 27; k += 1) {
		const at = nakshatraFromLon(k * span);
		assert.equal(at.index, k + 1);
		assert.equal(at.name, NAKSHATRAS[k][0]);
		assert.equal(at.lord, NAKSHATRAS[k][2]);
		if (k > 0) {
			assert.equal(nakshatraFromLon(k * span - 1e-6).index, k);
		}
		assert.equal(nakshatraFromLon(k * span + 1e-6).index, k + 1);
	}
	assert.equal(nakshatraFromLon(-1).index, 27);

	const padaCases = [0, 0.249999, 0.25, 0.5, 0.75, 0.999999];
	const padaExpected = [1, 1, 2, 3, 4, 4];
	padaCases.forEach((progress, i) => {
		assert.equal(nakshatraFromLon(progress * span).pada, padaExpected[i]);
	});

	const inside = nakshatraFromLon(ABHIJIT_START);
	assert.equal(inside.isAbhijit, true);
	assert.equal(inside.name, 'Uttara Ashadha');
	assert.equal(inside.lord, 'Sun');
	assert.equal(inside.nak28Name, 'Abhijit');
	assert.equal(inside.nak28Label, '织女');
	assert.equal(nakshatraFromLon(ABHIJIT_END - 1e-6).isAbhijit, true);
	assert.equal(nakshatraFromLon(ABHIJIT_END).isAbhijit, false);
	assert.equal(nakshatraFromLon(ABHIJIT_END + 1e-6).isAbhijit, false);

	assert.equal(nakshatrasForChart({ zodiacal: 'Tropical', objects: { Sun: { lon: 10 } } }), null);
	const sidereal = nakshatrasForChart({ zodiacal: 'Sidereal', objects: { Sun: { lon: 0 } } });
	assert.equal(sidereal.status, 'COMPUTED');
	assert.equal(sidereal.byBody.Sun.name, 'Ashwini');
	assert.equal(sidereal.ayanamsa, 'chart longitude');
});
