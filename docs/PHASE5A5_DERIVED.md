# PHASE 5-A.5 PASS

日期：2026-09-23  
HEAD：`4e6d20d393ae618828b648d3bbb9ad907538cd6b`

派生层只读实验 Chart JSON。没有再次调用 `initSwissEph` 或 `calc_ut`。历史 `normalAsp`、`lots`、`receptions`、`declParallel` 只作 expected。

```text
path=experiments/phase5a-sweph-parity/derived/chartV2.js
schema=experiments/phase5a-sweph-parity/schemas/browserChart.v2.schema.json
```

1990-06-15 HISTORICAL-GOLDEN。容许度仍是事先声明的 1 角秒。

## A. Aspects

```text
implementation=derived/aspectsBrowser.js
ruleSource=flatlib/aspects.py + perchart.getAspects
orbRule=flatlib/props.py 星体容许度；主相位任一方覆盖即保留；45° 最大 3°；Exact |orbDir|<0.3
applyingRule=较快者为入相主体；最短弧；顺行且 orbDir>0 或逆行且 orbDir<0 为 Applicative；|speed|<0.0003 为 Stationary
parity=PASS
```

相位表是 0、60、90、120、180，再加上源码里的 45°。没有加入半六分或五分相。

太阳到冥王的 `normalAsp`、`signAsp`、`immediateAsp`：81 PASS，0 FAIL。最大 orb 差 0.014 角秒（木星与冥王 120°）。凯龙、小行星、中点和 `Intp_*` 不在实验盘上，12 行 `NOT_COMPARABLE`。

## B. Lots

```text
implementation=derived/lotsBrowser.js
formulaSource=flatlib/tools/arabicparts.py，昼夜用 chart.isDiurnal（黄赤交角 -23.44）
parity=PASS
```

昼盘与历史 `chart.isDiurnal=true` 一致。31 个阿拉伯点 PASS。最大差 0.0015 角秒（Pars Basis）。`Pars Life` 与 `Pars Radix` 需要 Syzygy，记 `MISSING_INPUT`，没有填写经度。

## C. Reception

```text
implementation=derived/receptionBrowser.js
rulerSource=flatlib/dignities/tables.py 埃及界、迦勒底面、传统守护；strongRecption=true
parity=PASS
```

`receptions.normal`、`receptions.abnormal`、`mutuals.normal`、`mutuals.abnormal` 四组与历史 JSON 一致。

## D. Declination Parallel

```text
implementation=derived/declinationBrowser.js
toleranceSource=perchart.getParallel 中的 delta <= 1°
parity=PASS
```

用历史赤纬重跑同一算法，`parallel` 与 `contraParallel` 与历史 JSON 一致。浏览器盘上成员齐全的组是 `Jupiter+Sun`，PASS。其余组含实验盘没有的天体，记 `NOT_COMPARABLE`。这不是 `paransLocal`。

## E. Parans

```text
status=RULE-INCOMPLETE
dependency=paransLocal.js 是 Brady 近似（交角 23.4367，默认 2°）。生产 declParallel 是另一套算法。恒星交映还要星表。
```

## F. Fixed Stars

```text
status=RULE-INCOMPLETE
dataDependency=Swiss 恒星表、盘历元、岁差。fixedStarSu28 / guoStarSect 另要宿度表。
```

## G. Nakshatra / Seven Stars

```text
status=NAKSHATRA_DATA_DEPENDENCY
dataDependency=nakshatra.py 要恒星黄道经度，每宿 13°20′。当前实验盘是回归黄道。七政宿段同样 RULE-INCOMPLETE。
```

## H. Experimental Chart JSON v2

```text
path=experiments/phase5a-sweph-parity/derived/chartV2.js
schema=experiments/phase5a-sweph-parity/schemas/browserChart.v2.schema.json
```

`derived.parans`、`fixedStars`、`nakshatras` 是状态对象，不是空数组。

## I. Tests

```text
passed=4
failed=0
blocked=0
```

`node --test phase5a5.aspects.test.js phase5a5.lots.test.js phase5a5.reception.test.js phase5a5.declParallel.test.js`

1900、1950、1976、2000、2026 只确认天体、Asc、MC、宫头和相位对象能算出。这五张盘没有历史相位 oracle，记 `NOT_COMPARABLE`。

## J. Historical Comparison

逐行在：

```text
experiments/phase5a-sweph-parity/results/phase5a5-1990-aspects.json
experiments/phase5a-sweph-parity/results/phase5a5-1990-lots.json
experiments/phase5a-sweph-parity/results/phase5a5-1990-reception.json
experiments/phase5a-sweph-parity/results/phase5a5-1990-declparallel.json
```

这些文件是 `WEB-EXPERIMENTAL-RESULT`。

```text
aspects      PASS 81   FAIL 0   NOT_COMPARABLE 12   worst 0.014 arcsec
lots         PASS 31   FAIL 0   NOT_COMPARABLE 2    worst 0.0015 arcsec
reception    PASS 4    FAIL 0
declParallel PASS 3    FAIL 0   NOT_COMPARABLE 9
```

## K. Production Source

```text
services/astro.js=UNCHANGED
package.json=UNCHANGED
Java=UNCHANGED
Python=UNCHANGED
vendor=UNCHANGED
UI=UNCHANGED
```

## L. License

```text
legalReviewRequired=true
```

## M. Remaining Work

```text
P0  Syzygy，使 Pars Life / Pars Radix 可算；实验盘补上 declParallel 还缺的天体赤纬
P1  parans、恒星、宿段。规则或星表未齐，不要补一套自定义算法
P2  生产接入仍停在许可证审查
```

## N. Next Step

```text
NEXT_RECOMMENDED_PHASE=PHASE 5-A.6
```

5-A.6 只补派生层还缺的输入。不进入 5-B，不改 `fetchChart`。
