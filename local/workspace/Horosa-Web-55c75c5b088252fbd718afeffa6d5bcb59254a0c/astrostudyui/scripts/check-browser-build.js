#!/usr/bin/env node
'use strict';

/**
 * Post-build smoke check for a static browser deployment.
 * It verifies the generated HTML's viewport and that every local script/stylesheet
 * referenced by the entry document actually exists in the output directory.
 * This does not replace a real iOS/Android browser test.
 */
const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const DIST_ROOT = path.join(APP_ROOT, 'dist');
const HTML_PATH = path.join(DIST_ROOT, 'index.html');

function fail(message) {
  console.error('[browser-build-check] FAIL: ' + message);
  process.exitCode = 1;
}

function readRequired(filePath, label) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    fail(label + ' not found or unreadable: ' + path.relative(APP_ROOT, filePath));
    return '';
  }
}

function attributes(tag) {
  const result = {};
  const attrPattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;
  while ((match = attrPattern.exec(tag))) {
    result[match[1].toLowerCase()] = match[2] !== undefined
      ? match[2]
      : (match[3] !== undefined ? match[3] : match[4]);
  }
  return result;
}

function isStylesheetOrPreload(tag, attrs) {
  if (tag.startsWith('<script')) return true;
  if (!tag.startsWith('<link')) return false;
  const rel = String(attrs.rel || '').toLowerCase().split(/\s+/);
  return rel.includes('stylesheet') ||
    rel.includes('preload') ||
    rel.includes('modulepreload') ||
    rel.includes('icon') ||
    rel.includes('shortcut');
}

function assetCandidates(reference) {
  const clean = reference.split(/[?#]/, 1)[0];
  if (!clean || clean.startsWith('data:') || clean.startsWith('blob:')) return [];
  if (/^(?:https?:)?\/\//i.test(clean)) return [];
  let relative = clean.replace(/^\.\//, '').replace(/^\//, '');
  try { relative = decodeURIComponent(relative); } catch (error) { /* retain raw path */ }
  const candidates = [path.resolve(DIST_ROOT, relative)];
  // Umi's production publicPath is /static/, while emitted files may live at dist root.
  // Check both layouts so the guard catches genuinely missing assets without assuming
  // the deployment server's URL-to-disk mapping.
  if (relative.startsWith('static/')) {
    candidates.push(path.resolve(DIST_ROOT, relative.slice('static/'.length)));
  }
  return [...new Set(candidates)];
}

function main() {
  if (!fs.existsSync(DIST_ROOT) || !fs.statSync(DIST_ROOT).isDirectory()) {
    fail('production output directory dist/ is missing');
    return;
  }

  const html = readRequired(HTML_PATH, 'dist/index.html');
  if (!html) return;

  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  const viewport = metaTags.map((tag) => attributes(tag)).find((attrs) => attrs.name && attrs.name.toLowerCase() === 'viewport');
  if (!viewport || !/width\s*=\s*device-width/i.test(viewport.content || '')) {
    fail('entry HTML must declare a responsive width=device-width viewport');
  }
  if (viewport && /user-scalable\s*=\s*no/i.test(viewport.content || '')) {
    fail('entry HTML must not disable user zoom');
  }
  if (!/id=["']root["']/.test(html)) {
    fail('entry HTML does not contain the Umi #root mount node');
  }

  const tags = html.match(/<(?:script|link)\b[^>]*>/gi) || [];
  let checkedAssets = 0;
  const missing = [];
  for (const tag of tags) {
    const attrs = attributes(tag);
    if (!isStylesheetOrPreload(tag.toLowerCase(), attrs)) continue;
    const reference = tag.toLowerCase().startsWith('<script') ? attrs.src : attrs.href;
    if (!reference) continue;
    const candidates = assetCandidates(reference);
    if (!candidates.length) continue;
    checkedAssets += 1;
    if (!candidates.some((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())) {
      missing.push(reference);
    }
  }
  if (missing.length) {
    fail('entry HTML references missing local JS/CSS assets: ' + missing.join(', '));
  }

  const distEntries = fs.readdirSync(DIST_ROOT);
  const scriptCount = distEntries.filter((name) => /\.js$/i.test(name) && fs.statSync(path.join(DIST_ROOT, name)).isFile()).length;
  const styleCount = distEntries.filter((name) => /\.css$/i.test(name) && fs.statSync(path.join(DIST_ROOT, name)).isFile()).length;
  if (!scriptCount) fail('no root-level JavaScript bundles were emitted');
  if (!styleCount) fail('no root-level CSS bundles were emitted');

  if (process.exitCode) return;
  console.log(JSON.stringify({
    audit: 'Horosa static browser build smoke check',
    result: 'PASS',
    output: 'dist/',
    viewportResponsive: true,
    zoomEnabled: true,
    localEntryAssetsChecked: checkedAssets,
    rootJavaScriptBundles: scriptCount,
    rootCssBundles: styleCount,
    note: 'Static output check only; device rendering and runtime network behavior still need browser verification.',
  }, null, 2));
}

main();
