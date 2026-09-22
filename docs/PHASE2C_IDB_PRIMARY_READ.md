# PHASE 2-C · 命盘/事盘 IndexedDB 主读切换

**Date:** 2026-09-21  
**Baseline:** PHASE 2-B 封板（`docs/PHASE2B_USER_RECORDS.md`）  
**Scope lock:** 只动 user-records 存储域、启动 hydration、相关测试与本文件。不删 LS 四键，不停 LS mirror，不改公开同步 API，不扩大到全站 IndexedDB。

---

## 主读策略

启动仍先同步读 LS，立刻建立 memory / `lastParsedList`，React 首屏不 await IndexedDB。

后台 idle（测试环境不自动跑）打开 `horosa.user-records.v1`，完成 2-B 对账后，仅当同时满足：

```text
DB open 成功
AND schema version == 1
AND migrate/reconcile 成功
AND meta.state.migrated === true
AND 四槽 memory snapshot 均已填好（可为空数组）
```

才把 **global `primaryReady`** 置为 true。此后：

```text
listLocalCharts / listLocalCases / list*Trash
  → memory snapshot（新数组、共享 record 引用）
upsert / remove / restore / purge
  → 更新 memory
  → LS setItem 成功才算持久化
  → 异步 IDB（writeSeq last-wins）
```

charts / cases / live / trash **同一时刻**要么全走 IDB snapshot，要么全走 LS。禁止「charts 从 IDB、cases 从 LS」半切换。

Readiness 不是 boolean，而是：

| status | 含义 | 读路径 |
|---|---|---|
| `uninitialized` | 尚未尝试打开 | LS |
| `opening` | 正在打开/对账 | LS |
| `ready` | 主读条件全满足 | memory ← IDB hydration |
| `unavailable` | 无 IDB / open 失败 / hydrate 失败 | LS |
| `schema-incompatible` | `meta.version > 1` | LS（禁止写该 DB） |
| `migration-pending` | 对账/meta 未成功 | LS |

`horosa.lc.idb='1'` 语义不变：仍表示迁移/对账成功，不单独表示主读。

meta `state` 保留 2-B 字段，主读成功后可写 `primaryReadyAt`（可选诊断，不改变 `migrated` 语义）。

---

## Fallback

出现任一情况即 LS 主读、保留四键：

- IndexedDB 不支持或 open / blocked 失败
- `meta.version > 1`（不修改该 DB、不删 LS）
- migration / reconcile / putMeta 失败
- `state` 缺失或 `migrated !== true`
- hydration 读四槽失败

IDB 写失败（LS 已成功）：保留 memory + LS，记录 `lastFailure`，不 throw 到产品 UI，下次 flush 可重试。

LS 写失败：不宣称持久化成功，不只写 IDB，不把失败记录标成 memory-only 成功（quota 路径与 2-B 相同）。

---

## Hydration

```text
同步读 LS → UI 继续
    ↓ idle
打开 IDB → reconcile（规则同 2-B）→ migrated=true
    ↓
load charts / cases / charts_trash / cases_trash
    ↓
若 hydrate 期间无新的用户写：snapshot = IDB
若 hydrate 期间有写：该槽保留 memory adopt，其余槽用 IDB 补齐
    ↓
四槽齐全 → primaryReady → 后续 sync list() 只切 snapshot，不再 open IDB
```

hydrate 失败：**不清空**当前 memory / LS。

---

## Migration state

对账规则沿用 2-B：LS 有 IDB 无 → put IDB；IDB 有 LS 无 → 写回 LS；都有则 stamp/schemaVersion 较新者胜，相同 LS 胜。

完成后 `state.migrated = true`，再尝试主读。schema > 1 在 reconcile 之前返回，不写库。

---

## Failure behavior

