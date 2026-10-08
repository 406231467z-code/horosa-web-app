<div align="center">

简体中文 · [English](README_EN.md)

<img src="assets/horosa_setup_badge.png" alt="星阙 Horosa" width="128" />

# 星阙 Horosa

**浏览器里的玄学工作站**<br />
*Browser Web Production 无需本机 Java 或 Python。*

命 · 卜 · 工具 三区 —— **26 门主技法 · 60+ 子技法流派**（完整清单见[功能总览](#功能总览)）

[![Version](https://img.shields.io/badge/version-3.10.0-2ea043?style=flat-square)](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/releases/tag/v3.10.0)
[![License](https://img.shields.io/badge/license-AGPL--3.0-dc2626?style=flat-square)](LICENSE)
[![Windows](https://img.shields.io/badge/Windows%2010%2F11-x64-111111?style=flat-square&logo=windows&logoColor=white)](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/releases/tag/v3.10.0)
[![Client](https://img.shields.io/badge/client-browser-1f6feb?style=flat-square)](docs/PHASE4I_INSTALLER_EXIT.md)
[![Stars](https://img.shields.io/github/stars/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows?style=flat-square)](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/stargazers)

[打开浏览器](README.md#四网页版一键启动从源码) ·
[入口页](README.md) ·
[English Guide](README_EN.md) ·
[所有版本](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/releases)

</div>

---

## 星阙是什么

星阙 Horosa 的客户端是浏览器。西方占星、八字、紫微、奇门、六壬、太乙都在这个页面里。不安装 `Horosa.exe`，也不使用 NSIS 安装包。

**Browser Web Production** 不依赖本机 Java / Python / `Horosa.exe` / Electron。KEEP 技法在浏览器内计算；静态托管见 [`docs/STATIC_HOSTING_SPA.md`](docs/STATIC_HOSTING_SPA.md)。（PHASE 0–4 曾使用 Java `:9999` 与 Python `:8899`；PHASE 5 Legacy Purge 自工作区移除后端树。）

## 打开

在 `astrostudyui` 目录执行 `npm start`（开发），或 `npm run build` / `npm run build:file` 后用静态服务器打开产物（见 [`docs/STATIC_HOSTING_SPA.md`](docs/STATIC_HOSTING_SPA.md)）。

- 法律与隐私：服务条款 / 隐私政策 / 安全说明 / 网络说明 / 开源声明，见 [docs/legal](docs/legal/)（中英双语）

## 截图

<table>
<tr>
<td width="50%"><img src="assets/screenshots/horosa-astrology-workspace.png" alt="占星工作区" /><br/><sub><b>占星（西方本命盘）</b>—— 左栏起盘参数与流派预设，中栏图盘画布，右栏信息 / 相位 / 行星 / 古典 / 格局页签。</sub></td>
<td width="50%"><img src="assets/screenshots/horosa-bazi-workspace.png" alt="八字工作区" /><br/><sub><b>八字</b>—— 简 / 细 / 古法三盘，五行力量、格局用神、月令司令，大运 / 流年 / 流月 / 流日联动。</sub></td>
</tr>
<tr>
<td width="50%"><img src="assets/screenshots/horosa-vedic-vargas.png" alt="印度占星分盘" /><br/><sub><b>印度占星（吠陀）</b>—— D1–D60 分盘网格并列，南 / 北 / 东印盘式，Chitrapaksha 岁差、六十分盘吉凶。</sub></td>
<td width="50%"><img src="assets/screenshots/horosa-primary-directions-sphere.png" alt="主限天球" /><br/><sub><b>主限法 · 天球</b>—— 黄道 / 赤道 / 地平 / 子午 / 卯酉圈三维呈现，事件时间轴按年龄检索表行。</sub></td>
</tr>
<tr>
<td width="50%"><img src="assets/screenshots/horosa-astrocartography.png" alt="占星地图" /><br/><sub><b>占星地图（ACG）</b>—— 行星 ASC / MC / DSC / IC 线投影于世界地图，等距投影与多种宫制切换。</sub></td>
<td width="50%"><img src="assets/screenshots/horosa-planetarium.png" alt="天文馆" /><br/><sub><b>天文馆</b>—— 地表观测 / 天球外观双模，实时恒星、黄赤交角、恒星时，Babylon 三维天穹。</sub></td>
</tr>
<tr>
<td width="50%"><img src="assets/screenshots/horosa-sanshi-workspace.png" alt="三式合一" /><br/><sub><b>三式合一</b>—— 太乙 / 六壬 / 遁甲同屏，九宫盘面与概览 / 太乙 / 六壬 / 遁甲 / 紫微四化页签。</sub></td>
<td width="50%"><img src="assets/screenshots/horosa-qimen-workspace.png" alt="奇门遁甲" /><br/><sub><b>奇门遁甲</b>—— 时家转盘置闰，九宫星 / 门 / 神 / 干，概览 / 神煞 / 八宫 / 化解 / 用神页签。</sub></td>
</tr>
<tr>
<td width="50%"><img src="assets/screenshots/horosa-liuren-workspace.png" alt="大六壬" /><br/><sub><b>大六壬</b>—— 三传四课与十二天将，格局 / 毕法 / 占断 / 取象 / 七政多流派判读。</sub></td>
<td width="50%"><img src="assets/screenshots/horosa-liuyao-workspace.png" alt="六爻纳甲" /><br/><sub><b>六爻纳甲</b>—— 本卦 / 之卦 / 伏神 / 互卦，世应卦变动态间爻，装卦 / 断诀 / 占类 / 卦辞。</sub></td>
</tr>
<tr>
<td width="50%"><img src="assets/screenshots/horosa-geomancy-workspace.png" alt="天文地占" /><br/><sub><b>天文地占</b>—— 护盾方盘十六图形，四母 / 四女 / 四甥 / 判官 / 调和者，行星入宫断语。</sub></td>
<td width="50%"><img src="assets/screenshots/horosa-almanac-workspace.png" alt="黄历通书" /><br/><sub><b>黄历通书</b>—— 老黄历宜忌、值神值宿、彭祖百忌、吉神凶煞、冲煞胎神方位与通书择日。</sub></td>
</tr>
</table>

<div align="center">
<img src="assets/screenshots/horosa-navigation-overlay.png" alt="导航弹层" width="900" />
<p><em>导航弹层 —— 命盘推运、易与三式、工具工作台分组，支持搜索与最近使用。</em></p>
</div>

## 功能总览

导航把所有模块归为三组：**命**（命盘与推运）、**卜**（易与三式）、**工具**。下面列的，是各组里真正能用的内容——名字与应用里的页签一一对应。

> v3.0.0 起，命系与卜系多门技法的各派分歧均做成左栏可选项，默认值与既有结果一致，默认排盘路径字节级不变。

### 命 · 命盘与推运

这一层的强项是连贯：能读本命、把它沿时间推开、再带进第二个人，全程不离开同一个工作面。

- **占星** —— 本命盘与三维盘（Babylon.js 实时 3D），多种宫位制、古典 / 现代行星集
- **星运** —— 主限法、黄道星释、法达、小限、太阳弧、太阳 / 太阴返照、十年法、推运、星历
- **合盘** —— 比较盘、组合盘、影响盘、时空中点盘、马克斯盘
- **辅盘** —— 希腊星术（界限 / 阿拉伯点）、量化盘 / 中点树（汉堡学派）、星体地图（占星地理定位）、调波盘
- **印占** —— 北 / 南 / 东印度盘，恒星黄道
- **七政** —— 七政四余、七政 Moira
- **八字 · 紫微** —— 四柱排盘；紫微斗数含四化盘
- **数算 · 其他** —— 邵子神数、铁板神数、演禽等数术方法

### 卜 · 易与三式

易与三式不止是几个独立页签，三式合一已经做成一个真正能工作的整合面。

- **三式（合一）** —— 奇门、太乙、六壬整合呈现：概览、太乙、神煞、六壬、大格、小局、参考、八宫
- **遁甲 · 六壬 · 太乙** —— 三式各自的独立排盘入口
- **六爻 · 分至 · 风水** —— 纳甲六爻、节气盘、风水（理气六派）工具
- **塔罗 · 天文地占** —— 塔罗牌阵（RWS / 埃及 / 马赛 / 维尔特 四套图集）、天文地占（星象地占）
- **其他** —— 宿盘、金口诀、统摄法、皇极经世、五兆、太玄、荆诀、神易数

### 工具 · 工具工作台

- **AI 分析** —— 可接入 OpenAI / Anthropic / Gemini / Ollama / OpenRouter / 自定义端点；流式对话、历史记录、资料库（向量检索）、把任一技法的盘面挂载进上下文、按技法 / 页签结构化导出，并可生成八字 / 紫微分节命理报告
- **玄学史** —— 以二十四史、太平广记等公有古籍为底，汇编历代玄学人物、故事、术数源流与天象记录；离线历史地图 + 人物关系力导图 + 编年时间轴，按朝代 / 技法 / 人物检索，并与排盘联动
- **天文馆** —— 完整星官、升落 / 中天精确时刻、宿度网格与连续时间播放实时同步（基于 Babylon.js 的实时三维天象）
- **黄历** —— 农历、节气与择日
- **辅助** —— 八卦类象、十二宫、规则速查
- **数据库** —— 内置高可信名人星盘目录（数万条名人出生数据），离线秒级检索、按星座 / 分类筛选；详情含黄道星盘轮，可一键加入命盘管理、在任意技法页直接排盘

命盘与事盘都能本地保存：带标签、快照与后端原始结构化数据，可 JSON 导入导出，重开后恢复现场。

## 技术构成

- **前端** —— React 17 + Umi 3 + TypeScript，Ant Design；D3 绘盘，Babylon.js / Three.js 三维，Plotly 星体地图，Monaco 编辑 AI 导出模板
- **计算** —— KEEP 技法在浏览器内本地计算；Swiss WASM / astronomy-engine 实验资产见 `experiments/phase5a-sweph-parity`
- **客户端** —— 系统浏览器；Electron / NSIS / `Horosa.exe` 已自生产树移除
- **存储** —— IndexedDB / 本地存储承载命盘与事盘

## 网页版（从源码）

Browser Web Production（无本机 Java / Python）:

- **开发**：`cd local/workspace/Horosa-Web-…/astrostudyui && npm install && npm start`
- **静态 Web 交付**：`npm run build` → `dist/`
- **本地文件协议**：`npm run build:file` → `dist-file/`
- **托管**：见 [`docs/STATIC_HOSTING_SPA.md`](docs/STATIC_HOSTING_SPA.md)

## 常见问题

**怎么打开？**
在 `astrostudyui` 执行 `npm start`，或构建后用静态托管打开 `dist/` / `dist-file/`（见 [`docs/STATIC_HOSTING_SPA.md`](docs/STATIC_HOSTING_SPA.md)）。

**还要自己装 Python 或 Java 吗？**
Browser Web Production **不需要**。历史 PHASE 文档仍记录曾用 Java/Python 后端。

**关掉浏览器会丢掉命例吗？**
不会。命例与事盘在浏览器 IndexedDB / 本地存储里。

## 开发者入口

按你的目标选择入口：

- 想理解产品首页与用户入口：[README.md](README.md)
- 想看英文完整说明：[README_EN.md](README_EN.md)
- 想确认第三方许可证：[THIRD_PARTY_NOTICES.md](local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/THIRD_PARTY_NOTICES.md)
- 法律与隐私文档：[docs/legal](docs/legal/)
- 产品源码：[`local/workspace/Horosa-Web-…/astrostudyui/`](local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c/astrostudyui/)（PHASE 5 Legacy Purge 后仅保留浏览器生产树 + parity 实验）
- Release 文档：[`docs/FINAL_WEB_ARCHITECTURE.md`](docs/FINAL_WEB_ARCHITECTURE.md) · [`docs/STATIC_HOSTING_SPA.md`](docs/STATIC_HOSTING_SPA.md)
- 历史版本与完整发布说明：[GitHub Releases](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/releases)

## 致谢

星阙的源流不能忘。最早的星阙 Horosa 由**郑大哥**一手创建，**荀爽（Herakleios，爽哥）**参与辅助设计，并把相关 App 与 Web 公开出来，后来者才有得研究、学习与延展。这个 Windows 版本的继续整理与发布，正是建立在他们已经搭起的星阙体系、术数工作流与公开分享精神之上——补的是 Windows 交付、运行时打包、功能整合与体验改良。没有他们，就没有今天这一版。也感谢每一位持续测试、反馈、修复，推动星阙变得更完整的人。

特别感谢 [kentang2017](https://github.com/kentang2017) 长期公开的传统术数 Python 项目。星阙接入或适配了其中多项计算引擎——已声明为 MIT 的上游项目在对应 vendored 目录与 `THIRD_PARTY_NOTICES.md` 中保留许可证说明；未找到明确开源声明的项目则单独标注，避免在没有声明的地方擅自假定许可证。
