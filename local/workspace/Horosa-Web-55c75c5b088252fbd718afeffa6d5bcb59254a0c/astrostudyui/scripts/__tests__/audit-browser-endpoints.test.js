const { scanText } = require('../audit-browser-endpoints');

describe('browser endpoint inventory', ()=>{
  test('detects service roots, legacy chart routes and request wrappers', ()=>{
    const source = 'const result = request(`${Constants.ServerRoot}/chart`, { method: "POST" });';
    const findings = scanText(source, 'src/services/astro.js');
    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'ServerRoot', text: expect.stringContaining('Constants.ServerRoot') }),
      expect.objectContaining({ kind: 'legacy Horosa/Kentang endpoint', text: expect.stringContaining('/chart') }),
      expect.objectContaining({ kind: 'request()', text: expect.stringContaining('request(') }),
    ]));
  });

  test('detects configured third-party provider transport without misclassifying it as a Horosa route', ()=>{
    const findings = scanText('const response = await fetch(plan.url, options);', 'src/services/aianalysis.js');
    expect(findings).toContainEqual(expect.objectContaining({ kind: 'fetch()' }));
    expect(findings.some((row)=>row.kind === 'legacy Horosa/Kentang endpoint')).toBe(false);
  });

  test('preserves source line numbers for WebSocket endpoints', ()=>{
    const findings = scanText('\n\nnew WebSocket(url);', 'src/utils/wshelper.js');
    expect(findings).toContainEqual(expect.objectContaining({
      kind: 'WebSocket',
      line: 3,
      text: expect.stringContaining('new WebSocket'),
    }));
  });
});
