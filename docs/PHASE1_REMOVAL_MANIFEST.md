# PHASE 1 Removal Manifest

**Date:** 2026-09-21  
**Workspace UI root:** `local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui`  
**Guard:** `src/constants/ProductScope.js`  
**Dead tab redirect:** `canonicalizeTabKey()` → `astrochart` (homepage default). Charts nav key `__charts__` opens the local chart list drawer; it is not a TabPane.

Git snapshot at PHASE 1 close: **433+ deleted files**, ~99k lines removed from the UI tree (plus later dead-file cleanup such as unused `Statis.js`).

---

## 1. Removed pages

User-facing page modules deleted (not hidden):

| Product | Main entry |
|---------|------------|
| 风水 | `components/fengshui/FengShuiMain.js` |
| 3D 星盘 | `components/astro3d/AstroChartMain3D.js` |
| 天文馆 | `components/planetarium/PlanetariumMain.js` (and Babylon runtime) |
| 黄历 | `components/calendar/CalendarMain.js` |
| 辅助 | `components/cntradition/CnTraditionMain.js` |
| 玄学史 | `components/xuanshi/XuanShiMain.js` |
| 数据库 | `components/astrodata/AstrodataPage.js` |
| 择日工作台 | `components/zeri/ZeriMain.js` |
| 塔罗 | `components/tarot/**` |
| 辅助工具页 | `components/commtools/CommToolsMain.js` |
| 管理工具 | `components/admintools/AdminToolsMain.js` |
| 阅读器 | `components/reader/**` |
| 直播 | liveplayer UI / multimedia live surface |
| 案例列表/编辑 | `components/user/CaseList.js`, `CaseAddFormComp`, `CaseEditFormComp` |
| 登录/注册/改密/用户参数/用户管理 | `LoginForm`, `RegisterForm`, `ResetPwdForm`, `ChangePwdForm`, `ChangeParamsFormComp`, `UserMgmt` |
| GPS 命盘 | `ChartsGps.js`, unused `statis/Statis.js` |
| 深度学习 UI | `components/deeplearn/**` |
| 命盘笔记编辑器 | `ChartMemo.js`, `RichEditor.js` |

Kept page-adjacent files (not product pages):

* `components/cntradition/CnTraditionInput.js` — Bazi input
* `components/commtools/Azimuth.js` — GuoLao azimuth helper
* `components/election/ElectionMain.js` — 辅盘择日盘
* `components/geomancy/**` — KEEP_YIXUE

---

## 2. Removed tabs

From `ProductScope.REMOVED_TAB_KEYS`:

* `fengshui`
* `planetarium`
* `astrochart3D`
* `calendar`
* `cntradition`
* `xuanshi`
* `astrodata`
* `zeri`
* `astroreader`
* `liveplayer`
* `admintools`
* `tarot`
* `primarydirsphere`

Legacy alias kept as redirect, not as a product tab:

* `yanqin` → `mingother`

KEEP tabs (18): `astrochart`, `direction`, `bazi`, `ziwei`, `guolao`, `indiachart`, `auxchart`, `relativechart`, `shusuan`, `mingother`, `jieqichart`, `sanshiunited`, `liureng`, `dunjia`, `guazhan`, `taiyi`, `cnyibu`, `aianalysis`

Management nav is not a tab: `__charts__` opens `chartlist`.

---

## 3. Removed drawers

From `ProductScope.REMOVED_DRAWER_KEYS`:

* `register`, `login`, `resetpwd`, `changepwd`, `changeparams`
* `caselist`, `caseedit`, `caseadd`
* `chartdeeplearn`, `memo`, `chartsgps`, `commtools`

KEEP drawers: `query`, `selectplanet`, `selectchartdisplay`, `selectasp`, `selectorb`, `chartlist`, `chartedit`, `chartadd`, `homepage`

`astro/openDrawer` and `pages/index.js` `openDrawer` both no-op unless `isKeepDrawerKey`.

Quick dock no longer renders 事盘 保存/载入 even if pages still pass a `save` callback.

---

## 4. Removed routes / legacy tab aliases

This SPA does not use Umi path routes for techniques. Persistence is `currentTab` in dva/local state.

* Removed tab keys canonicalize to `astrochart` on boot (`index.js` useEffect) and on `astro/save`.
* `yanqin` aliases to `mingother`.
* `__charts__` never becomes a TabPane (no white screen).
* Prefetch/dedupe no longer whitelist `/chart3d`.
* `/planetarium/state` remains a **forbidden** prefetch example, not a live route.

