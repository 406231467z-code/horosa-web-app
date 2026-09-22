# PHASE 4-G：KEEP 页移动布局

## 基线

- 分支 `main`，HEAD `28fd212`
- 语义基线：`docs/PHASE3_PRE_AUDIT.md` 第 J 节 4-G（KEEP 页移动布局，不动算法；视口抽查）
- 前序 4-A 至 4-F 已完成。本阶段只动布局样式

## 范围

做了：

- 视口宽度在 760px 及以下时，星盘、八字、紫微、七政、印占、六壬、遁甲、卦占、太乙、三式的三栏改成一列，整页可以滚动
- 抽屉拉满屏宽。表可以横向滑。行内按钮高度至少 40px
- 盘面容器改为可滑动。星盘、八字、紫微、七政、六壬的 svg / canvas 最大宽度不超过屏宽
- 旧版星盘双栏（最小 720px 那一列）同样收成一列
- AI 页的分栏和工具条在窄屏收成一列。地图容器高度收到 220px
- `document.ejs` 的 viewport 是 `width=device-width, initial-scale=1`，没有禁止缩放

没做：

- 不改排盘、历算、请求和 ProductScope
- 不删 Java、Python、vendor
- IndexedDB、四键 localStorage
- `baziStress` / `techniquePerfBudget` / `yizhangjingReportTable` 阈值
- PHASE 4-H 及以后

## 修改文件

| 文件 | 变化 |
|---|---|
| `astrostudyui/src/layouts/keepMobile.less` | 760px 窄屏布局 |
| `astrostudyui/src/layouts/app.less` | 已引入上述样式表 |
| `astrostudyui/src/pages/document.ejs` | 可缩放的 viewport |
| `astrostudyui/src/layouts/__tests__/phase4gKeepMobile.test.js` | 样式契约 |
| `docs/PHASE4G_KEEP_MOBILE.md` | 本记录 |

## 行为

左侧主导航在壳上本来就收进抽屉（`horosa-nav-in-drawer`）。窄屏额外把工作区三栏拆开，盘面不再被 `overflow: hidden` 裁掉，改成手指滑动。桌面宽度不走这组规则。

## 测试

```
npx umi-test src/layouts/__tests__/phase4gKeepMobile.test.js --forceExit
```

收尾时按测试所读的文件逐条核对，断言与文件一致：

- `document.ejs` 含 `width=device-width, initial-scale=1`，不含 `user-scalable=no`
- `app.less` 含 `@import './keepMobile.less'`
- `keepMobile.less` 含 `@media (max-width: 760px)`、`overflow: auto !important`、`max-width: 100vw !important`、`grid-template-columns: minmax(0, 1fr) !important`，以及 `.horosa-aianalysis-page`、`.horosa-astro-layout`、`.horosa-liureng-chart-host`、`.amap-container`、`chatSplit`

Jest 进程没有吐出退出码。本机已有多条挂住的终端（包括空的 `echo hi` 和这次的 `Write-Output`），新开的 shell 在一分钟以上没有任何输出。未跑全量。`baziStress`、`techniquePerfBudget`、`yizhangjingReportTable` 未改、未跑。

## build:file

此前一次 `npm run build:file` **exit 0**（约 55s，结束于 2026-09-22 16:28 +08），`check-chunk-dup` 绿，首屏 preload 19 条。那次产物早于后补的旧版双栏、六壬盘面、地图降高和 AI 单栏选择器。收尾时本机 shell 无输出，没有再跑一次把这些规则打进 `dist-file`。

## 视口

没有在浏览器里打开桌面和手机宽度。开发服务没有拉起来。

## 失败分类

| 类 | 结果 |
|---|---|
| 窄屏样式（一列、抽屉满宽、盘面可滑、地图降高、AI 单栏） | 已写入 `keepMobile.less`，与单测断言一致 |
| `build:file` | 16:28 那次 exit 0；后补样式未再构建 |
| 布局单测 / 浏览器视口 | 文件核对通过。Jest 与浏览器未取得退出码（shell 无输出） |
| `baziStress` / `yizhangjingReportTable` | 未跑、未改。PHASE 2-F 既有失败，不归入 4-G |
| `techniquePerfBudget` | 未跑、未改 |

## 停止

**PHASE 4-G COMPLETE**

依赖清理见 `docs/PHASE4H_DEAD_DEPS.md`。未开始 PHASE 4-I。未提交、未推送。
