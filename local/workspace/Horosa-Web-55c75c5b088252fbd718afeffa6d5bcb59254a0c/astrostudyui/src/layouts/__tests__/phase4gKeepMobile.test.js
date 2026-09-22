const fs = require('fs');
const path = require('path');

describe('phase 4-G keep mobile layout', ()=>{
	test('viewport allows pinch zoom', ()=>{
		const html = fs.readFileSync(path.join(__dirname, '../../pages/document.ejs'), 'utf8');
		expect(html).toContain('width=device-width, initial-scale=1');
		expect(html).not.toContain('user-scalable=no');
	});

	test('narrow layout sheet is imported and unlocks scroll plus full-width drawers', ()=>{
		const appLess = fs.readFileSync(path.join(__dirname, '../app.less'), 'utf8');
		const css = fs.readFileSync(path.join(__dirname, '../keepMobile.less'), 'utf8');
		expect(appLess).toContain("@import './keepMobile.less'");
		expect(css).toContain('@media (max-width: 760px)');
		expect(css).toContain('overflow: auto !important');
		expect(css).toContain('max-width: 100vw !important');
		expect(css).toContain('grid-template-columns: minmax(0, 1fr) !important');
		expect(css).toContain('.horosa-aianalysis-page');
		expect(css).toContain('.horosa-astro-layout');
		expect(css).toContain('.horosa-liureng-chart-host');
		expect(css).toContain('.amap-container');
		expect(css).toContain('chatSplit');
	});
});
