# PHASE 2-A · localStorage 使用审计

**Date:** 2026-09-21  
**Scope:** 审计 only。本文件不授权改代码。不回滚 PHASE 1 删除，不改 KEEP 算法，不做 Umi→Vite，不删 Java/Python API。  
**Workspace UI root:** `local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui`  
**Baseline:** `docs/PHASE1_BASELINE.md`（build 成功；514/516 suites，6899/6910 tests）  
**Product lock:** `src/constants/ProductScope.js` 的 KEEP 范围与 `navigationPages` 不变。

Companion canvas: open beside chat as [Phase 2-A storage audit](file:///C:/Users/Jiliason/.cursor/projects/c-Users-Jiliason-horosa-web-app/canvases/phase2a-localstorage-audit.canvas.tsx).

---

## 1. 审计报告

### 1.1 现状一句话

仓库**已经**把可再生缓存和 AI 工作区放进 IndexedDB。PHASE 2 的 localStorage→IndexedDB 目标不是「从零引入 IDB」，而是把仍以**整库 JSON 数组**压在 origin ~5MB localStorage 上的用户资产（命盘/事盘及其回收站）迁走，并保持旧数据可启动迁移。

历史事故已经写进代码：`localCalcCache.js` 记载黄历/农历缓存累积 **3.6MB** 后顶死 origin 配额，全 App `setItem` 抛 `QuotaExceededError`。治理原则也已经写进 `idbCacheStore.js`：**localStorage 只放微型同步 KV；可再生派生缓存住 IndexedDB**。2-A 的工作是把这条原则应用到仍未迁走的用户资产。

### 1.2 已存在的三套 IndexedDB

| DB name | Version | Stores | 用途 | LRU / 逐出 | 备份 |
|---|---|---|---|---|---|
| `horosa-cache-v1` | 1 | `kv`（keyPath `key`，index `ts`） | 派生缓存：`horosa.localcalc.*`、L3 `net.*`、kentang `kt.*` | 总预算 **32MB**，按写时间 LRU | 不备份（cache） |
| `horosa.ai.analysis.v1` | 5 | 16 stores（对话/消息/材料/向量/模板/报告/workspace_meta 等） | AI 工作区用户数据 | 无 LRU；铁律：不随便新建 store、不轻易升版本 | `unifiedBackup` 的 `aiWorkspace` 专段 |
| `horosa.record.revisions.v1` | 1 | `revisions`（autoIncrement，index `cid`） | 命盘/事盘改错撤销栈，每 cid 10 版、5 分钟去抖 | 按 cid cap | **不备份**（本机撤销栈） |

另外：紫微自定义亮度/四化表主存仍是 localStorage，保存后 **fire-and-forget 镜像** 进 AI 库的 `workspace_meta`（`ziweiCustomTablesPersist.js`）。启动时仅当 LS 键**完全缺失**才写回。这是自愈，不是主存迁移。

`horosa.lc.idb` 已在注册表登记为「IndexedDB 可用性/迁移标志」，但源码里**没有读写实现**——这是预留槽，正好给 2-B 命盘/事盘迁移器用。跨机备份明确 `backup: false`，避免新机被骗跳过迁移。

### 1.3 localStorage 仍承担的角色

1. **用户资产整库**（要迁）：`horosa.localCharts.v1` / `horosa.localCases.v1` + 两只 trash。`localRecordStore.writeRaw` 每次保存都 `JSON.stringify(整个数组)` 同步 `setItem`。事盘 UI 已在 PHASE 1 拿掉，但 `localCases` 仍是三式/AI 挂载的事盘快照仓，**不能当死键删**。
2. **同步小配置**（不迁）：设置、技法偏好、主题、perf kill-switch、设备绑定标志。首屏、排盘请求体、紫微/七政构造期都同步读。
3. **可再生但仍在 LS 的缓存**（可进既有 cache DB，勿进用户库）：`horosa.ai.snapshot.*`（deferred 落盘，配额告急可清）、`horosa.boot.lastChart.v1`、`horosa.reader.chapter.*`、`horosa.guadesc.cache.*`。
4. **遗留 PHASE 1 键**（本阶段不删不迁）：塔罗/择日方案/玄史书签/commtools tab/阅读器书 等仍在注册表。2-A/2-B 不允许「顺便 grep-to-zero」。
5. **未登记键**（备份防呆会当用户资产带走）：`Token` / `LoginId`、`horosaLocalServerRoot(+Mode)`、`guaData` / `baziInverse` / `baziPattern`。2-B 不要借机清掉；只在报告里标风险。

### 1.4 sessionStorage

全站产品路径只有 **`horosaLaunchSid`**：壳 URL `&sid=` 写入，同 tab 页内导航丢 query 时仍能做 `/horosaIdentity` 握手。必须留在 sessionStorage，迁 IndexedDB 会跨 tab 串会话。

### 1.5 读写路径与主线程成本

| 路径 | 同步? | 主线程成本 | 备注 |
|---|---|---|---|
| `localRecordStore.readRaw` | 是 | 整库 `JSON.parse`；有 `lastRawText` 同串免解析 | ChartList、生日提醒、备份导出、健康页都假设同步 |
| `localRecordStore.writeRaw` | 是 | 整库 `JSON.stringify` + `setItem` | 改一条也重写全库；quota 失败不再粘死内存模式 |
| `deferredStorage` | 空闲写 | 注释记载快照 stringify **100–300ms** | 仅 `astro`/`module` AI 快照和 boot 现场；allowlist 允许裸 `setItem` |
| `idbCacheStore` / `localCalcCache` | 读走内存镜像，写异步 | 启动 `idbGetAllByPrefix` 预载 | LS 侧迁移器会删历史 `horosa.localcalc.*` |
| `requestDedupe` L3 / `kentangCache` L3 | 异步 | 命中免网络+RSA | 键前缀 `net.` / `kt.`，TTL 24h，rev 掺 `&rv=` |
| AI 分析库 | 异步 | 与排盘热路径分离 | UI 偏好 `horosa.ai.analysis.ui.v3` 仍 LS |

**2-B 必须带前后数据（本阶段无运行时采样，禁止编造 ms）：**

- `localStorage` 已用字节 / 键数（尤其四条记录库键）
- `listLocalCharts()` 冷读 parse 耗时
- `upsertLocalChart` 的 stringify+setItem 耗时
- IDB `getAll` 启动 hydrate 耗时
- 首屏到可点「命盘」的时间（StartupGate 之后）

代码已给出的定性锚点：快照同步 stringify 100–300ms 级；黄历缓存 3.6MB / 5MB 配额事故。

### 1.6 跨 Tab

- **没有** `BroadcastChannel`，**没有** `window` `storage` 事件监听。
- `localRecordStore` 的 parse 缓存在实例内。另一 tab 改库，本 tab 不会活更新，需刷新。这是现状，2-B 默认保持，不要顺手加同步总线。
- Origin 含端口。桌面壳端口阶梯（38991…38999）= 每实例独立 LS **和** IDB。`MultiInstanceNotice` 已说明「命盘不见了」是分域不是丢档。影子镜像只允许主端口写，避免第二实例覆盖主实例文件。
- IndexedDB 同样按 origin 分域，迁移后多实例问题**不会消失**。

### 1.7 版本升级与旧数据兼容

| 层 | 版本 | 迁移策略 |
|---|---|---|
| 命盘/事盘记录 | `schemaVersion` **2**（缺省当 v1） | `RECORD_MIGRATIONS = []`；读端宽容、纯读不回写；更高版本只发一次 `newerSchema` 事件 |
| AI 工作区 | IDB **v5** | 升版本会触发 onupgradeneeded；注释禁止为紫微镜像新建 store |
| 缓存库 | **v1** | 信封 `net-v1` / `kt-v1` + runtime `rv` |
| localcalc | 首启迁移器 | LS 历史键搬进 IDB 后删除，含 v1 尸键 |
| 全量备份 | unified **v2**，`minReaderVersion` 1 | 两库走 dedicated 信封；trash 并集；AI dump 专段；v1 包可导入 |
| 预留 | `horosa.lc.idb` | 应为「本机已完成 LS→IDB」标志，尚未接线 |

2-B 兼容铁律：启动必须仍能读出现有 `horosa.localCharts.v1` / `horosa.localCases.v1` JSON 数组；迁移幂等；失败时 LS 仍是真值；IDB 不可用（私有模式）走现有内存回退，不得把用户资产放进带 LRU 的 `horosa-cache-v1`。

### 1.8 清理策略

| 面 | 触发 | 清什么 | 不清什么 |
|---|---|---|---|
| `clearRecoverableCaches` | 一键清理 / quota 一档重试 | LS `horosa.localcalc.*`、`horosa.reader.chapter.*`、白名单 `guaData` 等 | 命盘/事盘/设置 |
| `purgeQuotaEmergency` | 写入撞配额 | 上一档 + `horosa.ai.snapshot.*` | 用户资产 |
| IDB cache LRU | 超 32MB | 最旧 `kv` 行 | 用户库（不在这个 DB） |
| 回收站 | 写入时修剪 | 30 天或 200 条 | 在册记录 |
| 删除日志 | 永久删除 | 500 条 FIFO | — |
| 版本历史 | 每次更新 | 每 cid 10 版 | 当前真值 |
| `navigator.storage.persist()` | `global.js` 启动 | 申请持久化，结果写入 `horosa.storage.persisted` | — |

缺口：一键清理**不会**清 IDB 里的 `net.*` / `kt.*` / localcalc。它们靠 32MB LRU。2-B 若把用户库放进 cache DB，会被 LRU 删档——这是硬性否决项。

### 1.9 异常恢复（已有，迁移必须接上）

1. localRecordStore：quota 如实返回 `{persisted, reason}`；storage-error 才进内存模式；quota 不粘死。
2. 影子文件：仅 LS 键缺失时写回四条记录库键。
3. 紫微自定义表：LS 缺失 ← IDB mirror。
4. JSON 损坏：`safeJsonParseFromStorage` 删键；记录库坏 JSON → `[]`。
5. IDB 全失败：三套库都 never throw，降内存。
6. 降级 app 读到更高 `schemaVersion`：横幅，不静默丢字段。

2-B 之后影子镜像的输入不能再假设「LS 上一定有整库 JSON」。要么 hydrate 后再 mirror 序列化结果，要么改为按 cid 镜像（壳白名单今日是整键文本）。

---

## 2. 文件清单

扫描口径：`src/**/*.js(x)` 中出现 `localStorage` / `sessionStorage` / `indexedDB` / `safeLocalStorage*` / `idbGet` / `idbScheduleWrite`。测试文件是 2-B 回归面，不在本阶段改。

### 2.1 基础设施（2-B 会动或必须接上）

| 文件 | 角色 |
|---|---|
| `src/utils/storageKeyRegistry.js` | 94 条登记（83 精确键 + 11 前缀），备份单一真值源 |
| `src/utils/safeStorage.js` | quota 守卫、可清面、未登记键闸 |
| `src/utils/deferredStorage.js` | 空闲 LS 落盘；legacy 裸 `setItem` allowlist |
| `src/utils/localRecordStore.js` | 命盘/事盘唯一写盘内核 |
| `src/utils/localcharts.js` / `localcases.js` | 域层；公开 API 同步 |
| `src/utils/idbCacheStore.js` | 缓存 IDB |
| `src/utils/localCalcCache.js` | **已迁** localcalc 的范本 |
| `src/utils/recordRevisions.js` | 改错 IDB |
| `src/utils/aiAnalysisStore.js` | AI IDB + `horosa.ai.analysis.ui.v3` LS |
| `src/utils/ziweiCustomTablesPersist.js` | 紫微表 LS 主存 + IDB 镜像 |
| `src/utils/shadowMirror.js` | 桌面四键文件镜像 |
| `src/utils/unifiedBackup.js` | LS raw + 两库信封 + AI dump |
| `src/utils/bootChartRestore.js` | 温启现场，deferred LS |
| `src/utils/moduleAiSnapshot.js` / `astroAiSnapshot.js` | AI 挂载快照 |
| `src/utils/requestDedupe.js` / `kentangCache.js` | L3 已在 cache IDB |
| `src/utils/customCalibreStores.js` | 界表/恒星黄道，同步设置 |
| `src/layouts/app.js` | 启动：影子对账、**同步** `listLocalCharts` 做生日提醒 |
| `src/global.js` | `persist()`、壳缩放 LS |
| `src/components/common/StorageHealthModal.js` | persist / 影子 / 库规模 |
| `src/components/common/MultiInstanceNotice.js` | 端口分域说明 |
| `src/components/user/ChartList.js` | 命盘 CRUD 主消费者 |
| `src/utils/storageSetItemLegacyAllowlist.json` | 目前仅 `deferredStorage.js` |

### 2.2 同步设置消费者（不迁；2-B 不要改算法读路径）

代表文件（非穷尽）：`ZiWeiInput.js`（约 75 处 LS）、`perfFlags.js`、`techniqueMountSettings.js`、`classicalChartGlobals.js`、`divinationJudgeGlobals.js`、`appearance.js`、`uiPrefs.js`、`mapConsent.js`、`windowSizePersistence.js`、`shellZoom.js`、`DunJiaMain.js`、`LiuRengMain.js`、`SuZhanInput.js`、`GuoLaoChartMain.js`、`egyptianSchools.js`、`models/app.js`（`Token`/`LoginId`）、`utils/request.js`、`utils/constants.js`（`horosaLaunchSid` + 本地 API 根）。

### 2.3 2-B 必跑的测试面（本阶段不改）

`storageQuotaGuard`、`storageRegistryCompleteness`、`localRecordStore*`、`localRecordTrash`、`localRecordSchema`、`localStorageManagement`、`unifiedBackup`、`shadowMirror`、`bootChartRestore`、`recordRevisions`、`requestDedupeL3`、`kentangCache`、`ziweiCustomPersist`。任何新失败必须标 `PREEXISTING` / `FLAKY` / `REGRESSION`。已知基线失败：`yizhangjingReportTable`（PREEXISTING / EXPECTED_TEST_ASSUMPTION）、`baziStress`（FLAKY/PERFORMANCE）。

---

## 3. 数据分类表

判定列：

- **迁 IDB**：用户资产、体积会涨、整库重写、非首屏同步必需。
- **留 LS**：小、必须同步、FOUC 或请求构造依赖。
- **已在 IDB**：不要二次搬家。
- **PHASE1 遗留**：登记保留，本阶段不删不迁。

### 3.1 用户设置（留 LS）

| 键 / 前缀 | 说明 | 备份 |
|---|---|---|
| `globalSetup`、`horosa.chart.classicalGlobals.v1`、`horosa.astro.customTerms.v1`、`horosa.astro.customAyanamsa.v1` | 排盘全局 / 界表 / 恒星黄道 | true |
| `horosa.chart.divinationJudgeGlobals.v1`、`horosa.egypt.school.v1`、各技法 `*.settings.v1` | 卜类/埃及/小成图等 | true |
| `prefix:ziwei` / `liureng` / `suzhan` / `horosaGuolao` / `horosa.pdsphere.` | 历史无点前缀设置族；紫微构造期同步读 | true |
| `horosa.ui.lightFlavor`、`horosa.sidebar.collapse.v1`、`horosa.ui.skipDeleteConfirm.v1` | 主题与轻 UI | true |
| `horosa.ai.analysis.ui.v3`、AI 导出/挂载/思考档 | AI 偏好；apiKey 密文且绑本机 | true |
| `horosa.reminders.enabled.v1` | 生日提醒开关 | true |

### 3.2 命盘数据（2-B 主迁）

| 键 | 形态 | 为何迁 | 同步约束 |
|---|---|---|---|
| `horosa.localCharts.v1` | 全库 JSON 数组 | 不可再生；随 memo/技法键膨胀；改一条重写全库 | 公开 API 今日同步；迁移后应用内存镜像 + StartupGate hydrate |
| `horosa.localCharts.trash.v1` | 同上，30d/200 | 与主库同命运 | 同左 |
| `horosa.localCases.v1` + trash | 同上 | 产品仍当三式/AI 事盘快照用 | 同左 |
| `horosa.deleted.log.v1` | 500 条含整记录 | 随永久删除变大 | 可随用户库走，或第二步 |
| `horosa.lc.lifeEvents.v1`、`HorosaLocalDeepLearn` | 人生事件 | 用户资产，可涨 | 非首屏热路径，可第二步 |
| `ziweiBrightnessCustom` / `ziweiSihuaCustom` | 小 JSON | **不迁主存**；已有 IDB 镜像自愈 | 紫微计算同步读，改主存=改 KEEP 结果风险 |

### 3.3 缓存（已在 IDB 或可进 cache DB）

| 键 / 前缀 | 现状 | 2-B |
|---|---|---|
| `horosa.localcalc.*` | 已迁 cache IDB，LS 仅残留会被迁移器删 | 不动 |
| `net.*` / `kt.*`（非 LS 键） | cache IDB L3 | 不动 |
| `horosa.ai.snapshot.*` | deferred **LS**，告急可清 | 可进 **cache** IDB，勿进用户库 |
| `horosa.boot.lastChart.v1` | deferred LS，7 天窗 | 可进 cache IDB 或保持小 LS |
| `horosa.reader.chapter.*`、`horosa.guadesc.cache.*` | LS cache；阅读器属 PHASE1 遗留 | 不顺手清理 |

### 3.4 UI 状态（留 LS / device-local）

`horosa.window.size.v1`、`horosa.shell.zoom`、`horosa.compat.*`、`horosaUpdateUiV2`、`horosa.astroTimeline.v1`、PD 列配置等。屏幕相关，备份多为 false。

### 3.5 AI 数据

| 数据 | 存储 | 2-B |
|---|---|---|
| 对话/材料/向量/模板/报告 | `horosa.ai.analysis.v1` | 已完成，不动库版本 |
| AI UI + provider 密文配置 | LS `horosa.ai.analysis.ui.v3` | 留 LS（小、同步） |
| 技法挂载快照 | LS `horosa.ai.snapshot.*` | 可选迁 cache IDB |
| 术语表 `horosa.report.glossary.global.v1` | LS user-data | 小，可留 |

### 3.6 临时 / 设备 / 会话

| 键 | 位置 | 判定 |
|---|---|---|
| `horosaLaunchSid` | sessionStorage | 不迁 |
| `horosa.perf.*`（40+ kill-switch） | LS device-local | 不迁；启动同步读 |
| `horosa.lc.idb` | 预留 LS | 2-B 接线，仍留 LS |
| `horosa.storage.persisted` | LS | persist 结果，不迁 |
| `horosa.localRecordStore.degraded` | 会话/设备 | 不迁 |
| `Token` / `LoginId` | LS **未登记** | 不迁；请求头同步；备份会当 unknown 带走（风险） |
| `horosaLocalServerRoot(+Mode)` | LS **未登记** | 设备绑定，应 device-local；不迁 |

### 3.7 PHASE 1 遗留（禁止顺便处理）

`horosa.tarot.*`、`horosa.zeri.*.schemes.v1`、`horosa.xuanshi.*`、`commtoolstab`、`readerBook`、`horosaGeomancyHistory`、`guaData`。可能仍有旧用户数据。2-B 迁移器若扫「全 LS 大键」必须 **allowlist 命盘/事盘**，不要把遗留键吞进新 DB 再删 LS。

---

## 4. IndexedDB schema 建议

**不要**把用户记录写入 `horosa-cache-v1`（LRU 会删档）。  
**不要**把命盘写入 `horosa.ai.analysis.v1`（升版本/新 store 会牵动整个 AI 模块）。  
**不要**把整库再存成一条 JSON blob（只是换盘符，stringify 成本还在）。

### 4.1 新建用户记录库

```
DB  horosa.user-records.v1
ver  1

stores
  charts        keyPath: cid
                indexes: updateTime, group, archived, starred
  cases         keyPath: cid
                indexes: updateTime, caseType, archived, starred
  charts_trash  keyPath: cid
                index: deletedAt
  cases_trash   keyPath: cid
                index: deletedAt
  meta          keyPath: id
                例: { id: 'migration', schemaVersion: 1, migratedAt, source: 'ls-array-v1',
                     chartsCount, casesCount, lsBytes }
```

记录 value = 今日数组元素的同一对象（含 `schemaVersion`）。**禁止**在 2-B 改 record 字段或 KEEP 技法键，以免 `recordFieldsRestore` 哨兵和排盘结果漂移。

`horosa.record.revisions.v1` 继续独立。cid 空间与新库相同，无需合并。

### 4.2 启动与兼容协议（旧数据）

沿用 `localCalcCache.migrateLegacyLocalStorage` 的形状，但**先双写、后停 LS**：

1. **Boot 0（同步，保现行为）**  
   若 LS 四键仍有 JSON：照旧 `JSON.parse` 填内存。ChartList / 生日提醒 / 备份第一拍与今天一致。

2. **Boot 1（异步，StartupGate 可等待）**  
   打开 `horosa.user-records.v1`。  
   - `meta.migration` 不存在：把内存数组逐 cid `put`，写 meta，置 `horosa.lc.idb=1`。失败则清 flag，LS 仍为真值。  
   - 已迁移且 IDB 可读：以 IDB 为准刷新内存；**暂不删 LS**（双真值窗口）。  
   - IDB 不可用：忽略 flag，继续 LS/内存（与今天私有模式一致）。

3. **写路径**  
   内存先更新（公开 API 仍同步返回）。persist = IDB `put/delete` 单条，**禁止**再 stringify 全库。双写窗口内额外把全库 JSON 写回 LS（可用 idle），以便旧壳/影子/未改备份代码仍工作。

4. **停 LS 写（后续子阶段，需单独指令）**  
   连续 soak + 备份/影子改完后，再删 LS 四键。未接到指令前 2-B 只做到双写+迁移器。

5. **读冲突**  
   LS 与 IDB 都在：以 IDB 为准（迁移完成后 IDB 更新）；若 IDB 空而 LS 有：重新迁移。影子对账仍「仅当主存缺失」——在停 LS 前主存仍是 LS。

### 4.3 缓存库（可选，与用户库解耦）

`horosa-cache-v1.kv` 可加前缀：

- `snap.astro` / `snap.module.<name>` ← 今日 `horosa.ai.snapshot.*`
- `boot.lastChart` ← `horosa.boot.lastChart.v1`

走现有 LRU + idle 写。丢失只是多算/少一次温启。不要和新用户库混事务。

### 4.4 备份 / 影子如何跟

- `exportLocalChartsBackup` 改为 `readRaw()`（内存）导出信封，不再直接 `getItem` 大字符串。双写期结果应与今日字节级接近（同 schema、同排序约定 `updateTime` desc）。
- `unifiedBackup` dedicated 段继续用信封，不要把 IDB 原始 store dump 混进 raw LS 段。
- `SHADOW_MIRROR_KEYS` 在停 LS 前可继续镜像 LS 文本；停 LS 后必须改为「序列化后的信封字符串」或改壳白名单。2-B 第一刀不要改 Electron/Tauri 壳，除非任务明确要求。

---

## 5. 迁移风险

| ID | 风险 | 等级 | 为何 | 缓解 |
|---|---|---|---|---|
| R1 | 公开 API 从同步变异步 | 高 | ChartList、`layouts/app.js` 生日提醒、备份、健康页都同步 `list*` | 内存镜像 + 启动仍先读 LS；hydrate 放 StartupGate |
| R2 | 双写窗口 LS/IDB 分叉 | 高 | 崩溃发生在只写一侧 | 内存为会话真值；重启以「IDB 有 meta 则 IDB，否则 LS」；迁移幂等 |
| R3 | 用户数据进 LRU 缓存库 | 高 | 32MB 逐出会删命盘 | 独立 `horosa.user-records.v1`，禁止 cache DB |
| R4 | 影子镜像断供 | 中 | 今日镜像的是 LS 整键 | 双写期保留 LS 文本；停 LS 单独立项改壳 |
| R5 | 备份漏 IDB | 中 | `collectBackupKeys` 只扫 LS | 两库导出继续走 `exportLocal*Backup`（内存/IDB），测试钉信封 |
| R6 | Jest/jsdom 无完整 IDB | 中 | 大量测试直接 `localStorage.setItem` 金标 | 保持内存回退；parity 测试继续走 LS 注入；另加迁移器单测 |
| R7 | `horosa.lc.idb` 被误备份 | 中 | 新机跳过迁移 → 空库 | 已 `device-local`/`backup:false`；导入侧必须拒绝该键（已有 cache/device 过滤） |
| R8 | 未登记 `Token` 进备份包 | 中 | unknownKeys 防呆带走 | 2-B 不顺手改备份策略；仅记录。若修须单独任务 |
| R9 | 整库 blob 原样搬进 IDB | 中 | 无配额收益、无主线程收益 | schema 强制 per-cid |
| R10 | 改 record 形状 / 紫微表主存 | 高 | KEEP 算法输入变化 | 2-B 禁止动 `buildLocalChartRecord` 字段集和 ziwei 自定义表主读路径 |
| R11 | 多实例端口分域 | 低 | 迁 IDB 后仍分域 | 保持 MultiInstanceNotice；不做跨端口合并 |
| R12 | 范围膨胀 | 高 | 遗留键、Worker/WASM、设置搬家、Umi | 2-B 只动记录内核+迁移器+测试；设置与遗留键不动 |
| R13 | 私有模式丢档 | 中 | 停 LS 后无 IDB 即无持久化 | 停 LS 前必须检测 IDB；不可用则永不删 LS |
| R14 | 与 PHASE1 基线失败混淆 | 低 | 全量测试本就 2 fail | 新失败必须分类；yizhangjing / baziStress 仍算 PREEXISTING/FLAKY |

---

## 6. 推荐实施顺序

接到「开始 2-B」之前**停止**。下面是建议，不是授权施工。

| 步 | 内容 | 完成定义 | build/test |
|---|---|---|---|
| **2-B1** | `localRecordStore` 加 IDB adapter：per-cid put/delete、启动迁移器、`horosa.lc.idb` 接线。公开 `list/upsert/remove/...` 仍同步（内存）。LS **继续双写**。不删 LS 键。 | 空库↔有库、LS 旧数组首启出现在 IDB；IDB 关掉时行为=今天 | `umi-test` 记录库相关 + `storageQuotaGuard` + `storageRegistryCompleteness`；然后 `build:file` |
| **2-B2** | 迁移/双写单测；损坏 JSON、半迁移、flag 有但 IDB 空、私有模式 | 无 REGRESSION；基线 2 fail 仍分类为旧 | 同上 |
| **2-B3** | `export/importLocal*Backup` 与 `unifiedBackup` 走内存/IDB，信封 format/version 不变 | 旧 v2 zip 可导入；导出再导入 cid 并集语义不变 | `unifiedBackup` + `localBackupImportGates` |
| **2-B4** | 影子：双写期仍 mirror LS 文本；健康页条数读内存 | 桌面主实例不丢影子 | `shadowMirror` 测试 |
| **2-B5** | 量测（强制）：LS 字节、list 冷读、upsert 写盘、hydrate、首屏。有前后表才允许谈「停 LS」 | 数字写入 2-B 报告 | 不改算法 |
| **2-C**（另指令） | AI snapshot / boot 现场 → `horosa-cache-v1` | 配额告急面改为清 IDB 前缀 | quota 哨兵更新 |
| **不做** | 设置迁 IDB；紫微表改主存；删 Token/遗留键；BroadcastChannel；Worker/WASM；把用户数据放进 LRU 库；Umi→Vite | — | — |
| **停 LS 四键** | 仅当 2-B5 数据证明 IDB 稳定、备份/影子已不依赖 LS 文本、私有模式仍有 LS 回退或明确降级 UI | 单独指令 | 全量测试 |

2-C 以及 Worker/WASM、状态边界，属于 PHASE 2 后续子阶段，**不是 2-A/2-B 范围**。

---

## 7. 2-A 结论（给下一指令）

1. IndexedDB 不是绿场。缓存与 AI 已迁完。  
2. 唯一值得在 2-B 动的是 **命盘/事盘四键 + 内核双写/迁移**，库名 `horosa.user-records.v1`，按 cid 存。  
3. 设置、perf、session sid、紫微自定义表主存、已存在的三套 IDB、PHASE 1 遗留键，全部不动。  
4. 兼容 = 先读 LS 填内存，再异步迁/对账，失败不删 LS。  
5. 本阶段**没有改任何产品代码**。等待 Phase 2-B 指令。
