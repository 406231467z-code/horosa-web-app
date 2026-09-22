# PHASE 3 · 前置审计 / 纯 Web 化路线锁定

**Date:** 2026-09-22  
**Baseline:** PHASE 1、2-A–2-F 已封板  
**性质:** 只读。**生产代码 changed = 0。** 未开始 PHASE 4。

产品面以 `astrostudyui/src/constants/ProductScope.js` 为准。几何占（geomancy）在 `cnyibu`，属易学 KEEP，不是已删风水。

---

## A. 当前纯 Web 化程度

| 层 | 现状 |
|---|---|
| **UI** | Umi 3 + React 17 已是浏览器 SPA。KEEP 导航只剩命/卜/AI/命盘。3D/风水/黄历页/择日工作台/塔罗/玄史/阅读/直播/登录/后台已从产品面拿掉。 |
| **计算** | 分裂：八字主路径、多数奇门、六爻卦体、河洛/一掌经/灵棋等已在浏览器 JS；西洋星盘/主限/印占/合盘仍走本机 Java→Python（Swiss Ephemeris）；三式与部分数算/易学走 kentang Python `:8899`；六壬/紫微起盘/卦辞仍有 Java。 |
| **存储** | 命盘/事盘权威主存 = `horosa.user-records.v1`。`primaryReady` 后四键 LS 不参与业务读写（2-F）。无云账号。 |
| **AI** | UI 在浏览器；请求经 Java `:9999/aianalysis/*` 代理到外部 LLM。模型不在浏览器内。`node-forge` / `js-rsa` 仍用于请求体加密，是浏览器库，不是 Node `crypto`。 |
| **Java** | 仍是默认 `ServerRoot`（约 `127.0.0.1:9999`）：星盘代理、六壬、紫微、卦辞、AI 代理、登录残骸。 |
| **Python** | `:8899` `webchartsrv.py`：PerChart + `/predict` `/india` `/modern` + kentang 挂载。纯浏览器打不开。 |
| **Electron** | 前端无 `require('electron')`。桌面桥（`horosaDesktop` / Tauri）在浏览器里降级。安装器/exe 在文档与 `windows-adaptations` 描述中，本阶段不删。 |

距离「纯浏览器」的缺口：**西洋历算（SE）+ kentang 闭源 Python + 少量 Java 术数 + AI 必须有远程端点**。存储与 UI 壳已经可以在浏览器里跑，但没有本地 Java/Python 时星盘与多数三式不能出盘。

---

## B. KEEP Backend Dependency Matrix

图例：JS = 浏览器主计算；Java / Python = 运行时仍调用；浏览器可直接运行 = 不启 Java/Python 也能完成主路径。

