<div align="center">

[简体中文](README_ZH.md) · English

<img src="assets/horosa_setup_badge.png" alt="Horosa" width="128" />

# Horosa

**A browser workstation**<br />
*Browser Web Production runs without local Java or Python.*

Fate · Divination · Tools — **26 primary disciplines, 60+ sub-techniques & schools** (full catalog in [What's Inside](#whats-inside))

[![Version](https://img.shields.io/badge/version-3.10.0-2ea043?style=flat-square)](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/releases/tag/v3.10.0)
[![License](https://img.shields.io/badge/license-AGPL--3.0-dc2626?style=flat-square)](LICENSE)
[![Windows](https://img.shields.io/badge/Windows%2010%2F11-x64-111111?style=flat-square&logo=windows&logoColor=white)](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/releases/tag/v3.10.0)
[![Client](https://img.shields.io/badge/client-browser-1f6feb?style=flat-square)](docs/PHASE4I_INSTALLER_EXIT.md)
[![Stars](https://img.shields.io/github/stars/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows?style=flat-square)](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/stargazers)

[Open in a browser](README.md#四网页版一键启动从源码) ·
[Portal](README.md) ·
[中文说明](README_ZH.md) ·
[All Releases](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/releases)

</div>

---

## What Horosa Is

The Horosa client is a browser. Western astrology, Bazi, Ziwei, Qimen, Liuren, and Taiyi live on that page. There is no `Horosa.exe` and no NSIS installer to run.

**Browser Web Production** does not require local Java, Python, `Horosa.exe`, or Electron. KEEP techniques calculate in the browser; static hosting is documented in [`docs/STATIC_HOSTING_SPA.md`](docs/STATIC_HOSTING_SPA.md). (PHASE 0–4 used Java `:9999` and Python `:8899`; PHASE 5 Legacy Purge removed backend trees from the workspace.)

## Open

Run `npm start` under `astrostudyui` for development, or `npm run build` / `npm run build:file` and serve the output (see [`docs/STATIC_HOSTING_SPA.md`](docs/STATIC_HOSTING_SPA.md)).

- **Legal & privacy**: Terms of Service / Privacy Policy / Security / Network / Open-source notices — see [docs/legal](docs/legal/) (Chinese & English).

## Screenshots

<table>
<tr>
<td width="50%"><img src="assets/screenshots/horosa-astrology-workspace.png" alt="Astrology workspace" /><br/><sub><b>Astrology (Western natal)</b> — setup params & tradition presets on the left, chart canvas in the center, info / aspects / planets / classical / patterns tabs on the right.</sub></td>
<td width="50%"><img src="assets/screenshots/horosa-bazi-workspace.png" alt="BaZi" /><br/><sub><b>BaZi (Four Pillars)</b> — simple / detailed / classical triple charts, Five-Element strength, structure & useful god, monthly command, luck / year / month / day cycles linked.</sub></td>
</tr>
<tr>
<td width="50%"><img src="assets/screenshots/horosa-vedic-vargas.png" alt="Vedic divisional charts" /><br/><sub><b>Vedic (Jyotish)</b> — D1–D60 divisional-chart grids side by side, South / North / East styles, Chitrapaksha ayanamsa, shashtiamsa dignities.</sub></td>
<td width="50%"><img src="assets/screenshots/horosa-primary-directions-sphere.png" alt="Primary directions sphere" /><br/><sub><b>Primary Directions · Celestial Sphere</b> — ecliptic / equator / horizon / meridian / prime-vertical circles in 3D, event timeline indexed by age.</sub></td>
</tr>
<tr>
<td width="50%"><img src="assets/screenshots/horosa-astrocartography.png" alt="Astrocartography" /><br/><sub><b>Astrocartography (ACG)</b> — planetary ASC / MC / DSC / IC lines projected on the world map, equidistant projection & multiple house systems.</sub></td>
<td width="50%"><img src="assets/screenshots/horosa-planetarium.png" alt="Planetarium" /><br/><sub><b>Planetarium</b> — surface-observer / celestial-sphere dual mode, live stars, obliquity, sidereal time, Babylon 3D dome.</sub></td>
</tr>
<tr>
<td width="50%"><img src="assets/screenshots/horosa-sanshi-workspace.png" alt="Three Rites combined" /><br/><sub><b>Three Rites in one</b> — Taiyi / Liuren / Qimen on one screen, nine-palace plate with overview / Taiyi / Liuren / Qimen / Ziwei-sihua tabs.</sub></td>
<td width="50%"><img src="assets/screenshots/horosa-qimen-workspace.png" alt="Qimen Dunjia" /><br/><sub><b>Qimen Dunjia</b> — hour-chart leap arrangement, nine-palace star / gate / spirit / stem, overview / spirits / eight-palace / resolution / useful-god tabs.</sub></td>
</tr>
<tr>
<td width="50%"><img src="assets/screenshots/horosa-liuren-workspace.png" alt="Da Liu Ren" /><br/><sub><b>Da Liu Ren</b> — three transmissions & four lessons with the twelve generals, structure / bifa / judgment / imagery / seven-governors multi-school reading.</sub></td>
<td width="50%"><img src="assets/screenshots/horosa-liuyao-workspace.png" alt="Liu Yao Najia" /><br/><sub><b>Liu Yao (Najia)</b> — original / changed / hidden / mutual hexagrams, self & response with changing lines, mounting / verdicts / query-type / text.</sub></td>
</tr>
<tr>
<td width="50%"><img src="assets/screenshots/horosa-geomancy-workspace.png" alt="Astrological geomancy" /><br/><sub><b>Astrological Geomancy</b> — sixteen shield-chart figures, four mothers / daughters / nieces / judge / reconciler, planet-in-house verdicts.</sub></td>
<td width="50%"><img src="assets/screenshots/horosa-almanac-workspace.png" alt="Chinese almanac" /><br/><sub><b>Almanac (Tongshu)</b> — daily do's & don'ts, day officers & lunar mansions, Peng Zu taboos, auspicious / inauspicious spirits, clash & fetal-spirit directions, date selection.</sub></td>
</tr>
</table>

<div align="center">
<img src="assets/screenshots/horosa-navigation-overlay.png" alt="Navigation overlay" width="900" />
<p><em>The command overlay groups charts, Yi & Sanshi, and tools, with search and recents for fast switching.</em></p>
</div>

## What's Inside

The navigation organizes everything under three groups: **命** (charts & timing), **卜** (divination), and **工具** (tools). What follows is what each group actually ships—module names map directly to the in-app tabs.

As of v3.0.0, where schools disagree across the fate and divination sets the differences are surfaced as left-panel options whose defaults match prior results—the default chart path is byte-for-byte unchanged.

### Charts & Timing (命)

The strength here is continuity: you can read a natal chart, walk it forward through time, and bring in a second person, without leaving the same surface.

- **Astrology (占星)** — natal chart plus a real-time 3D chart (Babylon.js), with multiple house systems and classical/modern planet sets
- **Timing (星运)** — primary directions, zodiacal releasing, firdaria, profection, solar arc, solar and lunar returns, decennials, progressions, and an ephemeris
- **Relationship (合盘)** — compare, composite, synastry, time-space midpoint, and Marks charts
- **Specialty (辅盘)** — Hellenistic (bounds and lots), quantitative / midpoint trees (Hamburg / Uranian), astrocartography with interactive maps, and a harmonic lab
- **Vedic (印占)** — North, South, and East Indian charts on the sidereal zodiac
- **Qizheng (七政)** — Qizheng Siyu and Qizheng Moira
- **Bazi (八字) · Ziwei (紫微)** — four-pillar charting, and Purple Star including the Sihua chart
- **Numerology & more (数算 · 其他)** — Shaozi, Tieban, Yanqin and related numeric methods

### Divination (卜)

Yi and Sanshi go past standalone tabs into a genuinely integrated surface.

- **Sanshi United (三式)** — Qimen, Taiyi, and Liuren brought together: overview, Taiyi, shensha, Liuren, major patterns, sub-patterns, references, and the eight palaces
- **Qimen (遁甲) · Liuren (六壬) · Taiyi (太乙)** — each of the three formulae also as its own standalone surface
- **Liuyao (六爻) · Jieqi (分至) · Feng Shui (风水)** — najia hexagram casting, solar-term charts, and Feng Shui tools (six Li-Qi schools)
- **Tarot (塔罗) · Astronomical Geomancy (天文地占)** — tarot spreads with RWS / Egyptian / Marseille / Wirth card art, and astronomical geomancy
- **More (其他)** — Suzhao, Jinkou, Tongshefa, Huangji Jingshi, Wuzhao, Taixuan, Jingjue, and Shenyishu

### Tools (工具)

- **AI Analysis (AI 分析)** — connects to OpenAI, Anthropic, Gemini, Ollama, OpenRouter, or a custom endpoint; streaming chat, conversation history, a materials library with vector retrieval, mounting any technique's chart into the context, structured export grouped by technique and tab, and sectioned Bazi / Ziwei report generation
- **Xuanxue History (玄学史)** — a standalone page compiled from public-domain classics (the Twenty-Four Histories, Taiping Guangji, etc.): figures, stories, technique lineages, and celestial-event records across the dynasties, with an offline historical map, a force-directed figure-relationship graph, and a chronological timeline, searchable by dynasty / technique / figure and linked to charting
- **Planetarium (天文馆)** — a real-time 3D sky view built on Babylon.js, with complete Chinese asterisms, precise rise / set / culmination times, a lunar-mansion degree grid, and real-time sync during continuous time playback
- **Almanac (黄历)** — lunar calendar, solar terms, and date selection
- **References (辅助)** — gua-symbol classes, the twelve palaces, and quick rule lookups
- **Database (数据库)** — a built-in catalog of high-reliability celebrity charts (tens of thousands of A/AA birth records), fully offline with instant search and sign/category filtering; each entry opens a zodiac wheel and adds to your chart library in one click, ready to cast on any technique page

Charts and cases save locally with tags, snapshots, and raw backend payloads. Everything supports JSON import/export and restores its full state when you reopen it.

## Under the Hood

- **Frontend** — React 17 + Umi 3 + TypeScript with Ant Design; D3 for chart drawing, Babylon.js / Three.js for 3D, Plotly for astrocartography maps, and Monaco for editing AI-export templates
- **Calculation** — KEEP techniques run locally in the browser; Swiss WASM / astronomy-engine experiments live under `experiments/phase5a-sweph-parity`
- **Client** — the system browser; Electron, NSIS, and `Horosa.exe` were removed from the production tree
- **Storage** — IndexedDB / browser storage for charts and cases

## Run the Web Version from Source

Browser Web Production (no local Java / Python):

- **Dev**: `cd local/workspace/Horosa-Web-…/astrostudyui && npm install && npm start`
- **Static web delivery**: `npm run build` → `dist/`
- **File protocol**: `npm run build:file` → `dist-file/`
- **Hosting**: see [`docs/STATIC_HOSTING_SPA.md`](docs/STATIC_HOSTING_SPA.md)

## FAQ

**How do I open it?**
Run `npm start` under `astrostudyui`, or build and statically host `dist/` / `dist-file/` (see [`docs/STATIC_HOSTING_SPA.md`](docs/STATIC_HOSTING_SPA.md)).

**Do I still need Python or Java?**
Not for Browser Web Production. Historical PHASE docs still record the former Java/Python backends.

**Does closing the browser delete saved charts?**
No. Charts and cases stay in IndexedDB / browser storage.

## For Maintainers

Start from the entry point that matches your goal:

- public-facing layout and bilingual portal: [README.md](README.md)
- the full Chinese guide: [README_ZH.md](README_ZH.md)
- third-party licensing: [THIRD_PARTY_NOTICES.md](local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/THIRD_PARTY_NOTICES.md)
- legal & privacy documents: [docs/legal](docs/legal/)
- product source: [`local/workspace/Horosa-Web-…/astrostudyui/`](local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui/) (after PHASE 5 Legacy Purge: browser production tree + parity experiments only)
- release docs: [`docs/FINAL_WEB_ARCHITECTURE.md`](docs/FINAL_WEB_ARCHITECTURE.md) · [`docs/STATIC_HOSTING_SPA.md`](docs/STATIC_HOSTING_SPA.md)
- release history & full notes: [GitHub Releases](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/releases)

## Acknowledgements

The lineage matters. Horosa was originally created by **郑大哥**, with auxiliary design work by **荀爽 (Herakleios, 爽哥)**, who released the App and Web versions that made later study, maintenance, and extension possible. This Windows edition builds on that groundwork—adding the delivery layer, runtime packaging, integration, and a great deal of polish—and it would not exist without them. Thanks, too, to everyone who keeps testing, reporting, and fixing things to make Horosa more complete.

Special thanks to [kentang2017](https://github.com/kentang2017), whose long-running, openly shared Python projects power several of Horosa's calculation engines. Upstream projects identified as MIT-licensed retain their license texts in the corresponding vendored directories and `THIRD_PARTY_NOTICES.md`; projects without an explicit open-source license are listed separately, so no license is assumed where none was declared.
