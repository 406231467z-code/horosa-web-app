# PHASE 5-A.7 PASS

日期：2026-09-23  
HEAD：`4e6d20d393ae618828b648d3bbb9ad907538cd6b`

本阶段只锁定数据来源和旧算法实际读取的字段。没有实现恒星、二十八宿、Nakshatra、七政星宿段或 Parans。

记录文件：`experiments/phase5a-sweph-parity/data/phase5a7-provenance.json`  
历史 `realChartResult.json` 只用来确认键是否存在。恒星黄经没有被复制成计算结果。

## A. Fixed Stars Provenance

```text
status=CONFIRMED
chartPath=swe.sweFixedStar → swisseph.fixstar_ut
catalog=flatlib/resources/swefiles/sefstars.txt
subset=const.LIST_FIXED_STARS
listedIds=67
uniqueIds=66
duplicate=STAR_UNUKALHAI
output=id, name, mag, lon, lat, ra, decl
displayedLongitude=ecliptic lon at the chart Julian day
zodiac=chart flags; tropical unless sidereal mode is on
precession=Swiss fixstar_ut, not a Horosa formula
epoch=each catalog record is 1950, 2000, or ICRS
browser=LICENSE_BLOCKED
wasmCatalog=MISSING
```

Horosa 本命 `/chart` 用的是 `LIST_FIXED_STARS` 这 67 个 id（去重后 66 颗，`STAR_UNUKALHAI` 出现两次）。显示名来自 `const.STAR_NAMES`，没有表项时退回 id。位置来自 `sefstars.txt`，星等来自同目录的 `fixstars.cat`（`swe.py` 写明 `fixstar_mag` 解析该文件）。

同目录还有 `sefstars-2.txt`（134721 字节）。Swiss 打开的文件名是 `sefstars.txt`，没有改用这份。`vendor/kinastro/astro/data/fixed_stars.json` 和选举表 `astrostudyui/src/divination/data/fixedStars.js`（41 颗，历元 1995，岁差常数 50.27 角秒/年）都不是 `/chart` 星表。

合相列表 `getStars` 的一行是 `[id, sign, signlon, shortest separation, name]`。默认容许度 1°，比较是严格小于。南纬盘会把星再加 180°；1990 金样纬度在北半球，这条不生效。

实验用的 `swisseph-wasm` 包里没有 `sefstars.txt`。Swiss 能算恒星，不等于这套 Horosa 恒星已经能在浏览器里复现。

## B. Su28 Provenance

```text
status=CONFIRMED
count=28
includes=牛
defaultMode=0 REAL
modes=0..8 all listed, none selected as the only table
browser=BROWSER_READY_AFTER_TRANSFORM
```

| mode | name | data | coordinate | epoch | precession |
| --- | --- | --- | --- | --- | --- |
| 0 | REAL | live equatorial distance stars | RA | chart JD | Swiss |
| 1 | DOUBING | `guo74.py` SuDeg widths | RA | table widths | not the Swiss star path |
| 2 | MOIRA_CURRENT | `MOIRA_DISTAR_J2000` to tropical longitude | ecliptic | J2000 in, chart JD out | IAU inside `_moira_distar_lons` |
| 3 | MOIRA_KAIXI | `MOIRA_KAIXI_STELLAR_DEGREES` plus ayanamsha | ecliptic | year 1300, base 4.0° | ayanamsha added |
| 4 | ZHENG_SIDEREAL | `MOIRA_CURRENT_STELLAR_DEGREES` | ecliptic | fixed list | chart is already sidereal |
| 5 | EQUATORIAL_SIDEREAL | live equatorial RA | RA | chart JD | Swiss |
| 6 | GUFA_LICHENG | Shoushi-li widths | ecliptic | Yuan widths | optional |
| 7 | EQUATORIAL_TROPICAL | fixed Yuan-Ming widths | RA | fixed constants | does not follow precession |
| 8 | EQUATORIAL_TROPICAL_LIVE | live RA widths, mode-7 anchor | RA | chart JD | live star RA |

`MOIRA_DISTAR_J2000` 有 28 行。自行运动单位是 0.01（赤经：时秒/年；赤纬：角秒/年）。`MOIRA_CURRENT_STELLAR_DEGREES` 和 `MOIRA_KAIXI_STELLAR_DEGREES` 各 28 个黄经，精度到 0.1°。这不是每宿 13°20′。

