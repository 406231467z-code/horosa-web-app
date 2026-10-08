# FINAL RELEASE CLOSURE PRE-GATE

**Baseline:** `4e6d20d393ae618828b648d3bbb9ad907538cd6b`  
**Date:** 2026-10-08  
**Legacy purge:** NOT started (no Java/Python/vendor deleted)

---

## A. Overall status

**RELEASE GATE BLOCKED**

Browser migration gates from the prior closure remain **PASS**. This pre-gate adds release packaging, dedicated mobile-keyboard automation, and static-hosting verification. **ACTIVE calculation backend dependency = 0** in production bundles.

---

## B. Mobile keyboard E2E

**Status: PARTIAL** (script: `tests/final-parity/closure-mobile-keyboard.mjs`, artifact: `tests/final-parity/closure-mobile-keyboard.json`)

| Viewport | Overflow | Calc network | Console errors | Result |
| --- | --- | --- | --- | --- |
| 390×844 | 0 | 0 | 0 | FAIL (findability) |
| 375×812 | 0 | 0 | 0 | FAIL (findability) |
| 360×800 | 0 | 0 | 0 | FAIL (findability) |

Keyboard-open simulation: viewport height ≈ 52% after focus flow.

Recorded findings (no production CSS/code changes):

| file | selector | viewport | behavior | severity |
| --- | --- | --- | --- | --- |
| `tests/final-parity/closure-mobile-keyboard.mjs` | `date/time input` | 390×844 (439px vv) | no focusable date/time control found after nav + 占星 | medium |
| same | `AI textarea` | all three | AI input not found in automated flow | low |

**Note:** Ant Design date/time controls may not expose plain `input` to headless focus; overflow and network hooks are clean. **Manual keyboard QA on device still required** for PASS.

---

## C. License gate

Sources: `docs/FINAL_LICENSE_GATE.md`, `docs/FINAL_BUG_FIX_LOG.md`, `docs/FINAL_ALGORITHM_PARITY.md`, `THIRD_PARTY_NOTICES.md`.

| Capability | Current status | Production enabled | Legal review required | Action |
| --- | --- | --- | --- | --- |
| Direction | LICENSE_REVIEW_REQUIRED | UI open; no ephemeris fetch | Yes (Swiss / primary direction) | Keep gated; no `/predict/pd*` |
| India | LICENSE_REVIEW_REQUIRED | UI open; no sidereal fetch | Yes | Keep gated; no `/india/*` |
| Babylonian stellar | LICENSE_REVIEW_REQUIRED | status only | Yes | Keep gated |
| Fixed Stars | LICENSE_BLOCKED | status only | Yes (Swiss catalog) | Do not ship catalog |
| Qizheng | LICENSE_BLOCKED | status only | Yes (tables) | Do not copy tables |
| 宿盘 (default mode 0) | LICENSE_BLOCKED | status only | Yes (`sefstars.txt`) | Do not ship file |
| Parans | NOT_IMPLEMENTED | status only | N/A | No invented parans |

**License gate confirmed:** no capability was unblocked; structured statuses preserved.

---

## D. Release tree

| Metric | Count |
| --- | --- |
| Tracked dirty | **237** |
| Untracked (`git ls-files --others`) | **105663** (dominated by `experiments/**/node_modules`, vendor snapshots, generated parity JSON) |
| `git diff --stat` (sample) | **101 files**, +1346 / −2278 lines (mostly `astrostudyui` browser migration) |

Classification (audit only; **nothing deleted**):

| Class | Examples |
| --- | --- |
| SOURCE | `astrostudyui/src/**` dirty production JS |
| TEST | `tests/final-parity/**`, new `__tests__/final*.test.js` |
| DOC | `docs/FINAL_*.md`, phase docs |
| EXPERIMENT | `experiments/phase5a-*`, astronomy audit |
| GENERATED | `dist/`, `dist-file/`, `closure-*.json`, `responsive-matrix.json` |
| RUNTIME | untracked `node_modules` under experiments |
| TEMP | Chrome profiles (outside repo) |
| LEGACY | Java/Python trees (unchanged, not deleted) |
| RELEASE | not a clean tag-only tree |

