# PHASE 5-A.6 PASS

日期：2026-09-23  
HEAD：`4e6d20d393ae618828b648d3bbb9ad907538cd6b`

本阶段只补已经通过的派生层所缺的输入。没有改相位、阿拉伯点、接纳或赤纬平行的判定规则。

## A. Syzygy

```text
ruleSource=flatlib/ephem/tools.py syzygyJD + eph.py getObject(SYZYGY)
syzygyType=full-moon
implementation=derived/syzygyBrowser.js
status=SYZYGY_RULE_CONFIRMED
parity=PASS
```

月日距小于 180° 时取上一次合相（新月），否则取上一次冲相（满月）。1990-06-15 是满月，JD 2448050.95910511。黄经差 0.000017 角秒。搜索用回归黄道上的太阳、月亮黄经；结果黄经是该时刻的月亮。当前盘上的月日距只用来判断类型。

## B. Pars Life

```text
formulaSource=arabicparts.py FORMULAS[Pars Life] = [Syzygy, Moon, Asc]，昼夜同一式
implementation=derived/lotsBrowser.js
parity=PASS
```

差 0.00076 角秒。

## C. Pars Radix

```text
formulaSource=arabicparts.py FORMULAS[Pars Radix] = [Moon, Syzygy, Asc]，昼夜同一式
implementation=derived/lotsBrowser.js
parity=PASS
```

差 0.00076 角秒。原先 31 个点仍然 PASS。没有 Syzygy 时这两点仍是 `MISSING_INPUT`。

## D. Declination Input Matrix

28 行全部 PASS，容许度 1 角秒。最大差是智神星 0.169 角秒。北交点仍是 `SE_MEAN_NODE`，莉莉丝仍是 `SE_MEAN_APOG`。行星赤纬仍是 `SEFLG_SWIEPH | SEFLG_SPEED | SEFLG_EQUATORIAL`。

完整数字在 `experiments/phase5a-sweph-parity/results/phase5a6-1990-declination.json`。

## E. DeclParallel

```text
previousPass=Jupiter+Sun，其余组缺天体
completePass=PASS
missingBodies=none
```

`parallel` 与 `contraParallel` 和历史 JSON 一致。阈值仍是 1°。

## F. Parans Required Inputs

行星黄经、黄纬、地理纬度、赤经与四轴时角、恒星黄经和赤纬、默认 2° 容许。`paransLocal` 自己用交角 23.4367 算赤纬，和生产 `declParallel` 不是同一算法。本阶段没有实现。

## G. Fixed Stars Required Inputs

Swiss 恒星表、盘历元、岁差、黄道（含恒星黄道模式）、星体经纬与赤经赤纬。`fixedStarSu28` 另要宿度表和宿度模式。`guoStarSect` 另要行星落宿和 `guotables`。本阶段没有实现。

## H. Nakshatra Required Inputs

恒星黄道经度、产生该经度的 ayanamsa、`nakshatra.py` 的 27 宿表（每宿 13°20′）。不依赖恒星表。本阶段没有实现。

## I. Schema

```text
browserChart.v2.schema.json=已加入 derived.syzygy
```

没有 Syzygy 时只有 `status=MISSING_INPUT`，没有用 0 占位。

## J. Regression

```text
5-A.3=PASS
5-A.4=PASS
5-A.5=PASS
5-A.6=PASS
```

8 个测试，0 失败。

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
P0  无
P1  Parans、恒星、宿段。输入已列出，算法未做
P2  生产接入仍停在许可证审查
```

## N. Next Step

```text
NEXT_RECOMMENDED_PHASE=PHASE 5-A.7
```

5-A.7 只处理恒星与宿段的数据来源。不进入 5-B，不改 `fetchChart`。
