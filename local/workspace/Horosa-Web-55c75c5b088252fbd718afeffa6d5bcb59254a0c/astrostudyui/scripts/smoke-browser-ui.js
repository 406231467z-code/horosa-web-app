#!/usr/bin/env node
'use strict';

/**
 * Real Chromium smoke test for the production static build.
 * The tiny HTTP server maps Umi's /static/ publicPath back to dist/ output files,
 * just as a static host must. This is not a substitute for iOS Safari / Android Chrome.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const APP_ROOT = path.resolve(__dirname, '..');
const DIST_ROOT = path.join(APP_ROOT, 'dist');
const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.eot': 'application/vnd.ms-fontobject',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.CHROMIUM_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/opt/google/chrome/chrome',
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function createStaticServer() {
  return http.createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    } catch (error) {
      res.writeHead(400).end('Bad request');
      return;
    }
    // publicPath=/static/ is a URL prefix; Webpack still emits files under dist/.
    if (pathname.startsWith('/static/')) pathname = pathname.slice('/static'.length);
    let target = path.resolve(DIST_ROOT, '.' + pathname);
    if (target !== DIST_ROOT && !target.startsWith(DIST_ROOT + path.sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      target = path.join(target, 'index.html');
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      // SPA route fallback; do not turn missing asset requests into HTML responses.
      if (!path.extname(pathname)) {
        target = path.join(DIST_ROOT, 'index.html');
      } else {
        res.writeHead(404).end('Not found');
        return;
      }
    }
    try {
      const data = fs.readFileSync(target);
      res.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(data);
    } catch (error) {
      res.writeHead(500).end('Read error');
    }
  });
}

async function main() {
  if (!fs.existsSync(path.join(DIST_ROOT, 'index.html'))) {
    throw new Error('dist/index.html not found; run npm run build first');
  }
  const executablePath = findChrome();
  if (!executablePath) {
    throw new Error('Chrome/Chromium not found. Set CHROME_BIN to a Chromium executable.');
  }

  const server = createStaticServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const baseUrl = 'http://127.0.0.1:' + address.port;
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    const runtimeErrors = [];
    const failedAssets = [];
    const badAssetResponses = [];
    const firstParty = new URL(baseUrl).origin;

    page.on('pageerror', (error) => runtimeErrors.push(error && error.message ? error.message : String(error)));
    page.on('requestfailed', (request) => {
      try {
        const url = new URL(request.url());
        if (url.origin === firstParty && /\.(?:js|css)(?:[?#]|$)/i.test(url.pathname)) {
          failedAssets.push({ url: request.url(), error: request.failure() && request.failure().errorText });
        }
      } catch (error) { /* malformed requests are reported by Chromium itself */ }
    });
    page.on('response', (response) => {
      try {
        const url = new URL(response.url());
        if (url.origin === firstParty && response.status() >= 400 && /\.(?:js|css)(?:[?#]|$)/i.test(url.pathname)) {
          badAssetResponses.push({ url: response.url(), status: response.status() });
        }
      } catch (error) { /* ignore non-URL responses */ }
    });

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await page.goto(baseUrl + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => {
      const root = document.querySelector('#root');
      return !!root && root.childElementCount > 0;
    }, { timeout: 20000 });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mobile = await page.evaluate(() => ({
      title: document.title,
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body ? document.body.scrollWidth : 0,
      rootWidth: document.querySelector('#root') ? document.querySelector('#root').scrollWidth : 0,
      viewportMeta: Array.from(document.querySelectorAll('meta[name="viewport"]')).some((node) => /width\s*=\s*device-width/i.test(node.content || '')),
      rootChildren: document.querySelector('#root') ? document.querySelector('#root').childElementCount : 0,
    }));

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
    await new Promise((resolve) => setTimeout(resolve, 400));
    const desktop = await page.evaluate(() => ({
      title: document.title,
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body ? document.body.scrollWidth : 0,
      rootWidth: document.querySelector('#root') ? document.querySelector('#root').scrollWidth : 0,
      rootChildren: document.querySelector('#root') ? document.querySelector('#root').childElementCount : 0,
    }));

    const failures = [];
    if (!mobile.viewportMeta) failures.push('mobile viewport meta is missing or not responsive');
    for (const [mode, metrics] of [['mobile', mobile], ['desktop', desktop]]) {
      if (!metrics.rootChildren) failures.push(mode + ' app root is empty');
      if (metrics.documentWidth > metrics.viewportWidth + 2) {
        failures.push(mode + ' document overflows horizontally: ' + metrics.documentWidth + 'px > ' + metrics.viewportWidth + 'px');
      }
      if (metrics.bodyWidth > metrics.viewportWidth + 2) {
        failures.push(mode + ' body overflows horizontally: ' + metrics.bodyWidth + 'px > ' + metrics.viewportWidth + 'px');
      }
    }
    if (runtimeErrors.length) failures.push('uncaught browser errors: ' + runtimeErrors.join(' | '));
    if (failedAssets.length) failures.push('failed local JS/CSS requests: ' + JSON.stringify(failedAssets));
    if (badAssetResponses.length) failures.push('local JS/CSS returned HTTP errors: ' + JSON.stringify(badAssetResponses));

    const report = {
      audit: 'Horosa production browser UI smoke test',
      result: failures.length ? 'FAIL' : 'PASS',
      browser: path.basename(executablePath),
      mobile,
      desktop,
      failedAssets,
      badAssetResponses,
      runtimeErrors,
      limitations: [
        'Chromium desktop emulation is not a real iOS Safari or Android Chrome device.',
        'This checks the entry screen and local assets; retained calculators that still call legacy APIs remain a separate migration blocker.',
      ],
    };
    console.log(JSON.stringify(report, null, 2));
    if (failures.length) {
      console.error('[browser-ui-smoke] ' + failures.join('\n[browser-ui-smoke] '));
      process.exitCode = 1;
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error('[browser-ui-smoke] ' + (error && error.stack ? error.stack : String(error)));
  process.exitCode = 1;
});
