# PHASE 5-A.4 PASS

日期：2026-09-23  
HEAD：`4e6d20d393ae618828b648d3bbb9ad907538cd6b`

实验 Chart JSON 已从 `browserEphemerisAdapter` 装出。这不是生产 `/chart`。

```text
path=experiments/phase5a-sweph-parity/browserChartBuilder.js
schema=experiments/phase5a-sweph-parity/schemas/browserChart.schema.json
result=experiments/phase5a-sweph-parity/results/phase5a4-1990.json
```

1990-06-15 的 HISTORICAL-GOLDEN：儒略日相同，天体 `lon/lat/lonspeed/decl/retrograde`、Asc/MC/Desc/IC、Regiomontanus 十二宫头全部 PASS。容许度仍是 1 角秒。

Placidus 能算出，这张历史盘不是 Placidus，记 `NOT_COMPARABLE`。Lahiri 恒星黄道只作 `REFERENCE-ONLY`。

```text
aspects lots receptions mutuals fixedStars nakshatras declParallel parans = NOT_IMPLEMENTED
services/astro.js = UNCHANGED
astrostudyui/package.json = UNCHANGED
legalReviewRequired = true
```

测试：`node --test phase5a4.browserChartBuilder.test.js` 与 5-A.3 一起，2 通过，0 失败。

下一阶段建议 PHASE 5-A.5：在实验 JSON 上再加派生量，仍不改 `fetchChart`。
