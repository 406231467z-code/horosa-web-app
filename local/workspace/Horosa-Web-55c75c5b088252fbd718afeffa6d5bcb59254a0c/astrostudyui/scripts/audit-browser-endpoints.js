#!/usr/bin/env node
'use strict';

/**
 * Static inventory for network and legacy-service references in the browser app.
 * This is intentionally an inventory, not a blanket failure: some external
 * provider requests (for example user-configured AI providers) are legitimate.
 * Review every match against the retained product scope before removing code.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'src');
const extensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const patterns = [
  ['ServerRoot', /\bServerRoot\b/g],
  ['request()', /\brequest\s*\(/g],
  ['fetch()', /\bfetch\s*\(/g],
  ['WebSocket', /\bWebSocket\b/g],
  ['EventSource/SSE', /\bEventSource\b/g],
  ['HTTP URL literal', /https?:\/\/[^\s'"`<>]+/g],
  ['legacy Horosa/Kentang endpoint', /(?:srv\.horosa\.com|horosaIdentity|\/chart|\/nongli\/time|\/jieqi\/year|\/qizheng|\/qizhengelection|\/aianalysis|\/predict\/|\/india\/|\/ziwei\/birth|\/qimen\/pan|\/taiyi\/pan|\/jinkou\/pan|\/liureng\/)/gi],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

if (!fs.existsSync(root)) {
  console.error('Source directory not found: ' + root);
  process.exit(2);
}

const results = [];
for (const file of walk(root)) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const [kind, pattern] of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        results.push({
          file: path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/'),
          line: index + 1,
          kind,
          text: line.trim().slice(0, 240),
        });
      }
    }
  });
}

results.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.kind.localeCompare(b.kind));
for (const item of results) {
  console.log(item.file + ':' + item.line + ' [' + item.kind + '] ' + item.text);
}
console.log('\nStatic inventory: ' + results.length + ' matches across ' + new Set(results.map((x) => x.file)).size + ' files.');
console.log('Matches are leads for review, not proof that a route is active or that a request is required.');