| KEEP | UI | JS 计算 | Java | Python | vendor | 浏览器可直接跑主路径 | 需迁移 |
|---|---|---|---|---|---|---|---|
| astrochart | 占星 | 绘图 D3；历算不在 JS | `/chart` → ChartController → AstroHelper | `:8899` PerChart / SE | flatlib | 否 | 是（E，长期 WASM） |
| direction | 星运 | pdMath 部分在 `utils/pdMath` | `/predict/pd` `/pdchart` `/pdpoles` | webpredictsrv | — | 否 | 是 |
| indiachart | 印占 | 展示 | `/india/chart` | webindiasrv | — | 否 | 是 |
| auxchart | 辅盘 | 部分本地规则 | `/chart` `/chart12` `/chart13` `/germany/*` | 同左 | — | 否 | 是 |
| relativechart | 合盘 | 展示 | `/modern/relative` `/astroextra/relative` | 同左 | — | 否 | 是 |
| jieqichart | 分至 | `preciseCalcBridge` 有本地节气种子 | `/chart` `/jieqi/year` | jieqi + PerChart | — | 部分 | 星盘仍要后端 |
| bazi | 八字 | `baziLunarLocal` + lunar-javascript **主路径** | `/bazi/birth` `/bazi/direct` 仅 BC/域外回退 | JDN 间接 | — | **是（常见日期）** | 回退可后迁 |
| ziwei | 紫微 | 大量本地排盘/亮度；起盘仍打后端 | `/ziwei/birth` `/ziwei/rules` | 无 | — | 否（起盘） | Java→JS |
| guolao | 七政 | 盘面 D3 | `/chart` `/qizheng/moira` | kin 模式 `/qizhengkin/pan` | kinastro | 否 | 是 |
| shusuan | 数算 | 河洛/参评/正传/一掌经本地 | 无对应 Controller | 邵子/铁板/分定/北极/南极/蠢子 `/pan` | kinastro | 部分 | 六家 pan |
| mingother | 其他命理 | 一掌经本地 | 无 | `/cetian/pan` `/xianqin/pan` | kinastro-xianqin | 部分 | 演禽/策天 |
| sanshiunited | 三式 | 组合壳 | 六壬盘/紫微片段 | kinqimen + kintaiyi + kinjinkou | 三个 vendor | 否 | 是 |
| liureng | 六壬 | 盘面 | `/liureng/gods` `/runyear` | 无 | — | 否 | Java→JS |
| dunjia | 遁甲 | `calcDunJia` 主路径本地 | 无 Controller | `/qimen/pan` 时家等 | kinqimen | **部分** | 时家转盘 |
| taiyi | 太乙 | 四柱可本地 | 无 | `/taiyi/pan` | kintaiyi | 否 | 是 |
| guazhan | 六爻 | `analyzeLiuyao` 主路径 | `/gua/desc` 卦辞 | 无 | — | **是（断卦）** | 卦辞可静态化 |
| cnyibu | 其他易学 | 宿占/统摄/轨策/小六壬/小成图/飞宫/灵棋本地 | 无 | 金口/五兆/太玄/荆诀/神易/皇极/地占 | kinjinkou 等 | 部分 | 上列 vendor |
| aianalysis | AI | 快照/导出在浏览器 | `/aianalysis/chat` stream embeddings | 挂载会再打各术后端 | — | UI 可开；对话否 | AI 保持远程 |
| local charts | 命盘 | IDB `user-records` | 无 | 无 | — | **是** | 否 |
| local cases | 内核仍在（三式/AI 快照） | 同 IDB；案例列表 UI 已删 | 无 | 无 | — | **是** | 否 |

调用链：

```text
KEEP UI → services/* 或组件内 request()
       → request.js（可选 RSA，ServerRoot≈:9999）
       → Java Controller
            ├─ AstroHelper → Python :8899（星盘族）
            ├─ 纯 Java（六壬 / 紫微 / 卦辞 / AI 代理）
            └─ 或前端 cachedKentangFetch 直连 :8899
```

---

## C. Java blockers（阻碍纯前端）

| API | 为何挡住 | 类 |
|---|---|---|
| `/chart` 及 `/predict/*` `/india/*` `/modern/*` `/germany/*` `/astroextra/*` | Java 只是代理，真算在 Python SE | E（长期 D） |
| `/ziwei/birth` | 起盘仍在 `ZiWeiController` | C |
| `/liureng/gods` `/liureng/runyear` | 纯 Java `LiuReng` | C |
| `/gua/desc` |  classpath 卦辞表 | C→可 A（静态 JSON） |
| `/bazi/birth` `/bazi/direct` | 仅域外/BC 回退 | A 已覆盖主路径 |
| `/aianalysis/*` | 代理密钥与 LLM，不是历算 | E（远程，但是 AI 云，不是本机 JVM 历算） |
| `/qizheng/moira` | 七政规则 + SE 配置 | E |

登录 `/user/login` 等：**F**，KEEP UI 已无入口，`request.js` 仍识别 need.login。本阶段不删。

---

## D. Python blockers