**Release tree cleanliness: FAIL** for shipping a tagged release without staging policy.

---

## E. Release artifact

| Artifact | Files | Size | Java/Python/exe/Electron/NSIS in tree |
| --- | --- | --- | --- |
| `astrostudyui/dist/` | 427 | ~59.7 MB | **None found** |
| `astrostudyui/dist-file/` | 351 | ~52.0 MB | **None found** |

`dist/build-info.json`: commit `4e6d20d…`, **dirty: true**, dirtyCount 127, builtAt `2026-09-24T07:42:27Z`.

Builds were **not re-run** in this pre-gate (per scope: no algorithm changes). Prior closure: **npm run build** / **build:file** exit 0.

---

## F. Browser network closure

Static scan: `tests/final-parity/bundle-classify.mjs` on `dist/`.

**ACTIVE calculation backend dependency = 0**

Sample classifications:

| Pattern | Classification |
| --- | --- |
| `:9999` in sort literal | DEAD / INPUT_MAX |
| `:8899` / `:8892` | absent in production bundle |
| `127.0.0.1` / `localhost` | FILE_PROTOCOL_HOST_CHECK, desktop-shell derivation (not browser calc) |
| `/predict/pd`, `/india/chart` | LABEL / LICENSE_OR_BROWSER_LABEL |
| `fetchChart` identifier | METHOD_NAME_SUBSTRING |
| `child_process`, `node:fs` | absent |

---

## G. Runtime kill

| Check | Result |
| --- | --- |
| Java processes | 0 |
| Python processes | 0 |
| listen :9999 / :8899 / :8892 | **false** |

Static web (`tests/final-parity/closure-static-runtime.mjs`, `dist` on :8012):

| Check | Result |
| --- | --- |
| Home `/` loads | PASS |
| Calc API fetch hook | **0** hits |
| Console / unhandled rejection | **0** on home |
| Removed routes deep-link | **FAIL** on bare static server (pathname stays; `homeUi` false). Dev-server E2E (prior) **PASS** redirect home. |

**Implication:** production static hosting needs SPA fallback + client router (same as dev `historyApiFallback`); not a Legacy Purge item.

---

## H. Responsive matrix

**Reused prior PASS** — 22 viewports × 24 pages, overflow 0 (`tests/final-parity/responsive-matrix.json`). Not re-run in this pre-gate.

---

## I. Performance

**Not re-run** (no threshold or test edits).

Baseline cited: **539 suites, 7026 passed, 9 skipped, 0 failed** (2026-09-24 full suite, exit 0).

---

## J. Build

| Item | Status |
| --- | --- |
| `npm run build` | **PASS** (prior; dist present) |
| `npm run build:file` | **PASS** (prior; dist-file present) |
| check-chunk-dup | PASS in prior build log |
| Active backend URL in bundle | **0** |

---

## K. Legacy purge gate

| Prerequisite | Met |
| --- | --- |
| License gate confirmed | Yes |
| Mobile keyboard E2E PASS | **No** (PARTIAL) |
| Release artifact clean | **No** (dirty build-info + dirty tree) |
| Production bundle backend runtime = 0 | Yes |
| Full suite 0 failed | Yes (baseline) |
| npm build / build:file PASS | Yes (baseline) |
| No unexpected dirty source | **No** |

**LEGACY PURGE = BLOCKED**

---

## L. Blockers

1. Mobile keyboard dedicated automation **PARTIAL** (medium: date/time focus not found; low: AI input not found; overflow/network clean).  
2. **Release tree not clean** — 237 tracked dirty files; 105k+ untracked paths (experiments/node_modules).  
3. **Static hosting removed-route check** fails on naive file server (dev E2E still PASS).  
4. **build-info.json** marks `dirty: true` at build time.

---

## M. Next allowed stage

**RELEASE GATE BLOCKED**

Legacy Purge remains **disallowed** until blockers above are resolved or explicitly waived with a release staging policy.

---

```text
FINAL RELEASE CLOSURE PRE-GATE COMPLETE

Legacy purge NOT started.
No Java/Python/vendor deleted.
No production algorithm modified.
No commit.
No push.
```
