# PHASE 5 PRE-AUDIT

日期：2026-09-22  
基线：`ebc4d9e`（`feat: 封存 PHASE 2-E 至 4-I 的浏览器基线`）  
这一步只定剩余 Java / Python 的去向。没有改生产算法，没有把 WASM 接上 `/chart`。

PHASE 5 是把核心计算从本机 Java `:9999`、Python `:8899` 再往浏览器收。浏览器客户端、不安装 `Horosa.exe`，在这条基线上已经成立。

## 视口（基线提交之后）

静态页：`http://127.0.0.1:8765/index.html`（`dist-file`，本机 8000 没有在听）。Java 与 Python 没有启动，盘面没有算出星历，量的是页面壳。

`document.ejs` 的 viewport 是 `width=device-width, initial-scale=1`，没有 `user-scalable=no`。

| 宽度 | 看到的页面 | 结果 |
| --- | --- | --- |
| 375 | 占星、八字、紫微、六壬、遁甲、太乙、六爻、三式 | 对应 redesign grid 都是一列（宽约 365px）。文档没有横向溢出 |
| 390 | 占星壳；模块菜单能打开 | 文档 `scrollWidth` 等于视口，没有横向溢出 |
| 430 | 占星壳 | 同上 |
| 768 | 占星 / 八字网格的计算样式回到 `260px minmax(0, 1fr) 320px`；AI 落地页打开 | 760px 规则没有在这一档把桌面收成一列。文档没有横向溢出 |

AI 空对话落地页没有挂上 `chatSplit`，所以「对话两栏变一栏」这一条没有在活页面上量到。命盘列表抽屉没有打开，抽屉是否满宽没有量到。

## 判定

只用三种：迁移、保留远程、删除。

这一轮的删除列是空的。Java、Python、`vendor` 都不删。

| 依赖 | 现状 | 判定 | 放到 |
| --- | --- | --- | --- |
| `/chart` 及它后面的 Swiss / flatlib | 占星、七政、分至星盘、六壬主盘等仍走 Java → Python | 迁移 | 5-A 对拍通过之后的 5-C。现在不替换 |
| `/predict/pd`、`/predict/pdchart`、`/predict/pdpoles`、`/predict/*` | 星运 | 迁移 | 5-C，跟在 `/chart` 对拍之后 |
| `/india/chart` | 印占 | 迁移 | 5-C |
| `/modern/relative`、`/astroextra/relative`、`/astroextra/analysis` | 合盘与辅盘分析 | 迁移 | 5-C |
| Swiss Ephemeris WASM | 只在 `experiments/phase4d-sweph-wasm`。没有进 `astrostudyui` 生产包 | 迁移的前置试验 | 5-A。先对拍 PerChart，再谈替换 |
| `/nongli/time` | `fetchPreciseNongli` 先请求 Java，失败才用本地历 | 迁移 | 5-B。可靠域改成先本地；域外仍留后端 |
| `/liureng/runyear` | 六壬、金口诀仍直接请求 | 迁移 | 5-B，单独对拍，不顺手改神煞 |
| `/ziwei/birth` | 公元 1–9999 已走 `ziweiBirthLocal.js` | 域外保留远程 | 可靠域不再迁。公元前与 10000+ 留 Java |
| `/ziwei/rules` | 紫微页用本地 `zwrules.json`。`services/rules.js` 里还留着旧请求函数 | 页内已本地。旧函数先不动 | 5-B 只确认没有第二个生产调用方。不删 Java 接口 |
| `/liureng/gods` | 可靠域走 `liurengGodsLocal.js` | 域外保留远程 | 与紫微相同 |
| `/jieqi/year` | 公元 1–9999 用本地节气表 | 域外与公元前保留远程 | 不把分至星盘的 `/chart` 算进这一条 |
| `/bazi/birth`、`/bazi/direct` | 可靠域 `buildLocalBaziResult`；抛错才请求 | 域外保留远程 | 不改八字主路径 |
| 卦辞、梅花易 | 浏览器静态表 | 已完成 | 不再列入 5-B |
| AI `/aianalysis/*` 代理 | 默认路径。直连是可选项 | 保留远程 | 不是历算。两种模式都留 |
| kintaiyi、kinqimen、kinastro、kinjinkou、kinwuzhao、kinwangji | 有 MIT `LICENSE`。KEEP 页仍走 `:8899`。`kentangBrowserPortEnabled()` 为 false | 保留远程，以后可以评估移植 | 5-D。不在预审计里动手 |
| taixuanshifa、jingjue、shenyishu | 目录在，没有 `LICENSE` | 保留远程 | 5-D 永久远程，除非以后出现明确再分发许可 |
| 地占 `geomancy` 端点 | `cnyibu` 里调用，不在上面九套的许可结论里 | 保留远程 | 5-D 单独看许可，不并进 MIT 六套 |
| `horosa.user-records.v1` | 命盘 / 事盘主存 | 已完成 | 不改四键，不改阈值 |

## 5-A 对拍门槛（写在这里，这一步不跑）

同一输入，WASM 对现有 PerChart / `/chart` 结果。至少这些字段有记录才允许谈生产替换：行星、ASC / MC、宫位、黄经、黄纬、速度、相位、阿拉伯点、节点、回归与恒星黄道，以及当前盘面还读的其他字段。

4-D 只证明 WASM 能算，内部 SWIEPH 与 Moshier 接近。那不是 PerChart 对拍。

## 停止

**PHASE 5 PRE-AUDIT COMPLETE**  
**未开始 PHASE 5-A。**  
基线 `ebc4d9e` 没有包含这份文档。未推送。