| API | KEEP 调用 | 类 |
|---|---|---|
| PerChart `POST /`（经 `/chart`） | 占星/辅盘/合盘/分至/七政 horosa/宿占读盘 | KEEP REMOTE；长期 WASM |
| `/predict/*` | direction、AI 挂载 | KEEP REMOTE |
| `/india/*` | indiachart | KEEP REMOTE |
| `/qimen/pan` kinqimen | 遁甲、三式 | KEEP REMOTE（闭源 vendor） |
| `/taiyi/pan` kintaiyi | 太乙、三式 | KEEP REMOTE |
| `/jinkou/pan` | 金口、三式 | KEEP REMOTE |
| `/wuzhao` `/taixuan` `/jingjue` `/shenyishu` `/wangji` | cnyibu | KEEP REMOTE |
| kinastro 六家 + 演禽 + qizhengkin | 数算/其他/七政 kin 模式 | KEEP REMOTE |
| `/cetian/pan` `/geomancy/*` | mingother / 地占 | KEEP REMOTE |
| `/nongli/time` `/jieqi/year` | 多页节气 | 部分已有 JS；极端日期仍远程 |

`/xuanshi`：**DEAD**（页已删）。

---

## E. Vendor migration candidates

| 类 | 项 |
|---|---|
| **DIRECT JS** | 八字主路径、六爻断卦、河洛/参评/正传/一掌经、灵棋、小六壬、小成图、飞宫、统摄、轨策、宿占盘面（历算仍借星盘）、遁甲 `calcDunJia` 主路径、命盘 IDB |
| **JS PORT** | 卦辞表、节气/农历边界、紫微起盘、六壬神煞、八字 BC 回退 |
| **WORKER CANDIDATE** | 八字/紫微/主限大批量扫描（主线程已有 stress 红线，见性能） |
| **WASM CANDIDATE** | Swiss Ephemeris / flatlib PerChart、印占历算。本阶段不实现 |
| **KEEP REMOTE** | 全部 kentang vendor Python；AI LLM |
| **UNKNOWN** | `vendor/kin_year_domain.py`（无产品接线） |

`vendor/` 九引擎（kintaiyi、kinqimen、kinastro、kinjinkou、kinwuzhao、kinwangji、taixuanshifa、jingjue、shenyishu）**全部仍被 KEEP 页调用**。语言均为 Python。依赖进程与网络端口，不依赖浏览器内 JVM。不能因为旧工具名字删除。

---

## F. Browser compatibility blockers

生产 `src`（排除测试）**没有** `fs` / `child_process` / `require('electron')` / `__dirname`。

| 阻塞 | 说明 |
|---|---|
| 本机 `:9999` Java | `request.js` 默认 ServerRoot。无服务则星盘/六壬/紫微起盘/AI 失败 |
| 本机 `:8899` Python | kentang 与星历 |
| 可选桌面桥 | shadow、自动备份、钥匙串、诊断导出：浏览器 no-op，不挡首屏 |
| `request.js` 登录分支 | 无登录 UI 仍可能 toast「需要登录」（历史写接口） |
| 加密 | forge/js-rsa **浏览器可用**，不是 Node blocker。KEEP 的 AI 体加密仍调用，不能当死依赖删 |

---

## G. Mobile blockers（只审计）

壳是桌面 Ant Design + 侧栏 + 宽表/画布，不是移动优先。

| 页面 | 问题 | 严重度 | 建议（不做） |
|---|---|---|---|
| 全局导航 `pages/index.js` | 多 Tab、侧栏、抽屉宽度按桌面 | 高 | 断点折叠 |
| astro / ziwei / guolao / liureng | D3/canvas 盘面按固定视口 | 高 | 缩放与横滑 |
| bazi / 奇门 / 太乙表 | 宽表横向溢出 | 中 | 列优先级 |
| chartlist | 表格 + 行内操作偏鼠标 | 中 | 触控行菜单 |
| aianalysis | Monaco + 分栏 | 中 | 小屏单栏 |
| 地图 ACG `@amap` | 依赖外网脚本与手势 | 中 | 保留但降级 |

未改 UI。

---

## H. Dead backend（不删）

