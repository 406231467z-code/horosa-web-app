# PHASE 5-A BLOCKED

日期：2026-09-23  
基线：`ebc4d9e`  
路线：`docs/PHASE5_PRE_AUDIT.md`  
生产 `/chart` 没有改。WASM 没有进 `astrostudyui` 的依赖。

本阶段要的是：同一输入下，生产 PerChart JSON 与 `swisseph-wasm@0.1.0` 逐字段对拍。对拍没有达到放行门槛。

## A. Production code changes

```text
0
```

没有改 `astrostudyui/src`、`astrostudysrv`、`astropy`、`vendor`。4-D 的 loader 原样复用，没有再装一套 Swiss Ephemeris。

## B. Backend golden

```text
BACKEND GOLDEN CAPTURE BLOCKED
```

本机 `:9999` 与 `:8899` 都没有在听。系统 Python 3.14 没有 `swisseph`、`flatlib`、`jsonpickle`。`astrostudyboot.jar` 没有构建。没有伪造 PerChart 数字。

仓库里有一份已经落盘的真实盘，标成 **HISTORICAL GOLDEN**：

- 文件：`astrostudyui/src/divination/engine/__tests__/fixtures/realChartResult.json`
- 出生：`1990-06-15 10:30:00`，时区 `+08:00`
- 地点：北纬 31°14′，东经 121°28′
- 黄道：Tropical
- 宫位：Regiomontanus（`hsys` 索引 2，Swiss 字母 `R`）
- 儒略日（盘内 UT）：`2448057.6041666665`
- 顶层键：`params`、`chart`、`receptions`、`mutuals`、`declParallel`、`aspects`、`lots`、`surround`、`guoStarSect`

这是 Python 盘体，不是当场打出来的 Java `/chart` 信封。

## C. Fixture count

输入写了 21 条（现代、边界、历法、高纬、南北半球、恒星黄道意图）。

有 golden 的：1 条（`astro-moon`，即上面这份 1990 盘）。

其余 20 条只有输入，没有输出。

## D. Field parity

容差在跑之前写死，跑完没有放宽：黄经、黄纬、宫头、ASC、MC 各 1 角秒；黄经速度 1 角秒/日。

这一份历史盘上，行星、交点、ASC、MC、12 宫头、星座、星座内度数、逆行标记：**62 项 PASS，0 项 FAIL**。

交点用的是平交点（Swiss body 10）。生产默认 `westNodeType` 不是 `true` 时走这条。

8 个天体的 `house`（落宫编号）标成 **MISSING**。WASM 没有做落宫。

| 生产字段 | WASM | 这一份盘 |
| --- | --- | --- |
| 七曜 + 北交 `.lon` `.lat` `.lonspeed` | `calc_ut`，`SEFLG_SWIEPH \| SEFLG_SPEED` | PASS |
| Asc / MC `.lon` | `houses().ascmc[0]` / `[1]`，宫制 `R` | PASS |
| House1–House12 `.lon` | `cusps[1..12]`，按宫号对齐，不按数组顺序 | PASS |
| `.sign` `.signlon` | 由黄经派生 | PASS |
| 逆行（速度符号） | 速度符号 | PASS |
| `.house` | 未计算 | MISSING |
| `aspects` | 未计算 | MISSING |
| `lots` | 未计算 | MISSING |

## E. Maximum delta

只统计这一份历史盘上的角度差（黄经、黄纬、ASC、MC、宫头，共 30 个角）。

```text
maximum angular delta     0.00605 arcsec
median angular delta      4.09e-10 arcsec
95th percentile           0.000745 arcsec
worst fixture             astro-moon / realChartResult.json
worst field               Jupiter.lat
```

速度项都在 1 角秒/日以内，没有单独超过角度这一项。

这只说明 1990-06-15 这一张 Tropical / Regiomontanus 盘的原始角度对得上。不能外推到另外 20 条没有 golden 的输入。

## F. ASC / MC / houses

ASC 差约 `1.0e-10` 角秒。MC 差约 `2.0e-10` 角秒。12 个宫头都在 1 角秒以内。宫制是这份盘上的 Regiomontanus，不是默认 Placidus。Placidus 没有生产数字可对。

## G. Derived fields

前端实际读、而 WASM 没有算的：

