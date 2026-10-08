# Final legacy purge audit

Date: 2026-09-24

Overall status: `PARTIAL`

## Decision

Purge was not started.

The full unit suite, both production builds, the calculation page matrix, chart CRUD, cross-viewport identity unit tests, responsive matrix, E2E Chrome/Edge, backend kill, bundle scan, and Qimen HTML fix are PASS or re-verified in this pass. Dedicated mobile keyboard/touch scripts and release-package cleanliness remain PARTIAL. Deletion stays closed until legacy purge gate is fully green.

## Classification

| Item | Class |
| --- | --- |
| Java and Python algorithm source | KEEP-REFERENCE |
| Historical golden files | KEEP-REFERENCE |
| Vendor parity source | KEEP-REFERENCE |
| `http://127.0.0.1:9999` in Jest and desktop-shell resolution | KEEP-REFERENCE |
| Production browser fallback to that URL | DELETED from the browser path |
| JDK runtime, Python runtime, JAR, Electron, `.exe`, Kentang runtime | not deleted |

## Deleted this pass

```text
none of the legacy trees
```

Nothing was moved to `legacy-reference/`.

## Post-purge regression

```text
not run
```

Java process, Python process, `:9999`, `:8899`, and `:8892` were already 0 before any purge.