| 类 | 例 |
|---|---|
| Java | `/planetarium/state`、`/chart3d/state`、`/calendar/month`、`/user/login` `/register`、阅读器 stub |
| Python | `/xuanshi` |
| vendor | `vendor/test_month_pillar_boundary.py`；`kin_year_domain.py` 未接线 |
| npm 已不在 package.json | three、babylonjs、astronomy-engine、echarts、flv.js、video.js、react-quill、@mediapipe（PHASE 1 已不在 dependencies） |

---

## I. Dependency cleanup candidates（不删）

| 包 | 判断 |
|---|---|
| `fastclick` | src 无引用 |
| `qrcode.react` | src 无引用 |
| `mammoth` | 材料解析在 Java pdfbox/POI |
| `print-js` | `helper.printArea` 未见 KEEP 生产调用 |
| `d3` `lunar-javascript` `docx` `pdf-lib` `@monaco-editor/react` `@amap/amap-jsapi-loader` `node-forge` `js-rsa` | KEEP，不删 |
| `puppeteer-core` | devDependency，测试/脚本 |

---

## J. PHASE 4 建议（只计划）

| 步 | 目标 | 生产代码 | 风险 | 测试 / build |
|---|---|---|---|---|
| **4-A** | 浏览器无后端时的失败语义：星盘明确「需要计算服务」，不白屏；不改算法 | 是（状态/文案） | 低 | 现有 serviceStatus 测试；`build:file` |
| **4-B** | 卦辞与节气静态表迁 JS，Java/Python 仅极端日期 | 是 | 中（历法边界） | 金样；不改 baziStress 阈值去刷绿 |
| **4-C** | 紫微起盘、六壬神煞 Java→JS，与现盘对拍 | 是 | 高 | 技法金样 |
| **4-D** | Swiss Ephemeris WASM **试验**，不替换生产 `/chart` | 隔离分支 | 高 | 不进主构建直到对拍 |
| **4-E** | kentang 维持远程；许可允许再议移植。不在 4-E 删除 vendor | 否（文档/开关） | 许可 | — |
| **4-F** | AI：浏览器 → 现有供应商 API 的可选直连（密钥模型），Java 代理保留为一种模式 | 是 | 高（密钥） | AI 加密单测 |
| **4-G** | KEEP 页移动布局，不动算法 | 是（CSS） | 中 | 视口抽查 |
| **4-H** | 依赖候选删除（fastclick 等）单独 PR | 是（lockfile） | 低 | 全量 + build |
| **4-I** | Electron/安装器退场 | 后置 | 中 | 不与历算捆绑 |

**不在 PHASE 4 第一步做：** Umi→Vite、删四键 LS、删 KEEP vendor、为 flaky 性能改算法。

Umi：运行时是浏览器包；Node 只在 `scripts/` 与 webpack 构建。迁移 Vite 收益是构建链，不解除 Java/Python。不值得作为纯 Web 的第一步。

---

## 性能基线（不改算法）

PHASE 2-F 全量（本阶段未改生产代码，数字沿用）：

- 518 suites：516 pass / 2 fail
- 6946 tests：6935 pass / 2 fail / 9 skip
- 失败：`yizhangjingReportTable`、`baziStress`（preexisting / 性能）。`techniquePerfBudget` 该轮未失败。
- KEEP 相关性能测试：`baziStress`、紫微/技法 `techniquePerfBudget`、一掌经表 `yizhangjingReportTable`。主线程八字均值预算 500ms 已红。Worker 仅作候选，本阶段不实现。

`build:file`：本阶段未改 `astrostudyui` 源码。沿用同日 PHASE 2-F 构建 **exit 0**（check-chunk-dup 通过）。未再跑全量套件；测试状态即 2-F 封板数字。无 PHASE 3 regression（唯一新增文件为本审计文档）。

---

## 存储 / IDB（未改）

`horosa.user-records.v1` 为命盘/事盘主存。`primaryReady` 后四键不参与业务读写。backup/import 走 `localRecordStore`。`listLocalCharts` / `listLocalCases` 仍同步。无新的 sync→async 破坏。其他三套 IDB（AI、revisions、cache）未改。

---

## 停止

**PHASE 3 PRE-AUDIT COMPLETE**  
**未开始 PHASE 4。**
