# License gate

Date: 2026-09-23

`legalReviewRequired` stays true. These rows are separate. A MIT note on the Flatlib wrapper does not cover the star catalog.

| Data | Source | License | Experiment | Production |
| --- | --- | --- | --- | --- |
| Swiss fixed stars | `flatlib/resources/swefiles/sefstars.txt`, `fixstars.cat`, `swe_fixstar_ut` | No license sentence in the catalog header. Authors: Moshier, Abramov, Koch; later SIMBAD and IAU names. Commercial use is not cleared. | Interface only. The file is not read by the mansion layer. | Not allowed |
| Qizheng mansion tables | `vendor/kinastro/astro/qizheng/constants.py` | Comment cites BahnAstro/MOIRA_chinese_astrology. No URL and no license sentence in the file. | Status `LICENSE_BLOCKED`. Longitude lists are not copied. | Not allowed |
| swisseph-wasm | `experiments/phase4d-sweph-wasm` | Same Swiss Ephemeris review as phase 5-A.3. | Used for planets, obliquity (`SE_ECL_NUT`), and the mode-3 user ayanamsa. | Not a production dependency |
| Ephemeris assets | wasm bundle `se1` files | Swiss ephemeris data. Commercial use is not cleared. | Already used by the 5-A.3 adapter. | Not allowed in `astrostudyui/package.json` |
| Nakshatra table | `astropy/astrostudy/nakshatra.py` | In-repo source | Calculated | Allowed as in-repo rules |
| Guo TERM_SU27 | `astropy/astrostudy/guostarsect/guotables.py` | In-repo source | Calculated | Allowed as in-repo rules |
| Su28 modes 2, 3, 4, 6, 7 | `perchart.py`, `guolao_tuibian.py` | In-repo numbers. Mode 2 and 3 also call the experimental Swiss obliquity or user ayanamsa. | Calculated | The numeric tables are in-repo. Shipping them beside a production Swiss binary still needs the ephemeris review. |
| Su28 modes 0, 1 placement, 5, 8 | `getFixedStartsSu28`, `sweFixedStar(Alkaid)` | Swiss fixed-star catalog | Blocked | Not allowed |
| Election `fixedStars.js` | UI file, epoch 1995 | In-repo UI source | Not used as the chart catalog | Stays where it is. It is not a substitute for chart fixed stars. |
