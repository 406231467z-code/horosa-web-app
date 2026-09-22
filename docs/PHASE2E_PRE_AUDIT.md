# PHASE 2-E · 前置审计 / 设计锁定

**Date:** 2026-09-22  
**Baseline:** PHASE 1、2-A、2-B、2-C、2-D 已封板  
**本阶段性质:** 只读审计 + 新增本文档。**生产代码 changed = 0。**

---

## 0. 本阶段没有修改生产代码

| 项 | 结果 |
|---|---|
| 产品/源码改动 | **0** |
| 删除文件 | **0** |
| 仅新增 | `docs/PHASE2E_PRE_AUDIT.md`（本文） |
| KEEP 算法 / Java / Python / Vite / WASM / Worker / 其他 IDB | **未触碰** |

---

## 1. 当前真实架构

```text
UI (ChartList / Case UI / models/user)
  → localcharts.js | localcases.js   （域层壳；公开 API 签名未变）
  → localRecordStore.createLocalRecordStore
  → userRecordsStore                   （horosa.user-records.v1）
  → IndexedDB stores:
       charts | cases | charts_trash | cases_trash | meta
```

**权威主存（`primaryReady === true`）：** `horosa.user-records.v1`  
**同步读：** memory snapshot（`getUserRecordsSnapshot`）  
**异步写：** `scheduleUserRecordsReplace` → flush（`writeSeq` last-wins；live+trash 同 kind 可合并为一事务）  
**四键 LS：** 不删除；`primaryReady` 后生产 CRUD **禁止 `setItem`**；仅作迁移遗留快照  
**`horosa.deleted.log.v1`：** 仍写 LS  
**`horosa.lc.idb`：** device-local 迁移/就绪旗标（`storageKeyRegistry`：`device-local`，不进备份）

### Readiness 六态

| status | primaryReady | 行为摘要 |
|---|---|---|
| `uninitialized` | false | 未开库 |
| `opening` | false | 打开/迁移中 |
| `ready` | **true** | 主读写；四键禁 setItem |
| `unavailable` | false | LS/内存 fallback |
| `schema-incompatible` | false | meta.version > 1；不动 LS |
| `migration-pending` | false | 迁移未完成/部分失败 |

### Schema v1 envelope（仅 IDB 行，不进 record/backup）

```text
{ cid, kind, slot, record, updatedAt, createdAt, writeSeq }
```

`recordsFromEnvelopes` / snapshot / `exportBackup` 只暴露 `record` 原样数组元素。

---

## 2. 完整调用图

### 命盘

```text
ChartList / models/user
 → listLocalCharts | upsertLocalChart | removeLocalChart | restore… | exportLocalChartsBackup
 → localcharts.js (createLocalRecordStore: storageKey=horosa.localCharts.v1, trash=….trash.v1)
 → localRecordStore.readRaw / writeRaw / writeTrashRaw / list / upsert / remove / restore
 → userRecordsStore (snapshot + scheduleReplace / migrate)
 → IndexedDB horosa.user-records.v1
```

### 事盘

```text
Case UI / 三式·AI 挂载
 → listLocalCases | upsertLocalCase | …
 → localcases.js (同内核；envelopeFormat=horosa-local-cases)
 → localRecordStore → userRecordsStore → IndexedDB
```

### 公开 API 签名

`localcharts.js` / `localcases.js` 仍为薄壳转发；**签名与 PHASE 2-D 前一致**（parity 金标仍适用）。内核不对组件直接暴露。

---

## 3. userRecordsStore 函数表

路径：`astrostudyui/src/utils/userRecordsStore.js`

### DB 生命周期 / 核心机制（摘要）

