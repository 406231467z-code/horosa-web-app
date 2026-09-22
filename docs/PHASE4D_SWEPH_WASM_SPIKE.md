# PHASE 4-D：Swiss Ephemeris WASM 试验

## 基线

- 分支 `main`，HEAD `28fd212`
- 语义基线：`docs/PHASE3_PRE_AUDIT.md` 第 J 节 4-D（Swiss Ephemeris WASM 试验，不替换生产 `/chart`，对拍之前不进主构建）
- 前序 4-A、4-B、4-C 已完成。本阶段不改那些路径

## 范围

做了：

- 在 `experiments/phase4d-sweph-wasm/` 单独装 `swisseph-wasm@0.1.0`，用 Node 加载 WASM
- 用 flatlib 测试里的同一时刻试算：1976-07-06 21:07 +08（即 13:07 UT），北纬 26°05′、东经 119°18′
- 七曜黄经同时用包内 Swiss 星历（`SEFLG_SWIEPH`）和 Moshier（`SEFLG_MOSEPH`）
- 同一时刻的 Placidus 上升点、中天
- 跑完后检查 `astrostudyui/package.json` 与 `astrostudyui/src` 没有引用这个包

没做：

- 不替换生产 `/chart`。占星、辅盘、合盘、分至星盘、七政 horosa 盘仍走 Java `:9999` → Python `:8899` PerChart
- 不把 WASM 加进 `astrostudyui` 的依赖或 Umi 包
- 不与本机 pyswisseph / PerChart JSON 逐字段对拍（相位、阿拉伯点、二十八宿、恒星制都不在这次试验里）。本机没有装 `swisseph`
- PHASE 4-E 及以后
- 删除 Java、Python、vendor
- ProductScope、IndexedDB、四键 localStorage
- `baziStress` / `techniquePerfBudget` / `yizhangjingReportTable` 阈值

## 修改文件

| 文件 | 变化 |
|---|---|
| `experiments/phase4d-sweph-wasm/package.json` | 隔离依赖，仅 `swisseph-wasm@0.1.0` |
| `experiments/phase4d-sweph-wasm/package-lock.json` | 锁定该包 |
| `experiments/phase4d-sweph-wasm/run.mjs` | 加载 WASM、试算、确认未进入应用源码 |
| `experiments/phase4d-sweph-wasm/.gitignore` | 忽略该目录的 `node_modules` |
| `docs/PHASE4D_SWEPH_WASM_SPIKE.md` | 本记录 |

`astrostudyui` 生产源码本阶段无改动。

## 行为

WASM 能初始化。七曜在该时刻的黄经（度）：

| 星 | SWIEPH | 与 Moshier 差 |
|---|---|---|
| 日 | 104.573812 | 0.003″ |
| 月 | 218.628985 | 0.012″ |
| 水 | 93.926467 | 0.015″ |
| 金 | 109.625309 | 0.002″ |
| 火 | 149.740189 | 0.029″ |
| 木 | 53.161637 | 0.052″ |
| 土 | 123.615145 | 0.011″ |

最大差 0.052 角秒。太阳 104.574° 是巨蟹 14°34′。公开的 1976-07-06 00:00 UT 星历表上太阳为巨蟹 14°03′，按当日大约 0.95°/日推到 13:07 UT，落在同一度分。

Placidus 上升 321.036350°，中天 242.748852°。宫位没有和 Python 盘对照。

Node 上初始化约 15.7 ms，七曜约 2.7 ms。这是本机 Node，不是浏览器主线程。

包体积（未进入主构建）：`swisseph.wasm` 561871 字节，`swisseph.data` 2151204 字节，胶水 `swisseph.js` 74272 字节。许可 `GPL-3.0-or-later`。

## 测试

```
node experiments/phase4d-sweph-wasm/run.mjs
```

exit 0。脚本同时确认应用 `package.json` 与 `src` 没有 `swisseph-wasm` / `@swisseph/browser` / `@swisseph/node`。

未跑 `build:file`。试验在对拍之前不进主构建；应用源码也没有引用它。未跑全量。`baziStress`、`techniquePerfBudget`、`yizhangjingReportTable` 未改、未跑。

## 失败分类

| 类 | 结果 |
|---|---|
| WASM 初始化与七曜 / Placidus 试算 | 通过 |
| 应用源码未引用该包 | 通过 |
| 与生产 PerChart 逐字段对拍 | 未做。因此不替换 `/chart`，不进主构建 |
| `build:file` | 未跑 |
| `baziStress` / `yizhangjingReportTable` | 未跑、未改。PHASE 2-F 既有失败，不归入 4-D |
| `techniquePerfBudget` | 未跑、未改 |

## 停止

**PHASE 4-D COMPLETE**

未开始 PHASE 4-E。未提交、未推送。
