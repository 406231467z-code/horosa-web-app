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
- `fetchPreciseNongli` in `src/utils/preciseCalcBridge.js` now prefers its real local BaZi/lunar implementation and caches the local result when that implementation can produce a result. It still has a legacy service fallback when local calculation returns no result.
- Development Umi config no longer proxies `/backend` or `/chart-service`; development-only route splitting is disabled to reduce async chunk mismatches. Production split behavior and existing asset paths are preserved.
- Responsive mobile/desktop CSS changes remain in this branch.

## Confirmed remaining calculation/service dependencies

These paths must be migrated to browser-native calculation or explicitly removed from the retained product scope before the backend directories can be deleted:

| Retained surface | Current dependency | Source location | Migration work |
| --- | --- | --- | --- |
| Main Western/natal astrology, many chart panels | `POST /chart` | `src/services/astro.js` | Implement a production browser chart engine; match PerChart response schema and golden parity before switching callers. |
| Precisely bounded nongli/other calendars | `/nongli/time` fallback | `src/utils/preciseCalcBridge.js` | Port/test the remaining date domains; then remove request fallback. |
| Jieqi-year outside local JS support | `/jieqi/year` fallback | `src/utils/preciseCalcBridge.js` | Port unsupported historical domains; do not use a modern table for BC dates. |
| Ziwei dates outside the tested local lunar domain | `/ziwei/birth` fallback | `src/utils/ziweiBirthLocal.js` | Extend and parity-test the browser algorithm or explicitly define the supported domain. |
| Qizheng / Kinastro-related retained techniques | `/qizheng/moira`, `/qizhengkin/pan`, `/qizhengelection/*` | `src/services/qizheng.js` | Port retained algorithms and their inputs/outputs to JS/WASM; confirm licensing. |
| 2D primary-direction pole calculations | `/predict/pdpoles` | `src/services/astroPd3d.js` | Port this calculation; do not confuse it with removed 3D rendering. |
| AI models/providers/chat/extraction/embeddings | `/aianalysis/*` API paths; some providers are direct fetches | `src/services/aianalysis.js` | Remove own-server proxy/config dependency and handle provider keys safely in-browser; retain AI only with a real provider path. |

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

## Verification for this branch

- Source files were re-fetched after edits.
- Static syntax checks passed for the edited Umi config, user model, migration tests, rules service/models, astro service, and precise calculation bridge test.
- No CI status/workflow was available for the current PR head.
- The frontend build and iOS Safari / Android Chrome were not run in the Trea environment as part of this update.
