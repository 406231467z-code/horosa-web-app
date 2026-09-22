# Horosa Web Migration Audit — PHASE 0

**Date:** 2026-09-21  
**Scope:** source-level audit only. No product code was modified, deleted, or migrated.  
**Evidence order:** actual files → imports → tab keys / drawers → HTTP paths → Java/Python/vendor. README used only as auxiliary.

**Checkout note:** this workspace is a **browser-launcher slice**. Electron `main.js` / `preload.js` / NSIS / `Horosa.exe` are documented in `windows-adaptations/HARNESS_MANIFEST.md` but **are not on disk** (`desktop_installer_bundle/` is gitignored and absent). What actually runs here is Python `:8899` + Java `:9999` + static UI + Chrome/Edge `--app=`.

Path aliases used below:

| Alias | Absolute path |
|-------|----------------|
| `WS` | `c:\Users\Jiliason\horosa-web-app` |
| `HOROSA` | `WS\local\workspace\Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c` |
| `UI` | `HOROSA\astrostudyui` |
| `JAVA` | `HOROSA\astrostudysrv` |
| `PY` | `HOROSA\astropy` |
| `VENDOR` | `HOROSA\vendor` |

Default ports (from launchers + `UI/src/utils/constants.js`):

| Port | Process | Env |
|------|---------|-----|
| 8000 | static web (`python -m http.server` or Umi dev) | `HOROSA_WEB_PORT` |
| 8899 | Python CherryPy chart service | `HOROSA_CHART_PORT` |
| 9999 | Java Spring Boot (`astrostudyboot.jar`) | `HOROSA_SERVER_PORT` / `ServerRoot` |

Frontend `ServerRoot` defaults to `http://127.0.0.1:9999`. Kentang (奇门/太乙/金口/数算…) is rewritten to `:8899` by `buildKentangEndpoint()`.

---

# 1. Repository Structure

## 1.1 Workspace vs nested product

Cursor workspace root `WS` is a **Windows packaging wrapper**. The real product source is nested:

```
WS/
├── START_HERE.bat                          # one-click Windows entry
├── docs/                                   # legal docs + this audit
├── local/
│   ├── Horosa_Local_Windows.bat|.ps1       # starts Python + Java + browser
│   └── workspace/
│       └── Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/   ← real project
├── prepareruntime/                         # download/stage bundled Python/Java
└── windows-adaptations/                    # Windows patch harness (~318 files)
```

Confirmed by listing `HOROSA` directories and by `START_HERE.bat` setting `HOROSA_WORKSPACE_DIR`.

## 1.2 Canonical engineering roots (from files, not README)

| Role | Path | Evidence |
|------|------|----------|
| **真实前端根目录** | `HOROSA/astrostudyui` | `package.json` name `horosa-astrostudyui`; Umi 3 app; `src/pages/index.js` is the SPA |
| **真实 Java 根目录** | `HOROSA/astrostudysrv` | 14 Maven modules; boot `astrostudyboot` |
| **真实 Python 根目录** | `HOROSA/astropy` | CherryPy entry `websrv/webchartsrv.py`; `requirements.txt` |
| **真实 vendor 根目录** | `HOROSA/vendor` | `kinqimen`, `kinjinkou`, `kintaiyi`, `kinastro`, `kinwuzhao`, `kinwangji`, `jingjue`, `shenyishu`, `taixuanshifa` |
| **flatlib / Swiss wrapper** | `HOROSA/flatlib-ctrad2` | `requirements.txt` = `pyswisseph`; used by Python chart engine |
| **Electron 根目录** | **ABSENT in this checkout** | Documented as `WS/desktop_installer_bundle/electron/` (gitignored, 0 files). Frontend only has `window.horosaDesktop` stubs |
| **Windows launcher** | `WS/local/Horosa_Local_Windows.ps1` | ~4800 lines; spawns Python/Java/http.server/browser |
| **Cross-platform start** | `HOROSA/start_horosa_local.sh` | Java then Python; same 8899/9999 |
| **其他关键工程目录** | `HOROSA/scripts`, `UI/src/components`, `UI/src/services`, `UI/src/utils`, `JAVA/astrostudyboot`, `PY/websrv`, `PY/websrv/kentang` | |

## 1.3 Java Maven modules (14 `pom.xml`)

| Module | HTTP? | Role |
|--------|-------|------|
| `astrostudyboot` | aggregator | Spring Boot 2.7.6 fat-jar entry |
| `astrostudytest` | aggregator | dev/test boot |
| `astrostudy` | yes | Western astrology proxy, user/auth, AI |
| `astrostudycn` | yes | 八字/紫微/六壬/节气/黄历/chart |
| `astrodeeplearn` | yes | fate-event training |
| `astroreader` | yes | e-book + RTMP live |
| `astroesp` | yes | IoT door lock |
| `basecomm` | yes | system time, host id |
| `boundless` | yes | `/` and `/heartbeat` |
| `image` / `iot` / `media` | test/TTS | libraries |
| `medialib` | no | library |
| `astroswisseph` | **no sources** | `pom.xml` only — JNI Swiss wrapper **not present** in this tree |

**Runtime fact:** Java does **not** compute natal positions itself for `/chart`. `ChartController` / `AstroHelper` HTTP POST JSON to Python `http://127.0.0.1:8899`.

## 1.4 Python layout

- Server: single CherryPy app `PY/websrv/webchartsrv.py` bind `127.0.0.1:8899`
- Core mounts: `/`, `/predict`, `/india`, `/modern`, `/germany`, `/jieqi`, `/chart3d`, `/jdn`, `/calc`, `/qizhengelection`, `/location`, `/cetian`, `/astroextra`, `/planetarium`, `/electionscan`, `/qizhengelectionscan`, `/indiaelectionscan`
- Kentang mounts: `PY/websrv/kentang/registry.py` → 18 engines including `/qimen`, `/taiyi`, `/jinkou`, `/xuanshi`, kinastro family
- **No Flask/FastAPI** in `astropy`

## 1.5 Umi routes (not a multi-page router)

`UI/src/pages/` contains only `index.js` and `404.js`.  
`.umirc.js`: `history` hash only for `BUILD_FOR_FILE`; otherwise default.  
**All techniques are left-rail `XQTabs` inside one SPA**, not URL routes.

---

# 2. Frontend Route Tree

## 2.1 Umi

```
/          → layouts/index.js → layouts/app.js → pages/index.js
/404       → pages/404.js
```

No per-feature Umi route.

## 2.2 First-level TabPane tree (`UI/src/pages/index.js`)

Navigation source of truth: `navigationPages` (28 entries) + conditional tabs `astroreader` / `liveplayer` / `admintools`.

```
pages/index.js  (eager: AstroChartMain, BaZi)
├── [命]
│   ├── 占星     astrochart        AstroChartMain.js                 EAGER
│   ├── 星运     direction         AstroDirectMain.js                LAZY   (hidden in left rail)
│   ├── 八字     bazi              BaZi.js                           EAGER
│   ├── 紫微     ziwei             ZiWeiMain.js                      LAZY
│   ├── 七政     guolao            GuoLaoChartMain.js                LAZY
│   ├── 印占     indiachart        IndiaChartMain.js                 LAZY
│   ├── 辅盘     auxchart          AuxChartMain.js                   LAZY   (hidden)
│   ├── 合盘     relativechart     AstroRelative.js                  LAZY   (hidden)
│   ├── 数算     shusuan           ShuSuanMain.js → KinAstroMain     LAZY   (hidden)
│   └── 其他     mingother         MingOtherMain.js → KinAstroMain   LAZY   (hidden)
├── [卜]
│   ├── 三式     sanshiunited      SanShiUnitedMain.js               LAZY
│   ├── 六壬     liureng           LiuRengMain.js                    LAZY
│   ├── 遁甲     dunjia            DunJiaMain.js                     LAZY
│   ├── 六爻     guazhan           GuaZhanMain.js                    LAZY
│   ├── 太乙     taiyi             TaiYiMain.js                      LAZY
│   ├── 分至     jieqichart        JieQiChartsMain.js                LAZY   (hidden; contains 3D 盘 tabs)
│   ├── 风水     fengshui          FengShuiMain.js                   LAZY
│   ├── 塔罗     tarot             TarotMain.js                      LAZY
│   └── 其他     cnyibu            CnYiBuMain.js                     LAZY
├── [工具]
│   ├── AI分析   aianalysis        AIAnalysisMain.js                 LAZY
│   ├── 天文馆   planetarium       PlanetariumMain.js                LAZY
│   ├── 黄历     calendar          CalendarMain.js                   LAZY
│   ├── 辅助     cntradition       CnTraditionMain.js                LAZY
│   ├── 玄学史   xuanshi           XuanShiMain.js                    LAZY
│   ├── 3D星盘   astrochart3D      AstroChartMain3D.js               LAZY
│   ├── 数据库   astrodata         AstrodataPage.js                  LAZY
│   └── 择日     zeri              ZeriMain.js                       LAZY
└── [内容/管理]  (login/admin gated)
    ├── 书籍阅读 astroreader       BookMain.js                       LAZY
    ├── 星阙直播 liveplayer        MediaMain.js                      LAZY
    └── 管理工具 admintools        AdminToolsMain.js                 LAZY
```

