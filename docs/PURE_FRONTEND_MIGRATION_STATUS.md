# Horosa 纯前端迁移状态

更新日期：2026-10-12  
工作分支：`feat/pure-frontend-web-migration`  
草稿 PR：[#2](https://github.com/406231467z-code/horosa-web-app/pull/2)（未合并）  
目标：桌面浏览器、iOS Safari、Android Chrome 使用同一套 Web UI；网页运行不依赖 Java、Python、JAR、EXE 或 Electron。

## 本批已落地

- 手机浏览器不再强制跳转至旧的移动站。
- 启动阶段不再请求 `/user/check`、远程系统时间或远程紫微规则；此前由账号校验顺带装载的外观/本地设置已拆为 `restoreLocalSetup`，继续从 `localStorage` 恢复；页面不再挂载“后端连接中”遮罩、后端状态灯和重连横幅。
- 普通浏览器环境的 `ServerRoot` 设为空值，统一 `request/requestRaw/requestStream/uploadFile` 入口会拦截后端请求；术数模块使用的 `fetchChartWithRetry` 也不再调用本地计算服务。
- 紫微静态规则从前端 JSON 加载；紫微本命盘在现有本地引擎支持的公元范围使用浏览器计算。
- 八字排盘优先使用 `buildLocalBaziResult`；精确农历优先使用现有本地桥接；公元 1–9999 年且在依赖库可靠范围内的节气表直接在浏览器生成。
- 遁甲通过现有 `calcDunJia` 本地引擎构建盘面；浏览器模式不再请求 `/qimen/pan`，本地历法缺少完整四柱时拒绝输出。
- 太乙通过 `calcTaiyiPanFromKintaiyi` 立成表引擎与前端派生规则计算；浏览器模式不再请求 `/taiyi/pan`，缺少完整四柱时拒绝输出。
- 六壬神煞已有本地计算器，行年已改为本地年差计算；主六壬课盘仍依赖西洋 `chartObj`（月将太阳位置、昼夜状态等），暂未宣称完整本地化。
- 浏览器模式下，未迁移的计算模块不会把后端失败伪装成成功结果；会提示功能仍未完成本地计算迁移。
- CSS 已补充动态视口高度 `100dvh`、根容器最小宽度限制、窄屏标签横向滚动和抽屉宽度限制；工作区高度下限在窄屏由 660px 调整为 320px，保留桌面默认下限。
- Umi 开发模式的 chunk `publicPath` 改为 `/`，正式 Web 部署继续使用 `/static/`，用于修复开发环境 `layouts__index.js` chunk 路径不匹配。
- 新建命盘及重新排盘操作在浏览器会更新本地出生资料并清除旧的星盘结果，避免新旧输入混用；加载已保存命盘会还原字段与备注，并触发当前本地术数模块。
- 最近一次工作现场快照已允许 Web 浏览器从本机 `localStorage` 恢复；无快照、坏档或超过 7 天时安全回退到默认页面。
- 新增 `chartFetchBrowserOnly.test.js`，断言未迁移术数接口在浏览器模式下不会调用 `fetch`，也不会返回伪成功。

## 已有前端数据与计算

| 能力 | 当前前端路径 | 状态 |
|---|---|---|
| 命盘/事盘保存管理 | `localcharts.js`、`localcases.js`、本地记录存储与 IndexedDB | 已有本地存储实现 |
| 八字与部分农历 | `baziLunarLocal.js`、`preciseCalcBridge.js` | 现代常用范围走本地；超范围、异常历法仍需逐项补齐 |
| 紫微本命盘与规则 | `ZiweiCalc.js`、`ziweiBirthLocal.js`、`ziweiRulesLocal.js` | 可靠年份范围走本地；域外历法与边界行为仍需完善 |
| 节气表 | `localNongliAdapter.js`、`preciseCalcBridge.js` | 公元 1–9999 可靠范围走本地 |
| 遁甲 | `DunJiaCalc.js`、`DunJiaMain.js` | 使用现有本地排盘构建器；生产浏览器对拍仍需做 |
| 太乙 | `TaiYiCore.js`、`TaiYiCalc.js` | 使用前端立成表与派生规则；生产浏览器对拍仍需做 |
| AI 分析 | 前端直连模型提供商 | 直连模式可保留；以前端代理为基础的功能已禁用，模型供应商自身仍需支持浏览器跨域请求 |
| 六壬行年/神煞 | `liurengGodsLocal.js`、`calcRunYearLocal` | 已有本地年干支、神煞与行年路径；主课盘因缺少完整本地西洋/太阳信息仍不能单独启动 |

## 尚未完成，不能标记为 Web Ready

- 西洋占星主盘、推运、合盘、七政等共享的完整 `/chart` PerChart 结果仍未全部迁到浏览器。
- 三式、六壬、金口诀等部分引擎仍依赖旧服务端数据或计算；遁甲与太乙已切到现有本地引擎，但所有流派、极端年份和选项组合仍需对拍。
- 公元前、极端年份、复杂历法、全部宫制、相位与阿拉伯点等仍需要逐项补齐并用生产真值对拍。
- 独立 Swiss Ephemeris WASM 试验尚有分发/许可证审查和完整字段对拍问题，未接入生产构建。

## 验收门槛

**当前验证状态：** 已做 GitHub 源码内容与迁移闸门的静态复核；本会话没有可用的本地仓库副本/依赖安装环境，尚未执行 `npm test`、`npm run build` 或 iOS/Android 真机验证。新增测试尚未运行，不能把它记为测试通过。


1. `astrostudyui` 生产构建成功，并检查静态产物没有 Java/Python/JAR/EXE 运行依赖。
2. 对生成的 JS/CSS chunk 做 404 检查，验证开发服务器与部署子路径；手机 Safari 与 Android Chrome 都能从首屏进入。
3. 网络面板确认除用户主动配置的 AI 提供商、地图等明确的第三方功能外，不存在对 Java/Python 端口、旧 `srv.horosa.com`、旧移动站或 `/backend/user/check` 的请求。
4. 每个保留的术数页面都必须在浏览器生成真实计算结果；不允许用历史样本、缓存或假对象冒充新排盘。
5. 在本地计算引擎迁移和对拍完成之前，不删除作为迁移参考的 Java/Python 源码；交付时再移除部署/启动链和不再使用的后端目录。

## 当前结论

**WEB MIGRATION PARTIAL — 不是最终交付。**  
当前分支已阻止多个浏览器后端依赖并接通部分本地计算，但需要继续迁移剩余引擎、修复实际浏览器构建/动态 chunk 路径，并完成桌面与移动端验收。
