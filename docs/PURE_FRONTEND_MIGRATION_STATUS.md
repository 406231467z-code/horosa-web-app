# Pure Frontend Migration Status

Updated: 2026-10-12
Branch: `fix/mobile-devserver-host`
Status: **IN PROGRESS — NOT WEB READY**

## Target

The retained Horosa product must calculate in the browser and use browser-local chart/case storage. It must not require this repository's Java service, Python/CherryPy service, or a remote Horosa calculation API for retained calculation flows. Do not replace real calculations with canned fixtures, stale chart snapshots, or fabricated success envelopes.

## Completed in the current migration branch

- Startup no longer calls the cloud account check `/user/check`; it initializes a local anonymous workspace.
- Startup clock no longer calls `/common/time`.
- Ziwei rules are bundled JSON through `src/utils/ziweiRulesLocal.js`; the rules service no longer makes an HTTP request.
- Removed cloud password/profile/reader effects from `src/models/user.js` and deleted `src/services/user.js`. Browser chart/case CRUD through `localcharts.js` / `localcases.js` remains.
- Removed the obsolete cloud-chart entitlement wrapper `/allowedcharts` from `src/services/astro.js`.
- `fetchPreciseNongli` and `fetchPreciseJieqiYear` in `src/utils/preciseCalcBridge.js` are now browser-only. They use the local BaZi/lunar engine and bundled local Jieqi table; unsupported inputs reject clearly rather than calling `/nongli/time` or `/jieqi/year`.
- `src/utils/divinationTimeDraft.js` no longer calls the Kentang `/jieqi/nongli` or `/jieqi/birth` endpoints for unsupported dates. It returns no calculated result when no verified local table is available. Development Umi config has no `/backend` or `/chart-service` proxy.
- Responsive mobile/desktop CSS changes remain in this branch.
- The Umi runner now passes `HOROSA_UMI_MODE` explicitly. Development disables route-level dynamic imports even if the parent shell inherited `NODE_ENV=production`; production keeps the existing `/static/` asset path and route splitting. A regression test evaluates the Umi config under both modes; this test still needs to run in Trea/Jest and the reported iOS Safari/Android Chrome failure still needs device verification.
- Cetian's classical reading catalogue is now bundled as `astrostudyui/src/components/kinastro/cetianYiyuTexts.json` (13 documents, 78 sections) and `KinAstroMain.loadCetianTexts` reads it locally; `/cetian/texts` no longer needs Kentang or `ServerRoot`. This removes the reading-data endpoint only; the Cetian/Xianqin calculation endpoints (`/{serviceKey}/pan`) remain backend blockers. `cetianTextsLocal.test.js` has been added but is not yet executed in Jest.

## Additional browser-native paths completed in this batch

- Qimen main calculation and step-prefetch now use the existing local `calcDunJia` path. `DunJiaCalc.js` no longer imports the Kentang client or calls `/qimen/pan`.
- Taiyi wrapper now calls the existing browser `calcTaiyi` / `TaiYiCore` engine and no longer calls `/taiyi/pan`.
- JinKou main/prefetch use `buildJinKouData` locally; the `/jinkou/pan` transport wrapper was removed.
- LiuReng gods calculation now uses local data tables and local lunar calculation; unsupported dates reject rather than call `/liureng/gods`.
- JinKou run-year is calculated locally with its existing age-cycle/ganzhi rules and local cache; `/liureng/runyear` is no longer called.
- Ziwei birth uses its existing browser calculation in the validated date domain and explicitly rejects unsupported years without calling `/ziwei/birth`.
- The startup/main-chart error path no longer probes `/horosaIdentity` to classify errors.
- Regression guards were added for the browser-native Qimen/Taiyi/JinKou/LiuReng/Ziwei paths and local-only calendar paths.

## Confirmed remaining calculation/service dependencies

These paths must be migrated to browser-native calculation or explicitly removed from the retained product scope before the backend directories can be deleted:

| Retained surface | Current dependency | Source location | Migration work |
| --- | --- | --- | --- |
| Main Western/natal astrology, many chart panels | `POST /chart` | `src/services/astro.js` | Implement a production browser chart engine; match PerChart response schema and golden parity before switching callers. |
| Precisely bounded nongli/other calendars | unsupported dates now reject locally; no fallback | `src/utils/preciseCalcBridge.js` | Extend local calendar algorithms/data for BCE and out-of-domain years. |
| Jieqi-year outside local JS support | unsupported years now reject locally; no fallback | `src/utils/preciseCalcBridge.js` | Port verified astronomical/calendar support for BCE and out-of-domain years. |
| Ziwei dates outside the tested local lunar domain | unsupported dates now reject locally; no fallback | `src/utils/ziweiBirthLocal.js` | Extend and parity-test the browser algorithm to restore old date coverage. |
| Main Western/natal astrology, chart-dependent pages, relative/auxiliary charts | `POST /chart` | `src/services/astro.js` | Implement a production browser chart engine; match PerChart response schema and golden parity before switching callers. |
| India/Jyotish charts, divisional charts, dasha, prashna | `POST /india/chart` | `src/components/astro/IndiaChart.js` | Port IndiaChartKernel and Jyotish/divisional chart engines; reuse the production browser ephemeris once approved. |
| India birth-time rectification | `POST /india/rectify` | `src/components/astro/IndiaChartMain.js` | Port the scan kernel, sunrise/ruling-planet inputs, and event scoring; the pure scoring module alone is insufficient. |
| Primary-direction event tables and directed charts | `POST /predict/pd`, `POST /predict/pdchart` | `src/components/astro/AstroPrimaryDirectionChart.js`, `src/components/direction/AstroDirectMain.js` | Port the complete PerPredict/pd_engine pipeline and compare multiple historical goldens. |
| Qizheng / Kinastro retained techniques and election | `/qizheng/moira`, `/qizhengkin/pan`, `/qizhengelection/*`, plus Kentang endpoints assembled per engine | `src/services/qizheng.js`, `src/integrations/kentang/serviceRoot.js`, retained component call sites | Port retained algorithms and response contracts to JS/WASM; audit vendor source licences before moving source into the bundle. |
| AI provider model lists, chat, streaming, embeddings | Direct browser provider APIs (no Horosa AI proxy) | `src/services/aianalysis.js`, `src/utils/aiDirectTransport.js` | Verify each provider protocol/CORS in browser; keys must be treated as public client-side secrets, and users must configure their own keys. |
| AI material extraction | `.txt`, `.md`, `.docx` local; PDF and legacy `.doc` explicitly unsupported in the browser | `src/services/aianalysis.js` | Add a locally bundled PDF text parser and test scanned/document edge cases, or constrain the input UI. |
| Main chart/predictive calculations outside validated calendar domain | Unsupported dates now reject locally; no fallback | `src/utils/preciseCalcBridge.js`, local lunar guards | Extend and parity-test browser calendars for BCE/extended domain before claiming the former server range. |
| Optional 2D primary-direction Pole column | Browser-local computation; old `/predict/pdpoles` wrapper deleted | `src/utils/pdPolesLocal.js`, `src/components/astro/AstroPrimaryDirection.js` | Port/test pole formulas and verify all projections/significator options. This does not migrate `/predict/pd` or `/predict/pdchart`. |

The list above is the **confirmed set**, not a claim that every remaining API reference in the repository has been enumerated. Run a full static endpoint scan and call-site audit before deleting any backend directory.

## Swiss Ephemeris / main chart gate

The isolated `experiments/phase5a-sweph-parity` work is not the production browser chart engine. The stored parity evidence is limited; the main production `/chart` request has not been replaced. Before connecting a WASM engine, verify the full fields consumed by retained charts, multiple independent real chart goldens, house-system/zodiac variants, date limits, browser asset loading/offline behavior, and licensing/deployment obligations.

## Deletion gate for Java/Python directories

Do **not** delete `astrostudysrv`, `astropy`, `flatlib-ctrad2`, or the legacy server runtime yet. Deleting them now would break retained calculations listed above, or push those calls to the external `https://srv.horosa.com` service rather than make the application pure frontend.

The backend deletion is allowed only when all of these are true:

1. No retained frontend code calls `ServerRoot` calculation endpoints or any legacy Java/Python/remote Horosa API.
2. Each retained calculator has a browser-native implementation with parity tests against real reference outputs; unsupported input domains fail clearly instead of inventing results.
3. Local chart/case create, edit, save memo, delete, and round-trip tests pass.
4. Production and file builds succeed, and the app starts under static hosting without Java, Python, a proxy, or a desktop shell.
5. Browser network inspection shows no calls to the removed Horosa API paths; desktop and mobile smoke tests pass.

## Latest incremental verification

- Removed the optional primary-direction Pole HTTP request; the component now calculates this column locally and the unused `src/services/astroPd3d.js` wrapper is deleted.
- Added `src/utils/pdPolesLocal.js` and tests, including a real historical chart fixture with seven Placidus planetary pole reference values. A direct static JavaScript execution matched those values within 0.0003 degrees. This check is not a full Jest run or live-service verification.
- AI analysis now calls configured provider APIs directly instead of Horosa's `/aianalysis/*` proxy. Text/Markdown/DOCX extraction is local; PDF/legacy DOC remain explicitly unsupported rather than uploaded to a backend.

## Verification for this branch

- Source files were re-fetched after edits.
- Static syntax checks passed for the edited Umi config, user model, migration tests, rules service/models, astro service, and precise calculation bridge test.
- No CI status/workflow was available for the current PR head.
- The frontend build, full Jest suite, and iOS Safari / Android Chrome were not run in the Trea environment as part of this update.
