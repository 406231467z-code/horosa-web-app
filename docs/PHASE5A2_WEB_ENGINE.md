# PHASE 5-A.2 PARTIAL / BLOCKED

日期：2026-09-23  
HEAD：`4e6d20d393ae618828b648d3bbb9ad907538cd6b`  
生产算法源码与 `ebc4d9e` 相同。本阶段没有改 Java、Python、vendor、pom、package.json、requirements，也没有恢复 jar。

```text
Java production runtime = NOT REQUIRED
Python production runtime = NOT REQUIRED
Electron = NOT REQUIRED
.exe = NOT REQUIRED
```

当前前端生产计算链仍然是：

```text
Browser → HTTP → Java :9999 / Python :8899 → Chart JSON → UI
```

纯 Web 目标链还没有接上西洋历算。

`realChartResult.json` 仍是 **HISTORICAL-GOLDEN**。本阶段没有 LIVE-GOLDEN。

## B. Web Calculation Matrix

| Feature | Implementation | Browser-only | Backend dependency | Test | Status |
| --- | --- | --- | --- | --- | --- |
| Planet longitude / latitude / speed / declination | `services/astro.js` `fetchChart` → `POST ${ServerRoot}/chart`。`divination/engine` 只读这份 JSON | NO | Java :9999 → Python :8899 PerChart / Swiss | HISTORICAL-GOLDEN only. Production engine has no planet test | LEGACY-BACKEND-DEPENDENT |
| Houses / ASC / MC | 同上。宫制清单 `AstroConst.HOUSE_SYSTEM_OPTIONS`（0–24，含 Regiomontanus=2、Placidus=3）只是请求参数 | NO | `/chart` | 无生产宫位测试 | LEGACY-BACKEND-DEPENDENT |
| Aspects / orbs / applying | `divination/engine/aspectsEngine.js` 读 `result.aspects.normalAsp` | NO | `/chart` 已算好的相位 | `resultShapes.contract.test.js` 只锁形状 | LEGACY-BACKEND-DEPENDENT |
| Arabic parts | 读 `/chart` 的 `lots` / objects | NO | `/chart` | HISTORICAL-GOLDEN | LEGACY-BACKEND-DEPENDENT |
| Reception / mutual | `divination/engine/reception.js` 读 `receptions` / `mutuals` | NO | `/chart` | 形状契约 | LEGACY-BACKEND-DEPENDENT |
| Parallel / contra-parallel | 读 `/chart` 的 `declParallel`。`paransLocal.js` 用固定黄赤交角做交映近似，输入仍是后端坐标 | NO | `/chart` 提供赤纬；parans 是派生层 | 无生产对拍 | LEGACY-BACKEND-DEPENDENT |
| Sidereal / ayanamsa | `chartRequest.js` 把 `zodiacal` / `siderealAyanamsa` 放进 `/chart` 请求体 | NO | `/chart` | 请求键测试，不是黄经对拍 | LEGACY-BACKEND-DEPENDENT |
| Fixed stars / 七政星宿段 / nakshatra | UI 读 `/chart` 的 `stars`、`fixedStarSu28`、`nakshatras`、`guoStarSect` | NO | `/chart` | HISTORICAL-GOLDEN 含这些键 | UI-ONLY / LEGACY-BACKEND-DEPENDENT |
| Bazi four pillars / dayun | `utils/baziLunarLocal.js` `buildLocalBaziResult`（lunar.js，含真太阳时、23 点换日、大运顺逆） | 函数本身 YES；生产农历桥先打 Java | `preciseCalcBridge.fetchPreciseNongli` 先 `POST /nongli/time`，失败才本地 | `baziLunarLocal.dayBoundary.test.js` | WEB-PARTIAL |
| Ziwei chart | `ziweiBirthLocal.js` → `components/ziwei/ZiweiCalc.js`。公元可靠年本地；公元前与域外 `POST /ziwei/birth` | 可靠域 YES | 域外 Java | `ziweiLocalParity.test.js`、`phase4cZiweiLiureng.test.js` | WEB-PARTIAL |
| Liuyao hexagram | `GuaZhanMain.js` `buildTimeGua` / `analyzeLiuyao`：本卦、变卦、互错综、世应、纳甲、六亲、六神、伏神 | 成卦 YES；时间卦的干支走农历桥 | 时间起卦可能先打 `/nongli/time` | 卦结构在挂载测试里 | WEB-PARTIAL |
| Qimen chart | `components/dunjia/DunJiaCalc.js` `cachedKentangFetch(.../qimen/pan)` | NO | Python :8899 | `serviceRoot.test.js` 锁 URL | LEGACY-BACKEND-DEPENDENT |
| Liuren chart | 神将：`liurengGodsLocal.js`（可靠域）。行年：`POST /liureng/runyear` | NO | Java :9999 | `phase4cZiweiLiureng.test.js` | WEB-PARTIAL |
| Taiyi chart | `components/taiyi/TaiYiCalc.js` `.../taiyi/pan` | NO | Python :8899 | serviceRoot 测试 | LEGACY-BACKEND-DEPENDENT |
| AI input | `utils/aiAnalysisContext.js`。八字/数算用本地结果；占星/七政/合盘/主限调 `fetchChart`、`/modern/relative`、`/predict/pdchart` | NO | Java `/chart` 等 | `aiAnalysisContext.test.js`（mock 农历） | LEGACY-BACKEND-DEPENDENT |
| Chart save | `utils/localRecordStore.js` `createLocalRecordStore`，`localcharts.js` | YES | 无 | `localRecordStore*.test.js` | WEB-COMPLETE |

