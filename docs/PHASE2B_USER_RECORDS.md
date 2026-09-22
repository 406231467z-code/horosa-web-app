# PHASE 2-B · 命盘/事盘四键 → IndexedDB

**Date:** 2026-09-21  
**Baseline:** PHASE 1 封板；`docs/PHASE2A_LOCALSTORAGE_AUDIT.md`；本阶段前未改产品代码。  
**Scope lock:** 只动四键 + `localRecordStore` 写盘口 + 新库 `horosa.user-records.v1` + 测试。不停 LS、不改 KEEP 算法、不动另三套 IDB、不做 2-C。

---

## 2-B.1 四键调用图

### Key 清单

| Key | 角色 | 生产写者 |
|---|---|---|
| `horosa.localCharts.v1` | 命盘主库 JSON 数组 | `localRecordStore.writeRaw` |
| `horosa.localCharts.trash.v1` | 命盘回收站 | `localRecordStore.writeTrashRaw` |
| `horosa.localCases.v1` | 事盘主库 JSON 数组 | 同上内核 |
| `horosa.localCases.trash.v1` | 事盘回收站 | 同上内核 |

`horosa.deleted.log.v1` 仍在 LS（永久删除日志，非四键）。`horosa.lc.idb` 现已接线为「四键迁移成功」旗标，仍 `device-local`、不进备份。

### Read / write / delete

```
ChartList / layouts/app.js / unifiedBackup / StorageHealthModal
    → listLocalCharts / upsertLocalChart / removeLocalChart / trash*
        → localcharts.js 域层
            → createLocalRecordStore({ storageKey, trashKey, warnLabel:'chart' })
                readRaw  → LS getItem 同步 → 内存 lastRawText
                writeRaw → LS setItem 同步 → shadowMirror → scheduleUserRecordsReplace(live)
                remove   → writeRaw(过滤 cid) → moveToTrash → writeTrashRaw
                restore  → upsert + 出 trash
    事盘同构: localcases.js / warnLabel:'case'
后台 idle: kickUserRecordsMigration → migrateAndReconcileUserRecords
```

域层公开 API **未改签名**。所有既有组件继续同步 `list*`。

### 当前数据结构

数组元素 = 记录对象。命盘 `cid` 默认 `local-${Date.now()}-${rand}`，事盘 `local-case-${Date.now()}-${rand}`。共有字段含 `updateTime`（`YYYY-MM-DD HH:mm:ss`）、`schemaVersion`（缺省 v1，upsert 盖 v2）。回收站另加 `deletedAt`。**没有**记录级 `createdAt`（未发明字段，以免改 KEEP 存盘形状）。

### cid 生命周期

创建：upsert 无 cid → 域层生成。更新：同 cid 合并。删除：主库去掉 → trash 追加。恢复：upsert 回主库 → trash 出栈。彻底删除：trash 去掉 → `deleted.log` 追加（仍 LS）。导入：同 cid 覆盖合并。

---

## 2-B.2 Schema

```
DB      horosa.user-records.v1
version 1
stores  charts | cases | charts_trash | cases_trash | meta
keyPath live/trash: cid ; meta: id
```

Envelope:

| 字段 | 含义 |
|---|---|
| cid | 主键 |
| kind | `chart` \| `case` |
| slot | `live` \| `trash` |
| record | LS 数组元素的 JSON 克隆（形状不变） |
| updatedAt | `Date.parse(updateTime\|deletedAt)` |
| createdAt | 本库首次见到该 cid 的 ms（仅 envelope，不写回记录） |
| writeSeq | 本会话写序号，只防同会话陈旧 flush |

meta `id=state`: `{ version:1, migrated, migratedAt, lastReconcileAt, counts }`。`meta.version > 1` → 当 schema 不兼容，不动 LS。

对账：LS 有 IDB 无 → put；IDB 有 LS 无 → 写回 LS（双写期补洞）；一致 → 跳过；stamp/schemaVersion 较新者胜，相同则 LS 胜。

---

## 2-B.3–2-B.6 实现