| 主题 | 实现要点 |
|---|---|
| open | `indexedDB.open(horosa.user-records.v1, 1)`；`onblocked`/`onerror` → unavailable；`versionchange` 关库清 `dbPromise` |
| schema | 仅 v1；`meta.version > 1` → `schema-incompatible` |
| migration | `reconcileSlot` 四槽；成功后 `putMeta({migrated:true})` + `horosa.lc.idb=1` |
| reconcile | LS↔IDB pickWinner；**已 migrated 再 hydrate 不再对账覆盖 IDB** |
| hydrate | `loadSnapshotsFromIdb` → memory；失败 → unavailable，保留 LS |
| snapshot | `snapshots[kind][slot]`；`adoptUserRecordsSnapshot` 写后即时更新 |
| primary write | pending + `writeSeq`；`coalesceFlushJobs` 合并 live+trash |
| stale | `seq < appliedSeq` / `seq < pending.seq` 丢弃 |
| fallback | `forcedUnavailable` / 无 IDB / 打开失败：永不 throw |
| 四键 ratchet | 测试 hook 包装 `localStorage.setItem` 计数 |

### Public / Internal

| function | caller | sync/async | R/W | failure |
|---|---|---|---|---|
| `kickUserRecordsMigration` | localRecordStore read/write | sync kick | — | no-op in test |
| `hydrateUserRecordsPrimary` / `migrateAndReconcileUserRecords` | kick / tests | async | R/W IDB+LS(migrate) | closed fail；不删 LS |
| `scheduleUserRecordsReplace` | localRecordStore | sync enqueue | W IDB | replica off → no-op |
| `flushUserRecordsWrites` | migrate / tests | async | W | false；不降 primary |
| `isUserRecordsPrimaryReady` / `getUserRecordsReadiness` | localRecordStore / UI | sync | R | — |
| `getUserRecordsSnapshot` / `adoptUserRecordsSnapshot` | localRecordStore | sync | R/W mem | null if !ready |
| `subscribeUserRecordsPrimary` | localRecordStore | sync | — | listener error swallowed |
| `formatUserRecordsReadinessLabel` | StorageHealthModal | sync | R | — |
| `listUserRecordEnvelopes` / `getUserRecordsMeta` | tests / diag | async | R | [] / null |
| `openDb` / `replaceStore` / `replaceLiveAndTrash` / `reconcileSlot` / `runFlush` | internal | async | R/W | soft fail |
| `__*ForTests` | tests only | mixed | — | test harness |

---

## 4. localRecordStore：primaryReady vs fallback

路径：`astrostudyui/src/utils/localRecordStore.js`

| API | primaryReady | fallback (!ready) |
|---|---|---|
| `readRaw` | snapshot 克隆；不触 LS | `getItem(storageKey)` + 缓存 |
| `writeRaw` | adopt snapshot + `scheduleLiveReplica`；**无 setItem 四键** | `setItem` + shadow + schedule |
| `readTrashRaw` | trash snapshot | `getItem(trashKey)` |
| `writeTrashRaw` | adopt trash + schedule；**无 setItem** | `setItem(trashKey)` |
| `list` | 基于 readRaw | 同左 |
| `upsert` / `remove` / `restore` | 经 writeRaw/writeTrashRaw | 同；quota 抛错语义不变 |
| permanent delete | `appendDeletedLog` → **仍写** `horosa.deleted.log.v1` | 同 |

**确认：** `primaryReady` 后四键生产路径 **无** `storage.setItem(四键)`。  
（迁移期 `userRecordsStore.writeLsArray`、影子启动对账、统一备份 trash 段另计，见 §9。）

---

## 5. 四键所有 production 读写点

键：`horosa.localCharts.v1` / `.trash.v1` / `horosa.localCases.v1` / `.trash.v1`

| 命中 | 分类 | 说明 |
|---|---|---|
| `localcharts.js` / `localcases.js` 常量 + config | production config | 经内核读写 |
| `localRecordStore` getItem/setItem | production R/W | **仅 !primaryReady** 写 |
| `userRecordsStore` LS_KEYS + `readLsArray`/`writeLsArray` | production R/W | 迁移/对账；已 migrated 再 hydrate **不写** |
| `shadowMirror` 白名单 + `reconcileShadowOnBoot` | production W（启动） | LS 空时影子写回四键 |
| `unifiedBackup` `TRASH_KEYS` get/set | production R/W | **直达 LS，绕过内核**（问题） |
| `storageKeyRegistry` | registry | `user-data` + `backup:'dedicated'` |
| `userRecordsStore.test.js` 等大量测试 | test | 含 ratchet / 直改 LS |
| `docs/PHASE2*` / `WEB_*` | documentation | — |

