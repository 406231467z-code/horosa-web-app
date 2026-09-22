# PHASE 4-C：紫微起盘与六壬神煞迁入浏览器

## 基线

- 分支 `main`，HEAD `28fd212`
- 语义基线：`docs/PHASE3_PRE_AUDIT.md` 第 J 节 4-C（紫微起盘、六壬神煞 Java→JS，与现盘对拍）
- 前序 4-A、4-B 已完成。本阶段不改服务失败文案，不改节气/卦辞表

## 范围

做了：

- 公元 1–9999 的紫微本命盘走已对拍的 `calcZiwei`，并带上 Java 兼容档（正月换年、日历农历日、命主按生年支）
- `/ziwei/rules` 的两份静态表原文进浏览器，排盘不再等这次请求
- 六壬旬日、太岁十二神、日/月/干/支神煞按 `LiuReng.fillXun` / `fillGods` 与 `GodsHelper` 的查表在浏览器计算。四柱仍用既有 `buildLocalNongliLite`
- 公元 10000 年及以后、公元前：本地不起盘、不编神煞，仍请求 `/ziwei/birth`、`/liureng/gods`。后端没有结果时不编造盘

没做：

- PHASE 4-D 及以后
- 删除 Java `ZiWeiController`、`LiuReng`、`gods.json`、Python
- ProductScope、IndexedDB、四键 localStorage
- `baziStress` / `techniquePerfBudget` / `yizhangjingReportTable` 阈值与八字算法
- `/liureng/runyear` 仍可走后端；页上已有的年龄循环兜底未改
- `ziweiLocalFirst` 开关仍是默认关。哨兵要求它保持 opt-in。起盘主路径不再依赖这个开关

## 修改文件

| 文件 | 变化 |
|---|---|
| `astrostudyui/src/utils/ziweiBirthLocal.js` | 可靠域本地起盘；域外才请求 `/ziwei/birth` |
| `astrostudyui/src/utils/ziweiRulesLocal.js` | 格局规则静态表 |
| `astrostudyui/src/utils/data/zwrules.json` | classpath 原文 |
| `astrostudyui/src/utils/data/zwrulesihua.json` | classpath 原文 |
| `astrostudyui/src/utils/liurengGodsLocal.js` | 旬日与神煞 |
| `astrostudyui/src/utils/data/gods.json` | classpath 原文 |
| `astrostudyui/src/utils/data/taisui.json` | classpath 原文 |
| `astrostudyui/src/components/ziwei/ZiWeiMain.js` | 起盘与规则改走上述入口 |
| `astrostudyui/src/components/sanshi/SanShiZiWeiSihua.js` | 三式里的紫微盘同一入口 |
| `astrostudyui/src/components/lrzhan/LiuRengMain.js` | 神煞同一入口 |
| `astrostudyui/src/components/jinkou/JinKouMain.js` | 金口复用的六壬神煞同一入口 |
| `astrostudyui/src/utils/aiAnalysisContext.js` | 快照取神煞同一入口 |
| `astrostudyui/src/utils/__tests__/phase4cZiweiLiureng.test.js` | 金样与域外不编造 |

## 行为

紫微：网格第一例（1950-03-12 10:30，男）本地盘的命宫、身宫、五行局、紫微落宫、命主、身主、年干支与固化的 Java 盘一致。24 例对拍整组仍绿。格局条文来自静态表，键为 `ZWRules` / `ZWRuleSihua`。

六壬：甲子旬为旬空戌亥、旬丁丁卯、旬首甲子、旬尾癸酉。年支子的岁驾在子、岁破在午。2026-09-22 能出日本地神煞。表里没有的神名不会补一条假煞。

## 测试

```
npx umi-test src/utils/__tests__/phase4cZiweiLiureng.test.js src/components/ziwei/__tests__/ziweiLocalParity.test.js src/components/ziwei/__tests__/ziweiEngineForwardSentinel.test.js --forceExit
```

- 3 suites，38 tests，全部通过
- 其中 24 例紫微网格对拍全绿
- 未跑全量。`baziStress`、`techniquePerfBudget`、`yizhangjingReportTable` 未改、未跑

## build:file

`npm run build:file` **exit 0**（约 131s）。

- `check-chunk-dup` 绿：22 个大 async chunk，最大请求组 33/56，首屏批次无重引擎
- 首屏 preload 19 条（此前 21）。分包边界随新表移动，检查脚本仍判绿
- `[build-info]` 提示工作树有未提交改动，产物不能对应单一 commit

## 失败分类

| 类 | 结果 |
|---|---|
| 4-C 针对性测试（紫微 24 例、旬日神煞、域外不编造、转发哨兵） | 通过 |
| `build:file` | exit 0 |
| `baziStress` / `yizhangjingReportTable` | 未跑、未改。PHASE 2-F 既有失败，不归入 4-C |
| `techniquePerfBudget` | 未跑、未改 |

## 停止

**PHASE 4-C COMPLETE**

未开始 PHASE 4-D。未提交、未推送。