## C. Astrology

```text
Calendar        = lunar.js + /nongli/time。不是浏览器 Date 本身。
Timezone        = 请求体 zone。八字核心另有 apparent solar（真太阳时）。
Julian Day      = 生产黄道历算的 JD 在 Python PerChart，不在 astrostudyui。
Ephemeris       = 生产无。实验 swisseph-wasm@0.1.0 只在 experiments/phase4d-sweph-wasm。
Planets         = Sun…Pluto、Node、Lilith 的黄经/黄纬/速度/逆行都来自 /chart。
Speed           = /chart objects.lonspeed。前端不自己积分。
Declination     = /chart objects.decl。前端不跑 Swiss。
Houses          = 25 套选项在 AstroConst.js，计算在 /chart。没有新增宫制。
ASC / MC        = /chart ascmc。DSC/IC 由对宫推导，底数仍是后端。
Aspects         = aspectsEngine 只查询后端 normalAsp（合冲拱刑六分、入相出相、容许度）。
Sidereal        = 请求参数 zodiacal + siderealAyanamsa，后端计算。
Ayanamsa        = 同上。user 槽附历元两参，仍交给后端。
Fixed stars     = /chart stars + fixedStarSu28 + guoStarSect。前端显示。
Arabic Parts    = /chart lots。
Reception       = reception.js 读后端 receptions/mutuals。
Parallel        = declParallel 来自 /chart。paransLocal.js 是交映近似，不是赤纬平行的 Swiss 复刻。
```

1900 / 1950 / 1976 / 1990 / 2000 / 2026、跨日、午夜、DST：生产前端没有对这些年份做本地星历断言。唯一西洋数值参照是 1990-06-15 的 HISTORICAL-GOLDEN。

## D. Chinese Metaphysics

```text
Bazi       = WEB-PARTIAL。buildLocalBaziResult：四柱、大运、流年/月/日、节气、起运、顺逆、真太阳时。生产入口 fetchPreciseNongli 仍先请求 Java。
Ziwei      = WEB-PARTIAL。命宫/身宫/十二宫/主星辅星/四化/大限在 ZiweiCalc，可靠年本地。域外仍 /ziwei/birth。
Guolao     = LEGACY-BACKEND-DEPENDENT。GuoLaoChartMain.js 直接 POST /chart。
Shusuan    = WEB-PARTIAL。canpingLocal / heluoLocal / zhengchuan* 吃 buildLocalBaziResult，有测试。极端年跟着八字域走。
Mingother  = WEB-PARTIAL。一掌经 yizhangjingLocal.js；页本身不打 kentang。干支底数仍可能来自农历桥。
```

