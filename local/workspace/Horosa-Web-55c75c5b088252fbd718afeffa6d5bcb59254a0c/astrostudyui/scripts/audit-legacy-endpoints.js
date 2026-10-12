/* eslint-disable no-console */
// Heuristic audit for remaining browser-to-service dependencies in production source.
// This intentionally reports candidates instead of failing the build: each match needs
// manual call-site review because comments, constants, and adapters can mention endpoints.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const SKIP_DIRS = new Set(['node_modules', '__tests__', '__fixtures__', '__mocks__']);

const SCANNERS = [
  {
    category: 'server-root-or-kentang-routing',
    expression: /\b(?:Constants\.)?ServerRoot\b|\bbuildKentangEndpoint\b|\bcachedKentangFetch\b/g,
  },
  {
    category: 'legacy-calculation-endpoint-string',
    expression: /\/(?:chart|india\/chart|india\/rectify|predict\/pd(?:chart|poles)?|qizheng\/moira|qizhengkin\/pan|qizhengelection(?:\/[\w$-]+)?|qimen\/pan|taiyi\/pan|jinkou\/pan|liureng\/(?:gods|runyear)|ziwei\/birth|nongli\/time|jieqi\/(?:year|nongli|birth)|astroextra\/ephemeris|aianalysis\/(?:chat|chat\/stream|embeddings|diagnose|providers|materials))(?![\w-])/g,
  },
  {
    category: 'network-or-websocket-call',
    expression: /\bfetch\s*\(|\brequest\s*\(|\baxios\.(?:get|post|put|delete)\s*\(|\bnew\s+WebSocket\s*\(/g,
  },
  {
    category: 'explicit-http-url',
    expression: /https?:\/\/[^\s'"\x60)]+/g,
  },
];

function walkSourceFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        walkSourceFiles(path.join(dir, entry.name), results);
      }
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

function scanText(source, relativePath) {
  const matches = [];
  const lines = String(source).split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const scanner of SCANNERS) {
      scanner.expression.lastIndex = 0;
      let match;
      while ((match = scanner.expression.exec(line)) !== null) {
        matches.push({
          category: scanner.category,
          file: relativePath,
          line: index + 1,
          token: match[0].slice(0, 180),
          excerpt: line.trim().slice(0, 280),
        });
        if (match[0] === '') scanner.expression.lastIndex += 1;
      }
    }
  }
  return matches;
}

function buildReport() {
  const files = walkSourceFiles(SRC);
  const matches = [];
  for (const filename of files) {
    const relativePath = path.relative(ROOT, filename).split(path.sep).join('/');
    matches.push(...scanText(fs.readFileSync(filename, 'utf8'), relativePath));
  }
  const byCategory = {};
  const byFile = {};
  for (const item of matches) {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    byFile[item.file] = (byFile[item.file] || 0) + 1;
  }
  return {
    audit: 'Horosa browser legacy-endpoint static scan',
    generatedAt: new Date().toISOString(),
    sourceRoot: 'src',
    filesScanned: files.length,
    matchCount: matches.length,
    byCategory,
    filesWithMatches: Object.keys(byFile).length,
    topFiles: Object.entries(byFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([file, count]) => ({ file, count })),
    limitations: [
      'Heuristic static scan only; it does not resolve imports, interpolate template literals, or prove a URL is invoked.',
      'Comments and examples can produce false positives; wrapper calls can hide their eventual URL.',
      'Review every finding and combine this report with browser Network-panel verification before deleting a backend.',
    ],
    matches,
  };
}

if (require.main === module) {
  const report = buildReport();
  const outArg = process.argv.indexOf('--out');
  let reportPath = null;
  if (outArg >= 0 && process.argv[outArg + 1]) {
    reportPath = path.resolve(ROOT, process.argv[outArg + 1]);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({
    audit: report.audit,
    filesScanned: report.filesScanned,
    matchCount: report.matchCount,
    filesWithMatches: report.filesWithMatches,
    byCategory: report.byCategory,
    reportPath,
    note: 'Review findings; the static scan is not proof that an endpoint is live or unused.',
  }, null, 2));
}

module.exports = { SCANNERS, walkSourceFiles, scanText, buildReport };