Legacy alias: `currentTab === 'yanqin'` → `mingother`.

## 2.3 Sub-tab registries (`UI/src/constants/SubTabRegistry.js`)

### 辅盘 `auxchart` — `AUX_SUBTABS` (12)

| key | label | category |
|-----|-------|----------|
| germanytech | 量化盘 / Hamburg | KEEP_ASTROLOGY |
| hellenastro | 十三分盘 | KEEP_ASTROLOGY |
| dwadasamsa | 十二分盘 | KEEP_ASTROLOGY |
| locastro | 占星地图 ACG | KEEP_ASTROLOGY |
| relocation | 重置盘 | KEEP_ASTROLOGY |
| harmonic | 调波盘 | KEEP_ASTROLOGY |
| draconic | 龙盘 | KEEP_ASTROLOGY |
| otherbu | 骰子 | KEEP_ASTROLOGY |
| horary | 卜卦盘 | KEEP_ASTROLOGY |
| election | 择日盘 | KEEP_ASTROLOGY |
| mundane | 世俗盘 | KEEP_ASTROLOGY |
| babylon | 巴比伦 | KEEP_ASTROLOGY |

### 卜·其他 `cnyibu` — `CNYIBU_SUBTABS` (14)

| key | label | category |
|-----|-------|----------|
| suzhan | 宿盘 | KEEP_YIXUE |
| jinkou | 金口诀 | KEEP_YIXUE |
| tongshefa | 统摄法 | KEEP_YIXUE |
| huangji | 皇极经世 | KEEP_YIXUE |
| wuzhao | 五兆 | KEEP_YIXUE |
| taixuan | 太玄 | KEEP_YIXUE |
| jingjue | 荆诀 | KEEP_YIXUE |
| shenyishu | 神易数 | KEEP_YIXUE |
| geomancy | 地占 | KEEP_YIXUE |
| guice | 皇极轨策（含梅花数系） | KEEP_YIXUE |
| xiaoliuren | 小六壬 | KEEP_YIXUE |
| xiaochengtu | 小成图（梅花时间卦） | KEEP_YIXUE |
| feigong | 飞宫小奇门 | KEEP_YIXUE |
| lingqi | 灵棋经 | KEEP_YIXUE |

Tarot was promoted out of this group to L1 `tarot`.

### 星运 `direction` — 28 tabs in `AstroDirectMain.js`

Natal predictive suite (all KEEP_ASTROLOGY except one renderer):

| key | label | API (Java→Python unless noted) | 3D? |
|-----|-------|--------------------------------|-----|
| progressions | 二次推运 | `/astroextra/progressions` | no |
| primarydirect | 主限法 | `/predict/pd` | no |
| primarydirchart | 主限法盘 | `/predict/pdchart` | no |
| primarydirsphere | 主限天球 | `/predict/pd3d` + Three.js | **REMOVE_RENDERER** |
| solararc | 太阳弧 | `/predict/solararc` | no |
| planetaryarc | 行星弧 | `/predict/planetaryarc` | no |
| solarreturn | 太阳返照 | `/predict/solarreturn` | no |
| lunarreturn | 月亮返照 | `/predict/lunarreturn` | no |
| givenyear | 流年法 | `/predict/givenyear` | no |
| profection | 小限法 / Annual Profections | `/predict/profection` | no |
| firdaria | 法达星限 | `/predict/dist` (firdaria-like) | no |
| zodialrelease | 黄道星释 ZR | `/predict/zr` | no |
| persiandirected | 波斯向运 | `/predict/persianchart` | no |
| distributions | 界推运 | `/predict/dist` | no |
| agepoint | 年龄推进点 | `/predict/agepoint` | no |
| jaynesprog | 赤纬推运 | `/astroextra/jaynesprog` | no |
| vedicprog | 恒星推运 | (India stack) | no |
| ephemeris | 星历 | `/astroextra/ephemeris` | no |
| returntimeline | 回归轴 | `/astroextra/returns` | no |
| decennials | 十年大运 | predictive | no |
| planetaryages | 行星年龄 | predictive | no |
| yearsystem129 | 129年系统 | predictive | no |
| balbillus | Balbillus | predictive | no |
| triplicityrulers | 三分主星 | predictive | no |
| keypoints | 数字相位 | predictive | no |
| lunationphase | 月相推运 | predictive | no |
| prenatalsyzygy | 产前朔望 | `/astroextra/prenatal_syzygy` | no |
| extrareturns | 多重回归 | `/astroextra/returns` | no |

**Not a missing feature:** Transit as a named L1 tab does not exist. Transit-like data is inside natal `/chart` + predictive extras. Secondary Progression = `progressions`. Synastry/Composite = `relativechart`. ACG = `auxchart/locastro`. Vedic = `indiachart`. 七政四余 = `guolao`. Hellenistic extras live in auxchart + direction.

### 合盘 `relativechart`

`Comp` 比较盘, `Composite` 组合盘, `Synastry` 影响盘, `TimeSpace` 时空中点, `Marks` 马克斯盘, `Score` 关系量化 → all `POST /modern/relative` (KEEP_ASTROLOGY).

### 数算 `shusuan` → KinAstroMain

`shaozi` 邵子神数, `tieban` 铁板, `fendjing` 分定经, `beiji` 北极, `nanji` 南极, `chunzi` 蠢子, `canping` 参评, `heluo` 河洛理数, `zhengchuan` 神数正传 → KEEP_CHINESE_METAPHYSICS. HTTP `/{module}/pan` on Python except 河洛/正传 which have substantial **frontend local** engines (`heluoLocal.js`, `zhengchuan*.js`).

### 命·其他 `mingother`

`cetian` 策天飞星 (`/cetian/pan`), `xianqin` 演禽 (`/xianqin/pan`), `yizhangjing` 一掌经 → KEEP_CHINESE_METAPHYSICS.

### 三式合一 inner (do not double-count as extra L1)

Outer: overview / taiyi / liureng / bagong / ziweisihua. Reuses standalone 太乙/六壬/遁甲/紫微 engines.

### 择日 `zeri` — `ZERI_SUBTABS` (10) — page class **REMOVE_TOOLS**

`tianxing`, `qimenzeri`, `huanglizeri`, `bazizeri`, `taiyizeri`, `ziweizeri`, `liurengzeri`, `sanshizeri`, `qizhengzeri`, `indiazeri`.  
Engines they call are **SHARED_KEEP** (奇门/八字/太乙/紫微/六壬/七政/SWE election scans).

### 辅助 `cntradition` — REMOVE_TOOLS UI, SHARED_KEEP data

`guasym` 八卦类象, `cuangong12` 十二串宫, `pithy` 八字规则. Same pithy/gong12 also used by 八字 / 六爻.

### 风水 inner — REMOVE_FENGSHUI

`base` 基础, `disk` 纳气盘/罗盘, `canvas` 画布, `analysis` 判定.

### 直播 inner — REMOVE_OTHER_MANAGEMENT

`baobao`, `live`, `player`.

## 2.4 Drawers (not TabPanes)

Rendered from `pages/index.js`; keys in `models/astro.js` `closeAllDrawer()`.

