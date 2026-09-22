# PHASE 4-H：依赖候选删除

## 基线

- 分支 `main`，HEAD `28fd212`
- 语义基线：`docs/PHASE3_PRE_AUDIT.md` 第 I、J 节 4-H（审计后删除 fastclick、qrcode.react、mammoth、print-js；保留清单内的包；针对性测试与 `build:file`）
- 不处理 PHASE 4-I 的 Electron / 安装器

## 生产引用审计

| 包 | package.json | package-lock.json | node_modules | `src` / `scripts` / `.umirc.js` |
|---|---|---|---|---|
| fastclick | 无 | 无 | 无 | 无 |
| qrcode.react | 无 | 无 | 无 | 无 |
| mammoth | 无 | 无 | 无 | 无 |
| print-js | 无 | 无 | 无 | 无 |

`helper.js` 的导出里没有 `printArea`，文件里也没有 `print-js`。`src` 生产文件（排除 `__tests__`）里没有 `printArea`、`printJS`、`fastclick`、`qrcode.react`、`mammoth`、`print-js`。

仍引用 `helper` 的两处盘面：

- `AstroChartCircle.js` 只引入 `randomStr`、`detectOS`、`distanceInCircleAbs`、`creatTooltip`、`setupFloatingTooltip`
- `RengChart.js` 只引入 `randomStr`、`formatDate`、`positionFloatingTooltip`

这两处测试里原先的 `printArea: jest.fn()` 是整模块 mock，生产代码不调用它。已从 mock 里拿掉。

保留未动：`d3`、`lunar-javascript`、`docx`、`pdf-lib`、`@monaco-editor/react`、`@amap/amap-jsapi-loader`、`node-forge`、`js-rsa`。`puppeteer-core` 仍在 devDependencies。

## 删除与 lockfile

审计时四个包已经不在 `package.json`、`package-lock.json` 和 `node_modules`。没有需要再删的条目，也没有再跑 `npm uninstall`。锁文件保持「这四个名字不出现」。

## 修改文件

| 文件 | 变化 |
|---|---|
| `astrostudyui/src/utils/__tests__/phase4hDeadDeps.test.js` | 包清单、helper、生产源码扫描、盘面 import |
| `astrostudyui/src/components/astro/__tests__/AstroChartCircle.test.js` | 去掉无调用的 `printArea` mock |
| `astrostudyui/src/components/lrzhan/__tests__/RengChart.test.js` | 去掉无调用的 `printArea` mock |
| `docs/PHASE4H_DEAD_DEPS.md` | 本记录 |

`package.json` 与 `package-lock.json` 本步没有新的 diff。

## 测试

```
npx umi-test src/utils/__tests__/phase4hDeadDeps.test.js src/components/astro/__tests__/AstroChartCircle.test.js src/components/lrzhan/__tests__/RengChart.test.js --forceExit
```

- exit 0
- 3 suites，10 tests，全部通过
- 未跑全量。`baziStress`、`techniquePerfBudget`、`yizhangjingReportTable` 未改、未跑

## build:file

`npm run build:file` **exit 0**。

- `check-chunk-dup` 绿：23 个大 async chunk

## 失败分类

| 类 | 结果 |
|---|---|
| 四包生产引用审计 | 无引用 |
| `printArea` 间接生产调用 | 无。helper 不导出，盘面 import 不含它 |
| 针对性测试 | 10/10 通过 |
| `build:file` | exit 0 |
| KEEP 包 / puppeteer-core / Electron 安装器 | 未删 |
| `baziStress` / `yizhangjingReportTable` | 未跑、未改。PHASE 2-F 既有失败，不归入 4-H |
| `techniquePerfBudget` | 未跑、未改 |

## 停止

**PHASE 4-H COMPLETE**

未开始 PHASE 4-I。未提交、未推送。