另一套宿界在 `vendor/kinastro/astro/qizheng/constants.py`，由 `webqizhengkinsrv.py` 使用，引擎名 `kinastro-qizheng`。它不是本命 `fixedStarSu28`，也不是 `guoStarSect`。三张表各 28 个 `start_lon`：`TWENTY_EIGHT_MANSIONS`、`TWENTY_EIGHT_MANSIONS_LIMING`、`TWENTY_EIGHT_MANSIONS_ANCIENT`。立命换算在 `calculator.py` 的 `_compute_liming_lon`：`_TANG_EPOCH_AYANAMSA_AT_J2000 = 29.185`，J2000 儒略日 `2451545.0`，岁差率 `50.29` 角秒/年。文件注释提到 BahnAstro/MOIRA，没有 URL，也没有许可句。分类是 MIXED。浏览器状态是 BACKEND_REQUIRED。

## C. Nakshatra Provenance

```text
status=CONFIRMED
source=astropy/astrostudy/nakshatra.py
entries=27
span=360/27
zero=0° of the sidereal longitude passed in
ayanamsa=not inside nakshatra.py
pada=present, 1..4
abhijit=overlay, does not replace the 27 lords
tropicalChart=nakshatras is null
browser=BROWSER_READY
```

`nakshatra_from_lon` 只吃传入的黄经。`perchart.getChartObj` 仅在 `zodiacal == SIDEREAL` 时调用它，传入的是已经是恒星黄道的 `object.lon`。空的 `siderealAyanamsa` 走 Swiss 当前默认，这条写在 `perchart`，不在宿表里。不能把 5-A.4 的 Lahiri 参照测试当成这张表的零点。

边界：`index = min(26, int(lon / span))`。正好落在 `k * (360/27)` 上时，`int` 把它分给下一宿。360° 经 `% 360` 回到 0，即 Ashwini。Pada 是 `min(4, int(progress * 4) + 1)`。Abhijit 区间是 `[276°40′, 280°53′20″)`，来自 `india/primitives.py`。

1990 金样是回归黄道，`chart.nakshatras` 为 `null`。它不能当宿度黄经的对照。

## D. GuoStarSect Provenance

```text
status=CONFIRMED
classification=MIXED
table=guotables.py TERM_SU27, LIST_SU, SU_CATEGORY, LIST_SU_RELATION, LIST_SU_SIXHOUSE
algorithm=GuoStarSect.allTerm
entries=27
includesNiu=false
epoch=static degrees inside each sign
precession=false
browser=BROWSER_READY_AFTER_TRANSFORM
```

行星入宿在 `setupPlanets`：用行星所在星座和星座内黄经，对照 `TERM_SU27`。`allTerm` 再按 `planet.su` 归入 27 宿。月亮所在宿是 `lifesu`，关系从这一宿起走 `LIST_SU_RELATION`。函数里没有另一套昼夜宿表。这不是 `getFixedStarSu28`，也不是 vendor 七政四餘的三张二十八宿表。

## E. Parans Rule Provenance

```text
chartJson=ABSENT
productionAcg=CONFIRMED
function=ACGraph._parans
file=astropy/astrostudy/acg/ACGraph.py
events=rise, set, mc, ic
inputs=planet RA, planet declination, event pair, simultaneous latitude
latitudeLimit=66 degrees
output key=parans
star output key=starParans
localFile=paransLocal.js
localStatus=LEGACY-LOCAL-APPROXIMATION
localObliquity=23.4367
localOrb=2 degrees
browser=BACKEND_REQUIRED
```

本命 `/chart` 发出的是 `declParallel`，没有 `parans` 键。1990 金样也没有这个键。ACG 的 `_parans` 是星图（astrocartography）规则，已经定位到函数、输入和输出。`paransLocal.js` 保持为本地近似，不记成生产 Parans。

## F. Data Epoch Matrix

| Data | Epoch | Frame | Dynamic | Needs Precession |
| --- | --- | --- | --- | --- |
| Chart fixed stars | record equinox 1950, 2000, or ICRS; output at chart JD | catalog equinox, then ecliptic of the chart zodiac | yes, via Swiss | Swiss `fixstar_ut` |
| Su28 mode 0 default | chart JD | equatorial RA | yes | Swiss |
| Su28 modes 2–4, 6–7 | fixed degree lists or year-1300 base | ecliptic or fixed RA | mode 2 and optional mode 6 move; 4 and 7 stay fixed | mode-specific, listed above |
| Nakshatra | none inside the table | sidereal ecliptic longitude it is given | the longitude moves with the chart | the table itself does not precess |
| Guo TERM_SU27 | none | ecliptic sign longitude | signs follow the chart zodiac | no |
| Qizheng kin mansions | three static `start_lon` lists; liming uses J2000 JD 2451545.0 and ayanamsa 29.185 | ecliptic longitude | liming longitude moves with JD | vendor linear rate 50.29 arcsec/year |
| ACG parans | chart JD positions | RA and declination | yes | comes in with the body positions |

