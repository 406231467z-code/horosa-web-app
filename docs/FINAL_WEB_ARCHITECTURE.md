# Final web architecture

Date: 2026-09-24

Checkpoint named by the request: `4e6d20d393ae618828b648d3bbb9ad907538cd6b`

## Overall status

```text
WEB MIGRATION PARTIAL
```

This is not WEB READY. License-gated capabilities stay structured statuses. Chart save/load/edit/delete, cross-viewport result identity, keyboard, and tab/page/save/AI timings are still open, so the license exception does not apply.

## Browser calculation

Western natal positions, houses, aspects, lots, reception, declination parallel, syzygy, and Pars come from Astronomy Engine 2.1.19 in `browserAstronomyEngine.js`. `calculateChart` calls `calculateBrowserChart`. `fetchChart` stays on the legacy provider path and is not the production natal call.

Bazi, Ziwei, Liuyao, Qimen, Liuren, Taiyi, Jinkou, Geomancy, HuangJi, Taixuan, Jingjue, Shenyi, and Wuzhao use the browser engines already in the tree.

`browserCalcGate.js` stops a non-desktop page, outside Jest, from fetching a local calculation URL. Jest and a desktop shell are unchanged. External HTTPS APIs are unchanged.

A production browser no longer falls back to `http://127.0.0.1:9999`. `resolveLocalServerRoot` returns an empty string unless `NODE_ENV` is `test` or the page is a desktop shell (`window.__TAURI__` or `window.horosaDesktop`).

## Measured this pass

```text
final parity corpus          6 PASS
final parity closure         3 PASS
full npm test                536 suites PASS, 7020 tests PASS, 9 skipped, 0 failed
npm install                  up to date
npm run build                exit 0
npm run build:file           exit 0
Chrome and Edge page walk    24 pages × desktop / tablet / mobile, overflow 0, calc-network 0
Java process                 0
Python process               0
:9999 :8899 :8892 :8000      CLOSED
```

## Still open

```text
Algorithm parity             PARTIAL   sun longitude NOT_COMPARABLE; Shusuan and Guolao numeric still without an oracle; 宿盘 LICENSE_BLOCKED
Responsive overflow          PASS on Chrome and Edge at desktop, tablet, and mobile widths
Keyboard / chart CRUD        not run
E2E                          PARTIAL   headless Chrome and Edge; not a separate device; save/edit/delete not completed
Performance                  PARTIAL   1 / 10 / 100 natal charts measured earlier; tab, page, save, and AI context were not timed
Backend kill page matrix     PASS for calculation URLs on the opened pages
Full unit suite              PASS   536 suites, 7020 tests, 0 failed
Security                     PASS for the Qimen HTML sink, the signature classification, and the test-only new Function
Removed routes               PASS   /fengshui /planetarium /astrochart3d /astrochart-3d redirect to /
Legacy purge                 not started
Post-purge regression        not run
Release package              BLOCKED   uncommitted production source and tests; no commit was made
```
