# PHASE 1.5 Baseline

**Date:** 2026-09-21  
**Workspace UI root:** `local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui`  
**Guard:** `src/constants/ProductScope.js`  
**This is not PHASE 2.** No TypeScript engines, WASM, Worker, IndexedDB, Umi→Vite, React upgrade, or Java/Python deletion.

## Environment

| Item | Value |
|------|--------|
| OS | Windows 10.0.26200 (win32 x64) |
| CPU | 11th Gen Intel Core i5-1135G7 @ 2.40GHz (8 logical cores) |
| RAM | 16082 MB |
| Node | v24.21.0 |
| Test runner | `umi-test` (Jest 26.6.3) |

---

# Build

* **command:** `npm run build:file` (cwd: `astrostudyui`)
* **result:** success, exit 0
* **duration:** 561384 ms (~9.4 min)
* **notes:** `check-chunk-dup` green; 3D/heavy engines not in the same chunk as page entries. Working tree still has uncommitted PHASE 1 + 1.5 changes, so the artifact is not a release commit.

---

# Tests

**Full suite command:** `npx umi-test --forceExit`

* **total suites:** 516
* **passed suites:** 514
* **failed suites:** 2
* **skipped suites:** 0
* **total tests:** 6910
* **passed:** 6899
* **failed:** 2
* **skipped:** 9
* **duration:** 1067.859 s (~17.8 min)

PHASE 1 full-suite snapshot (before 1.5): 5 failed suites / 7 failed tests / 511 passed suites / 6892 passed tests.

PHASE 1.5 recovered 5 of those 7 tests (parser + fake-timer test fixes). Two failures remain (below). Net +2 tests from new sentinels (`hides removed product techniques…`, `PHASE1.5:已删页的子页签注册不得再导出`).

---

# Known failures

Original PHASE 1 seven failures, classified after isolated retest. Do not change core 八字 / 紫微 / 一掌经 algorithms to make these green.

## 1. `yizhangjingReportTable` — `[命宫与人事十二宫]/[大限]/[神煞合参] 表化后事实多重集零变化`

* **test:** `src/utils/__tests__/yizhangjingReportTable.test.js`
* **current result:** FAIL. `diffFacts` expected `[]`, received 195 tokens all of the form `旧0 vs 新N`
* **classification:** `EXPECTED_TEST_ASSUMPTION` (also `PREEXISTING`)
* **whether caused by PHASE 1:** no. Fixture is the pre-GFM prose baseline; `extractFacts` only tokenizes GFM table rows, so the old fixture contributes 0 facts and every current table cell looks like a new value
* **action:** do not recapture the fixture; do not change 一掌经. Later (not PHASE 2 engines) the extractor or baseline pairing can be repaired
* **remaining risk:** this test does not currently prove value-stability across the table conversion

## 2. `ziweiCenterPresetD4` — `apply:全键写入 LS 相等+恰一次 bump`

* **test:** `src/components/ziwei/__tests__/ziweiCenterPresetD4.test.js`
* **current result:** PASS after PHASE 1.5
* **classification:** `EXPECTED_TEST_ASSUMPTION` (was a false FAIL)
* **whether caused by PHASE 1:** no. `applyDisplayPreset` still writes flags then **one** `bumpZwDisplayRev('displayPreset', name)`. The old slicer `indexOf('\\n\\t}\\n')` missed CRLF function closes and counted 13 later bumps in the rest of `ZiWeiInput.js`
* **action:** test body extractor tightened to `applyDisplayPreset(name){…}`. Ziwei calculation untouched
* **remaining risk:** none for product UI; display revision count is still one per preset apply

## 3–5. `guicePerf` — 无 slot 时须自出三栏 (three tests)

* **test:** `src/components/guice/__tests__/guicePerf.test.js`
* **current result:** PASS after PHASE 1.5 (full suite and isolated)
* **classification:** `EXPECTED_TEST_ASSUMPTION` (was a false FAIL)
* **whether caused by PHASE 1:** no. `GuiceMain.render()` still emits `horosa-astro-input-panel` / `horosa-chart-stage` / `horosa-inspector-panel`. The regex `\n\trender() {…}\n}` did not match CRLF class close, so `render` scanned as empty
* **action:** brace-depth method extractor. Performance of 轨策 unchanged
* **remaining risk:** none for the three-column host contract

## 6. `baziStress` — `buildLocalBaziResult 单次均值 <500ms、最大 <1000ms`

* **test:** `src/utils/__tests__/baziStress.test.js`
* **current result:** FAIL
  * isolated: `n=10 avg=581.1ms max=1505ms`
  * full suite (CPU contention): `n=10 avg=930.9ms max=2547ms`