## E. Sanshi

```text
Qimen          = UI 本地，盘计算 LEGACY-BACKEND-DEPENDENT（/qimen/pan，:8899）。
Liuren         = 四课三传神将可靠域本地；行年 /liureng/runyear 仍是 Java。WEB-PARTIAL。
Taiyi          = UI 本地，盘计算 /taiyi/pan。LEGACY-BACKEND-DEPENDENT。
Sanshi United  = 编排上述三盘，并调用 fetchPreciseNongli。不是纯前端合盘。
```

## F. Yixue

```text
Liuyao  = WEB-PARTIAL。起卦与装卦在浏览器。时间卦干支依赖农历桥。
CNYibu  = WEB-PARTIAL。地占 geomancy 走 buildKentangEndpoint('geomancy')。部分子页本地。
```

## G. Removed Scope

```text
Fengshui     = REMOVED（ProductScope.REMOVED_TAB_KEYS）
3D           = REMOVED（astrochart3D）
Planetarium  = REMOVED
Astrochart3D = REMOVED
```

本阶段没有恢复这些页面。`astroPd3d.js` 里非 3D 主限仍走 `/predict/pd*`，那是星运后端，不是 3D 渲染。

## H. Backend Dependency Matrix

```text
Java :9999
  POST /chart                 占星、七政星盘、辅盘、印度盘底、卜卦盘请求体
  POST /nongli/time           农历桥首选
  POST /ziwei/birth           紫微域外
  POST /liureng/runyear       六壬/金口行年
  POST /liureng/gods          六壬神将域外
  POST /predict/pd|pdchart|pdpoles
  POST /modern/relative
  POST /india/chart           预取白名单仍登记
  POST /bazi/birth            八字域外兜底

Python :8899（buildKentangEndpoint）
  /qimen/pan
  /taiyi/pan
  /jinkou/pan
  /qizhengkin/pan
  /wuzhao /wangji /taixuan /jingjue /shenyishu /shaozi /xianqin /cetian /geomancy
```

KENTANG_DEPENDENCY_MATRIX

```text
Feature     | Endpoint                         | Why                         | Web replacement      | Status
Qimen       | /qimen/pan                       | 遁甲盘                      | 无生产 JS 盘引擎     | LEGACY-BACKEND-DEPENDENT
Taiyi       | /taiyi/pan                       | 太乙盘                      | 无                   | LEGACY-BACKEND-DEPENDENT
Jinkou      | /jinkou/pan + /liureng/*         | 金口诀                      | 神将仅可靠域本地     | LEGACY-BACKEND-DEPENDENT
Qizheng kin | /qizhengkin/pan                  | 七政四余 kentang            | 无                   | LEGACY-BACKEND-DEPENDENT
Wuzhao      | /wuzhao/pan                      | 五兆                        | 无                   | LEGACY-BACKEND-DEPENDENT
Huangji     | /wangji/*                        | 皇极                        | 无                   | LEGACY-BACKEND-DEPENDENT
Taixuan     | /taixuan/pan                     | 太玄                        | 无                   | LEGACY-BACKEND-DEPENDENT
Jingjue     | /jingjue/pan                     | 荆诀                        | 无                   | LEGACY-BACKEND-DEPENDENT
Shenyi      | /shenyishu/pan                   | 神易数                      | 无                   | LEGACY-BACKEND-DEPENDENT
Geomancy    | /geomancy/*                      | 地占（CNYibu）              | 无                   | LEGACY-BACKEND-DEPENDENT
Jieqi seed  | buildKentangEndpoint('jieqi')    | divinationTimeDraft         | 可靠年另有本地节气表 | WEB-PARTIAL
```

## I. Swiss Web Status