---

## 5. Removed services

Deleted:

* `src/services/astro3d.js`
* `src/services/planetarium.js`
* `src/services/xuanshi.js`
* `src/services/electionScan.js` (择日工作台 scan; 辅盘 `electionEngine` stays)

Intentionally retained (not product pages):

* `src/services/astroPd3d.js` — still exports `fetchPdPoles` (`/predict/pdpoles`) and unused `fetchPd3D` (`/predict/pd3d`, no remaining UI caller)
* `src/services/app.js` login/register/resetpwd — dva sagas remain; **login UI is gone**. Java controllers stay.
* `src/services/user.js` reader/password helpers — UI gone; Java stays.
* `src/services/astro.js` `fetchAllowedCharts` — **UI no longer calls `/allowedcharts`** (`ChartSearchModal` is local-only). Function left in the service file.

---

## 6. Removed 3D files

~44 files:

* `src/components/astro3d/**` (30) including `Astro3D.js`, `AstroChartMain3D.js`, `AstroPDSphere.js`, `PDSphereEngine.js`, `PlanetocentricMode.js`, `TextSprite.js`, `labelSprite.js`, `DRACOLoader.js`, 3D tests
* `src/components/planetarium/**` (12)
* `public/vendor/babylon/babylon.js` and related Babylon static runtime

Moved, not deleted (2D Primary Directions math):

* `src/utils/pdMath/pdSphereMath.js`
* `src/utils/pdMath/pdTimelineMath.js`
* `src/utils/pdMath/pdHouseCusps.js`
* plus `sphMath.js` / `morphMath.js` dependencies used by those files

---

## 7. Removed Fengshui files

~100 files under `src/components/fengshui/**` (engine, luopan charts, liqi schools, tests, data).

Extracted shared KEEP helper:

* `src/constants/shan24.js` (`SHAN_ORDER`, `SHAN_CENTER_DEG`, `GANZHI_60`, `shanAtDeg`) for GuoLao / AI mount schema.

**Did not delete `lunar-javascript`.**

---

## 8. Removed tool files

Approximate counts:

| Area | Files |
|------|------:|
| calendar / 黄历 page | 45 |
| zeri 择日工作台 + `divination/zeri` | 107 |
| tarot | 73 |
| xuanshi | 22 |
| commtools page (Azimuth restored) | 10 deleted |
| astrodata | 3 |
| CnTraditionMain | 1 |

Shared leftovers copied, not the 黄历 page:

* `src/data/tongshuData.js` — AI mount schema options only; huangli/tongshu snapshot builders return empty.

---

## 9. Removed management files

* CaseList / CaseAdd / CaseEdit
* Login / Register / ResetPwd / ChangePwd / ChangeParams / UserMgmt / ChartsGps
* AdminTools / BackupTool
* ChartMemo / RichEditor
* deeplearn UI
* reader / multimedia
* unused `components/statis/Statis.js` (`/statis/chartsgps`)

Kept: `ChartList`, `ChartAddFormComp`, `ChartEditFormComp`, `localcharts.js`, `localRecordStore.js`.

---

## 10. Removed npm dependencies

Confirmed unused after src import search, then removed from `package.json`:

* `three`
* `babylonjs`
* `astronomy-engine` (was 3D-only via deleted `ephemInterp.js`)
* `echarts` (xuanshi-only)
* `flv.js`
* `video.js`
* `videojs-flash`
* `react-quill` (ChartMemo / RichEditor)
* `@mediapipe/tasks-vision` (no src usage)

`.umirc.js` vendors-gl / vendors-echarts cacheGroups removed.

`postinstall` still runs `patch_quill_domnodeinserted.js`; it no-ops when quill is missing.

---

## 11. Shared dependencies intentionally retained

| Dependency / module | Why kept |
|---------------------|----------|
| `lunar-javascript` | Shared by Bazi, Ziwei, Heluo, jieqi — not fengshui-only |
| `d3` | 2D chart SVG, ACG map |
| React / React DOM / Umi / antd | PHASE 1 does not upgrade the shell |
| `tz-lookup`, `@amap/amap-jsapi-loader` | geo / timezone |
| Monaco, html2image/html2pdf, pdf-lib, docx, jszip, katex, marked, highlight.js | AI analysis / report |
| `node-forge`, `js-rsa` | `request.js` body encrypt + AI encrypt — **not login-only** |
| `components/babylon` + `divination/babylon` | **Babylonian astrology**, not Babylon.js 3D |
| `divination/election/electionEngine` | 辅盘择日盘 |
| `CnTraditionInput`, `Azimuth` | Bazi / GuoLao |
| `shan24.js` | GuoLao 24 mountains |
| `utils/pdMath/*` | Primary Directions math |
| `localcharts.js`, `localRecordStore.js` | local natal CRUD |
| `localcases.js`, `kentangCaseSave.js` | payload helpers still used by AI snapshot round-trip tests; **case UI is gone** |
| `horosaDesktop` stubs | deleting them would regress desktop detection; later PHASE |
| `fetchPdPoles` | KEEP `/predict/pdpoles` |
| Java `:9999` / Python `:8899` | algorithm migration is later PHASE |

