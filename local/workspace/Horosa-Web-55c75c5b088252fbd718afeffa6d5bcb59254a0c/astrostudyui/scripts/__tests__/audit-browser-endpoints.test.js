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
  test('distinguishes comment references and local prefetch metadata from probable transports', ()=>{
    const comments = scanText('// legacy /chart note', 'src/utils/notes.js');
    expect(comments).toContainEqual(expect.objectContaining({ kind: 'endpoint reference in comment' }));
    expect(comments.some((row)=>row.kind === 'legacy Horosa/Kentang endpoint')).toBe(false);

    const localTask = scanText("return { path: '/nongli/time', run: () => fetchPreciseNongli(params) };", 'src/components/dunjia/DunJiaMain.js');
    expect(localTask).toContainEqual(expect.objectContaining({ kind: 'endpoint-like scheduler metadata' }));
    expect(localTask.some((row)=>row.kind === 'legacy Horosa/Kentang endpoint')).toBe(false);
  });

});