```text
SWISS_WEB_STATUS=PARTIALLY_AVAILABLE
```

```text
Current implementation=
  生产 astrostudyui/package.json 没有 swisseph、没有 WASM。
  experiments/phase4d-sweph-wasm 有 swisseph-wasm@0.1.0。
  experiments/phase5a-sweph-parity 用 HISTORICAL-GOLDEN 对过一盘黄经/宫/大部分相位。
  那不是生产引擎，也不是 LIVE-GOLDEN。
Remaining work=
  在生产包之外先做浏览器 Chart JSON 构建器，只对 HISTORICAL-GOLDEN。
  不把 WASM 写进 Umi 依赖，不替换 /chart，不改容许度。
```

## J. Tests

```text
engine smoke=NOT RUN
relevant suites=未跑 518。现有相关文件：
  divination/engine/__tests__/chartRequestClassicalKeys.test.js
  divination/engine/__tests__/resultShapes.contract.test.js
  utils/__tests__/baziLunarLocal.dayBoundary.test.js
  components/ziwei/__tests__/ziweiLocalParity.test.js
  utils/__tests__/phase4cZiweiLiureng.test.js
  integrations/kentang/__tests__/serviceRoot.test.js
build=NOT RUN
failures=本阶段没有新的数值失败。也没有把历史盘标成当前生产输出。
```

这两个 engine 测试锁的是 `/chart` 请求键和响应形状，不计算太阳到冥王星。

## K. Code Changes

```text
无生产源码改动。
只新增本记录 docs/PHASE5A2_WEB_ENGINE.md。
```

Swiss、宫制、复杂历法、命理主算法都只登记缺口，没有重写。

## L. Remaining Work

```text
P0  浏览器星历 Chart JSON（行星、速度、赤纬、宫、ASC/MC）。生产包今天没有这份计算。
P1  相位、阿拉伯点、接纳、赤纬平行、恒星黄道、恒星与七政星宿段的浏览器实现。现在全是 /chart 派生。
P1  农历桥改为可靠域先本地（fetchPreciseNongli 仍先打 Java）。这是 5-B 的原范围，本阶段未改。
P1  奇门 / 太乙 / 金口 / 七政 kentang 仍是 :8899。
P2  六壬行年、紫微域外、八字域外。
P2  统一 Chart JSON。今天西洋盘形状在 resultShapes.js，八字/紫微/六爻各有自己的对象。
P3  性能：/chart 与农历桥的重复请求、八字推运（已有 memo）、盘面重渲染。本阶段未优化。
```

统一 Chart JSON 最小草案（未实现，不改 UI）：

```text
{
  id, technique,
  birth: { date, time, zone, calendar },
  location: { lat, lon },
  planets: [{ id, lon, lat, speed, decl, retro, house }],
  houses: { system, cusps, asc, mc },
  aspects: [],
  derived: {},
  meta: { engine, source: "web" | "historical-golden" }
}
```

## M. Next Step

```text
NEXT_RECOMMENDED_PHASE=PHASE 5-A.3
why=P0 是浏览器星历。实验 WASM 已能对 HISTORICAL-GOLDEN 的一盘角度，但没有生产 Chart JSON，也没有接到 UI。下一阶段应只做隔离的浏览器星历输出，仍不用 Java/jar，仍不做 5-B，仍不批量换命理算法。
```

## Performance / Mobile

```text
PERFORMANCE-HOTSPOT
  fetchPreciseNongli 每次未命中缓存都先打 /nongli/time
  占星 models 对同盘重复 fetchChart（已有内存缓存，换参即失效）
  baziLunarLocal 推运曾占 buildBaziCore 绝大部分时间，现有核心 memo
  divination paransLocal 对天体做四轴循环，输入坐标仍来自后端

calculation engine 不调用 Electron。缺的是浏览器星历，不是桌面 API。
Mobile UI 未改。
```

PHASE 5-A.2 PARTIAL / BLOCKED  
STOP.

PHASE 5-B NOT STARTED.