| 失败 | 产品可见性 | IDB | LS 四键 |
|---|---|---|---|
| IDB 不可用 | 仍可 list 已有命盘/事盘 | 不写 | 保留 |
| schema > 1 | 同上 | 不改 | 保留 |
| 迁移部分失败 | 同上 | 尽力 | 保留 |
| hydrate 失败 | 同上 | 已 migrated 也不主读 | 保留 |
| IDB 写失败 | 界面数据仍在 | lastFailure=write | 已成功则保留 |
| LS 写失败 | 不得报保存成功 | 不单写 | 未变 |

陈旧写：`writeSeq` 新者胜，旧 flush discard。多标签页本阶段不做 BroadcastChannel / SharedWorker。

---

## charts / cases 隔离与 trash

四 object store 分开。`chart.cid === case.cid` 也互不覆盖。

trash 与 live 同属一个 primary-ready 开关：`listTrash` / `restore` / `purge` 不得在 primary 后单独回落 LS。

restore 仍是 LS 逻辑事务：upsert live → 出 trash。中间 IDB 失败时 LS 仍满足 live 有 cid、trash 无 cid。

永久删除：trash 去掉 + `horosa.deleted.log.v1` **仍只写 LS**。本阶段不迁移删除日志。

---

## Backup / import / record shape

`exportLocalChartsBackup` / `exportLocalCasesBackup` / `unifiedBackup` 仍调用同步 `list*`。信封 `format/version/charts|cases` 不变。

record 仍是原 LS JSON。envelope 的 `createdAt/updatedAt/writeSeq/kind/slot` 只存在于 IDB 行，不写进 record，也不随 backup/import 污染。

---

## Rollback strategy

1. 不删 LS 四键；任何时候关掉 `primaryReady`（unavailable / schema / 未迁移）即回到 LS 读。
2. 回退 2-C 代码后，2-B 双写 + LS 主读仍可工作；`horosa.lc.idb` 与 `migrated` 不需要倒车。
3. 禁止用「停 LS」作为本阶段修复手段。

---

## StorageHealthModal

只增加一行「命盘/事盘 IndexedDB」，文案区分：IDB 主读 / LS 回退 / IDB 不可用 / 库版本过新。不改 `horosa.lc.idb` 语义，不重做健康页。

---

## 测试结果

### Targeted

`npx umi-test src/utils/__tests__/userRecordsStore.test.js --forceExit`

**18/18 pass**（10 条 2-B 回归 + 8 条 2-C）。1000 charts+1000 cases 约 12–18s；1000 次 `listLocalCharts()` 后 `idbReadOps` 不变。

`StorageHealthModal.test.js`：**2/2 pass**。

### 相关 persistence

`localRecordStore*` / `localchartsBcAd` / `unifiedBackup` / `storageRegistryCompleteness` / `localStorageManagement` / `recordLifecycleExtras` / `localBackupImportGates` / `userListComponentsSmoke`：**全绿**（81 tests）。parity 金标仍锁 LS 字节。

### Build

`npm run build:file`：exit 0，Webpack 704483ms，总墙钟 934537ms。`check-chunk-dup` 绿。

### Full suite

`npx umi-test --forceExit`：518 suites（515 pass / 3 fail），6930 tests（6918 pass / 3 fail / 9 skip），1262.962 s。相对 2-B：+1 suite（StorageHealthModal）、+10 tests（8 条 2-C + 2 条健康页）。3 个失败与 2-B 同类，见下。

### Failure classification

1. `yizhangjingReportTable` — `PREEXISTING` / `EXPECTED_TEST_ASSUMPTION`。未改一掌经。
2. `baziStress` 均值 794.9ms（预算 <500）— `PREEXISTING` / `FLAKY` / `PERFORMANCE`。未改八字。
3. `techniquePerfBudget` L1 309ms（预算 ≤250）— `PREEXISTING` / `FLAKY` / `PERFORMANCE`。未改 KEEP / `memoBySignature`。2-C 的 list 延迟测试自身通过。

---

## 未做

- 未删除 LS 四键，未停止 LS mirror
- 未开始 PHASE 2-D
- 未改 settings / perf / session / 其它 IDB / KEEP / Java / Python / Umi→Vite / WASM / Worker
