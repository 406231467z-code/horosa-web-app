# PHASE 4-A：无计算服务时的可恢复失败态

## 基线

- 分支 `main`，跟踪 `origin/main`
- HEAD `28fd21236a58fdb3d26acdec30c14ef78acfef48`（PHASE 0–2-D 已推送）
- 工作树在本阶段开始前已含未提交的 PHASE 2-E / 2-F 生产改动与 `docs/PHASE2E_*`、`docs/PHASE2F_LOCALSTORAGE_EXIT.md`、`docs/PHASE3_PRE_AUDIT.md`
- 语义基线：`docs/PHASE3_PRE_AUDIT.md` 第 J 节。4-A 只做「浏览器无后端时的失败语义」，状态与文案，不改算法

PHASE 3 结论：纯浏览器没有本机 Java `:9999` / Python `:8899` 时，星盘等历算无法计算。`StartupGate` 在 `ServerRoot` 始终有值时会对连接被拒无限重试，主界面被全屏覆盖。本阶段只打断这条白屏，不把历算搬进浏览器。

## 范围

做了：

- 纯浏览器（无 `window.__TAURI__`、无 `window.horosaDesktop`）在 `/heartbeat` 网络层失败（`TypeError`）时放行主界面，并标明「需要计算服务」
- 横幅、排盘失败弹窗、连接类后端原文的中文提示与上述语义对齐
- 探测仍失败时不弹成功，文案写明没有生成盘面

没做：

- PHASE 4-B～4-I（卦辞/节气静态表、紫微六壬移植、WASM、kentang、AI 直连、移动布局、删依赖、退安装器）
- ProductScope KEEP/REMOVE
- 删除 Java / Python / vendor
- IndexedDB、四键 localStorage、PHASE 2-F 棘轮
- `baziStress` / `techniquePerfBudget` / `yizhangjingReportTable` 阈值与算法
- Umi→Vite、WASM、Worker

超时与 `AbortError` 仍视为「后端在世只是慢」，继续放行并记在线。这条与 PHASE 3 的离线判定一致，不算排盘成功。

## 修改文件（仅 4-A）

| 文件 | 变化 |
|---|---|
| `astrostudyui/src/utils/serviceStatus.js` | `isDesktopCalcShell()`、`CALC_SERVICE_REQUIRED_MESSAGE` |
| `astrostudyui/src/components/common/StartupGate.js` | 纯浏览器连接被拒：`markServiceOffline()` 后 `setReady(true)`。桌面壳仍退避重试 |
| `astrostudyui/src/components/common/ServiceStatusBanner.js` | 纯浏览器离线文案用上述常量；桌面壳仍是「正在自动探测恢复」。重试与 10s 恢复轮询未改 |
| `astrostudyui/src/components/common/ChartServiceErrorModal.js` | 纯浏览器标题「需要计算服务」，正文不写解压/防火墙。探测失败的警告写明没有生成盘面。成功弹窗仍只在 `probeBackend` 为真时出现 |
| `astrostudyui/src/utils/request.js` | 连接类技术异常的用户文案改为「需要计算服务…本次没有生成结果」。非连接类技术异常仍是「请重启应用」 |
| `astrostudyui/src/components/common/__tests__/phase4aCalcServiceRequired.test.js` | 新增 |

未改：`ProductScope.js`、`userRecordsStore.js`、`localcharts.js`、`localcases.js`、`localRecordStore.js`、`unifiedBackup.js`、`shadowMirror.js`、历算与 vendor。

## 行为

纯浏览器，Java `:9999` / Python `:8899` 未响应：

1. 启动覆盖在一次连接被拒后撤下，主界面可进。本地命盘（IndexedDB）不依赖这两座服务。
2. 顶栏琥珀横幅：「需要计算服务：本机 Java（:9999）与 Python（:8899）未响应。星盘等历算暂不可用，本次没有生成结果。本地命盘仍可使用。服务启动后点「立即重试」。」
3. 星盘请求失败走原有 `showChartServiceError`，标题「需要计算服务」。点「立即重试」且探测仍失败时，警告为「计算服务仍不可达，没有生成盘面…」，不出现「后端已在线」。
4. 服务恢复后，横幅「立即重试」与既有 10s 身份探测仍可把状态置回在线。

桌面壳（`__TAURI__` 或 `horosaDesktop`）：启动覆盖继续等待，排盘弹窗仍保留解压/防火墙说明与重启后端。算法、请求体、Swiss Ephemeris 调用链未改。

## 测试

```
npx umi-test src/components/common/__tests__/phase4aCalcServiceRequired.test.js src/components/common/__tests__/startupGateDesktopElapsed.test.js --forceExit
```

- 2 suites，7 tests，全部通过（约 6s）
- 纯浏览器 `TypeError`：覆盖层撤下，`isServiceOnline() === false`，横幅含「需要计算服务」，不含「重启应用」
- 桌面壳 `TypeError`：仍显示「正在连接本地服务」，启动门不把连接被拒记成离线放行
- `startupGateDesktopElapsed`：无桌面桥不渲染「已用时」

未跑全量套件。本阶段不改历算与性能阈值，全量沿用 PHASE 2-F 封板，不在 4-A 重跑。

## build:file

工作目录：`astrostudyui`。`npm run build:file` **exit 0**（约 85s）。

- `[scrub-build-paths]` 残留 0
- `[inject-preload]` 21 条
- `check-chunk-dup` 绿：22 个大 async chunk，最大请求组 33/56，首屏批次无重引擎
- `[build-info]` 提示工作树有未提交改动，产物不能对应单一 commit。这是 2-E/2-F/4-A 尚未提交，不是编译失败

## 失败分类

| 类 | 结果 |
|---|---|
| 4-A 针对性测试 | 通过。无新增失败 |
| `build:file` | exit 0 |
| `yizhangjingReportTable` | 未跑、未改。PHASE 2-F 全量中的既有失败，不归入 4-A |
| `baziStress`（主线程均值 &lt; 500ms） | 未跑、未改阈值。既有性能失败，不归入 4-A |
| `techniquePerfBudget` | 未跑、未改。2-F 该轮未失败 |

## 停止

**PHASE 4-A COMPLETE**

未开始 PHASE 4-B。未提交、未推送。
