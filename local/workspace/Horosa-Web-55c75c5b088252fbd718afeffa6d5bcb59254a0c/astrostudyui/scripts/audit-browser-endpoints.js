#!/usr/bin/env node
'use strict';

/**
 * Static inventory for network and legacy-service references in production browser code.
 * This is intentionally an inventory rather than a blanket failure: configured provider
 * APIs (for example user-owned AI endpoints) are legitimate external network calls.
 * Review every result against retained product scope before removing or migrating a route.
 */
const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = path.join(APP_ROOT, 'src');
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const SKIP_DIRS = new Set(['node_modules', '__tests__', '__fixtures__', '__mocks__', 'coverage']);

const PATTERNS = [
  ['ServerRoot', /\bServerRoot\b/g],
  ['Kentang routing', /\b(?:buildKentangEndpoint|cachedKentangFetch)\b/g],
  ['request()', /\brequest\s*\(/g],
  ['fetch()', /\bfetch\s*\(/g],
  ['WebSocket', /\bWebSocket\b/g],
  ['EventSource/SSE', /\bEventSource\b/g],
  ['HTTP URL literal', /https?:\/\/[^\s'"\x60<>]+/g],
  ['legacy Horosa/Kentang endpoint', /(?:srv\.horosa\.com|horosaIdentity|\/allowedcharts\b|\/user\/check\b|\/common\/time\b|\/chart(?![\w-])|\/nongli\/time\b|\/jieqi\/(?:year|nongli|birth)\b|\/qizheng\/|\/qizhengkin\/|\/qizhengelection(?:\/|\b)|\/aianalysis(?:\/|\b)|\/predict\/pd(?:chart|poles)?\b|\/india\/(?:chart|rectify)\b|\/ziwei\/(?:birth|rules)\b|\/qimen\/pan\b|\/taiyi\/pan\b|\/jinkou\/pan\b|\/liureng\/(?:gods|runyear)\b|\/astroextra\/ephemeris\b|\/cetian\/texts\b)/gi],
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) walk(full, files);
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function classifyEndpointReferenceLine(line) {
  const trimmed = String(line || '').trim();
  if (/^(?:\/\/|\/\*|\*\/?|\{\/\*)/.test(trimmed)) {
    return 'endpoint reference in comment';
  }
  // The shared step-prefetch registry uses endpoint-shaped keys to group local jobs.
  // A path label by itself is not evidence that the browser sends a request.
  if (/\bpath\s*:/i.test(line) && !/\b(?:request|fetch|cachedPost|cachedKentangFetch|buildKentangEndpoint)\s*\(/.test(line)) {
    return 'endpoint-like scheduler metadata';
  }
  return 'legacy Horosa/Kentang endpoint';
}

function scanText(source, relativePath) {
  const results = [];
  String(source).split(/\r?\n/).forEach((line, index) => {
    for (const [kind, pattern] of PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        results.push({
          file: relativePath,
          line: index + 1,
          kind: kind === 'legacy Horosa/Kentang endpoint' ? classifyEndpointReferenceLine(line) : kind,
          text: line.trim().slice(0, 280),
        });
      }
    }
  });
  return results;
}

function buildReport() {
  const files = walk(SOURCE_ROOT);
  const results = [];
  for (const file of files) {
    const relativePath = path.relative(APP_ROOT, file).split(path.sep).join('/');
    results.push(...scanText(fs.readFileSync(file, 'utf8'), relativePath));
  }
  results.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.kind.localeCompare(b.kind));
  const byKind = {};
  results.forEach((item) => { byKind[item.kind] = (byKind[item.kind] || 0) + 1; });
  return {
    audit: 'Horosa browser legacy endpoint static inventory',
    generatedAt: new Date().toISOString(),
    sourceRoot: 'src',
    filesScanned: files.length,
    matchCount: results.length,
    filesWithMatches: new Set(results.map((item) => item.file)).size,
    byKind,
    limitations: [
      'Heuristic scan only; comments, examples, and unused wrappers can produce false positives.',
      'Template literals, imported aliases, indirect wrappers, and runtime URL assembly are not fully resolved.',
      'This report does not prove an endpoint is active or unused; combine it with call-site review and browser Network-panel tests.',
      'Unit tests and fixture directories are excluded to focus on production source.',
    ],
    results,
  };
}

function main(args = process.argv.slice(2)) {
  if (!fs.existsSync(SOURCE_ROOT)) {
    console.error('Source directory not found: ' + SOURCE_ROOT);
    process.exitCode = 2;
    return null;
  }
  const report = buildReport();
  const outIndex = args.indexOf('--json-out');
  let reportPath = null;
  if (outIndex >= 0 && args[outIndex + 1]) {
    reportPath = path.resolve(APP_ROOT, args[outIndex + 1]);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  }
  if (!args.includes('--summary-only')) {
    for (const item of report.results) {
      console.log(item.file + ':' + item.line + ' [' + item.kind + '] ' + item.text);
    }
  }
  console.log(JSON.stringify({
    audit: report.audit,
    filesScanned: report.filesScanned,
    matchCount: report.matchCount,
    filesWithMatches: report.filesWithMatches,
    byKind: report.byKind,
    reportPath,
    note: 'Findings require manual call-site review; this is not proof of active requests.',
  }, null, 2));
  return report;
}

if (require.main === module) main();

module.exports = { PATTERNS, walk, scanText, buildReport, main };
