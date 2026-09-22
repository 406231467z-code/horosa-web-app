# PHASE 4-F：AI 可选直连

## 基线

- 分支 `main`，HEAD `28fd212`
- 语义基线：`docs/PHASE3_PRE_AUDIT.md` 第 J 节 4-F（浏览器到现有供应商 API 的可选直连，密钥模型；Java 代理保留为一种模式；AI 加密单测）
- 前序 4-A 至 4-E 已完成。本阶段不改那些路径

## 范围

做了：

- 提供商编辑里增加「连接方式」。默认「经本机 Java 代理」
- 选「浏览器直连供应商」后，对话、流式对话、嵌入向量由浏览器发给供应商
- 直连时密钥只放在供应商要求的位置：OpenAI 兼容与 Anthropic 在请求头，Gemini 在查询串。请求体里没有 `apiKey`
- 代理模式仍把含密钥的正文用既有 RSA 封套发给 `/aianalysis/*`。封套线上看不到明文密钥
- `aiTransport` 在发给 Java 之前从正文里去掉，避免被代理转到上游

没做：

- 不删除 Java `AIAnalysisProxyService`
- 模型列表、连接诊断、材料解析仍走 Java。直连档的这三项仍把密钥交给本机代理
- Ollama 直连走配置里的 OpenAI 兼容地址，不走原生 `/api/chat`，`num_ctx` 不一定生效
- 供应商若不允许浏览器跨域，直连会失败，改回代理即可
- PHASE 4-G 及以后
- ProductScope、IndexedDB 结构、四键 localStorage
- `baziStress` / `techniquePerfBudget` / `yizhangjingReportTable` 阈值

## 修改文件

| 文件 | 变化 |
|---|---|
| `astrostudyui/src/utils/aiDirectTransport.js` | 代理 / 直连计划、供应商请求、流式帧翻译 |
| `astrostudyui/src/services/aianalysis.js` | 对话、流式、嵌入按计划分流；代理正文封套 |
| `astrostudyui/src/components/aianalysis/AIAnalysisMain.js` | 连接方式表单项，写入 `providerOptions.aiTransport` |
| `astrostudyui/src/utils/__tests__/phase4fAiDirectTransport.test.js` | 密钥位置与封套 |
| `docs/PHASE4F_AI_DIRECT.md` | 本记录 |

## 行为

未改过的提供商档案仍是代理。DeepSeek 直连地址是 `https://api.deepseek.com/chat/completions`，`Authorization` 为 `Bearer` 加密钥，正文没有密钥，也没有 `aiTransport` 和 `requestTimeoutMs`。Anthropic 用 `x-api-key` 和带 `type: text` 的内容块。Gemini 密钥在 `key=` 查询串，正文没有密钥。

OpenAI 兼容流里的 `content` 译成现有 `delta` 事件，`reasoning_content` 译成 `reasoning` 事件，页面沿用原来的流式渲染。

## 测试

```
npx umi-test src/utils/__tests__/phase4fAiDirectTransport.test.js src/services/__tests__/aianalysisSseParser.test.js src/utils/__tests__/rsaSessionKey.test.js --forceExit
```

- 加密封套单测与直连密钥位置：7 项通过（`js-rsa` 在 Jest 里按既有会话钥测试的方式模拟；AES 段与明文不同，且不含原始密钥）
- SSE 解析 6 项通过
- RSA 会话钥 4 项通过
- 未跑全量。`baziStress`、`techniquePerfBudget`、`yizhangjingReportTable` 未改、未跑

提供商弹窗没有在运行中的浏览器里点开。本机没有开着的开发服务。连接方式的保存值由 `buildProviderFormValues` / `buildProviderOptionsFromForm` 写入，请求计划由上面的单测覆盖。

## build:file

`npm run build:file` **exit 0**（约 65s）。

- `check-chunk-dup` 绿：22 个大 async chunk，最大请求组 33/56，首屏批次无重引擎
- 首屏 preload 19 条
- `[build-info]` 提示工作树有未提交改动，产物不能对应单一 commit

## 失败分类

| 类 | 结果 |
|---|---|
| 默认代理、直连密钥不进正文、代理封套不含明文密钥、流式帧翻译 | 通过 |
| SSE 解析、RSA 会话钥 | 通过 |
| `build:file` | exit 0 |
| 浏览器里点开提供商弹窗 | 未做 |
| `baziStress` / `yizhangjingReportTable` | 未跑、未改。PHASE 2-F 既有失败，不归入 4-F |
| `techniquePerfBudget` | 未跑、未改 |

## 停止

**PHASE 4-F COMPLETE**

未开始 PHASE 4-G。未提交、未推送。