**裸 `localStorage.setItem` 绕过内核的生产写：**

1. ~~CRUD 四键~~ — primaryReady 后 **无**（2-D 已封）  
2. **`unifiedBackup.mergeTrashRaw` → `safeLocalStorageSet(trashKey)`** — 有  
3. **`shadowMirror.reconcileShadowOnBoot`** — 有（启动、主存空才写）  
4. 迁移 `writeLsArray` — 有（仅 migrate/reconcile 路径）

**未发现** ChartList/Case UI 直接 `setItem` 四键。

---

## 6. IDB 所有 production 读写点

| DB | 模块 | 与 user-records 关系 |
|---|---|---|
| `horosa.user-records.v1` | `userRecordsStore.js` **仅此库** | 命盘/事盘主存 |
| `horosa.record.revisions.v1` | `recordRevisions.js` | 独立；upsert 前推历史 |
| `horosa-cache-v1` | `idbCacheStore.js` | 可再生缓存 |
| `horosa.ai.analysis.v1` | `aiAnalysisStore.js` | AI 工作区 |

**确认：** 新库未接管其他业务 storage；其他三套 IDB **未被改写**。  
`storageKeyRegistry`：`horosa.user-records.v1` = `user-data` / `dedicated`（备份仍走两库信封，不 dump IDB）。  
`horosa.lc.idb` = `device-local`（正确）。  
标签文案仍写「双写副本」—— **文案滞后于 2-D 主写**（低优先级）。

---

## 7. Backup / Import 分析

### 单库信封（正确）

```text
exportLocalChartsBackup → exportBackup → readRaw()
→ { format:'horosa-local-charts', version:1, exportedAt, total, charts:[...] }
```

事盘：`horosa-local-cases` + `cases:[...]`。

- `readRaw` 在 primaryReady 下取 **裸 record** snapshot → **无** `createdAt/updatedAt/writeSeq/kind/slot` 泄漏。  
- import → `upsert({...item, preserveUpdateTime:true})` → 走内核主写。

### 统一备份（缺口）

| 段 | 路径 | primaryReady 下 |
|---|---|---|
| charts/cases | `exportLocalChartsBackup` / Cases | **正确**（IDB 真值） |
| trash | `safeLocalStorageGet(TRASH_KEYS)` | **可能读到陈旧 LS 快照** |
| trash restore | `mergeTrashRaw` → `safeLocalStorageSet` | **写 LS，不进 IDB/snapshot** |

---

## 8. Failure matrix

| 场景 | primaryReady | list | upsert | remove | restore | LS 四键 |
|---|---|---|---|---|---|---|
| fresh（未迁） | false→migrate | LS | LS+双写队列 | LS | LS | 读写 |
| IDB unavailable | false | LS/mem | LS/mem | LS/mem | LS/mem | 仍可读；不删 |
| blocked / open fail | false | LS | LS | LS | LS | 不动删 |
| schema > 1 | false | LS | LS | LS | LS | 不动删 |
| migration pending | false | LS | LS+队列 | LS | LS | 可写 |
| migration failure | false | LS | LS | LS | LS | 保留 |
| hydrate failure | false | LS | LS | LS | LS | 保留 |
| write quota（!ready） | false | — | throw saveError | 不抛 | upsert 可抛 | 可失败 |
| write fail（ready） | **仍 true** | memory | memory+异步失败 | memory | memory | **不 setItem** |
| transaction failure | 仍 true | memory | 最终可能落后 IDB | 同 | 同 | 不回写 |

---

## 9. Race / consistency 分析