## G. Browser Readiness Matrix

| Feature | Data | Browser ready |
| --- | --- | --- |
| Fixed Stars | `sefstars.txt` plus `fixstar_ut` | LICENSE_BLOCKED；实验 wasm 里星表 MISSING |
| Election stars | `fixedStars.js` | BROWSER_READY，且不是本命星表 |
| Su28 | nine modes | BROWSER_READY_AFTER_TRANSFORM |
| Nakshatra | 27-name table | BROWSER_READY；回归盘结果是 null |
| Guo Star Sect | `guotables.py` | BROWSER_READY_AFTER_TRANSFORM |
| Qizheng kin | three 28-row tables plus `_compute_liming_lon` | BACKEND_REQUIRED |
| Parans | `ACGraph._parans` | BACKEND_REQUIRED |

## H. License Matrix

| Data | License |
| --- | --- |
| `flatlib-ctrad2/LICENSE` | MIT, FlatAngle 2015. 只覆盖 Python 封装 |
| `sefstars.txt`, `sefstars-2.txt`, `fixstars.cat` | 文件头没有许可句。作者是 Moshier、Abramov、Koch，后有 SIMBAD 与 IAU 星名。商业使用未清 |
| `nakshatra.py`, Abhijit constants | 仓内源码，表上没有单独第三方许可头 |
| `guotables.py` | 仓内源码，没有单独许可头 |
| `fixedStars.js` | 仓内 UI 源码，与 Swiss 星表分开 |
| `MOIRA_DISTAR_J2000` | `perchart.py` 里的仓内数值表 |
| vendor 七政二十八宿 | 仓内 vendor 数值。注释指向 BahnAstro/MOIRA，没有 URL 和许可句 |

`legalReviewRequired` 仍为 true。没有把 MIT 和星表许合成一条。

## I. Data Size / Precision

| Data | Size | Precision |
| --- | --- | --- |
| `sefstars.txt` | 1360 records, 136618 bytes | RA/Dec to seconds; proper motion and parallax in 0.001 arcsec |
| Horosa subset | 67 listed ids, 66 unique | output floats from `fixstar_ut`; catalog not trimmed |
| `sefstars-2.txt` | 134721 bytes | not opened by the chart path |
| `fixstars.cat` | 107283 bytes | magnitude file |
| `MOIRA_DISTAR_J2000` | 28 rows | RA/Dec to 0.001 time-second or arcsecond in the literals |
| Moira degree lists | 28 and 28 | 0.1 degree in the current list; 0.5 degree steps appear in Kaixi |
| Nakshatra | 27 tuples, 2313 bytes | span is the exact quotient 360/27 |
| `guotables.py` | 12081 bytes, 27 mansions | boundaries are degree literals inside signs |
| Qizheng kin tables | 28 + 28 + 28 `start_lon` | decimal degrees as written, up to 4 places; 室 in the first list is 353.49 |
| Election `fixedStars.js` | 41 entries | separate 1995 table |

## J. Tests

```text
5-A.3=PASS
5-A.4=PASS
5-A.5=PASS
5-A.6=PASS
5-A.7=PASS
```

`phase5a7.provenance.test.js` 核对文件存在、记录数、字段名和 27/28 计数。没有生成假星行。

## K. Production Source

```text
services/astro.js=UNCHANGED
package.json=UNCHANGED
Java=UNCHANGED
Python=UNCHANGED
vendor=UNCHANGED
UI=UNCHANGED
```

实验目录的 `package.json` 只增加了 `phase5a7` 脚本。

## L. Remaining Work

```text
P0  浏览器恒星位置仍被许可挡住，且实验 wasm 没有 sefstars.txt。不要把星表接进生产。
P1  Nakshatra 表和 TERM_SU27 已在仓内。回归金样的 nakshatras 是 null，不能用来对黄经。
P2  ACG Parans 规则已定位。本命 JSON 没有 parans 字段。paransLocal.js 仍是本地近似。
```

## M. Next Step

```text
NEXT_RECOMMENDED_PHASE=5-A.8 browser tables for Nakshatra and TERM_SU27 only, after this provenance file
```
