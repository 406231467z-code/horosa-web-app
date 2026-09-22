# PHASE 4-E：kentang 维持远程

## 基线

- 分支 `main`，HEAD `28fd212`
- 语义基线：`docs/PHASE3_PRE_AUDIT.md` 第 J 节 4-E（kentang 维持远程；许可允许再议移植。不在 4-E 删除 vendor）
- 前序 4-A 至 4-D 已完成。本阶段不改那些路径

## 范围

做了：

- 核对 `vendor/` 九套引擎快照的许可，并记在下面
- `kentangBrowserPortEnabled()` 固定返回 `false`。排盘仍由 `buildKentangEndpoint` 组成 HTTP 地址，默认落到图表服务 `:8899`
- 测试确认九套目录都还在，MIT 的 `LICENSE` 仍在，没有许可文件的三套仍没有 `LICENSE`

没做：

- 不把任何 kentang 引擎移植进浏览器
- 不删除 `vendor/`，不改 Python 适配，不改 `THIRD_PARTY_NOTICES.md`
- PHASE 4-F 及以后
- ProductScope、IndexedDB、四键 localStorage
- `baziStress` / `techniquePerfBudget` / `yizhangjingReportTable` 阈值
- 已有的本地遁甲主路径 `calcDunJia` 未改。`/qimen/pan` 仍是远程 kinqimen

## 许可

| 引擎 | 快照许可 | 本阶段 |
|---|---|---|
| kintaiyi、kinjinkou、kinqimen、kinwangji、kinwuzhao、kinastro | `LICENSE` 为 MIT | 维持远程。MIT 允许以后另开阶段再议移植 |
| taixuanshifa、jingjue | 快照里没有许可文件，README 也没有授权条款 | 维持远程。没有再分发许可，不列入移植候选 |
| shenyishu | 没有 `LICENSE`。README「授權」只写学术研究与文化传承，没有授予复制、修改、再发布 | 维持远程。不列入移植候选 |

`vendor/kin_year_domain.py` 与 `vendor/test_month_pillar_boundary.py` 未接线，留在原地。

## 修改文件

| 文件 | 变化 |
|---|---|
| `astrostudyui/src/integrations/kentang/serviceRoot.js` | 移植开关恒为关 |
| `astrostudyui/src/integrations/kentang/__tests__/serviceRoot.test.js` | 开关、HTTP 根、vendor 快照仍在 |
| `docs/PHASE4E_KENTANG_REMOTE.md` | 本记录 |

## 行为

Java `:9999` 在场时，奇门与神易数的默认地址仍是 `http://127.0.0.1:8899/qimen/pan` 与 `http://127.0.0.1:8899/shenyishu/pan`。查询参数里的显式服务地址仍优先，原有测试未改断言。浏览器里没有 kentang 起盘实现可被这个开关打开。

## 测试

```
npx umi-test src/integrations/kentang/__tests__/serviceRoot.test.js --forceExit
```

- 1 suite，8 tests，全部通过
- 未跑全量。`baziStress`、`techniquePerfBudget`、`yizhangjingReportTable` 未改、未跑

## build:file

未跑。请求地址与页面没有变化，计划表这一步的测试栏为空。模块已被上述测试加载。

## 失败分类

| 类 | 结果 |
|---|---|
| 移植开关为关、默认根仍是 HTTP 图表服务 | 通过 |
| 九套 vendor 目录仍在；六套 MIT `LICENSE` 仍在 | 通过 |
| 浏览器移植 | 未做 |
| `build:file` | 未跑 |
| `baziStress` / `yizhangjingReportTable` | 未跑、未改。PHASE 2-F 既有失败，不归入 4-E |
| `techniquePerfBudget` | 未跑、未改 |

## 停止

**PHASE 4-E COMPLETE**

未开始 PHASE 4-F。未提交、未推送。
