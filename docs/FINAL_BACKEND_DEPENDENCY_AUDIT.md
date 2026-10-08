# Final backend dependency audit

Date: 2026-09-24

Overall status: `PARTIAL`

Calculation page opens are PASS. The chart create / edit / delete loop is not.

## Processes and ports

Checked after the production rebuild, with the dev server stopped:

```text
Java process     0
Python process   0
:9999            CLOSED
:8899            CLOSED
:8892            CLOSED
:8000            CLOSED
```

No page-by-page browser reopen was run after that check, because port 8000 was closed for the production build.

## Production root

`constants.js` no longer returns `http://127.0.0.1:9999` for a production browser. Jest and a desktop shell still resolve query, storage, and page port plus 1999.

`dist` and `dist-file` were scanned after the rebuild. The literal `http://127.0.0.1:9999` is absent from both. `:8899` and `:8892` are absent. `child_process`, `node:fs`, and `Electron` are absent.

Remaining `:9999` hits are `max:9999`, a sort sentinel, and a dynasty duration of 9999. They are not a calculation port.

`http://127.0.0.1:` plus `port + 1999` remains in the bundle for the desktop-shell branch. A normal browser returns before that function runs.

## Bundle classification

| Needle | Classification |
| --- | --- |
| `/predict/pd`, `/predict/pdchart`, `/predict/pdpoles` | LICENSE-GATED label. The browser message says those paths are not requested. Prefetch `run()` calls the browser engine. |
| `/india/chart` | LICENSE-GATED label. The browser message says the path is not requested. |
| `fetchChart` substring | `prefetchChart`, `user/fetchCharts`, and the divination shell log string. The shell calls `calculateChart`. |
| `localhost`, `127.0.0.1` | file-protocol host check, Ollama `127.0.0.1:11434`, WebRTC candidate, desktop port derivation |
| `buildKentangEndpoint` | absent from `dist` |

Source files under `astrostudyui/src` still contain historical endpoint strings. `browserCalcGate.js` blocks those local calculation URLs outside Jest and outside the desktop shell. That is a gate, not a line-by-line deletion of every source string.

## Allowed and forbidden

Observed runtime states for the engines under test: `SUCCESS`, `LICENSE_REVIEW_REQUIRED`, `LICENSE_BLOCKED`, `UNSUPPORTED`, `NOT_IMPLEMENTED`.

`ACTIVE_JAVA_DEPENDENCY`, `ACTIVE_PYTHON_DEPENDENCY`, and `ACTIVE_KENTANG_DEPENDENCY` were not observed on the calculation calls in the parity corpus. Chrome and Edge each opened the retained pages, including 命盘 and the 其他 tabs, with Java, Python, and the three calculation ports already off. The fetch hook recorded no `:9999`, `:8899`, `:8892`, `/chart`, `/predict/`, `/india/`, `/wangji`, `/qimen`, `/taiyi`, `/jinkou`, `/liureng`, `/geomancy`, `/bazi/birth`, or `/ziwei/birth`. Console error and unhandled rejection lists were empty. Banned Java/Python sentences were absent.

`productionDefaultProviderNoLegacyFetch.test.js`: the default provider is `browser` and `fetchChart` is not called. `provider: 'legacy'` is the only path that calls it.

Chart create / reload / edit / delete in the page was not completed, so that loop stays PARTIAL. The calculation page matrix is PASS.
