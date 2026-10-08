import fs from 'node:fs';
const data = JSON.parse(fs.readFileSync('tests/final-parity/responsive-matrix.json', 'utf8'));
let tiny = 0;
let bad = 0;
let errors = 0;
for (const item of data.report) {
	tiny += item.tiny || 0;
	bad += (item.bad || []).length;
	errors += (item.errors || []).length;
}
console.log(JSON.stringify({
	browser: data.browser,
	viewports: data.report.length,
	tiny,
	bad,
	errors,
	sample: data.report[0],
}, null, 2));
