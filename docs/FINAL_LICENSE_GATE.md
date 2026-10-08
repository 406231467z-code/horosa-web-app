# Final license gate

Date: 2026-09-24

These stay structured statuses. They are not FEATURE COMPLETE. The browser does not call Java, Python, or Kentang to fill them.

| Capability | Status | Provider | Notes |
| --- | --- | --- | --- |
| Direction | LICENSE_REVIEW_REQUIRED | browser | `PRIMARY_DIRECTION_EPHEMERIS`. No `/predict/pd`, `/predict/pdchart`, or `/predict/pdpoles`. |
| India | LICENSE_REVIEW_REQUIRED | browser | `INDIA_SIDEREAL_EPHEMERIS`. No `/india/chart` or `/india/rectify`. |
| Fixed Stars | LICENSE_BLOCKED | browser | Swiss catalog is not shipped |
| Qizheng tables | LICENSE_BLOCKED | browser | tables are not copied |
| Babylonian stellar | LICENSE_REVIEW_REQUIRED | browser | `BABYLON_SIDEREAL_EPHEMERIS` |
| Parans | NOT_IMPLEMENTED | browser | no invented parans |
| Default 宿盘 mode 0 | LICENSE_BLOCKED | browser | `sefstars.txt` is not shipped |
| Geomancy real ephemeris | LICENSE_REVIEW_REQUIRED | browser | shield cast still runs locally |

Allowed user-facing statuses: `LICENSE_REVIEW_REQUIRED`, `LICENSE_BLOCKED`, `NOT_IMPLEMENTED`, `UNSUPPORTED`.