| drawer | component | category |
|--------|-----------|----------|
| chartlist | ChartList.js | KEEP_CHART_MANAGEMENT |
| chartadd | ChartAddFormComp.js | KEEP_CHART_MANAGEMENT |
| chartedit | ChartEditFormComp.js | KEEP_CHART_MANAGEMENT |
| caselist | CaseList.js | KEEP_CHART_MANAGEMENT |
| caseadd | CaseAddFormComp.js | KEEP_CHART_MANAGEMENT |
| caseedit | CaseEditFormComp.js | KEEP_CHART_MANAGEMENT |
| memo | ChartMemo.js | KEEP_CHART_MANAGEMENT |
| chartsgps | ChartsGps.js | REMOVE_OTHER_MANAGEMENT (map of saved charts; optional) |
| chartdeeplearn | DLFeature.js | REMOVE_OTHER_MANAGEMENT |
| query | AstroFormComp.js | SHARED_KEEP (natal query form) |
| login/register/resetpwd/changepwd/changeparams | user/* | REMOVE_OTHER_MANAGEMENT (cloud-user; local charts do not need it) |
| selectasp/selectorb/selectplanet/selectchartdisplay | astro selectors | KEEP_ASTROLOGY |
| commtools | CommToolsMain.js | REMOVE_TOOLS (see §12; inverse-bazi SHARED) |
| homepage | HomePageSetup.js | SHARED_KEEP (module picker) |

---

# 3. Feature Classification

## 3.1 First-level tabs (30)

| Category | Count | keys |
|----------|------:|------|
| KEEP_ASTROLOGY | 6 | astrochart, direction, indiachart, auxchart, relativechart, jieqichart |
| KEEP_CHINESE_METAPHYSICS | 5 | bazi, ziwei, guolao, shusuan, mingother |
| KEEP_SANSHI | 4 | sanshiunited, liureng, dunjia, taiyi |
| KEEP_YIXUE | 2 | guazhan, cnyibu |
| KEEP_AI | 1 | aianalysis |
| REMOVE_FENGSHUI | 1 | fengshui |
| REMOVE_3D | 2 | planetarium, astrochart3D |
| REMOVE_TOOLS | 5 | calendar, cntradition, xuanshi, astrodata, zeri |
| REMOVE_OTHER_MANAGEMENT | 3 | astroreader, liveplayer, admintools |
| UNKNOWN | 1 | tarot |

`jieqichart` is KEEP_ASTROLOGY (节气/分至盘 used as astro technique). Its **3D盘** sub-views are REMOVE_RENDERER, not a reason to delete jieqi calculation (`/jieqi/year`).

`zeri` sits in nav group `工具` and is not in the keep product list → REMOVE_TOOLS. Do **not** delete kinqimen / SWE / bazi because of this page.

`tarot` is 卜-group divination, not in keep or explicit delete lists → UNKNOWN.

## 3.2 Expanded leaf count (sub-tabs unfolded; used for stats A–D)

See §数字统计. Methodology: unfold registered sub-tabs; keep L1 as 1 when it has no sub-tab list; do not double-count 三式合一 inners; add 6 chart CRUD drawers.

---

# 4. Astrology

## 4.1 What actually exists

| Feature | Exists? | Page | Notes |
|---------|---------|------|-------|
| 本命盘 / Natal | YES | `astrochart` | eager `AstroChartMain` + `AstroFormComp` |
| Transit named tab | NO | — | transit data inside natal/predictive |
| Secondary Progression | YES | `direction/progressions` | |
| Primary Directions | YES | `direction/primarydirect` + `primarydirchart` | calc KEEP; 3D sphere REMOVE_RENDERER |
| Solar Arc | YES | `direction/solararc` | |
| Solar Return / Lunar Return | YES | direction | |
| Synastry / Composite / Davison / Marks | YES | `relativechart` | `/modern/relative` |
| Midpoints (Hamburg) | YES | `auxchart/germanytech` | `/germany/midpoint` |
| Zodiacal Releasing | YES | `direction/zodialrelease` | `/predict/zr` |
| Firdaria | YES | `direction/firdaria` | |
| Annual Profections | YES | `direction/profection` | |
| Hellenistic / traditional | YES | natal lots/terms + aux hellenastro + babylon | |
| Indian / Vedic | YES | `indiachart` | `/india/chart`, `/india/rectify` |
| 七政四余 | YES | `guolao` | Java moira + Python kinastro `qizhengkin` |
| ACG / Astrology Map | YES | `auxchart/locastro` + `components/acg` + `@amap` | `/location/acg*` |
| Harmonic / Draconic / Relocation | YES | auxchart | `/astroextra/*` |
| Horary / Election / Mundane | YES | auxchart | dice `/predict/dice`; mundane extras |
| Babylonian | YES | auxchart/babylon | **not** Babylon.js |

## 4.2 Call chain (natal)

```
AstroChartMain / models/astro
  → services/astro.js fetchChart()
    → POST Java :9999 /chart
      → ChartController (astrostudycn)
        → AstroHelper HTTP POST Python :8899 /
          → flatlib-ctrad2 + pyswisseph (PerChart)
```

Same Java-proxy pattern for `/predict/*`, `/india/*`, `/modern/relative`, `/germany/midpoint`, `/location/acg*`, `/astroextra/*`, `/jieqi/*`, `/jdn/*`, `/calc/*`.

## 4.3 Frontend that can be reused (2D)

- `components/astro/*` SVG/D3 wheel (`AstroHelper.js` uses `d3.arc`) — **reuse, KEEP**
- `components/graph/*` D3 primitives — SHARED_KEEP
- `components/acg/AcgD3Map.js` — KEEP map UI (AMap), not 3D
- `components/astro3d/pdSphereMath.js`, `pdTimelineMath.js`, `pdHouseCusps.js` — **SHARED_KEEP** (tests forbid `from 'three'`)
- `astronomy-engine` in `ephemInterp.js` — 3D playback interp only; not natal source of truth

## 4.4 Must not delete with 3D

Primary Directions **calculation** (`/predict/pd`, `/predict/pdchart`, `/predict/pdpoles`) is KEEP. Only `/predict/pd3d` + `PDSphereEngine.js` + `Astro3D.js` are REMOVE_RENDERER.

---

# 5. Chinese Metaphysics

## 5.1 八字

| Layer | Path |
|-------|------|
| Page | `components/cntradition/BaZi.js` (eager) |
| Local engine | `utils/baziLunarLocal.js` `buildLocalBaziResult` + `lunar-javascript` |
| Java fallback | `POST /bazi/birth`, `/bazi/direct`, `/bazi/pattern` |
| Controllers | `BaZiBirthController`, `PaiBaZiController`, `BaZiPatternController` |
| Python | not the primary 八字 engine (Java `BaZiHelper`; nongli may use `/jieqi/nongli`) |
| Vendor | none |
| Tests | local lunar adapter tests; BC years still hit Java |

**Reuse:** local 四柱/大运/流年 path is already frontend-first. Remaining Java: pattern library, pithy corpus (`/common/pithy`), inverse (`/common/inversebazi` and `/bazi/direct`), unreliable lunar-js years.

## 5.2 紫微

| Layer | Path |
|-------|------|
| Page | `components/ziwei/ZiWeiMain.js` |
| Local engine | `components/ziwei/ZiweiCalc.js` |
| Java | `POST /ziwei/birth`, `/ziwei/rules`, `/ziwei/luck` (`ZiWeiController`) |
| Python | no |
| Tests | `ziweiLocalParity.test.js` (local vs Java field parity) |
| D3 | `ZiWeiChart.js` and house components |

**Reuse:** `ZiweiCalc` + D3 命盘 UI. Java still in live path for `/ziwei/birth` (prefetch) plus rules corpus.

## 5.3 七政四余

| Layer | Path |
|-------|------|
| Page | `components/guolao/GuoLaoChartMain.js` |
| Java | `POST /qizheng/moira` (`QizhengMoiraRuleService`) — **Java native, not Python** |
| Python | `POST /qizhengkin/pan` kinastro-qizheng; election `/qizhengelection/*` SWE |
| SWE | YES for kinastro chart + election scan |

SHARED with 择日 `qizhengzeri` (page REMOVE, engine KEEP).

## 5.4 数算 / 演禽 / 策天

See §16 Vendor. Frontend `KinAstroMain.js` is a **HTTP client**, not a Python port. 河洛/正传 have local JS.

---

# 6. Sanshi

```
六壬  LiuRengMain.js
  → POST Java /liureng/gods , /liureng/runyear
  → LiuRengController → LiuRengHelper (Java)
  → Frontend local: LRShenShaDoc, LRBiFa, 十二长生, 课体
  → D3: LiuRengChart.js
  → Python: none for core 六壬

遁甲  DunJiaMain.js → DunJiaCalc.js
  → POST Python :8899 /qimen/pan
  → vendor/kinqimen
  → Java: no QimenController (kentang-direct)

太乙  TaiYiMain.js → TaiYiCalc.js
  → POST Python :8899 /taiyi/pan
  → vendor/kintaiyi

三式合一  SanShiUnitedMain.js
  → reuses the three engines + /ziwei/birth for 紫微四化 overlay
```

**kinqimen / kintaiyi:** actually used. **kinjinkou** is 易学 (金口), not 三式 core, but listed in cnyibu.

---

# 7. Yixue

## 7.1 六爻

```
GuaZhanMain.js
  → local: gua/liuyaoFacade.js, GuaConst.js, LiuYaoConst.js, 纳甲/六亲/神煞
  → Java: POST /gua/desc , /gua/meiyi  (卦辞/梅花易卦辞文本, GuaController)
  → Python: none
  → D3: GuaZhanChart / gua/GuaChart.js
```

Time 起卦 `buildTimeGua()` is local 梅花-style numbers. Classic 卦辞 still Java.

## 7.2 梅花易数

No L1 tab named 梅花. Actual locations:

- `cnyibu/guice` 皇极轨策 — `shuXi: 'meihua'` school in `guiceSchools.js`
- `cnyibu/xiaochengtu` — 梅花时间卦
- 六爻 `buildTimeGua` — 时间起卦
- Help text contrasts 梅花 vs 六爻纳甲

## 7.3 Other 易学 under cnyibu

| Sub | Frontend | Python | Vendor |
|-----|----------|--------|--------|
| jinkou | `components/jinkou/*` | `/jinkou/pan` | kinjinkou |
| wuzhao | `components/wuzhao/*` | `/wuzhao/pan` | kinwuzhao |
| taixuan | `components/taixuan/*` | `/taixuan/pan` | taixuanshifa |
| jingjue | `components/jingjue/*` | `/jingjue/pan` | jingjue |
| shenyishu | `components/shenyishu/*` | `/shenyishu/pan` | shenyishu |
| huangji | `components/huangji/*` | `/wangji/pan` | kinwangji |
| geomancy | geomancy components | `/geomancy/*` | astrostudy.geomancy |
| feigong / xiaoliuren / lingqi / suzhan | local-heavy UI | mixed / suzhan uses astro chart | — |

---

# 8. AI Analysis

| Layer | Path |
|-------|------|
| Page | `components/aianalysis/AIAnalysisMain.js` |
| Service | `services/aianalysis.js` |
| Java | `AIAnalysisController`: `/aianalysis/providers/models`, `/chat`, `/chat/stream` (SSE), `/diagnose`, `/materials/extract`, `/embeddings` |
| Python | none |
| Calc | **none** — snapshots built in `utils/aiAnalysisContext.js` from already-computed charts |
| UI lib | `@monaco-editor/react` via `MonacoField.js` |
| Store | `aiAnalysisStore.js` (local) |

KEEP_AI. Later: `MIGRATE_TO_TS` (LLM proxy can stay as a small backend or serverless; not WASM).

---

# 9. Chart Management

Local-first already:

```
ChartList / ChartAdd / ChartEdit
  → utils/localcharts.js (localStorage key horosa.localCharts.v1)
  → utils/localRecordStore.js
  → import/export envelope format horosa-local-charts
```

Logged-in cloud path (REMOVE_OTHER_MANAGEMENT unless product still wants accounts):

- Java `UserChartsController`: `/user/charts`, `/add`, `/update`, `/delete`, `/memo`
- `UserDataTransferController`: `/user/charts/export`, `/import`

**SHARED_KEEP:** `localcharts.js`, `localRecordStore.js`, `ChartAddFormComp` birth fields, `DateTime`, geo selectors (`GeoCoordSelector` + cities JSON). These are required for 命盘保存 even if cloud user APIs go away.

Cases (起课) parallel local store — KEEP_CHART_MANAGEMENT for 三式/易学 saved questions.

---

# 10. Fengshui Dependencies

**Do not delete in PHASE 0.** Full map for later REMOVE_FENGSHUI.

## 10.1 UI

- Tab `fengshui` → `components/fengshui/FengShuiMain.js`
- **99 files** under `UI/src/components/fengshui/` (engine, 理气 schools, 罗盘, 玄空, 三合, 金锁, 紫白, 择日-in-fengshui, data JSON, tests)
- Inner: base / disk / canvas / analysis

## 10.2 Backend

- **No dedicated Java FengShuiController**
- **No Python fengshui HTTP mount**
- Comment in coverage: kind `'A'` “本地理气引擎”

## 10.3 Shared libs (must mark SHARED_KEEP, not REMOVE)

| Shared | Why SHARED_KEEP |
|--------|-----------------|
| `lunar-javascript` | also 八字, 紫微 luck, 河洛, 黄历择日, 演禽 |
| `DateTime` / day-boundary | all techniques |
| `xq-ui`, antd, dva | shell |
| 节气 solar terms conceptually | fengshui `zibai.js` has **local** `jieqiSolar()` via lunar-js; HTTP `/jieqi/` is for astro 节气盘 — KEEP that API |

## 10.4 Not used by fengshui

d3, @amap, Java/Python chart APIs, Swiss Ephemeris — **not** fengshui deps.

## 10.5 Later delete set (not now)

`components/fengshui/**`, nav entry, keywords in `navigationPages`, help docs that are fengshui-only. Do not remove `lunar-javascript` from `package.json`.

---

# 11. 3D Dependencies

## 11.1 Two renderers

| Renderer | Load | UI entry | Data API |
|----------|------|----------|----------|
| **Three.js 0.185.1** | webpack `import * as THREE from 'three'` | tab `astrochart3D`; 节气 3D盘; 星运 主限天球 | `/chart3d/state`, `/predict/pd3d` |
| **Babylon.js** | `public/vendor/babylon/babylon.js` → `window.BABYLON` | tab `planetarium` | `/planetarium/state` |

## 11.2 npm `babylonjs`

Listed in `UI/package.json` (`^7.54.3`) **but not imported in `src/`**. Runtime uses the public vendor script. Treat npm package as **dead dependency** (do not delete in PHASE 0).

## 11.3 Three.js actual import files (7)

Production:

- `components/astro3d/Astro3D.js`
- `components/astro3d/PDSphereEngine.js`
- `components/astro3d/PlanetocentricMode.js`
- `components/astro3d/TextSprite.js`
- `components/astro3d/labelSprite.js`
- `components/astro3d/vendor/DRACOLoader.js`

Test mentions: `astro3d/__tests__/pdSphere.test.js` (asserts math module has **no** three import).

## 11.4 Babylon.js actual use

- `components/planetarium/PlanetariumBabylon.js` (`const BABYLON = window.BABYLON`)
- `components/planetarium/PlanetariumMain.js` (guards `window.BABYLON`)
- tests inject a stub `global.BABYLON`
- asset: `UI/public/vendor/babylon/babylon.js`

**Not Babylon.js:** `divination/data/babylonianData.js` (Mesopotamian astrology).

## 11.5 KEEP vs REMOVE_RENDERER

| KEEP (calc/data) | REMOVE_UI / REMOVE_RENDERER |
|------------------|-----------------------------|
| `/chart` natal positions | `Astro3D.js` WebGL scene |
| `/predict/pd` PD list | `PDSphereEngine.js` |
| `pdSphereMath.js` | `AstroChartMain3D.js` tab |
| `/planetarium/state` body altaz if reused for 2D sky | `PlanetariumBabylon.js` |
| `planetariumProjection.js` (BABYLON-free, SWE-aligned) | planetarium tab |
| `astronomy-engine` interp (optional) | GLTF/DRACO loaders, lil-gui, stats |

## 11.6 3D file count

| Bucket | Count |
|--------|------:|
| `components/astro3d` | 28 |
| `components/planetarium` | 10 |
| services `astro3d.js`, `astroPd3d.js`, `planetarium.js` | 3 |
| `public/vendor/babylon/babylon.js` | 1 |
| **Total 3D-dedicated files** | **42** |

Plus jieqi lazy-imports 3D component (file itself is KEEP jieqi).

---

# 12. Tool Pages

| Page | key | Category | Backend |
|------|-----|----------|---------|
| AI分析 | aianalysis | KEEP_AI | Java LLM proxy |
| 天文馆 | planetarium | REMOVE_3D | Python SWE + Babylon |
| 黄历 | calendar | REMOVE_TOOLS | Java `/calendar/month`, `/nongli/time` — **nongli API is SHARED_KEEP** (六爻/八字/三式) |
| 辅助 | cntradition | REMOVE_TOOLS UI | `/gua/meiyi`, pithy — SHARED_KEEP |
| 玄学史 | xuanshi | REMOVE_TOOLS | Python `/xuanshi/*` SQLite, **27 endpoints**, echarts |
| 名人数据库 | astrodata | REMOVE_TOOLS | mostly static/frontend DB |
| 择日 | zeri | REMOVE_TOOLS | electionscan Python SWE + kentang |
| 小工具 drawer | commtools | REMOVE_TOOLS | `/calc/azimuth`, `/calc/cotrans`, inverse bazi — calc SHARED if 占星 keeps azimuth |

`echarts` is **only** 玄学史 (4 files). Removing 玄学史 allows dropping echarts later — not d3.

---

# 13. Management Pages

| Surface | Category |
|---------|----------|
| 命盘列表/增/改/删/导入/导出 (local) | KEEP_CHART_MANAGEMENT |
| 起课列表/增/改 | KEEP_CHART_MANAGEMENT |
| 命盘批注 memo | KEEP_CHART_MANAGEMENT |
| 登录/注册/改密/用户参数 | REMOVE_OTHER_MANAGEMENT |
| 用户管理 `/usermgmt/*` | REMOVE_OTHER_MANAGEMENT |
| 备份 `/bak/*` | REMOVE_OTHER_MANAGEMENT |
| OAuth client apps | REMOVE_OTHER_MANAGEMENT |
| 管理工具 tab | REMOVE_OTHER_MANAGEMENT |
| 书籍阅读 / 直播 / TTS / 讯飞 | REMOVE_OTHER_MANAGEMENT |
| 深度学习命运事件 | REMOVE_OTHER_MANAGEMENT |
| IoT `/door/locktrigger` | REMOVE_AFTER_MIGRATION |
| 星盘 GPS 分布 | REMOVE_OTHER_MANAGEMENT |

Shared with KEEP: birth form, timezone, lat/lon, `localcharts` storage kernel.

---

# 14. Java API Inventory

**Counts:** 53 controllers with handlers, **160** handler methods, **157** distinct paths. All `@RequestMapping` (no GetMapping). `@WsController` unused.

Default later tag legend: KEEP_BACKEND_TEMP = keep Java until replaced; MIGRATE_TO_TS = stateful/proxy; MIGRATE_TO_WASM = ephemeris-heavy; REMOVE_AFTER_MIGRATION = dead after product cut.

### Infra / health

| API | Controller | Frontend | Feature | Later |
|-----|------------|----------|---------|-------|
| `/` | RootController | — | infra | KEEP_BACKEND_TEMP |
| `/heartbeat` GET/PUT/POST/OPTIONS | HeartbeatController | StartupGate.js | health | KEEP_BACKEND_TEMP |
| `/horosaIdentity` GET | HorosaIdentityController | identity | identity | MIGRATE_TO_TS |
| `/common/time` `/tm` `/tmdetail` `/ver` | SystemController | app.js systime, StartupGate | clock | MIGRATE_TO_TS |
| `/common/hostid` `/hid` `/hidmd5` | SystemController | — | host | KEEP_BACKEND_TEMP |
| `/common/prevmonth` | SystemController | calendar | calendar | MIGRATE_TO_TS |
| `/common/imgToken` `/smsToken` | TokenController | app.js | tokens | KEEP_BACKEND_TEMP |
| `/common/delquerycaches` | CommController | admin | cache | REMOVE_AFTER_MIGRATION |
| `/common/naying` `/inversebazi` `/pithy` `/gong12` `/gong12gods` | CommController | commtools, 八字 | SHARED_KEEP calc | MIGRATE_TO_TS |

### Auth / user / charts (cloud)

| API | Controller | Frontend | Later |
|-----|------------|----------|-------|
| `/user/login` `/logout` `/register` `/resetpwd` `/check` `/changepwd` `/changeparams` | Login/Register/… | services/app.js, user.js | REMOVE_AFTER_MIGRATION if local-only |
| `/user/charts` CRUD `/memo` | UserChartsController | ChartList when logged in | MIGRATE_TO_TS or drop if localcharts-only |
| `/user/charts/export` `/import` | UserDataTransferController | chart transfer | MIGRATE_TO_TS |
| `/usermgmt/*` | UserMgmtController | admintools | REMOVE_AFTER_MIGRATION |
| `/allowedcharts` | AllowedChartController | astro.js | REMOVE_AFTER_MIGRATION |
| `/clientapp/*` | ThirdAppClientController | admin | REMOVE_AFTER_MIGRATION |
| `/bak/*` | BackupMgmtController | admin | REMOVE_AFTER_MIGRATION |
| `/log/*` `/statis/*` | TransLog / Statistic | GPS/stats | REMOVE_AFTER_MIGRATION |

### Western / Chinese calc (Java is often a thin proxy to Python)

| API | Controller | Frontend | Engine behind Java | Later |
|-----|------------|----------|--------------------|-------|
| `/chart` `/chart12` `/chart13` `/qry/chart` | ChartController, QueryChartController | services/astro.js, models/astro | Python flatlib | MIGRATE_TO_WASM |
| `/modern/relative` | ModernChartController | AstroRelative | Python | MIGRATE_TO_WASM |
| `/india/chart` `/rectify` | IndiaChartController | IndiaChartMain | Python jyotish | MIGRATE_TO_WASM |
| `/germany/midpoint` | GermanyTechController | aux germany | Python | MIGRATE_TO_WASM |
| `/location/acg*` | AcgController | acg map | Python SWE | MIGRATE_TO_WASM |
| `/planetarium/state` | PlanetariumController | planetarium.js | Python SWE | REMOVE_AFTER_MIGRATION (renderer) / data UNKNOWN if 2D sky kept |
| `/chart3d/state` | Chart3DController | astro3d.js | Python SWE | REMOVE_AFTER_MIGRATION (renderer) |
| `/calc/azimuth` `/cotrans` `/formula` `/calculate` | CalcController | commtools | Python SWE | MIGRATE_TO_WASM |
| `/jdn/date` `/num` | JdnController | tools | Python | MIGRATE_TO_WASM |
| `/predict/*` (16 including pd3d) | PredictiveController | direction | Python | MIGRATE_TO_WASM; pd3d REMOVE_RENDERER |
| `/astroextra/*` (15) | AstroExtraController | direction, mundane | Python | MIGRATE_TO_WASM |

### Chinese native Java (not kentang)

| API | Controller | Frontend | Later |
|-----|------------|----------|-------|
| `/bazi/birth` `/direct` `/pattern` `/pattern/update` | BaZi* | BaZi.js | MIGRATE_TO_TS (local engine already exists) |
| `/ziwei/birth` `/rules` `/luck` | ZiWeiController | ZiWeiMain.js | MIGRATE_TO_TS (ZiweiCalc exists) |
| `/liureng/gods` `/runyear` | LiuRengController | LiuRengMain.js | MIGRATE_TO_TS |
| `/qizheng/moira` | QizhengMoiraController | qizheng.js | MIGRATE_TO_TS |
| `/gua/desc` `/meiyi` | GuaController | GuaZhanMain, MeiyiGuaSym | MIGRATE_TO_TS (text corpus) |
| `/nongli/time` | NongliController | many via preciseCalcBridge | MIGRATE_TO_TS / WASM |
| `/jieqi/year` | JieQiController | JieQiChartsMain | MIGRATE_TO_WASM (proxies Python) |
| `/calendar/month` | CalendarController | CalendarMain | REMOVE_AFTER_MIGRATION (黄历 UI) but helper SHARED |

### AI

| API | Controller | Frontend | Later |
|-----|------------|----------|-------|
| `/aianalysis/*` (6) | AIAnalysisController | aianalysis.js | MIGRATE_TO_TS |

### Reader / live / DL / IoT / test

| API group | Later |
|-----------|-------|
| `/astroreader/*`, `/live/*`, `/xunfei/*` | REMOVE_AFTER_MIGRATION |
| `/deeplearn/*` | REMOVE_AFTER_MIGRATION |
| `/door/locktrigger` | REMOVE_AFTER_MIGRATION |
| `/test/qrcode` `/test/com` | REMOVE_AFTER_MIGRATION |

---

# 15. Python API Inventory

**114** `@cherrypy.expose` endpoints. Entry `webchartsrv.py`. Frontend either hits Java (which POSTs here) or kentang-direct `:8899`.

Swiss legend: YES-flatlib / YES-direct / YES-indirect / NO.

### Root + core (keep calc unless renderer)

| API | File | Frontend | Engine | SWE | Later |
|-----|------|----------|--------|-----|-------|
| `/` `/chart12` `/chart13` | webchartsrv.py | via Java /chart | flatlib PerChart | YES-flatlib | MIGRATE_TO_WASM |
| `/healthz` `/horosaIdentity` | webchartsrv.py | launcher / tests | — | mixed | KEEP_BACKEND_TEMP |
| `/predict/*` (16) | webpredictsrv.py | via Java | flatlib | YES-flatlib | MIGRATE_TO_WASM; pd3d REMOVE_RENDERER |
| `/india/chart` `/rectify` | webindiasrv.py | via Java | jyotish + flatlib | YES | MIGRATE_TO_WASM |
| `/modern/relative` | webmodernsrv.py | via Java | astrostudy.modern | YES | MIGRATE_TO_WASM |
| `/germany/midpoint` | webgermanysrv.py | via Java | hamburg | YES | MIGRATE_TO_WASM |
| `/jieqi/*` | webjieqisrv.py | via Java | jieqi + swe | YES | MIGRATE_TO_WASM |
| `/jdn/*` `/calc/*` | webjdn.py, webcalc.py | commtools | swe | YES-direct | MIGRATE_TO_WASM |
| `/location/acg*` | webacgsrv.py | acg | ACGraph + swe | YES-direct | MIGRATE_TO_WASM |
| `/astroextra/*` (15) | webastroextrasrv.py | direction, mundane | swe | YES-direct | MIGRATE_TO_WASM |
| `/cetian/pan` `/texts` | webcetiansrv.py | mingother | cetian_ziwei | NO | MIGRATE_TO_TS |
| `/chart3d/state` | webchart3dsrv.py | astro3d.js | chart3d | YES-direct | REMOVE_AFTER_MIGRATION (UI); data SHARED if 2D |
| `/planetarium/state` | webplanetariumsrv.py | planetarium.js | PerChart + swe | YES | REMOVE_AFTER_MIGRATION (UI) |
| `/qizhengelection/*` | webqizhengelectionsrv.py | qizheng.js, zeri | swe | YES-direct | KEEP for 七政; zeri UI remove |
| `/electionscan/*` `/qizhengelectionscan/*` `/indiaelectionscan/*` | *electionscansrv.py | electionScan.js | swe | YES | REMOVE_AFTER_MIGRATION with 择日 page; UNKNOWN if electional astro kept in auxchart |

### Kentang (18 mounts)

| Mount | File | Frontend | Vendor | SWE | Later |
|-------|------|----------|--------|-----|-------|
| `/taiyi/pan` | webtaiyisrv.py | TaiYiCalc.js | kintaiyi | NO | MIGRATE_TO_TS |
| `/qimen/pan` | webqimensrv.py | DunJiaCalc.js | kinqimen | NO | MIGRATE_TO_TS |
| `/jinkou/pan` | webjinkousrv.py | JinKouCalc.js | kinjinkou | NO | MIGRATE_TO_TS |
| `/wuzhao/pan` | webwuzhaosrv.py | WuZhaoMain.js | kinwuzhao | NO | MIGRATE_TO_TS |
| `/taixuan/pan` | webtaixuansrv.py | TaiXuanMain.js | taixuanshifa | NO | MIGRATE_TO_TS |
| `/jingjue/pan` | webjingjuesrv.py | JingJueMain.js | jingjue | NO | MIGRATE_TO_TS |
| `/shenyishu/pan` | webshenyishusrv.py | ShenYiShuMain.js | shenyishu | NO | MIGRATE_TO_TS |
| `/wangji/pan` `/classic` `/xinyi` | webwangjisrv.py | HuangJiMain.js | kinwangji | NO | MIGRATE_TO_TS |
| `/shaozi` `/tieban` `/fendjing` `/beiji` `/nanji` `/chunzi` `/xianqin` `/qizhengkin` `/pan` | web*srv.py | KinAstroMain, qizheng.js | kinastro | YES-indirect | MIGRATE_TO_WASM or TS |
| `/geomancy/*` | webgeomancysrv.py | cnyibu geomancy | astrostudy.geomancy | mixed | MIGRATE_TO_TS |
| `/xuanshi/*` (27) | webxuanshisrv.py | xuanshi.js | SQLite history | NO | REMOVE_AFTER_MIGRATION |

Python `requirements.txt` also lists **plotly**, **streamlit**, **kerykeion**, **astropy>=7** (PyPI astronomy lib; name collision with folder `astropy/`). Plotly is for vendor Streamlit demos, **not** the React UI.

---

# 16. Vendor Engines

| Folder | Capability | Imported by | UI | Keep? |
|--------|------------|-------------|----|-------|
| **kinqimen** | 奇门遁甲 | `webqimensrv.py` | dunjia, sanshi, zeri | KEEP (SHARED with zeri) |
| **kintaiyi** | 太乙 | `webtaiyisrv.py` | taiyi, sanshi, zeri | KEEP |
| **kinjinkou** | 金口诀 | `webjinkousrv.py` | cnyibu/jinkou | KEEP |
| **kinwuzhao** | 五兆 | `webwuzhaosrv.py` | cnyibu | KEEP |
| **kinwangji** | 皇极经世 | `webwangjisrv.py` | cnyibu/huangji | KEEP |
| **taixuanshifa** | 太玄 | `webtaixuansrv.py` | cnyibu | KEEP |
| **jingjue** | 荆诀 | `webjingjuesrv.py` | cnyibu | KEEP |
| **shenyishu** | 神易数 | `webshenyishusrv.py` | cnyibu | KEEP |
| **kinastro** | 邵子/铁板/分定/北极/南极/蠢子/演禽/七政 kin | multiple web*srv | shusuan, mingother, guolao | KEEP; SWE-indirect |
| Streamlit `vendor/*/app.py` | standalone demos | not mounted by CherryPy | — | later REMOVE (dead for product HTTP) |

Frontend `components/kinastro/KinAstroMain.js` is **not** a JS rewrite of vendor; it calls HTTP.

---

# 17. Swiss Ephemeris

## 17.1 Where it actually runs

| Location | Role |
|----------|------|
| `PY` `pyswisseph` (`astropy/requirements.txt`) | natal, predictives, ACG, calc, planetarium, chart3d, election scans, qizheng election |
| `HOROSA/flatlib-ctrad2` (`pyswisseph`) | flatlib `ephem.swe` used by `/` natal |
| `vendor/kinastro` | YES-indirect for 数算/七政 kin |
| `JAVA/astroswisseph` | **empty of Java/C sources** in this checkout — not an active SWE engine |
| Frontend | **does not embed SWE**. Comments/tests compare against backend SWE (`planetariumProjection.js`, `chart3dInterp.test.js`) |

## 17.2 Features that require SWE later (WASM candidates)

Natal 2D, all `/predict/*` except dice, India, ACG, Hamburg, jieqi true solar terms, azimuth/cotrans, 七政 kinastro, mundane eclipse times, election scans.

## 17.3 Features that do **not** need SWE

八字 (lunar-js), 紫微 (ZiweiCalc), 六爻, 六壬 Java helper, 奇门/太乙/金口/五兆/太玄/荆诀/神易/皇极, 风水 local, AI proxy, chart localStorage, 玄学史 SQLite.

---

# 18. Electron / Windows Dependencies

## 18.1 Electron (REMOVE_ELECTRON)

**On disk: no Electron main/preload/ipc/electron-builder/NSIS/exe.**

Documented but missing: `desktop_installer_bundle/electron/{main.js,preload.js,service-manager.js,…}` and NSIS scripts (`HARNESS_MANIFEST.md`).

Frontend bridge (no-op in browser launcher):

- `utils/shadowMirror.js`
- `utils/windowSizePersistence.js`
- `components/common/StartupGate.js`
- `components/homepage/PageHeader.js` (`exportDiagnostics`)
- `components/common/__tests__/startupGateDesktopElapsed.test.js`

`scripts/inject-preload.js` is **Umi chunk preload**, not Electron preload.

## 18.2 Windows launcher (REMOVE_WINDOWS)

```
START_HERE.bat
  → local/Horosa_Local_Windows.bat
    → Horosa_Local_Windows.ps1
         → python ... astropy/websrv/webchartsrv.py     (:8899)
         → java -jar astrostudyboot.jar --astrosrv=http://127.0.0.1:8899  (:9999)
         → python -m http.server (:8000)
         → chrome/edge --app=http://127.0.0.1:8000/...
         health: GET :9999/common/time ; chart :8899
```

Also: `prepareruntime/Prepare_Runtime_Windows.ps1` (embed Python/Java/wheels/VC++), `windows-adaptations/` (~318 patch/golden files).

`HOROSA/start_horosa_local.sh` is cross-platform product start — not Windows-only, but still a **local Java/Python launcher** to remove for pure web.

---

# 19. package.json Dependency Audit

Source: `UI/package.json` only (the real frontend). No `electron` dependency.

| Package | Version | Used in | Feature | Future |
|---------|---------|---------|---------|--------|
| react / react-dom | 17.x | entire SPA | shell | KEEP (do not upgrade in PHASE 0) |
| umi | ^3.5.41 | build/dev | shell | KEEP for now (Vite is later phase) |
| antd (via umi preset) | 4.x chain | UI | shell | KEEP |
| @ant-design/pro-layout | ^6.5.0 | layout | shell | KEEP until shell rewrite |
| d3 | ^7.8.4 | **91 files** `from 'd3'` (astro, ziwei, 六壬, 金口, 七政, 宿, graph, hamburg, ACG) | 2D charts | **KEEP core** |
| echarts | ^6.1.0 | xuanshi only (~4 files) | 玄学史 | later REMOVE with xuanshi |
| three | 0.185.1 | 6 astro3d files | 3D | later REMOVE with 3D |
| babylonjs | ^7.54.3 | **no src import** | dead npm; public/vendor used | later REMOVE npm; delete public vendor with planetarium |
| astronomy-engine | 2.1.19 | astro3d/ephemInterp.js | 3D interp | later REMOVE with 3D unless reused |
| lunar-javascript | ^1.7.7 | bazi, ziwei luck, fengshui zibai/zeri, heluo, yanqin, huangli zeri | calendar/bazi | **SHARED_KEEP** |
| @monaco-editor/react | ^4.7.0 | AI MonacoField | KEEP_AI | KEEP |
| @amap/amap-jsapi-loader | ^1.0.1 | amap/*, ACG | KEEP_ASTROLOGY maps | KEEP for ACG |
| @mediapipe/tasks-vision | ^0.10.35 | **zero src imports** | dead | later REMOVE |
| tz-lookup | ^6.1.25 | timezone | SHARED_KEEP | KEEP |
| video.js / flv.js | 8.x / 1.6 | multimedia live | REMOVE_OTHER_MANAGEMENT | later REMOVE |
| react-quill / node-forge | editor/crypto | ChartMemo (lazy), security | mixed | ChartMemo KEEP; forge UNKNOWN |
| html2pdf / pdf-lib / docx / jszip | export | AI/reports | KEEP_AI / charts | KEEP |
| katex / marked / highlight.js | markdown | AI/reader | KEEP_AI; reader remove | split |
| puppeteer-core | dev | tests | KEEP tests | KEEP |
| plotly | **not in frontend package.json** | — | — | n/a (Python-only) |

`.umirc.js` splitChunks already isolates `three`+`astronomy-engine` as `vendors-gl`, d3 as `vendors-d3`, echarts as `vendors-echarts`.

---

# 20. Shared Dependencies

Mark **SHARED_KEEP** if any KEEP feature uses it.

| Shared item | Consumers | If deleting a REMOVE feature |
|-------------|-----------|------------------------------|
| `lunar-javascript` | 八字, 紫微, 河洛, 演禽, 风水, 黄历择日 | cannot drop with 风水 |
| `/nongli/time` + `preciseCalcBridge` | 六爻, 三式, 八字, 黄历 | cannot drop with 黄历 UI |
| `/jieqi/year` | 节气盘 KEEP, 部分命理 | cannot drop with 黄历 |
| D3 + `components/graph` | 占星 2D, 紫微, 六壬, 金口, 七政, 玄学史 persons | cannot drop with 玄学史; echarts **can** drop |
| `localcharts` / `localRecordStore` | all KEEP modules save charts | KEEP |
| `DateTime`, day-boundary, `xq-ui` | all | KEEP |
| cities JSON / GeoCoord | astro, 三式, charts | KEEP |
| Java `/chart` Python natal | 占星, 印占, 辅盘, 合盘, 节气星盘, 七政 overlay | KEEP |
| kinqimen | 遁甲 KEEP + 择日 REMOVE | KEEP engine |
| pyswisseph | all Western + 七政 kin + 天文馆/3D | KEEP engine; drop only renderer APIs |
| AI snapshot builders | import 八字/紫微/六壬/… | KEEP those calc modules |

---

# 21. Migration Risks

1. **Natal astrology is Python+SWE behind a Java proxy.** Browser-only 占星 without WASM SWE will not match current `/chart`.
2. **Two implementations already exist** for 八字 and 紫微 (local JS + Java). Parity tests exist; BC / lunar-js domain still falls back to Java. Risk: silent drift if Java is cut too early.
3. **Kentang vendors are Python, not inlined in the frontend.** 奇门/太乙/金口/数算 cannot go browser-only by deleting HTTP.
4. **六壬 is Java-native**, unlike 奇门. Different migration path.
5. **Empty `astroswisseph` Java module** — do not plan a Java SWE port from this tree; SWE lives in Python.
6. **3D deletion vs PD math** — `pdSphereMath.js` must stay if 主限法 2D stays.
7. **风水 uses lunar-js** — deleting 风水 files is safe; deleting lunar-js is not.
8. **Umi `dynamicImport` + splitChunks** — phone/WeChat chunk failures (`2.js`, `shared-technique.js`, `layouts__index.chunk.css`) are a **web-shell** risk, independent of calc migration.
9. **Electron code is dual-mode.** Removing `horosaDesktop` branches is cleanup, but the real EXE pipeline is not in this checkout.
10. **Dead deps** (`babylonjs` npm, `@mediapipe`) look removable but PHASE 0 does not delete them.
11. **玄学史 27 Python endpoints + SQLite** is a large REMOVE that does not affect KEEP calc.
12. **择日 election scans are minute-level SWE.** Cutting the 择日 **page** is not cutting `/qizhengelection/pan` needed by 七政.
13. **Name collision:** folder `astropy/` (Horosa Python app) vs PyPI `astropy>=7` in requirements.
14. **Auth/RSA `js-rsa` / `node-forge`** — required only if cloud login remains.

---

# 22. Recommended Migration Order

PHASE 0 (this document) is complete. Do **not** start PHASE 1 until explicitly requested.

Suggested later order (not executed):

1. **Product cut in the shell (tabs/nav only)** after dependency tags: hide 风水/3D/工具/管理, keep engines.
2. **First calc batch (browser-complete):** 八字 → 紫微 → 六爻 (see scoring in 数字统计 S).
3. **Chart management:** already localStorage; make it the only save path; drop `/user/charts` if accounts go away.
4. **AI:** keep Java/TS LLM proxy; snapshots already frontend.
5. **三式/易学 vendor:** port or WASM-wrap kinqimen / kintaiyi / kinjinkou (pure Python, no SWE) as TS.
6. **六壬:** port `LiuRengHelper` Java → TS (no SWE).
7. **Western natal + predictives + 七政 kinastro:** compile **pyswisseph / Swiss Ephemeris to WASM**; reuse existing D3 2D UI; delete Three/Babylon UI after.
8. **Drop Java process** once proxies are gone; then drop CherryPy.
9. **Drop Electron/Windows launchers last** after static hosting works.

---

# 数字统计

Counting rules:

- **L1** = 30 TabPanes in `pages/index.js`.
- **Expanded leaves** = unfold SubTabRegistry + direction 28 + relative 6 + shusuan 9 + mingother 3 + fengshui 4 + zeri 10 + cntradition 3 + xuanshi 6 documented views + liveplayer 3; L1 without sub-tabs count as 1; 三式合一 hub counts as 1 (inners not double-counted); **plus 6 chart CRUD drawers**.
- `primarydirsphere` counted in REMOVE_3D, not KEEP_ASTROLOGY.

### A–D Pages

| | Definition | Count |
|--|------------|------:|
| **A** | Expanded product surfaces (leaves + 6 chart CRUD) | **123** |
| **B** | KEEP_* among A | **89** |
| **C** | REMOVE_* among A | **33** |
| **D** | UNKNOWN among A | **1** (tarot) |

L1-only check: 30 = KEEP 18 + REMOVE 11 + UNKNOWN 1.

KEEP 89 = astrology leaves 48 (direction 27 + natal/aux/relative/jieqi/india) + Chinese 15 + sanshi 4 + yixue 15 + AI 1 + chart CRUD 6.  
REMOVE 33 = fengshui 4 + 3D 3 (planetarium, astrochart3D, primarydirsphere) + tools 21 + other management 5.

### E–F APIs

| | Count |
|--|------:|
| **E. Java API** | **157** distinct paths (160 handlers) |
| **F. Python API** | **114** expose endpoints |

### G–H Engines

**G. 保留计算引擎 (SHARED_KEEP / KEEP):**

- pyswisseph + flatlib-ctrad2 (Western + 七政 kin + jieqi)
- kinqimen, kintaiyi, kinjinkou, kinwuzhao, kinwangji, taixuanshifa, jingjue, shenyishu, kinastro
- Java `BaZiHelper` / `ZiWeiHelper` / `LiuRengHelper` / `QizhengMoiraRuleService` / `GuaHelper` until TS parity
- Frontend: `baziLunarLocal`, `ZiweiCalc`, `liuyaoFacade`, `heluoLocal`, `zhengchuan*`, `pdSphereMath`

**H. 删除计算引擎 (after UI cut, not now):**

- 风水 `fengshuiEngine.js` (local, 99-file module)
- 玄学史 SQLite `/xuanshi/*`
- 3D-only `/chart3d/state` + `/predict/pd3d` **render payloads** (not `/predict/pd`)
- 天文馆 Babylon runtime
- Streamlit vendor demo apps
- IoT / deeplearn / live / reader backends
- Empty `astroswisseph` Java module (already source-empty)

### I–K Migration style

**I. 需要迁移到 TypeScript 的模块**

八字剩余 Java、紫微 birth/rules 语料、六壬 `LiuRengHelper`、七政 moira、卦辞 `/gua/desc`、kinqimen/kintaiyi/kinjinkou/其他 kentang（无 SWE）、AI proxy、nongli 文本、命盘若保留云端同步。

**J. 可能需要 WASM 的模块**

Swiss Ephemeris / flatlib natal+predictives、India jyotish、ACG、Hamburg midpoints、`/calc/azimuth|cotrans`、`/jieqi` true solar terms、kinastro 七政/数算 (SWE-indirect)、election-scan minute SWE.

**K. 可以直接复用现有前端计算的模块**

- 八字 `buildLocalBaziResult` (AD1–9999)
- 紫微 `ZiweiCalc` + D3 盘
- 六爻 `liuyaoFacade` + 摇卦 UI（卦辞除外）
- 河洛 `heluoLocal.js`、神数正传 `zhengchuan*`
- 命盘 `localcharts.js`
- 2D 星盘 D3 (`AstroHelper` / `graph/*`)
- PD 球面数学 `pdSphereMath.js`（无 Three）
- AI snapshot `aiAnalysisContext.js`
- 风水引擎（仅当产品改变主意保留风水；当前计划是删 UI+引擎一起，不复用）

### L–N File counts

| | Count | Notes |
|--|------:|-------|
| **L. 3D 依赖文件** | **42** | astro3d 28 + planetarium 10 + 3 services + 1 public babylon |
| **M. 风水依赖文件** | **99** | `components/fengshui` only; plus 1 nav entry |
| **N. Electron 专用文件** | **0 main-process + 5 bridge + Windows stack** | Electron main **absent**. Bridge files: 5. Windows: `START_HERE.bat`, `local/Horosa_Local_Windows.{bat,ps1}`, `prepareruntime/`, `windows-adaptations/` (~318) |

### O–R Library use

**O. Babylon.js**

- Runtime: `UI/public/vendor/babylon/babylon.js` + `PlanetariumBabylon.js` + `PlanetariumMain.js`
- npm `babylonjs`: unused import
- Not: `babylonianData.js`

**P. Three.js**

- `Astro3D.js`, `PDSphereEngine.js`, `PlanetocentricMode.js`, `TextSprite.js`, `labelSprite.js`, `vendor/DRACOLoader.js`
- Lazy: `AstroChartMain3D` from index + jieqi

**Q. Plotly**

- **Frontend `src/`: not used**
- Python `astropy/requirements.txt`: `plotly>=5,<7` for vendor Streamlit demos

**R. Swiss Ephemeris**

- Python `pyswisseph` via natal `/`, `/predict/*`, `/india/*`, `/location/*`, `/calc/*`, `/jieqi/*`, `/chart3d/state`, `/planetarium/state`, qizheng election, kinastro indirect
- `flatlib-ctrad2`
- Java module source: **missing**
- Frontend: alignment tests only, no native SWE

### S. First three modules to migrate

Scored on: existing frontend calc ratio, Java/Python coupling, vendor, algorithm complexity, tests, page count, SWE dependence. Higher = migrate first.

| Rank | Module | FE calc | Coupling | Vendor | Complexity | Tests | Pages | SWE | Why first |
|------|--------|---------|----------|--------|------------|-------|------:|-----|-----------|
| **1** | **八字** | High (`baziLunarLocal`) | Java fallback only | none | medium | lunar/local tests | 1 L1 | no | Already local-first; cutting Java is leftover pithy/pattern/BC |
| **2** | **紫微** | High (`ZiweiCalc`) | Java `/ziwei/birth` still live | none | medium | **parity tests vs Java** | 1 L1 | no | Engine exists; D3 UI complete; SWE-free |
| **3** | **六爻** | Very high (`liuyaoFacade`) | Java **text only** `/gua/desc` | none | medium | facade/school tests | 1 L1 | no | Core 装卦 is already browser; corpus can ship as JSON |

Rejected for batch 1:

| Module | Why not first |
|--------|----------------|
| 命盘管理 | Already frontend (`localcharts`); little “migration”, just product default |
| 奇门/太乙/金口 | 100% Python vendor, no JS engine |
| 西占 natal | 100% SWE/flatlib; needs WASM first |
| 六壬 | Large Java helper, no local engine parity suite like 紫微 |
| AI | Not a calc engine; depends on snapshots of other modules |

---

## Dead / duplicate code recorded (not cleaned)

- npm `babylonjs` unused; public vendor script used instead
- npm `@mediapipe/tasks-vision` unused
- `JAVA/astroswisseph` pom-only
- Electron installer tree gitignored/absent
- Dual 八字/紫微 engines (intentional transition)
- Vendor Streamlit `app.py` not on CherryPy mounts
- `yanqin` tab alias leftover

---

**PHASE 0 status:** audit complete. No PHASE 1 (no Umi→Vite, no Java/Python deletion, no algorithm rewrite).
