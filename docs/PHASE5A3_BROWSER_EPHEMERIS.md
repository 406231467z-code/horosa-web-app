# PHASE 5-A.3 PASS

日期：2026-09-23  
HEAD：`4e6d20d393ae618828b648d3bbb9ad907538cd6b`

```text
SWEPH_EXPERIMENT_STATUS=RUNNABLE
SWEPH_BASELINE_MATCH
```

这不是 `ASTROLOGY_ENGINE_COMPLETE`。生产 `POST /chart` 没有改。

## 位置

```text
experiments/phase5a-sweph-parity/browserEphemerisAdapter.js
experiments/phase5a-sweph-parity/phase5a3.sweph.browser.test.js
experiments/phase5a-sweph-parity/results/phase5a3-1990.json
```

包仍是 `swisseph-wasm@0.1.0`，从 `experiments/phase4d-sweph-wasm` 引入。没有升级。

## 对照

Oracle：`realChartResult.json`，标记 **HISTORICAL-GOLDEN**。  
容许度：`field-map.json` 的 1 角秒，没有放宽。  
Flags：`SEFLG_SWIEPH | SEFLG_SPEED`。赤纬是同一次 flags 再加 `SEFLG_EQUATORIAL` 的第二次 `calc_ut`（与 flatlib `sweObject` 相同），不是自造黄赤变换。

交点默认 `SE_MEAN_NODE`（body 10）。黑月 Horosa id 是 `Dark Moon`，默认 `SE_MEAN_APOG`（body 12）。真交点 / 真远地点只在 `westNodeType` 或 `westLilithType` 为 true 时使用。这张历史盘没有这些键。

1990-06-15 10:30 区偏 +08:00 的儒略日与历史盘相同：`2448057.6041666665`。适配器只用调用方给出的固定时区，不内置夏令时规则表。这张盘自己记的是 `+08:00`。

76 个字段全部 PASS。最大差是 Pluto 赤纬 0.017 角秒。ASC / MC / 宫头在 1e-10 角秒量级。

Placidus 能算（letter `P`），但这张历史盘是 Regiomontanus，所以 Placidus 宫头是 `NOT_COMPARABLE`。恒星黄道同样 `NOT_COMPARABLE`：`zodiacal` 是 Tropical，`siderealAyanamsa` 为空。`get_ayanamsa_ut` 能返回数，没有拿来当对拍。

捆绑星历文档范围约 1800–2400。1700 和 2500 的 `calc_ut` 仍返回有限数，那些年登记为 `EPHEMERIS_DATA_RANGE_GAP`，没有当成已验证。

## 浏览器

桌面和 390×844 移动视口都打开了 `browser/smoke.html`。标题 `PHASE5A_SMOKE_OK`。儒略日与 Node 相同，太阳黄经 `83.751486350667`。一次 `initSwissEph`，十二体共用该实例。

```text
TEST_ENVIRONMENT=node for the assertion file; browser smoke is a separate page
initTime node ≈ 16.5 ms; browser desktop ≈ 44 ms
calcTime node ≈ 5.7 ms; browser desktop ≈ 4.8 ms
```

## 许可

Swiss Ephemeris 与 `swisseph-wasm` 包装在实验 `README` / `LICENSE` 中记为 GPL-3.0-or-later。README 同时写明商业使用需要 Astrodienst 许可，并声明包装作者不能代发该许可。本阶段只记录这些事实。`LEGAL REVIEW REQUIRED`。没有加入生产依赖。

## 生产源

```text
services/astro.js=UNCHANGED
astrostudyui/package.json=UNCHANGED
UI=UNCHANGED
Java=UNCHANGED
Python=UNCHANGED
vendor=UNCHANGED
```

## 下一阶段

`PHASE 5-A.4` 可以开始：用这份适配器组实验用 Chart JSON。仍不要改 `fetchChart`，仍不做相位、阿拉伯点、接纳、恒星和 5-B。
