# PHASE 4-B：卦辞与节气静态表迁入浏览器

## 基线

- 分支 `main`，HEAD `28fd212`（PHASE 0–2-D）
- 语义基线：`docs/PHASE3_PRE_AUDIT.md` 第 J 节 4-B
- 前序：`docs/PHASE4A_CALC_SERVICE_REQUIRED.md` 已完成。本阶段不改 4-A 的服务失败文案

## 范围

做了：

- 六十四卦卦辞与八卦梅花易从 Java classpath 原样打进浏览器表。六爻、梅花易取辞不再请求 `/gua/desc`、`/gua/meiyi`
- 公元 1–9999 的 24 节气年表走 `buildLocalJieqiYearSeed`，不请求 `/jieqi/year`
- 公元 10000 及以上、公元 0 及以前、公元前：本地表返回空，仍请求 `/jieqi/year`。后端没有结果时不编造节气

没做：

- PHASE 4-C 及以后（紫微起盘、六壬、WASM、kentang、AI、移动布局、删依赖、退安装器）
- 删除 Java `GuaController`、`gua/*.json`、`meihuayi/*.json`、Python
- ProductScope、IndexedDB、四键 localStorage
- `baziStress` / `techniquePerfBudget` / `yizhangjingReportTable` 阈值与算法
- 分至星盘 `loadJieqiChart`（仍走 `/chart`，属星历，不是本阶段的节气表）
- `/nongli/time` 仍是后端优先、失败再本地。真太阳时与经度不在这张节气静态表里

## 修改文件

| 文件 | 变化 |
|---|---|
| `astrostudyui/src/utils/data/guaTextIndex.json` | 64 卦 + 8 经卦原文（约 119KB），从 classpath 合并，未改字 |
| `astrostudyui/src/utils/guaTextTable.js` | 按爻象二进制、卦名、简称、宫名查找，与 `GuaHelper` 的键一致 |
| `astrostudyui/src/components/guazhan/GuaZhanMain.js` | 卦辞改读本地表 |
| `astrostudyui/src/components/gua/MeiyiGuaSym.js` | 梅花易改读本地表 |
| `astrostudyui/src/components/gua/DoubleMeiyiGuaSym.js` | 卦辞与梅花易改读本地表 |
| `astrostudyui/src/utils/preciseCalcBridge.js` | 可靠域节气年表本地优先；公元前不拿公元表冒充；交节四柱用已有 `buildLocalNongliLite`（缺经度则钟面时刻） |
| `astrostudyui/src/utils/__tests__/guaTextTable.test.js` | 乾坤卦辞金样 |
| `astrostudyui/src/utils/__tests__/preciseCalcBridge.test.js` | 域内不请求、域外保留后端时刻、无结果不编造 |

## 行为

卦辞：`111111` / `乾` / `天天` / `乾乾` 为同一条，卦辞「元，亨，利，贞。」坤卦辞与 classpath `000000.json` 一致。表外名字没有条目，不显示假卦辞。

节气：2026 年本地表金样为立春 `2026-02-04 04:02:08`（日柱己酉）、夏至 `2026-06-21 16:24:30`（日柱丙寅）、冬至 `2025-12-21 23:03:05`（日柱甲子）。年表里的冬至是上一年十二月，与既有本地种子约定相同。分至页每张节气卡的四柱来自该交节钟面的本地农历，不再等 Java。星盘格点仍要计算服务。

## 测试

```
npx umi-test src/utils/__tests__/guaTextTable.test.js src/utils/__tests__/preciseCalcBridge.test.js src/utils/__tests__/lunarDomainGuard.test.js src/components/jieqi/__tests__/jieqiCalendarStress.test.js --forceExit
```

- 4 suites，18 tests，全部通过
- `jieqiCalendarStress` 含本地节气单次 &lt; 500ms 的既有断言，本轮通过。未改该阈值
- 未跑全量。`baziStress`、`techniquePerfBudget`、`yizhangjingReportTable` 未改、未跑

## build:file

`npm run build:file` **exit 0**（约 71s）。

- `check-chunk-dup` 绿：22 个大 async chunk，最大请求组 33/56，首屏批次无重引擎
- `[build-info]` 提示工作树有未提交改动，产物不能对应单一 commit

## 失败分类

| 类 | 结果 |
|---|---|
| 4-B 针对性测试（卦辞金样、节气域、分至压测） | 通过 |
| `build:file` | exit 0 |
| `baziStress` / `yizhangjingReportTable` | 未跑、未改。PHASE 2-F 既有失败，不归入 4-B |
| `techniquePerfBudget` | 未跑、未改 |

## 停止

**PHASE 4-B COMPLETE**

未开始 PHASE 4-C。未提交、未推送。