| 场景 | 机制 | 结论 |
|---|---|---|
| 连续 upsert | writeSeq ↑；pending 覆盖 | 最终 last-wins |
| upsert→remove | live+trash 同 tick 可合并一事务 | 2-D 已测 |
| remove→restore | upsert 再写 trash 过滤 | 一致 |
| remove→purge | trash 删；deleted.log LS | 不复活 live |
| live/trash 同 cid | 独立 store | OK |
| charts/cases 同 cid | 独立 store | 已测 |
| migration ∥ user write | flush 后再 reconcile；mutateGen 护 hydrate | 可接受 |
| hydrate ∥ write | mutateGen + mergeLoadedSnapshots | 保留用户侧 snapshot |
| stale queued write | seq < applied 丢弃 | 已测 |

**不足：** 多标签页真实 IDB 竞争未测；统一备份 trash 与 IDB 权威不一致（见问题）。

---

## 10. 测试覆盖矩阵

主文件：`src/utils/__tests__/userRecordsStore.test.js`

| 类别 | 覆盖 |
|---|---|
| correctness | CRUD、隔离、trash、import |
| migration | 幂等、partial winner、旗标 |
| fallback | unavailable、hydrate fail、write fail 不降级 |
| race | stale writeSeq |
| schema | version>1 |
| quota | **主要在 !primary 的 localRecordStoreQuota**；primary 后 quota 弱 |
| transaction | live+trash / purge |
| performance | list 不打 IDB；1000 条 |
| regression | backup 信封、deleted.log、ratchet 四键 0 |

相关：`StorageHealthModal.test.js`、`localRecordStore*`、`unifiedBackup.test.js`、`shadowMirror.test.js`、`localBackupImportGates.test.js`。

**缺口：**

- unified backup trash **在 primaryReady 下**  
- 真实浏览器 IndexedDB（现用 memory backend）  
- primary 后 quota / shadow boot 与 IDB 交互  
- 多 tab

**本审计未修改任何 flaky/preexisting 测试。**

---

## 11. 发现的问题

| # | 严重度 | 问题 |
|---|---|---|
| F1 | **高** | `unifiedBackup` trash 导出读 LS、恢复写 LS，primaryReady 后与 IDB 权威脱节 |
| F2 | 中 | `shadowMirror.reconcileShadowOnBoot` 可在 primaryReady 后把影子写回 **陈旧 LS**（不写 IDB；若之后某路径误信 LS 则危险） |
| F3 | 低 | `storageKeyRegistry` 对 `horosa.user-records.v1` 标签仍写「双写副本」 |
| F4 | 低 | 无真实 IDB / 多 tab 集成测 |
| F5 | 信息 | 迁移期 `writeLsArray` 仍写四键——**符合 2-D 设计**，非回归 |

---

## 12. 建议的 PHASE 2-E 实际实现范围（勿自行开 2-F）

1. **统一备份 trash 段改走内核 API**  
   - 导出：`listLocalChartsTrash` / `listLocalCasesTrash`（或等价 readTrash）  
   - 恢复：经 `writeTrashRaw` / 公开 trash API，进入 snapshot + IDB  
2. **影子启动对账与 primaryReady 对齐策略**（写 LS 后 kick hydrate，或 primary 后禁止写四键改推 IDB）  
3. **registry 文案** 更新为「主存」  
4. **补测：** primaryReady 下 unified trash round-trip；ratchet 覆盖 backup restore  
5. **明确不做：** 删四键 LS、迁 deleted.log、改 KEEP、改其他 IDB、Umi→Vite

---

## 13. 验收命令结果

| 命令 | 结果 |
|---|---|
| `npm run build:file` | **PASS**（exit 0；check-chunk-dup OK；build-info 提示工作树有未提交 docs，非编译失败） |
| `umi-test userRecordsStore.test.js + StorageHealthModal.test.js --forceExit` | **28/28 PASS** |

未跑全量 suite；本轮未触发 `yizhangjingReportTable` / `baziStress` / `techniquePerfBudget`。
