# PHASE 5-A BLOCKED

日期：2026-09-23  
这一步是 5-A.1：补 golden，并在已有的那张历史盘上补落宫、相位、阿拉伯点。  
生产 `/chart` 没有改。WASM 没有进入 `astrostudyui`。

## A. Production code changes

```text
0
```

## B. Backend golden count

```text
BACKEND GOLDEN CAPTURE BLOCKED
```

本机没有可启动的图表运行时：

- `:9999`、`:8899` 都没有在听
- 没有 `astrostudyboot.jar`
- Python 3.12 与 3.14 都不能 `import swisseph`
- 仓库里没有 pyswisseph 的离线 wheel，也没有 `runtime/windows/python`

没有新采任何 `/chart`。没有用 Node 的瑞士星历冒充 PerChart。

真实 backend golden 数量：**0**（这次没有打到生产接口）。  
可对拍的历史盘：**1**，仍标 **HISTORICAL GOLDEN**。

门槛要求至少 5 个真实 backend golden。这一条没有达到。

## C. Fixture count

输入仍是 21 条。有生产数字的仍是 1 条：1990-06-15 10:30 +08，上海，Tropical，Regiomontanus。

## D. Production field inventory

扫描的是 KEEP 页实际读取，不是只看 fixture。

| 生产字段 | 读取处 | UI 要用 | WASM | 这一张盘 |
| --- | --- | --- | --- | --- |
| `chart.objects[].lon/lat/lonspeed` | 星盘、AI 快照、七政、分至、六壬 | 要 | `calc_ut` | PASS |
| `sign` / `signlon` / 逆行 | 星盘、印占盘 | 要 | 由黄经、速度派生 | PASS |
| `objects[].house` | 星盘落宫 | 要 | 生产 `inHouse`：宫头前移 5° | PASS |
| `chart.houses[].lon` | 星盘宫头 | 要 | `houses` | PASS，仅 Regiomontanus |
| `aspects.normalAsp` / `signAsp` / `immediateAsp` | `AstroHelper.js`、AI 快照 | 要 | 按 flatlib 默认容许度复算 | PASS |
| `lots` | `AstroHelper.js`、印占南盘 | 要 | `arabicparts` 默认昼夜公式 | 除生命点、根点外 PASS |
| `chart.isDiurnal` | 星盘、星运 | 要 | 用盘内已有昼夜标记，没有重算地平 | 作为公式输入 |
| `receptions` / `mutuals` | `AstroInfo.js`、卜卦 | 要 | 未复算 | MISSING |
| `declParallel` | `AstroInfo.js`、世运 | 要 | 未复算 | MISSING |
| `surround` | `AstroInfo.js` | 要 | 未复算 | MISSING |
| `guoStarSect` | `AstroHelper.js` | 要 | 未复算 | MISSING |
| `nakshatras` | `AstroPlanet.js` | 恒星黄道才有 | 未做 | NOT PRESENT IN THIS GOLDEN |
| `fixedStarSu28` | 七政、分至 | 要 | 未做 | 未对 |
| `nongli` | Java 在 `/chart` 上补 | 要 | 不是瑞士星历 | NOT PRESENT IN THIS GOLDEN |

宫制下拉在 `AstroConst.HOUSE_SYSTEM_OPTIONS`，从整宫制到福点整宫制共 25 档，占星页都提供。只有 Regiomontanus 有 golden。其余宫制没有生产数字，不能记成通过。

## E. Raw field parity

仍是 5-A 那一次：七曜、平北交、黄经、黄纬、速度，62 项原始比较里 0 失败。最大角度差 0.00605 角秒，最差字段 `Jupiter.lat`。容差仍是事先写定的 1 角秒，没有放宽。

## F. House parity

生产规则：非整宫制时，宫起点是宫头减 5°（`House._OFFSET = -5`，`houseCuspAdvance` 默认 5）。再用宫宽判断落点。整宫制不加这 5°。

