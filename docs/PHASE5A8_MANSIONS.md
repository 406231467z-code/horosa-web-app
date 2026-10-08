# PHASE 5-A.8 PASS

日期：2026-09-23  
HEAD：`4e6d20d393ae618828b648d3bbb9ad907538cd6b`

实验层在 `derived/mansionChart.js`。v2 的 `deriveExperimentalChart` 没有改状态字符串，5-A.5 仍读到原来的 `RULE-INCOMPLETE` 和 `NAKSHATRA_DATA_DEPENDENCY`。

## A. Nakshatra

```text
implementation=derived/nakshatraBrowser.js
source=astropy/astrostudy/nakshatra.py + india/primitives.py
tests=tests/phase5a8.nakshatra.test.js PASS
parity=tropical chart is null, matching the 1990 golden key
```

27 宿，跨度 `360/27`。正好落在界上时进入下一宿。经度先对 360 取正模。Pada 是 `min(4, int(progress * 4) + 1)`。Abhijit 不改 27 宿的宿主。函数里不计算 Lahiri。

## B. GuoStarSect

```text
implementation=derived/guoStarSectBrowser.js
source=guotables.py TERM_SU27 + guostarsect.py allTerm
tests=tests/phase5a8.guostarsect.test.js PASS
parity=1990 Sun Moon Mercury Venus Mars Jupiter Saturn su match the historical chart
```

字段名是 `su`。27 宿，不含牛。月亮所在宿是 `lifesu`。没有单独的昼夜表。历史对象上的 `mansion` 是另一套 28 等分名称，没有并进这里。

## C. Su28

```text
mode 0=LICENSE_BLOCKED
mode 1=tableStatus EXPERIMENTAL from guo74.SuDeg; placementStatus LICENSE_BLOCKED
mode 2=EXPERIMENTAL; dependsOnSwissForObliquity=true; productionReady=false; reason=LICENSE_REVIEW_REQUIRED
mode 3=EXPERIMENTAL from Kaixi degrees plus caller-provided ayanamsa; productionReady=false; reason=LICENSE_REVIEW_REQUIRED
mode 4=EXPERIMENTAL from MOIRA_CURRENT_STELLAR_DEGREES; ayanamsa not applied
mode 5=LICENSE_BLOCKED
mode 6=EXPERIMENTAL from guolao_tuibian; precess option kept, default off
mode 7=EXPERIMENTAL from Yuan-Ming widths; precess=false
mode 8=LICENSE_BLOCKED
```

这四档和 Nakshatra、GuoStarSect 都是 implementation candidate，不是 final-production-approved。缺省 mode 是 0，阻断后不会改走 mode 2。历史 `fixedStarSu28` 是 mode 0，只记 REFERENCE-ONLY。

## D. Fixed Stars

```text
status=LICENSE_BLOCKED
license=Swiss sefstars.txt, commercial use not cleared
productionReady=false
```

## E. Qizheng

```text
status=LICENSE_BLOCKED
license=vendor comment cites MOIRA; no license sentence
productionReady=false
```

## F. Parans

```text
status=NOT_IMPLEMENTED
natalChartStatus=NOT_NATAL_CHART
ACGStatus=AUDIT_ONLY
localApproximationStatus=LEGACY-LOCAL-APPROXIMATION
```

## G. Tests

```text
5-A.3=PASS
5-A.4=PASS
5-A.5=PASS
5-A.6=PASS
5-A.8=PASS
```

## H. Production Source

```text
services/astro.js=UNCHANGED
package.json=UNCHANGED
Java=UNCHANGED
Python=UNCHANGED
vendor=UNCHANGED
UI=UNCHANGED
```

## I. License Gate

见 `experiments/phase5a-sweph-parity/LICENSE_GATE.md`。

## J. Remaining Work

```text
P0  sefstars 与七政宿界的许可仍未清，恒星位置和 mode 0/1 落点/5/8 不能进生产。
P1  mode 2/3 的黄经依赖实验 Swiss 的黄赤交角和用户 ayanamsa。本机没有 pyswisseph，没有再跑一份 Python 对照。
P2  历史对象上的 mansion 字段是 28 等分名称，与 su、nakshatra、fixedStarSu28 都不同。Parans 仍延期。
```

## K. Next Step

```text
NEXT_RECOMMENDED_PHASE=5-A.9
```