* **classification:** `FLAKY/PERFORMANCE` (`PREEXISTING` on this machine)
* **whether caused by PHASE 1:** no. Exhaustive option-matrix tests in the same file still pass (structure/correctness). The wall-clock gate was calibrated on a faster machine (comment in file: isolated avg≈110ms)
* **action:** do **not** change the 八字 algorithm. Record environment (this document). Threshold is a machine/load issue
* **remaining risk:** the perf gate will stay red on this laptop; a true 八字 slowdown could hide in the same noise. Prefer isolated runs on a faster host if the gate must be enforced

## 7. `stepPrefetch` — `缺省预算 ≤12;新一轮 submit 整队替换,旧代任务全弃`

* **test:** `src/utils/__tests__/stepPrefetch.test.js` (`🔴 预算与 latest-wins`)
* **current result:** PASS after PHASE 1.5 (isolated 13ms; also green in full suite)
* **classification:** `FLAKY` (was a false FAIL under real timers)
* **whether caused by PHASE 1:** no. Scheduler still latest-wins + budget 12 / hard cap 5. Real-timer waits raced with `requestIdleCallback` / 32ms fast-first / 80ms gap on Jest 26
* **action:** fake timers + stub `requestIdleCallback` → `setTimeout(0)`; flush microtasks. Did **not** lengthen wall-clock timeout to hide the race
* **remaining risk:** low. Pump behavior is now deterministic in Jest 26

---

# PHASE 1.5 cleanup (what changed)

User-visible AI export / mount selectors hide removed-product keys via `REMOVED_AI_TECHNIQUE_KEYS` / `isRemovedAiTechniqueKey`. Historical preset sections and extractors remain so old snapshots still parse.

Removed from the **selector / 一键挂载 / 事盘源列表**, still parseable:

* `fengshui`, `calendar`, `huangli` (老黄历日课, not `huangji`), `tongshu`, `tarot`
* `tianxing`, `qimenzeri`, `huanglizeri`, `bazizeri`, `taiyizeri`, `ziweizeri`, `liurengzeri`, `sanshizeri`, `qizhengzeri`, `indiazeri`

KEEP: `election` (辅盘择日盘), `geomancy` (天文地占), `huangji` (皇极经世).

Deleted dead production leftovers:

* `fetchPd3D` wrapper (`/predict/pd3d`). `fetchPdPoles` kept in `services/astroPd3d.js`
* `ZERI_SUBTABS`, `CNTRADITION_SUBTABS` and their runtime memory slots
* unused planetarium perf-flag functions
* unreachable `openDrawer` branches: login/register/resetpwd, caselist/caseadd/caseedit, chartdeeplearn, planetselect, statistic
* unused `Astro3DColor` table in `AstroConst.js`

Not touched (by design):

* `/predict/pd`, `/predict/pdchart`, `/predict/pdpoles`, `pdMath`, `pdSphereMath`, `pdTimelineMath`, `pdHouseCusps`
* `lunar-javascript`, `constants/shan24.js`
* `localcharts.js`, `localRecordStore.js` (no IndexedDB migration)
* Java controllers, Python engines
* Babylonian astrology (`babylonianData.js` is not Babylon.js)

---

# Product surface recheck

User-visible groups remain:

* 占星, 中国命理, 三式, 易学, AI分析, 命盘

Chart management only: list / add / save / open / edit / delete (`ChartList`, `ChartAdd`, `ChartEdit`). No ChartMemo, Cases pages, GPS charts, or cloud-chart UI.

No user entry for: 风水, 3D, 天文馆, 黄历, 辅助工具, 玄学史, 数据库, 择日工作台, 塔罗, 案例管理页, 登录/注册, 用户管理, 管理工具, 阅读器, 直播, IoT, 深度学习.

AI analysis may still list **事盘** snapshots for KEEP 三式/六爻/易学 modules stored in `localcases` (calculation + AI mount, not CaseList). Removed-product case types are filtered out of that picker.

`models/app.js` login/register sagas remain as dead effects; `utils/request.js` may still dispatch `app/logout` when Java returns `need.login`. No login/register/reset UI is mounted. Java was not changed.

---

# PHASE1_REGRESSION vs PREEXISTING

| Item | Verdict |
|------|---------|
| Extra Ziwei display revisions from PHASE 1 | **Not a regression.** False test. |
| Guice three-column layout | **Not a regression.** False test. |
| Prefetch latest-wins | **Not a regression.** Flaky timer test. |
| Yizhangjing table facts | **PREEXISTING** test-assumption |
| Bazi 500ms gate | **PREEXISTING** machine/load |
| Removed product re-exposed in AI selector | **Would have been leftover, now gated** (PHASE 1.5 product cleanup, not a calc regression) |

**No PHASE 1 calculation regression found.**