用这张盘自己的宫头和行星黄经回放，落宫与生产 `planet.house` 一致（自检失败 0）。再用 WASM 黄经和 WASM 宫头按同一规则落宫，七曜、北交、ASC、MC 都与生产落宫相同。

## G. Aspect parity

按当前默认：`virtualPointReceiveAsp` 关闭，主相位加 45°，容许度是星体表（日 15°、月 12°，以此类推），小相位上限 3°，正合阈值 0.3°。入相、离相按速度符号。

`normalAsp`、`signAsp`、`immediateAsp` 在这张盘上与生产逐对一致。小行星、凯龙、平近点、日月中点等起相点也算进去了。0 失败。

## H. Lots parity

公式来自 `flatlib/tools/arabicparts.py` 的默认昼夜表，昼夜用这张盘已有的 `isDiurnal`。福点在对象列表里，不在 `lots` 数组顶上，对的是对象黄经。

除下面两项，列出的阿拉伯点都在 1 角秒以内。

| 字段 | 状态 | 原因 |
| --- | --- | --- |
| Pars Life | MISSING | 公式要朔望点 Syzygy，WASM 没有算朔望 |
| Pars Radix | MISSING | 同上 |

没有改公式去凑数。

## I. Sidereal parity

这张盘是 Tropical，`siderealAyanamsa` 为空。

```text
NOT PRESENT IN THIS GOLDEN
```

没有恒星黄道的生产 golden。岁差、宿、恒星黄道宫位都没有对拍。

## J. Maximum delta

角度（5-A，30 个角，仅这一张盘）：

```text
maximum angular delta     0.00605 arcsec
median angular delta      4.09e-10 arcsec
95th percentile           0.000745 arcsec
worst fixture             1990-06-15 HISTORICAL GOLDEN
worst field               Jupiter.lat
```

派生字段这一轮：比较 112 项，PASS 110，FAIL 0，MISSING 2（生命点、根点）。

## K. Performance

```text
NODE EXPERIMENT
≠
BROWSER PERFORMANCE
```

没有新的后端计时。浏览器这次冒烟初始化约 47.7 ms。

## L. Browser experiment

`http://127.0.0.1:8771/phase5a-sweph-parity/browser/smoke.html` 标题 `PHASE5A_SMOKE_OK`。太阳黄经、ASC、MC 与 Node 的 WASM 一致。没有接入 Umi。

## M. License facts

```text
LEGAL REVIEW REQUIRED
```

与 5-A 相同，没有新的许可文件：`swisseph-wasm@0.1.0` 声明 GPL-3.0-or-later；其 LICENSE 写明 Swiss Ephemeris 商业使用要另向 Astrodienst 取得许可；星历在 `wasm/swisseph.data`。这不是法律结论。即使数学对拍通过，也不能据此把 WASM 打进正式 Web 包。

## N. Tests

```text
node experiments/phase5a-sweph-parity/compare.mjs
node experiments/phase5a-sweph-parity/derived.mjs
```

两个退出码都是 **2**。生产 `package.json` 与 `src` 仍没有 `swisseph-wasm`、`@swisseph/browser`、`@swisseph/node`。

浏览器冒烟：`PHASE5A_SMOKE_OK`。

## O. Build

```text
BUILD: NOT RUN
REASON: production source unchanged
```

## P. Production `/chart` changed?

没有。

## Q. WASM entered production?

没有。

## R. Regression classification

生产源码没有改。没有新的产品回归。

## S. Final decision

```text
PHASE 5-A = BLOCKED
```

这一张历史盘上，原始角度、落宫、相位、大部分阿拉伯点已经对上。还缺：

- 至少 5 个当场打出来的 `/chart` golden
- 恒星黄道 golden
- 生命点、根点（朔望点）
- 接纳、互容、赤纬平行、夹攻、七政星宿段
- 除 Regiomontanus 以外的宫制

这些没齐，不能改判 PASS，也不能把 WASM 接上生产。

**PHASE 5-A 到此停止。**  
**未开始 PHASE 5-B。**
