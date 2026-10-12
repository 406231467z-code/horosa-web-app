const { scanText } = require('../audit-legacy-endpoints');

describe('legacy endpoint inventory scanner', ()=>{
  test('detects service-root, legacy chart path, and HTTP wrapper calls', ()=>{
    const source = 'const result = request(`${Constants.ServerRoot}/chart`, { method: "POST" });';
    const findings = scanText(source, 'src/services/astro.js');
    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'server-root-or-kentang-routing', token: 'Constants.ServerRoot' }),
      expect.objectContaining({ category: 'legacy-calculation-endpoint-string', token: '/chart' }),
      expect.objectContaining({ category: 'network-or-websocket-call', token: 'request(' }),
    ]));
  });

  test('detects direct third-party fetches without claiming they are Horosa backends', ()=>{
    const findings = scanText('const response = await fetch(plan.url, options);', 'src/services/aianalysis.js');
    expect(findings).toContainEqual(expect.objectContaining({
      category: 'network-or-websocket-call',
      token: 'fetch(',
    }));
    expect(findings.some((row)=>row.category === 'legacy-calculation-endpoint-string')).toBe(false);
  });

  test('records exact source line numbers and limits excerpts', ()=>{
    const findings = scanText('\n\nnew WebSocket(url);', 'src/utils/wshelper.js');
    expect(findings).toContainEqual(expect.objectContaining({
      category: 'network-or-websocket-call',
      line: 3,
      token: 'new WebSocket(',
    }));
  });
});
