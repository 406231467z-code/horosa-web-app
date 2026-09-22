# Horosa Web Feature Scope — PHASE 1

**Date:** 2026-09-21  
**Status:** product surface locked for the pure-web app  
**Source of truth:** `astrostudyui/src/constants/ProductScope.js` and `astrostudyui/src/pages/index.js` `navigationPages`

This document is the product contract after PHASE 1. It is not an algorithm-migration plan.

Checkout note: the real UI lives at `local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui`.

---

## KEEP

User-visible product is only:

1. **Astrology** — natal, predictive (主限 / 太阳弧 / 返照 / 小限 / 法达 / 黄道星释 and other current predictive tabs), synastry / comparison / composite / Davison, Hamburg, ACG (2D), Vedic, Qizheng, auxiliary charts (卜卦盘 / 择日盘 / 世俗盘 / 重置 / 调波 / 龙盘 / 巴比伦占星), jieqi/solstice charts. **No 3D renderer.**
2. **Chinese Metaphysics** — Bazi, Ziwei, Qizheng-related Chinese capability, 数算, 策天, 演禽, 一掌经, and other current 命-group Chinese modules.
3. **Sanshi** — Qimen, Da Liuren, Taiyi, San Shi United.
4. **Yixue** — Liuyao, Meihua-related, Jinkou, Wuzhao, Taixuan, Jingjue, Shenyishu, Huangji, Xiaoliuren, Xiaochengtu, Lingqi, Feigong, **geomancy (KEEP_YIXUE; do not treat the English name as fengshui)**, and other current `cnyibu` yixue modules.
5. **AI Analysis** — `AIAnalysisMain`, provider/model UI, chart snapshot context, report UI, Monaco if used on the AI page, AI export.
6. **Chart Management** — local natal-chart CRUD only.

Primary navigation groups:

| Group | Items |
|-------|--------|
| 命 | 占星, 星运, 八字, 紫微, 七政, 印占, 辅盘, 合盘, 数算, 其他中国命理 |
| 卜 | 三式, 六壬, 遁甲, 六爻, 太乙, 其他易学 (plus 分至 / jieqi as existing 卜 item) |
| 工具 | AI分析 |
| 管理 | 命盘 |

No other first-level nav.

---

## REMOVE

These product surfaces are deleted (not merely hidden):

* **Fengshui** — tab, `FengShuiMain`, luopan/liqi UI, fengshui-only services/data/CSS/tests. Shared `lunar-javascript` and 24-mountain helper used by GuoLao are **not** fengshui product.
* **All 3D** — astrochart3D, planetarium, Babylon.js planetarium runtime, Three.js chart UI, WebGL renderer, 3D-only loaders/assets/services. Primary Directions **calculation** (`/predict/pd`, `/predict/pdchart`, `/predict/pdpoles`, `utils/pdMath/*`) stays.
* **Planetarium**
* **Calendar** (黄历 page) — shared lunar/jieqi calc via `lunar-javascript` and `/nongli` / `/jieqi` APIs stays.
* **Auxiliary Tools** (commtools page, 辅助/`CnTraditionMain`) — `CnTraditionInput` and `Azimuth` stay because Bazi / GuoLao still use them.
* **Xuanxue History**
* **Database** (名人数据库)
* **Election Tool** (择日工作台 page) — astrology election chart (`ElectionMain` / `electionEngine`) stays as 辅盘 capability.
* **Case Management** — CaseList / CaseAdd / CaseEdit / 起课案例保存 UI. Cases are **not** kept.
* **Login / User Management** — login, register, reset/change password, user params, usermgmt, OAuth client UI.
* **Admin** — admintools, backup management UI, GPS chart management, cloud stats.
* **Reader**
* **Live**
* **IoT**
* **Deep Learning** UI
* **Tarot** (was a first-level / cnyibu product page)

PHASE 1 does **not** delete Java controllers or Python engines.

---

## Chart Management

ONLY:

1. Create
2. Save
3. Open
4. Edit
5. Delete
6. List

Not in default user UI:

* cloud account sync
* login
* cloud charts
* GPS chart map
* cases
* complex admin
* cloud backup
* import/export as a default user feature (local storage compatibility code may remain; UI is hidden)

Storage remains `localcharts.js` / `localRecordStore.js` (localStorage). IndexedDB migration is a later PHASE.

---

## Intentionally not started in PHASE 1

* Java / Python algorithm migration
* TypeScript engine / WASM / Worker rewrite
* Swiss Ephemeris rewrite
* Umi → Vite
* React / Ant Design major upgrade
* AI backend rewrite
* localStorage → IndexedDB