---

## 12. Backend APIs intentionally retained for later migration

Java / Python controllers and vendor engines are **not** deleted in PHASE 1:

* `flatlib-ctrad2`, `pyswisseph`, `kinqimen`, `kintaiyi`, `kinjinkou`, `kinwuzhao`, `kinwangji`, `taixuanshifa`, `jingjue`, `shenyishu`, `kinastro`
* Java BaZi / Ziwei / LiuReng / Qizheng
* Python astrology engines
* `/predict/pd`, `/predict/pdchart`, `/predict/pdpoles` (and unused `/predict/pd3d`)
* `/nongli/*`, `/jieqi/*` (shared calendar calc, not 黄历 page)
* `/user/login|register|resetpwd|changepwd|changeparams`, `/usermgmt/*`, `/allowedcharts`, reader/live/IoT/deeplearn controllers — **Java stays**; frontend UI no longer exposes them

Frontend leftovers that still *could* call Java if dva effects fire, but have no product entry:

* `models/app.js` login/register/resetpwd/logout sagas + `services/app.js`
* `models/user.js` listBooks / case sagas
* `models/astro.js` dead `caselist`/`chartdeeplearn` branches after `isKeepDrawerKey` early-return; `localdeeplearn` still imported
* `services/user.js` astroreader functions
* `services/astro.js` `fetchAllowedCharts` (uncalled)

Python leftovers with no remaining frontend caller (UI deleted; engines stay):

* planetarium / chart3d state endpoints
* xuanshi endpoints
* election-scan (择日工作台) endpoints behind deleted `electionScan.js`
* tarot if any Python path existed (product was frontend-only)

---

## Residual notes (not fake-delete)

Nav / TabPane / homepage picker / `predictHook` no longer contain deleted product keys. Dead tabs canonicalize to `astrochart`.

Strings that **still exist** (compatibility / comments / AI preset tables — **not** first-level nav):

* `src/utils/aiExport.js` still lists `fengshui` / `calendar` / `huangli` / `tongshu` / `tarot` / `*zeri` as **AI export preset keys** so old snapshots do not break. This is leftover AI-settings surface, not a tab.
* `src/services/astroPd3d.js` still exports unused `fetchPd3D` (`/predict/pd3d`). Callers only use `fetchPdPoles`.
* `src/services/app.js` + `models/app.js` still wrap `/user/login|register|resetpwd|logout` with **no login UI**.
* `src/services/astro.js` `fetchAllowedCharts` — **no caller**.
* Prefetch **forbidden** markers keep `planetarium` / `chart3d` so `/chart` prefix cannot revive 3D.
* `JieQiChartsMain.parseJieQiTab` maps leftover `3D盘${title}` tab keys onto 2D 星盘 (no white screen).
* `xuanshi` as 六壬 `castMethod` (选时) is KEEP, not 玄学史.
* `divination/babylon` / `BABYLON_*` is Babylonian astrology KEEP, not Babylon.js.
* `localdeeplearn` still imported by `models/astro.js` (no UI).
* `src/data/tongshuData.js` leftover election glossary, currently unused after tongshu schema became `sectionsOnly`.
* `src/constants/SubTabRegistry.js` still exports unused `ZERI_SUBTABS` / `CNTRADITION_SUBTABS` (index.js does not wire them).
* After the successful `build:file`, leftover static copies `public/fengshui/**`, `public/astrodata/**`, and `public/gltf/draco/**` were deleted. The `dist-file` from that run still contains copies of those public files until the next build.

Git deleted-file counts at PHASE 1 close (UI tree): **434** deleted paths. Approx: fengshui **99**, 3D+planetarium+babylon vendor **39**, calendar **44**, xuanshi **19**, zeri **101**, tarot **70**, reader **6**, commtools **11**, user mgmt **11**, multimedia **7**, admintools **2**, astrodata **2**, deeplearn **2**.
