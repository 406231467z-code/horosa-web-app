# Final algorithm parity

Date: 2026-09-24

Overall status: `PARTIAL`

Closure file `finalParityClosure.test.js` is 3 PASS. It uses published anchors. It does not copy a fresh browser actual into the expected value. Sun longitude still has no historical golden in this corpus. Shusuan and Guolao still have no numeric oracle here. Default 宿盘 stays license-blocked.

Corpus: `tests/final-parity/cases.json` and `src/utils/__tests__/finalParityCorpus.test.js`.

Rerun on 2026-09-24 after the ServerRoot edit:

```text
Test Suites   1 passed
Tests         6 passed
FAIL          0
```

Years: 1900, 1950, 1976, 1990, 2000, 2026.

Clocks on the astrology and bazi rows: 00:00:00, 10:30:00, 23:00:00, 23:59:00.

Places on the astrology rows: Fuzhou `+08:00`, high latitude 69.65N, southern hemisphere 33.87S.

Historical golden files, including `realChartResult.json` and `ziweiV2Baseline.json`, were not modified. No tolerance was widened.

## Rows

| Module | Comparison | Status |
| --- | --- | --- |
| Astrology | provider `browser`, 12 houses, fixed stars `LICENSE_BLOCKED`, parans `NOT_IMPLEMENTED`, repeat sun longitude identical | PASS |
| Astrology sun longitude | no historical expected longitude in this corpus | NOT_COMPARABLE |
| Direction | status `LICENSE_REVIEW_REQUIRED`, provider `browser`, message names `/predict/pd` | PASS |
| India | status `LICENSE_REVIEW_REQUIRED`, provider `browser`, message names `/india/chart` | PASS |
| Bazi | four pillars repeat, each pillar length 2; 2026 立春 day 己酉 time `2026-02-04 04:02:08`; 夏至 day 丙寅; 冬至 day 甲子 | PASS |
| Liuyao | `currentGua` repeat on the same pillars | PASS |
| Ziwei | `lifeHouseIndex`, `bodyHouseIndex`, `wuxingJu` against `ziweiJavaGrid.json` for years in the corpus | PASS |
| HuangJi, Jingjue, Taixuan, Shenyi, Wuzhao | status `SUCCESS` on the year list; Jingjue seed 42 key `321`; Taixuan seed 42 head `一方二州三部二家` | PASS |
| Geomancy | seed 42 mothers `Albus,Populus,Laetitia,Populus`, judge `Populus`; real ephemeris `LICENSE_REVIEW_REQUIRED` | PASS |
| Jinkou | 甲辰 spirits 地分 青龙, 将神 朱雀, 贵神 勾陈, 人元 螣蛇 | PASS |
| Qimen | published anchors in `finalParityClosure.test.js`: 2026-02-18 拆补 `阳遁二局下元`; 2015-12-22 10:30 `阴遁七局中元`; 14:30 `阳遁七局中元` | PASS |
| Taiyi | published inverse year-branch god for 丙午 is `申` | PASS |
| Liuren | published month general at sun longitude 20° is 戌/酉/亥; 24° richan 1900 is 戌 and 2026 is 亥 | PASS |
| Guolao | license status only; no invented arc | LICENSE_REVIEW_REQUIRED |
| Shusuan | no new numeric golden row in this corpus | NOT_COMPARABLE |
| Mingother / default 宿盘 | catalog absent | LICENSE_BLOCKED |
| AI | context contract is in `aiAnalysisContext.test.js` from the earlier suite, not a numeric parity row | NOT_COMPARABLE |

The bazi year loop logged one `console.warn` because those corpus inputs omit longitude, so apparent-solar correction is skipped. The assertions still passed. The warning is not a `console.error`.

## Field rule

Each corpus assertion is input, expected, actual, delta, status. A status row uses delta 0 when expected equals actual. Sun longitude stores actual and classification `NOT_COMPARABLE` with expected null. License rows compare the status string. No arc, nakshatra, or stellar longitude was invented.
