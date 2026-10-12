#!/usr/bin/env node
'use strict';

/**
 * Caelus 0.25 ships JSON imports with the native ESM import attribute syntax.
 * Horosa still uses Umi 3 / Webpack 4, whose parser cannot parse those attributes.
 * Strip only the import attributes from the generated data entrypoint; Webpack 4's
 * JSON module loader still resolves the exact same data files.
 *
 * This is intentionally fail-loud if the upstream entrypoint syntax changes.
 */
const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '..', 'node_modules', 'caelus', 'dist', 'src', 'data-embedded.js');
const marker = '/* horosa:caelus-webpack4-json-imports */';

if (!fs.existsSync(target)) {
  console.error('[patch-caelus] Expected Caelus entrypoint not found: ' + target);
  process.exit(1);
}

let source = fs.readFileSync(target, 'utf8');
if (source.includes(marker)) {
  console.log('[patch-caelus] already patched');
  process.exit(0);
}

const pattern = /\s+with\s*\{\s*type\s*:\s*(['"])json\1\s*\}/g;
const matches = source.match(pattern) || [];
if (!matches.length) {
  console.error('[patch-caelus] Import-attribute anchor changed; inspect upstream output before building.');
  process.exit(1);
}

source = source.replace(pattern, '');
source = marker + '\n' + source;
if (/\bwith\s*\{\s*type\s*:\s*['"]json['"]\s*\}/.test(source)) {
  console.error('[patch-caelus] Import attributes remain after patch');
  process.exit(1);
}
fs.writeFileSync(target, source, 'utf8');
console.log('[patch-caelus] patched ' + matches.length + ' JSON imports for Webpack 4');
