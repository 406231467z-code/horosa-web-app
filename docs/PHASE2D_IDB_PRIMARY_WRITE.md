# PHASE 2-D · IDB 主写 / 四键 LS 停止生产写入

**Date:** 2026-09-21  
**Baseline:** PHASE 2-C COMPLETE（`docs/PHASE2C_IDB_PRIMARY_READ.md`）  
**Scope lock:** 仅命盘/事盘四键。不删 LS、不迁 `deleted.log`、不改公开同步 API、不进入 2-E。

---

## 主写策略

`primaryReady === true`（沿用 2-C 六态，不另建状态机）时：

```text
write
  → memory snapshot
  → 异步 IDB（writeSeq last-wins）
```

四个 LS 数据键 **禁止生产 `setItem`**：

```text
horosa.localCharts.v1
horosa.localCharts.trash.v1
horosa.localCases.v1
horosa.localCases.trash.v1
```

LS 四键 **不 `removeItem`**。迁移完成后保留为遗留快照。用户把记录从 A 改成 B 后：

```text
IDB = B（权威）
LS  = A（遗留）
```

`horosa.deleted.log.v1` 仍写 LS。

未 ready（unavailable / schema-incompatible / migration-pending / uninitialized）：继续 LS 读写 fallback。一次 IDB 写失败 **不** 掉 primary、**不** 重新开启四键永久双写。

已 `state.migrated === true` 时再次 hydrate：**不再用 LS 对账覆盖 IDB**。

---

## remove / restore

同一 tick 内 live + trash 的 pending 合并为 **一条 IDB transaction**（两 store）。各槽仍用自己的 `writeSeq`，避免 trash 被 live 序号污染后无法 purge。

---

## StorageHealthModal

仍用 2-C 六态，文案：

| status | 文案 |
|---|---|
| ready | 主存 |
| unavailable | 不可用，使用兼容回退 |
| schema-incompatible | 版本不兼容 |
| opening / migration-pending | 迁移中 |
| uninitialized | 未初始化 |

---

## 四键 write-ratchet

测试 hook：`__startFourKeyWriteRatchetForTests` 包装 `localStorage.setItem`，对四键计数。primaryReady 后 upsert/remove/restore/import 必须全为 0。

---

## 测试与构建结果

### Targeted

`npx umi-test src/utils/__tests__/userRecordsStore.test.js src/components/common/__tests__/StorageHealthModal.test.js --forceExit`

**28/28 pass**（10 条 2-B + 8 条 2-C + 8 条 2-D + 2 条健康页）。

四键 ratchet（primaryReady 后 upsert/update/remove/restore/import）：

| key | setItem 次数 |
|---|---|
| `horosa.localCharts.v1` | 0 |
| `horosa.localCharts.trash.v1` | 0 |
| `horosa.localCases.v1` | 0 |
| `horosa.localCases.trash.v1` | 0 |

### 相关 persistence

`localRecordStore*` / `localchartsBcAd` / `unifiedBackup` / `storageRegistryCompleteness` / `localStorageManagement` / `recordLifecycleExtras` / `localBackupImportGates` / `userListComponentsSmoke` / StorageHealthModal：**13 suites / 82 tests 全绿**。

### Build

`npm run build:file`：exit 0，Webpack 250795ms，总墙钟 365339ms。`check-chunk-dup` 绿。

### Full suite

`npx umi-test --forceExit`：518 suites（515 pass / 3 fail），6938 tests（6925 pass / 4 fail / 9 skip），1183.541 s。相对 2-C：+8 tests（2-D 用例）。失败套件仍是 2-C 那三个，见下。

### Failure classification

1. `yizhangjingReportTable` — `PREEXISTING` / `EXPECTED_TEST_ASSUMPTION`
2. `baziStress` 均值 836.4ms — `PREEXISTING` / `FLAKY` / `PERFORMANCE`
3. `techniquePerfBudget` L1 316ms、memo 147ms — `PREEXISTING` / `FLAKY` / `PERFORMANCE`

无新的 2-D regression。未改 KEEP / 八字 / 一掌经。

---

## 未做

- 未删除 LS 四键
- 未停止 `deleted.log` 的 LS 写入
- 未开始 PHASE 2-E
- 未引入 Worker / WASM，未扩大到全站 storage