| 文件 | 作用 |
|---|---|
| `src/utils/userRecordsStore.js` | 新库、双写队列、迁移/对账、测试内存后端 |
| `src/utils/localRecordStore.js` | LS 成功后异步 replica；quota 失败不写 IDB；test 环境不自动 migrate |
| `src/utils/storageKeyRegistry.js` | 登记 `horosa.user-records.v1` dedicated |
| `src/utils/__tests__/userRecordsStore.test.js` | 2-B.7 |

兼容：首屏仍 `readRaw` 同步 LS。Jest 默认不装 replica、不打 timer。生产 `requestIdleCallback` 迁移。IDB 失败 never throw，不删 LS，不置 `horosa.lc.idb`。迁移成功也不删四键。

陈旧写：pending last-wins + `writeSeq < appliedSeq` 丢弃。

---

---

## 执行结果

### Build

* **command:** `npm run build:file` (cwd: `astrostudyui`)
* **result:** success, exit 0
* **duration:** 371500 ms (~6.2 min)
* **notes:** `check-chunk-dup` green. Working tree still has uncommitted PHASE 1 + 2-B changes; artifact is not a release commit.

### Targeted 2-B tests (before full suite)

`userRecordsStore.test.js` + `storageRegistryCompleteness.test.js`: **17/17 pass**, including registry snapshot + 裸 `setItem` ratchet.

### Full suite

**command:** `npx umi-test --forceExit`

| | PHASE 1.5 baseline | PHASE 2-B |
|---|---|---|
| suites | 516 (514 pass / 2 fail) | 517 (514 pass / 3 fail) |
| tests | 6910 (6899 pass / 2 fail / 9 skip) | 6920 (6908 pass / 3 fail / 9 skip) |
| duration | 1067.859 s | 1368.338 s |

Net +1 suite / +10 tests = `userRecordsStore.test.js` (all 10 passed in the full run).

### Failure classification

#### 1. `yizhangjingReportTable` — 表化后事实多重集零变化

* **classification:** `PREEXISTING` / `EXPECTED_TEST_ASSUMPTION`
* **PHASE 2-B:** no. Unchanged from PHASE 1.5. Do not change 一掌经.

#### 2. `baziStress` — `buildLocalBaziResult` 均值 &lt;500ms

* **full suite:** avg 884.5ms (budget 500)
* **classification:** `PREEXISTING` / `FLAKY` / `PERFORMANCE`
* **PHASE 2-B:** no. Did not touch 八字. Same class as PHASE 1.5.

#### 3. `techniquePerfBudget` — `memoBySignature` 命中 1000 次 ≤ 50ms

* **full suite:** 343ms
* **isolated retest:** FAIL, 89ms (L1/L2 still pass)
* **classification:** `FLAKY` / `PERFORMANCE` (not a PHASE 2-B regression)
* **whether caused by 2-B:** no. 2-B did not modify `memoBySignature.js` / `requestDedupe.js`. The isolated test does not import the new user-records module. Budget is a wall-clock sentinel on an 11th-gen i5 under Jest 26; Windows `Date.now()` granularity + suite heat make 50ms tight.
* **action:** do not loosen the budget in 2-B; do not change KEEP 算法 or memo implementation to green it.

No other failures. `localRecordStoreParity` / cache / trash / schema / registry ratchet stayed green.

### Compatibility / acceptance

* Public `list/upsert/remove/trash` sync API unchanged; LS still written on success.
* Migration idempotent; IDB unavailable leaves LS intact; schema-too-new refuses without deleting LS.
* Dual-write last-wins + `writeSeq` drops stale flushes.
* Charts vs cases isolated even with a shared cid string.
* **Did not** delete LS four keys; **did not** start 2-C.

### Main-thread cost (honest)

2-B does **not** remove whole-array `JSON.stringify` on `writeRaw`. Idle IDB put is extra work after persist. First paint still reads LS. Before/after wall times for that stringify path are therefore the same class as PHASE 2-A (still LS-bound). Stopping LS is a later, separately authorized step; measure then.


设置 / perf / session sid / 紫微自定义表主存 / `horosa-cache-v1` / `horosa.ai.analysis.v1` / `horosa.record.revisions.v1` / PHASE 1 遗留键 / navigationPages / Java / Python / KEEP 算法 / Umi→Vite / WASM / Worker / 停 LS。
