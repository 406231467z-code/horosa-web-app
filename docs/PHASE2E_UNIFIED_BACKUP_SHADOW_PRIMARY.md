# PHASE 2-E · 统一备份 Trash + ShadowMirror 与 IDB Primary 对齐

**Date:** 2026-09-22  
**Baseline:** PHASE 2-D + `docs/PHASE2E_PRE_AUDIT.md`  
**Status:** **PHASE 2-E COMPLETE** · **未开始 PHASE 2-F**

---

## 1. F1 · unifiedBackup trash（修复前后）

### 修复前

```text
export trash  → safeLocalStorageGet(TRASH_KEYS)     // 可能读陈旧 LS
restore trash → mergeTrashRaw → safeLocalStorageSet // 绕过 snapshot/IDB
```

### 修复后

```text
export trash
  → listLocalChartsTrash / listLocalCasesTrash
  → localRecordStore.readTrashRaw
  → primaryReady ? memory snapshot : LS

restore trash
  → mergeLocalChartsTrashFromBackup / mergeLocalCasesTrashFromBackup
  → localRecordStore.mergeTrashFromBackup
  → writeTrashRaw
  → primaryReady ? adopt snapshot + schedule IDB : LS setItem
```

新增域层 API（既有公开函数签名未改）：

- `mergeLocalChartsTrashFromBackup`
- `mergeLocalCasesTrashFromBackup`

---

## 2. F2 · shadowMirror primary guard

`reconcileShadowOnBoot` 在调用时（非模块加载时）检查 `isUserRecordsPrimaryReady()`（延迟 `require` 避免环依赖）：

| 状态 | 行为 |
|---|---|
| `primaryReady === true` | **跳过** shadow→四键 LS；`skippedPrimary: true`；不改 IDB |
| `primaryReady === false` | 原兼容逻辑（主存缺失才写回） |

不删除 shadow 数据 / LS 四键 / migration fallback。

---

## 3. F3 · registry 文案

`horosa.user-records.v1` label：

- 前：`…双写副本…`
- 后：`命盘/事盘 IndexedDB 主存(备份仍走两库信封,本库名登记以过哨兵)`

`key` / `kind` / `backup:dedicated` **未改**。

---

## 4. 四键 LS 策略（保持 2-D）

| 模式 | 四键 setItem |
|---|---|
| primaryReady CRUD / unified trash restore | **0** |
| fallback / migration | 允许 |
| `horosa.deleted.log.v1` | 仍写 LS |

四键 **未删除**。

---

## 5. Backup envelope compatibility

- `horosa-local-charts` / `horosa-local-cases` · `version: 1` 不变  
- trash 段仍为 JSON 字符串数组（manifest 形状兼容）  
- record 无 `createdAt` / `updatedAt` / `writeSeq` / `kind` / `slot`

---

## 6. Tests

Targeted：

```text
userRecordsStore + unifiedBackup + shadowMirror + localBackupImportGates
→ 4 suites / 50 tests PASS
```

新增覆盖：TEST A–G（export 权威、restore+ratchet、cid 隔离、shadow guard、fallback、envelope）。

---

## 7. Build / Full suite

| 项 | 结果 |
|---|---|
| `npm run build:file` | **PASS**（exit 0；check-chunk-dup OK） |
| targeted（4 files） | **4 suites / 50 tests PASS** |
| `npx umi-test --forceExit` | **518 suites：516 pass / 2 fail**；**6943 tests：6932 pass / 2 fail / 9 skip**；~376s |

---

## 8. Failure classification

对照 PHASE 2-D baseline（518 suites / 515 pass / 3 fail；6938 tests / 6925 pass / 4 fail / 9 skip）：

| 类 | 本轮 |
|---|---|
| A. PHASE 2-E 新失败 | **0** |
| B/C. PHASE 2-D / PREEXISTING | `yizhangjingReportTable.test.js`、`baziStress.test.js`（性能阈值） |
| D. FLAKY/PERFORMANCE | 同上；**未**修改 KEEP / flaky 测来变绿 |

`techniquePerfBudget` 本轮未失败（较 2-D 少 1 个 suite fail）。测试净增 ≈5（2-E 新用例），总数 6943 对齐。

---

## 9. 停止声明

**PHASE 2-E COMPLETE**  
**未开始 PHASE 2-F**  
未删四键 LS；未迁 deleted.log；未改 KEEP / Java / Python / Vite / WASM / Worker / 其他 IDB。
