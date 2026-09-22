# PHASE 2-F · 四键 LocalStorage 退出

**Date:** 2026-09-22  
**Status:** **PHASE 2-F COMPLETE** · **未开始 PHASE 3**

---

## 1. 四键最终调用图

```text
ChartList / Case UI
  → localcharts / localcases          （公开 API 仍同步）
  → localRecordStore
       primaryReady: snapshot only（不 get/set/remove 四键）
       !primaryReady: LS fallback（迁移前 / IDB 不可用）
  → userRecordsStore
       authoritative: horosa.user-records.v1
       migration: readLsArray / writeLsArray（仅未 migrated）
```

| 路径 | primaryReady | !primaryReady |
|---|---|---|
| CRUD list/upsert/remove/restore | memory snapshot + 异步 IDB | 四键 LS |
| unifiedBackup trash | list*Trash / merge*Trash | 同上（内核） |
| shadowMirror.reconcile | **跳过**四键回写 | 主存空才写回 |
| deleted.log | 仍写 `horosa.deleted.log.v1` | 同左 |

ChartList / Case UI **不**直接 getItem 四键。`PageHeader` 诊断只 getItem `horosa.ai.snapshot.*`。

---

## 2–4. Migration / primary / fallback

旧设备（仅四键、从未跑 2-B）：

```text
LS live+trash → hydrate → reconcile → IDB → primaryReady → snapshot
```

- 成功：四槽全迁；`updateTime` 不变；`migrated=true`；连续 hydrate 不重复、不用旧 LS 覆盖 IDB。
- 失败（unavailable / open error / schema>1 / 写失败）：`primaryReady=false`；**不删**四键；不把未完成迁移标成权威主存。
- fallback **保留**：IDB 不可用时仍读写四键。停用 ≠ 删除 fallback。
- **不** `removeItem` / `clear` 四键。LS = legacy residue。

---

## 5–7. Backup / shadow / registry

- export/import/unified trash：经 `localRecordStore`，primary 下不 `safeLocalStorageGet/Set` 四键。
- 信封仍为 `horosa-local-charts|cases` version 1，无 envelope 字段泄漏。
- shadow：primaryReady 后 shadow→四键 = 0；模块本身保留。
- registry：四键 label 改为「遗留兼容快照（非主存）」；`kind=user-data` + `backup=dedicated` 不变（避免改备份面）。`horosa.user-records.v1` 仍是主存。

---

## 8. Ratchet

测试包装 `getItem` / `setItem` / `removeItem`。primaryReady 下 CRUD + backup：**三者均为 0**。数据仍留在 LS。

---

## 9–11. 失败 / 幂等 / 性能

见 `userRecordsStore.test.js` PHASE 2-F 与既有 2-B/2-D。  
1000×list：不增加 IDB read（2-D 用例）。无 Worker/WASM。

---

## 12–14. 验收

| 项 | 结果 |
|---|---|
| targeted | **4 suites / 53 tests PASS** |
| `build:file` | **PASS**（exit 0） |
| full suite | **518 suites：516 pass / 2 fail**；**6946 tests：6935 pass / 2 fail / 9 skip**；~391s |

对照 2-E（6943 tests / 6932 pass / 2 fail / 9 skip）：净增 3 个 2-F 用例且全部通过。

| 类 | 本轮 |
|---|---|
| A. 2-F regression | **0** |
| B/C/D/E | `yizhangjingReportTable`、`baziStress`（继承；未改 KEEP） |

---

## 决策

primaryReady 后业务不再 get/set/remove 四键。四键数据保留。fallback 保留。

**PHASE 2-F COMPLETE。未开始 PHASE 3。**