- `aspects.normalAsp` 以及同级的 `immediateAsp`、`signAsp`：生产 JSON 有，WASM **MISSING**
- `lots`（阿拉伯点）：生产 JSON 有，WASM **MISSING**
- 行星 `house`：生产有，WASM **MISSING**
- 恒星黄道 / `nakshatras`：这份盘是 Tropical，**NOT PRESENT IN THIS GOLDEN**
- 返照盘：不在这份 `/chart` 体里，**NOT PRESENT IN THIS GOLDEN**
- `nongli`：这份历史 JSON 没有，Java 才会补，**NOT PRESENT IN THIS GOLDEN**

星座、星座内度数、逆行是从黄经和速度派生的，这一份盘上与生产一致。

`swisseph-wasm` 自带的 `se1` 大约覆盖 1800–2400。公元 1、100、1582、9999 即使以后采到 golden，这一包的 SWIEPH 文件也不覆盖。那是候选限制，这次没有数字。

## H. Performance

```text
NODE EXPERIMENT
≠
BROWSER PERFORMANCE
```

Node（同一进程、同一张 1990 盘）：初始化 36.54 ms，第一次计算 5.14 ms，随后 10 次合计 1.13 ms，100 次合计 6.10 ms。后面几次明显比第一次短，这是进程内热身，不是浏览器主线程。

生产 `/chart` 的请求耗时没有采到。

浏览器里同一次初始化约 54.5 ms（见下一节）。这仍是一次冒烟，不是性能结论。

## I. Browser experiment

`experiments/phase5a-sweph-parity/browser/smoke.html`  
静态服务 `http://127.0.0.1:8771/`，页面标题变成 `PHASE5A_SMOKE_OK`。

浏览器算出的太阳黄经 `83.751486350667`、ASC `156.01167440694198`、MC `64.07947909689118`，与 Node 对同一儒略日的 WASM 结果一致。没有接入 Umi。

## J. License facts

```text
LEGAL REVIEW REQUIRED
```

记录到的事实，不是法律结论：

- 包 `swisseph-wasm@0.1.0` 的 `package.json` 与 `LICENSE` 写的是 **GPL-3.0-or-later**（版权行 2024 prolaxu）
- `LICENSE` 附加条款写：这是 Swiss Ephemeris 的 JavaScript 包装；非商业使用走 GPL；商业使用需要 Astrodienst AG 的商业许可，联系 `swisseph@astro.com`
- README 写：星历文件打进 `wasm/swisseph.data`，包含 `sepl_18.se1`、`semo_18.se1`、`seas_18.se1`、`sefstars.txt`、`seorbel.txt`、`seleapsec.txt`；C 源 vendored 为 Swiss Ephemeris 2.10.03
- README 写：闭源商业使用不能只靠这份 GPL 包装；作者与 Astrodienst 无隶属，不能代发商业许可
- 浏览器部署意味着把包装代码和这份星历数据发给客户端。再分发条件以上面文件为准，需要另行法律复核

## K. Tests

```text
node experiments/phase5a-sweph-parity/compare.mjs
```

退出码 **2**（门槛未过，不是脚本崩溃）。同时确认 `astrostudyui/package.json` 与 `astrostudyui/src` 没有 `swisseph-wasm`、`@swisseph/browser`、`@swisseph/node`。

浏览器冒烟：标题 `PHASE5A_SMOKE_OK`。

没有跑 518 套件。

## L. Build

```text
BUILD: NOT RUN
REASON: production source unchanged
```

## M. Regression classification

生产源码没有改。没有新的产品回归可归类。已知的性能阈值失败不在本阶段，也没有重跑。

## N. Production `/chart` changed?

没有。

## O. WASM entered production dependency?

没有。依赖只存在于 `experiments/phase4d-sweph-wasm`。5-A 通过相对路径加载那个包，没有写进 `astrostudyui/package.json`。

## P. Next stage

```text
PHASE 5-B
```

未开始。

5-A 是 BLOCKED。在活的 `/chart` golden 覆盖约定的 fixture、并且相位、阿拉伯点、落宫要么对上要么明确不做之前，不进入 5-B，也不把 WASM 接上生产 `/chart`。

## 停止

**PHASE 5-A 到此停止。**  
**未开始 PHASE 5-B。**
