# Final responsive audit

Date: 2026-09-24

Overall status: `PARTIAL`

Closure walk on 2026-09-24, after the dev server was up: headless Chrome and headless Edge, each at 1920×1080, 768×1024, 1024×768, and 390×844. 24 pages each. `scrollWidth - innerWidth` was 0. Panel crash text was 0. Recorded in `tests/final-parity/closure-chrome.json` and `closure-edge.json`.

Keyboard open/close and a saved-chart edit loop were not run.

## Overflow matrix

Source: `tests/final-parity/responsive-matrix.json`.

Browser: headless Edge. Dev server `http://127.0.0.1:8000/` was up for that run. It was not repeated after COPY-1 and CONST-1. Those edits do not change layout rules.

Viewports, each in both orientations:

```text
320×568
360×800
375×812
390×844
430×932
768×1024
1024×768
1280×720
1366×768
1440×900
1920×1080
```

22 viewport records. Each record: 24 page opens.

Clicked names: 占星, 星运, 八字, 紫微, 七政, 印占, 六爻, 遁甲, 六壬, 太乙, 三式, 分至, 数算, AI分析, 命盘, plus tabs 金口诀, 统摄法, 皇极经世, 五兆, 太玄, 荆诀, 神易数, 地占, 宿盘.

| Check | Result |
| --- | --- |
| horizontal overflow | 0 |
| crash | 0 |
| bad layout flags recorded by the script | 0 |
| script errors | 0 |
| tiny targets recorded by the script | 0 |

Page identity in that run is the clicked control name. Body text was not asserted per page.

## Not measured

```text
keyboard open and close
form scroll under the keyboard
save
load
edit
delete
modal scroll
same input calculated on desktop, tablet, and mobile
Desktop Chrome
a separate tablet device
```

Those items stay open, so this audit is PARTIAL.
