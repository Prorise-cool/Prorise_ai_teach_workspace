# OpenMAIC Issues / PR 全量调研与 fork 评估（2026-03-23）

> 调研对象：[`THU-MAIC/OpenMAIC`](https://github.com/THU-MAIC/OpenMAIC)
> 输出时间：2026-03-23（Asia/Shanghai）
> 面向本地 PRD：`/Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/_bmad-output/planning-artifacts/prd.md`

## 一、方法与边界

- 已使用数据源：GitHub MCP、GitHub API（`gh api`）、GitHub 公共页面链接。
- 当前环境 **没有 Tavily MCP**，因此改用 GitHub MCP + GitHub API 做全量抓取，并为每一项保留源链接。
- 全量抓取结果：Issues 共 **109** 条，PR 共 **103** 条。
- 严重度分级：`Critical / High / Medium / Low`，重点看安全、核心功能阻断、聊天 / Provider / 课堂生成 / TTS / 搜索 / 持久化 / 部署链路。

## 二、仓库快照

| 指标 | 值 | 源链接 |
|---|---:|---|
| Stars | 11337 | [repo](https://github.com/THU-MAIC/OpenMAIC) |
| Forks | 1670 | [repo](https://github.com/THU-MAIC/OpenMAIC) |
| 默认分支 | `main` | [repo](https://github.com/THU-MAIC/OpenMAIC) |
| 最新 main commit | `1f84f4c4a75a` | [commit](https://github.com/THU-MAIC/OpenMAIC/commit/1f84f4c4a75a2385621db3b851a1ab33b6a939e1) |
| Issues | 109（open 64 / closed 45) | [issues](https://github.com/THU-MAIC/OpenMAIC/issues) |
| PRs | 103（open 49 / merged 35 / closed-unmerged 19) | [pulls](https://github.com/THU-MAIC/OpenMAIC/pulls) |

## 三、核心结论

- 上游在 **2026-03-23** 仍处于高频修复期：最近项里同时包含聊天鉴权回归 [#220](https://github.com/THU-MAIC/OpenMAIC/issues/220) → [#221](https://github.com/THU-MAIC/OpenMAIC/pull/221)、安全修复提案 [#217](https://github.com/THU-MAIC/OpenMAIC/pull/217)、跨设备课堂持久化修复 [#218](https://github.com/THU-MAIC/OpenMAIC/pull/218)。
- 与你方 PRD 最相关的风险簇是：`Provider / API key 解析`、`Chat 路由回归`、`TTS`、`Tavily 搜索长度限制`、`课堂持久化与多端访问`、`安全边界（SSRF / session）`。
- 结论上：**可以 fork，但不建议直接跟着 upstream main 无脑合并后开发**。

### 3.1 严重度分布

| 类型 | Critical | High | Medium | Low |
|---|---:|---:|---:|---:|
| Issues | 6 | 49 | 25 | 29 |
| PRs | 19 | 35 | 23 | 26 |

### 3.2 高风险开放项

| 类别 | 数量 |
|---|---:|
| Open severe issues | 43 |
| Open severe PRs | 40 |

## 四、优先关注的严重 Issues（Top）

| 严重度 | # | State | 风险域 | 标题 | 摘要 | 源链接 |
|---|---:|---|---|---|---|---|
| Critical | 116 | closed | security, llm-provider | [Bug]: Chat fails with "Unknown provider: custom-xxx" for custom providers | ### Bug Description When a custom provider is configured via the Sett… | [issue #116](https://github.com/THU-MAIC/OpenMAIC/issues/116) |
| Critical | 35 | open | security, build-deploy | [Bug]: 模型无法加载 | ### Bug Description <img width="563" height="370" alt="Image" src="ht… | [issue #35](https://github.com/THU-MAIC/OpenMAIC/issues/35) |
| Critical | 214 | open | security, classroom-persistence | [Feature]: Show disk-persisted courses on home page | ### Problem or Motivation The home page course list calls `listStages… | [issue #214](https://github.com/THU-MAIC/OpenMAIC/issues/214) |
| Critical | 216 | open | classroom-persistence, build-deploy | [Bug]: 图片无法显示，老师头像是男生，但声音是女声，生成第二页slide无法载入。 | ### Bug Description <img width="1087" height="697" alt="Image" src="h… | [issue #216](https://github.com/THU-MAIC/OpenMAIC/issues/216) |
| Critical | 109 | open | classroom-persistence, build-deploy | [Bug]: 官方网站生成的课件，课堂讨论没有声音输出，正常教学有声音 | ### Bug Description 1、官方网站生成的课件，课堂讨论没有声音输出，正常教学有声音；2、课堂讨论设置的10轮，可是三轮后… | [issue #109](https://github.com/THU-MAIC/OpenMAIC/issues/109) |
| Critical | 55 | open | classroom-persistence, build-deploy | [Bug]: 配置图像生成模型，测试连接服务成功，实际使用失败 | ### Bug Description <img width="992" height="349" alt="Image" src="ht… | [issue #55](https://github.com/THU-MAIC/OpenMAIC/issues/55) |
| High | 220 | closed | llm-provider, build-deploy | fix: server-configured API key ignored in chat route after #114 refactor | ## Bug Description PR #114 (commit d0c324c) refactored `app/api/chat/… | [issue #220](https://github.com/THU-MAIC/OpenMAIC/issues/220) |
| High | 185 | open | llm-provider, web-search | [Bug]: Stale generationSession in sessionStorage causes false Tavily error on retry | ### Bug Description When a classroom generation fails on the `/genera… | [issue #185](https://github.com/THU-MAIC/OpenMAIC/issues/185) |
| High | 183 | open | llm-provider, web-search | Per-provider proxy support for server-side fetch calls | Node.js native `fetch()` doesn't respect `HTTP_PROXY`/`HTTPS_PROXY`. … | [issue #183](https://github.com/THU-MAIC/OpenMAIC/issues/183) |
| High | 181 | open | build-deploy | [Bug]: 生成的互动页面，不能互动！ | ### Bug Description 生成一个动态互动页面，但是不能互动。查看源码控制台显示如下图： <img width="972" … | [issue #181](https://github.com/THU-MAIC/OpenMAIC/issues/181) |
| High | 174 | open | classroom-persistence | [Feature]: UI界面问题 | ### Problem or Motivation 再听课的时候无法沉浸式观看PPT，讨论那个模块能不能隐藏？或者可以做成弹幕啊 ### … | [issue #174](https://github.com/THU-MAIC/OpenMAIC/issues/174) |
| High | 127 | open | llm-provider, tts-audio | [Bug]: Roundtable UI state not cleaned up after QA/Discussion request failure | ### Description When a `/api/chat` request fails during an active QA … | [issue #127](https://github.com/THU-MAIC/OpenMAIC/issues/127) |
| High | 119 | closed | web-search | [Bug]: Web search fails when query exceeds Tavily's 400-char limit | ## Description The web search API passes the user's requirement text … | [issue #119](https://github.com/THU-MAIC/OpenMAIC/issues/119) |
| High | 118 | open | llm-provider | [Bug]: LLM auto-select doesn't override unusable provider from localStorage | ## Description When `fetchServerProviders()` returns server-configure… | [issue #118](https://github.com/THU-MAIC/OpenMAIC/issues/118) |
| High | 117 | closed | classroom-persistence, ui-ux | [Bug]: Video placeholder src causes unnecessary 404 requests | ## Description `<video>` elements render with placeholder IDs (e.g. `… | [issue #117](https://github.com/THU-MAIC/OpenMAIC/issues/117) |
| High | 74 | open | classroom-persistence, build-deploy | [Bug]: 多个讨论的时候，白板重叠了 | ### Bug Description <img width="1812" height="1004" alt="Image" src="… | [issue #74](https://github.com/THU-MAIC/OpenMAIC/issues/74) |
| High | 53 | open | classroom-persistence | [Bug] 课程数据未持久化到服务器磁盘 | ## Bug: 课程数据未持久化到服务器磁盘 ### 版本 OpenMAIC v0.1.0 ### 问题描述 本地部署模式下，生成的课程数… | [issue #53](https://github.com/THU-MAIC/OpenMAIC/issues/53) |
| High | 115 | open | build-deploy | [Bug]:白板和做题区域太小了，无法查看 | ### Bug Description 白板和做题区域太小了，无法查看 ### Steps to Reproduce Win11 电脑，C… | [issue #115](https://github.com/THU-MAIC/OpenMAIC/issues/115) |
| High | 26 | open | build-deploy | [Bug]: 豆包生图接口失败 | ### Bug Description 使用豆包和 Qwen 生图模型，课程内容中所有图片生成失败 ### Steps to Reprod… | [issue #26](https://github.com/THU-MAIC/OpenMAIC/issues/26) |
| High | 219 | open | classroom-persistence | [Feature]: 下载的时候可以连语音也一起下载吗? | ### Problem or Motivation 产品真的很棒,但是有个问题 比如老师 需要生成PPT的时候 有些场景是不需要生成中间答… | [issue #219](https://github.com/THU-MAIC/OpenMAIC/issues/219) |

## 五、优先关注的严重 PR（Top）

| 严重度 | # | State | Merge | 风险域 | 标题 | 额外状态 | 源链接 |
|---|---:|---|---|---|---|---|---|
| Critical | 218 | open | open | security, classroom-persistence | fix: persist classroom to server for cross-device access | mergeable=True / state=behind / files=2 | [pr #218](https://github.com/THU-MAIC/OpenMAIC/pull/218) |
| Critical | 213 | open | open | security, classroom-persistence | fix(storage): local disk persistence for classroom data generated via browser UI flow (#53) | mergeable=None / state=unknown / files=1 | [pr #213](https://github.com/THU-MAIC/OpenMAIC/pull/213) |
| Critical | 217 | open | open | security, build-deploy | fix: strengthen SSRF guard IPv6 coverage and replace Math.random() session IDs with crypto.randomUUID() | mergeable=False / state=dirty / files=7 | [pr #217](https://github.com/THU-MAIC/OpenMAIC/pull/217) |
| Critical | 94 | open | open | security, llm-provider | feat: Ollama local LLM support | mergeable=None / state=unknown / files=15 | [pr #94](https://github.com/THU-MAIC/OpenMAIC/pull/94) |
| Critical | 90 | open | open | security, llm-provider | Update Node.js version requirements and fix 11 bugs | mergeable=None / state=unknown / files=10 | [pr #90](https://github.com/THU-MAIC/OpenMAIC/pull/90) |
| Critical | 80 | open | open | security, build-deploy | Add unit testing infrastructure with Vitest | mergeable=None / state=unknown / files=13 | [pr #80](https://github.com/THU-MAIC/OpenMAIC/pull/80) |
| Critical | 198 | open | open | tts-audio, classroom-persistence | feat: add pre-generation outline review | mergeable=None / state=unknown / files=7 | [pr #198](https://github.com/THU-MAIC/OpenMAIC/pull/198) |
| Critical | 194 | open | open | llm-provider, web-search | fix: clean up stale generationSession on failure | mergeable=True / state=behind / files=1 | [pr #194](https://github.com/THU-MAIC/OpenMAIC/pull/194) |
| Critical | 190 | closed | merged | security, build-deploy | docs: add CONTRIBUTING.md to standardize contribution workflow | mergeable=None / state=unknown / files=1 | [pr #190](https://github.com/THU-MAIC/OpenMAIC/pull/190) |
| Critical | 178 | open | open | build-deploy | fix: 修复浏览器语音识别的拼写错误和语言硬编码问题 | mergeable=True / state=behind / files=12 | [pr #178](https://github.com/THU-MAIC/OpenMAIC/pull/178) |
| Critical | 160 | open | open | - | feat: support multiple PDF uploads per generation | - | [pr #160](https://github.com/THU-MAIC/OpenMAIC/pull/160) |
| Critical | 144 | open | open | llm-provider, web-search | test: add Vitest infrastructure with provider-config and settings-sync tests | - | [pr #144](https://github.com/THU-MAIC/OpenMAIC/pull/144) |
| Critical | 66 | open | open | classroom-persistence | docs: improve hosted mode API documentation | - | [pr #66](https://github.com/THU-MAIC/OpenMAIC/pull/66) |
| Critical | 65 | open | open | - | feat: add PDF content summarization for long documents | - | [pr #65](https://github.com/THU-MAIC/OpenMAIC/pull/65) |
| Critical | 54 | open | open | llm-provider, tts-audio | fix: Resolve Mac Chrome TTS invocation, Qwen TTS missing parameters and UI layout issues (#12) | - | [pr #54](https://github.com/THU-MAIC/OpenMAIC/pull/54) |
| Critical | 30 | closed | merged | security, llm-provider | Fix SSRF/credential forwarding via client-supplied baseUrl | - | [pr #30](https://github.com/THU-MAIC/OpenMAIC/pull/30) |
| Critical | 4 | closed | merged | security, tts-audio | feat: add OpenClaw plugin and upgrade generate-classroom API | - | [pr #4](https://github.com/THU-MAIC/OpenMAIC/pull/4) |
| Critical | 147 | closed | closed-unmerged | security, llm-provider | feat(interview): add /api/interview/turn route via orchestration system | - | [pr #147](https://github.com/THU-MAIC/OpenMAIC/pull/147) |
| Critical | 89 | closed | closed-unmerged | security, llm-provider | Update Node.js version requirements and fix 11 bugs | - | [pr #89](https://github.com/THU-MAIC/OpenMAIC/pull/89) |
| High | 215 | open | open | build-deploy | feat: add German language support (de-DE) | - | [pr #215](https://github.com/THU-MAIC/OpenMAIC/pull/215) |

## 六、与 fork 后开发最相关的风险簇

### 6.1 Provider / Chat / API key
- [#116](https://github.com/THU-MAIC/OpenMAIC/issues/116)：自定义 Provider 聊天 500。
- [#114](https://github.com/THU-MAIC/OpenMAIC/pull/114)：修复 `providerType` 透传，但随后又暴露新的回归。
- [#220](https://github.com/THU-MAIC/OpenMAIC/issues/220) → [#221](https://github.com/THU-MAIC/OpenMAIC/pull/221)：`resolveModel()` 重构后，服务端配置的 API key 被忽略，聊天直接 401。
- [#118](https://github.com/THU-MAIC/OpenMAIC/issues/118)：旧 `modelId` 本地缓存阻止自动切换到可用 Provider。
- 含义：如果你们重度依赖多模型 / 多 Provider / 服务端密钥回退，这一簇必须先做兼容与回归用例。

### 6.2 Web Search / Tavily
- [#119](https://github.com/THU-MAIC/OpenMAIC/issues/119) → [#121](https://github.com/THU-MAIC/OpenMAIC/pull/121) / [#122](https://github.com/THU-MAIC/OpenMAIC/pull/122)：Tavily 查询超过 400 字符会直接失败。
- 含义：长需求文本驱动的搜索增强生成链路需要你们自己先做统一 query normalization / truncation。

### 6.3 TTS / Audio
- [#16](https://github.com/THU-MAIC/OpenMAIC/pull/16)：GLM TTS 长文本导致静默失败。
- [#13](https://github.com/THU-MAIC/OpenMAIC/pull/13)、[#10](https://github.com/THU-MAIC/OpenMAIC/pull/10)：测试非当前激活 Provider 时使用了错误的默认 voice。
- [#14](https://github.com/THU-MAIC/OpenMAIC/issues/14)：TTS `modelId` 仍缺少灵活配置。
- 含义：音频层抽象尚未稳定，不能直接照搬。

### 6.4 安全
- [#217](https://github.com/THU-MAIC/OpenMAIC/pull/217)：开放 PR，修复 SSRF IPv6 绕过与弱随机 session ID。
- 含义：如果你们要 fork，可先手动吸收这类补丁，再决定是否跟踪上游 merge。

### 6.5 课堂持久化 / 多端访问
- [#218](https://github.com/THU-MAIC/OpenMAIC/pull/218)：课堂原本只保存在浏览器 IndexedDB，同网段跨设备访问 404。
- 含义：这不是小修小补，而是架构层能力缺口。

### 6.6 安装 / 构建 / 部署
- [#18](https://github.com/THU-MAIC/OpenMAIC/issues/18)：Windows `pnpm install` 后 `postinstall` 失败。
- [#2](https://github.com/THU-MAIC/OpenMAIC/pull/2)、[#3](https://github.com/THU-MAIC/OpenMAIC/pull/3)：Vercel / MinerU 路径仍在快速修补。
- 含义：部署成熟度还不算稳定，更适合作为参考实现而不是零改动基线。

## 七、fork 决策建议

**建议：Conditional fork（有条件 fork），不要直接基于 upstream 最新 main 无脑继续开发。**

| 顺序 | 动作 | 原因 | 参考源 |
|---:|---|---|---|
| 1 | 固定一个已知基线 commit | 避免上游快速演进把新回归带进来 | [latest main](https://github.com/THU-MAIC/OpenMAIC/commit/1f84f4c4a75a2385621db3b851a1ab33b6a939e1) |
| 2 | 先消化聊天 / Provider 稳定性问题 | 这是你们最容易继承到的上游缺陷 | [#114](https://github.com/THU-MAIC/OpenMAIC/pull/114), [#118](https://github.com/THU-MAIC/OpenMAIC/issues/118), [#220](https://github.com/THU-MAIC/OpenMAIC/issues/220), [#221](https://github.com/THU-MAIC/OpenMAIC/pull/221) |
| 3 | 再补安全问题 | 避免 fork 后先背安全债 | [#217](https://github.com/THU-MAIC/OpenMAIC/pull/217) |
| 4 | 单独评估课堂持久化 | 关系到多端协作和恢复能力 | [#218](https://github.com/THU-MAIC/OpenMAIC/pull/218) |
| 5 | TTS / Tavily 单独做适配层 | 上游这两条链路已经多次出问题 | [#16](https://github.com/THU-MAIC/OpenMAIC/pull/16), [#119](https://github.com/THU-MAIC/OpenMAIC/issues/119), [#121](https://github.com/THU-MAIC/OpenMAIC/pull/121), [#122](https://github.com/THU-MAIC/OpenMAIC/pull/122) |

## 八、全量 Issues 索引表（全部条目）

| # | State | Labels | 严重度 | 风险域 | 标题 | 创建时间 | 源链接 |
|---:|---|---|---|---|---|---|---|
| 220 | closed | bug | High | llm-provider,build-deploy | fix: server-configured API key ignored in chat route after #114 refac… | 2026-03-23 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/220) |
| 219 | open | enhancement | High | classroom-persistence | [Feature]: 下载的时候可以连语音也一起下载吗? | 2026-03-23 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/219) |
| 216 | open | bug | Critical | classroom-persistence,build-deploy | [Bug]: 图片无法显示，老师头像是男生，但声音是女声，生成第二页slide无法载入。 | 2026-03-23 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/216) |
| 214 | open | enhancement | Critical | security,classroom-persistence | [Feature]: Show disk-persisted courses on home page | 2026-03-22 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/214) |
| 212 | open | - | High | llm-provider,tts-audio | Add TTS settings for hosted version (open.maic.chat)[Feature]: Add TT… | 2026-03-22 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/212) |
| 208 | open | bug | Medium | build-deploy | [Bug]: 互動白板文字重疊 | 2026-03-22 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/208) |
| 205 | open | enhancement | High | classroom-persistence,ui-ux | [Feature]: Custom Agent Personas & numbers- team Agent Count | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/205) |
| 204 | open | enhancement | High | tts-audio,classroom-persistence | [Feature]: Multi-Language Generation & Subtitles | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/204) |
| 203 | open | enhancement | High | web-search,tts-audio | [Feature]: Video & External Media Embedding | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/203) |
| 202 | open | enhancement | High | classroom-persistence,build-deploy | [Feature]: Per-Scene Editing & Regeneration | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/202) |
| 201 | closed | - | Medium | tts-audio | fix: voice input concurrency and cancellation edge cases in useAudioR… | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/201) |
| 200 | open | - | High | llm-provider,tts-audio | refactor: extract presentation mode UI from roundtable/index.tsx | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/200) |
| 197 | open | - | Low | - | 如何能够不加入任何角色生成课堂？ | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/197) |
| 196 | closed | bug | Low | build-deploy | [Bug]: 页面布局好乱啊，这是大模型的问题还是程序框架的问题？ | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/196) |
| 192 | closed | - | Low | ui-ux | Bug: `TypeError` in `executeWbDrawText` when `action.content` is unde… | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/192) |
| 188 | open | - | High | llm-provider,tts-audio | docs(skill): enableTTS description is stale | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/188) |
| 186 | closed | enhancement | Medium | build-deploy | [Feature]: Add CONTRIBUTING.md to standardize contribution workflow | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/186) |
| 185 | open | - | High | llm-provider,web-search | [Bug]: Stale generationSession in sessionStorage causes false Tavily … | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/185) |
| 184 | closed | bug | Medium | build-deploy | [Bug]: 视频生成都不能成功 | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/184) |
| 183 | open | enhancement | High | llm-provider,web-search | Per-provider proxy support for server-side fetch calls | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/183) |
| 181 | open | bug | High | build-deploy | [Bug]: 生成的互动页面，不能互动！ | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/181) |
| 180 | open | enhancement | Low | llm-provider | feat: support MinerU official cloud API for PDF parsing | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/180) |
| 179 | closed | bug | Low | build-deploy | [Bug]: Live Demo broken | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/179) |
| 174 | open | enhancement | High | classroom-persistence | [Feature]: UI界面问题 | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/174) |
| 173 | open | enhancement | High | classroom-persistence,ui-ux | [Feature]: Add outline review and refinement step before content gene… | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/173) |
| 172 | closed | - | Medium | classroom-persistence | docs: language field options not documented in skill reference | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/172) |
| 166 | closed | - | High | classroom-persistence | bug: missing i18n keys `pdfLoadFailed`, `pdfParseFailed`, `streamNotR… | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/166) |
| 165 | closed | - | Low | - | bug: `mml2omml()` return type mismatch in `latex-to-omml.ts` | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/165) |
| 162 | open | enhancement | Low | llm-provider,tts-audio | [Feature]: Multi-Agent Voice Breakout Rooms for Active Collaborative … | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/162) |
| 161 | closed | - | Low | - | 请问如果在openclaw接入openmaic，可以使用codingplan套餐吗 | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/161) |
| 159 | open | bug | Medium | build-deploy | [Bug]: 生成未完成的页面显示bug | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/159) |
| 158 | closed | - | Low | - | OpenMAIC推荐硬件配置 | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/158) |
| 157 | open | - | High | classroom-persistence | feat: Course Prompt Preset Panel (community templates + user saved pr… | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/157) |
| 156 | open | - | Low | ui-ux | [Feature]: Whiteboard drawing pen — user annotations with optional VL… | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/156) |
| 155 | open | - | High | tts-audio,classroom-persistence | [Feature]: Solo discussion mode — allow disabling agent participation | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/155) |
| 154 | open | - | High | classroom-persistence,build-deploy | feat: allow users to resume previous QA sessions from the discussion … | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/154) |
| 152 | closed | enhancement | High | classroom-persistence | [Feature]: 讨论的逻辑太死板！！！！！真人机对话 | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/152) |
| 148 | open | - | High | classroom-persistence | feat: support multiple PDF uploads per generation | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/148) |
| 146 | closed | - | Low | - | coding plan 如何使用 | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/146) |
| 145 | closed | - | Medium | llm-provider,tts-audio | [Bug]: Browser-native TTS produces broken/garbled audio during classr… | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/145) |
| 143 | closed | - | Low | - | 请教下，视频是用什么做的呢？非常感谢！ | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/143) |
| 140 | open | - | High | classroom-persistence,build-deploy | feat: support DOCX file upload | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/140) |
| 138 | open | - | High | llm-provider,web-search | feat: unify server-side web search to support multiple providers (pos… | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/138) |
| 135 | closed | - | Low | llm-provider,web-search | bug: Settings page crashes when localStorage contains a stale/removed… | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/135) |
| 132 | closed | enhancement | Medium | llm-provider,tts-audio | [Feature]: Add ElevenLabs TTS provider | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/132) |
| 130 | closed | - | Low | tts-audio | feat: add 1.25x playback speed option | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/130) |
| 127 | open | - | High | llm-provider,tts-audio | [Bug]: Roundtable UI state not cleaned up after QA/Discussion request… | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/127) |
| 125 | closed | - | High | llm-provider,tts-audio | [Bug]: Roundtable UI state not cleaned up after QA/Discussion request… | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/125) |
| 120 | closed | - | Medium | web-search | 如何正确输入话题 | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/120) |
| 119 | closed | bug | High | web-search | [Bug]: Web search fails when query exceeds Tavily's 400-char limit | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/119) |
| 118 | open | bug | High | llm-provider | [Bug]: LLM auto-select doesn't override unusable provider from localS… | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/118) |
| 117 | closed | bug | High | classroom-persistence,ui-ux | [Bug]: Video placeholder src causes unnecessary 404 requests | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/117) |
| 116 | closed | bug | Critical | security,llm-provider | [Bug]: Chat fails with "Unknown provider: custom-xxx" for custom prov… | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/116) |
| 115 | open | bug | High | build-deploy | [Bug]:白板和做题区域太小了，无法查看 | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/115) |
| 109 | open | bug | Critical | classroom-persistence,build-deploy | [Bug]: 官方网站生成的课件，课堂讨论没有声音输出，正常教学有声音 | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/109) |
| 103 | open | enhancement | High | classroom-persistence,build-deploy | [Feature]: [Feature Request] Export course package with interactive A… | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/103) |
| 102 | open | enhancement | High | classroom-persistence | [Feature]: 希望有课程讲解的画面全屏或最大化的功能 | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/102) |
| 101 | closed | enhancement | Low | tts-audio | [Feature]: 希望能支持课程生成好之后能切换tts | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/101) |
| 100 | closed | enhancement | Low | tts-audio | [Feature]: Language Support & Localization Documentation to add more … | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/100) |
| 88 | open | bug | Medium | build-deploy | [Bug]: 初中生成的公式有问题，存在乱码 | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/88) |
| 87 | closed | enhancement | Medium | web-search,classroom-persistence | [Feature]: 希望Image Generation、Video Generation、Web Search、能够支持grok的调用 | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/87) |
| 86 | closed | bug | High | classroom-persistence,build-deploy | 使用托管OpenMAIC方式生成了两个课件均无声音 | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/86) |
| 84 | closed | bug | High | classroom-persistence,build-deploy | [Bug]: openclaw插件生成的课堂没有声音 | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/84) |
| 81 | open | enhancement | High | classroom-persistence | [Feature]: 生成的讲解ppt页面数量太少了 | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/81) |
| 79 | open | - | High | build-deploy | Add unit testing infrastructure with Vitest | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/79) |
| 78 | closed | - | Low | - | Slide content should be more concise; verbose and conversational text… | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/78) |
| 76 | closed | - | Medium | llm-provider,tts-audio | [Bug]: Qwen ASR always returns "嗯。" regardless of input | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/76) |
| 74 | open | bug | High | classroom-persistence,build-deploy | [Bug]: 多个讨论的时候，白板重叠了 | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/74) |
| 73 | open | enhancement | High | classroom-persistence | [Feature]关于小组讨论的个人建议 | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/73) |
| 72 | open | enhancement | High | classroom-persistence | [Feature]: 需要一个生成后，再编辑功能 | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/72) |
| 70 | open | enhancement | High | classroom-persistence | [Feature]: 支持Gemini接入Google Cloud Vertex AI endpoint | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/70) |
| 69 | open | enhancement | High | classroom-persistence | [Feature]: 下载中添加一个视频下载功能 | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/69) |
| 68 | open | enhancement | Medium | - | [Feature]: 先进行一轮内容校准，再进行在线课程生成，这样更加符合业务需求 | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/68) |
| 60 | open | bug | Medium | build-deploy | [Bug]: 画板框架界面问题 | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/60) |
| 57 | open | - | High | classroom-persistence,ui-ux | Feature: persist quiz attempts and expose assessment context for down… | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/57) |
| 56 | closed | - | Medium | classroom-persistence,ui-ux | Feature: persist quiz attempts and expose assessment context for down… | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/56) |
| 55 | open | bug | Critical | classroom-persistence,build-deploy | [Bug]: 配置图像生成模型，测试连接服务成功，实际使用失败 | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/55) |
| 53 | open | - | High | classroom-persistence | [Bug] 课程数据未持久化到服务器磁盘 | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/53) |
| 52 | closed | enhancement | Medium | classroom-persistence | [Feature]: 需要文件总结功能 | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/52) |
| 51 | closed | bug | High | classroom-persistence,build-deploy | [Bug]: 通过openclaw利用托管的形式生成没有声音 | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/51) |
| 49 | closed | - | Medium | llm-provider,web-search | feat: extend /api/generate-classroom to support full generation featu… | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/49) |
| 47 | open | enhancement | High | classroom-persistence | [Feature]: 需要可查阅机器人讨论聊天历史记录 | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/47) |
| 46 | closed | bug | Medium | web-search,build-deploy | [Bug]: Web search failed | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/46) |
| 43 | open | - | Low | web-search | feat: Question Bank Reference for course generation | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/43) |
| 39 | open | enhancement | Low | tts-audio | [Feature]: 将语音播报扩展至讨论环节，支持全局语音 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/39) |
| 38 | open | - | Low | ui-ux | feat: Whiteboard element overlap detection and auto-layout | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/38) |
| 37 | open | enhancement | Medium | - | [Feature]: 讨论环节增加完整重播功能与播放速度控制 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/37) |
| 36 | open | enhancement | Medium | - | [Feature]: 讲解增加播放进度条 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/36) |
| 35 | open | bug | Critical | security,build-deploy | [Bug]: 模型无法加载 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/35) |
| 34 | open | enhancement | Medium | - | [Feature]: 课程重命名与文件夹分类 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/34) |
| 33 | open | enhancement | Medium | - | [Feature]: 内置笔记系统 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/33) |
| 32 | closed | enhancement | Low | ui-ux | [Feature]: 白板历史版本与自动保存 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/32) |
| 29 | open | enhancement | High | classroom-persistence | [Feature]: 生成完的内容如何修改？ | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/29) |
| 27 | open | enhancement | Low | - | [Feature]: 希望 AI 助教和 AI 同学也能有语音功能 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/27) |
| 26 | open | bug | High | build-deploy | [Bug]: 豆包生图接口失败 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/26) |
| 25 | closed | bug | Low | llm-provider,tts-audio | [Bug]: 浏览器原生 TTS (browser-native-tts) 播放时没有声音 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/25) |
| 23 | open | enhancement | High | classroom-persistence | [Feature]: 最好能支持多用户和后台管理 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/23) |
| 22 | open | enhancement | High | classroom-persistence | [Feature]: Add cognitive profile assessment for personalized learning… | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/22) |
| 19 | closed | bug | Medium | build-deploy | [Bug]: 互动白板内容超出画布时无法拖拽查看 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/19) |
| 18 | closed | - | High | build-deploy | pnpm install 执行时触发了 postinstall 脚本，该脚本会依次构建 mathml2omml 和 pptxgenjs 两… | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/18) |
| 15 | closed | - | Low | tts-audio | tts stt 配置问题 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/15) |
| 14 | open | - | Low | llm-provider,tts-audio | Feature Request: 增加对 TTS 服务商 Model ID 的灵活配置支持 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/14) |
| 12 | closed | - | Low | tts-audio | 课程播放过程中没有声音 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/12) |
| 11 | open | - | Low | - | 请生成一堂中文互动课，课程名称：《大模型是如何工作的》 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/11) |
| 9 | closed | - | Low | - | 希望支持上传或AI生成 flashcards复习 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/9) |
| 8 | open | - | Medium | - | 上传pdf文档后无法生成学习课程？ | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/8) |
| 7 | open | - | Medium | - | 生图配置测试通过，但生图失败。 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/7) |
| 6 | closed | - | High | llm-provider,tts-audio | 配置 TTS 无法验证通过 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/6) |
| 5 | closed | - | Low | - | ask about the sound pronblems | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/issues/5) |

## 九、全量 PR 索引表（全部条目）

| # | State | Merge 结果 | 严重度 | 风险域 | 标题 | 创建时间 | 源链接 |
|---:|---|---|---|---|---|---|---|
| 221 | closed | merged | High | llm-provider,build-deploy | fix: use resolved API key in chat route instead of client-sent key | 2026-03-23 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/221) |
| 218 | open | open | Critical | security,classroom-persistence | fix: persist classroom to server for cross-device access | 2026-03-23 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/218) |
| 217 | open | open | Critical | security,build-deploy | fix: strengthen SSRF guard IPv6 coverage and replace Math.random() se… | 2026-03-23 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/217) |
| 215 | open | open | High | build-deploy | feat: add German language support (de-DE) | 2026-03-22 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/215) |
| 213 | open | open | Critical | security,classroom-persistence | fix(storage): local disk persistence for classroom data generated via… | 2026-03-22 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/213) |
| 211 | open | open | High | llm-provider,tts-audio | feat: add Discussion TTS with per-agent voice assignment | 2026-03-22 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/211) |
| 210 | open | open | High | build-deploy | Kelas ka | 2026-03-22 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/210) |
| 207 | open | open | High | llm-provider,tts-audio | feat: Add Xiaomi MiMo Support | 2026-03-22 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/207) |
| 206 | closed | closed-unmerged | High | llm-provider,build-deploy | fix: pass providerType to chat api | 2026-03-22 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/206) |
| 199 | closed | closed-unmerged | Medium | llm-provider,classroom-persistence | Study API hardening + OpenAI Responses support + MinerU config docs (… | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/199) |
| 198 | open | open | Critical | tts-audio,classroom-persistence | feat: add pre-generation outline review | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/198) |
| 195 | open | open | High | tts-audio,build-deploy | feat: refine presentation mode speech bubbles, input flow, and access… | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/195) |
| 194 | open | open | Critical | llm-provider,web-search | fix: clean up stale generationSession on failure | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/194) |
| 193 | closed | merged | Low | - | fix: guard against undefined action.content in executeWbDrawText | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/193) |
| 191 | open | open | Low | llm-provider,build-deploy | add MinerU cloud API support | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/191) |
| 190 | closed | merged | Critical | security,build-deploy | docs: add CONTRIBUTING.md to standardize contribution workflow | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/190) |
| 189 | closed | merged | Low | - | chore: add Claude Code directories to ESLint global ignores | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/189) |
| 187 | closed | merged | Low | - | chore: add Claude Code local files to .gitignore | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/187) |
| 182 | open | open | High | llm-provider,tts-audio | feat: add and expand MiniMax provider support | 2026-03-21 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/182) |
| 178 | open | open | Critical | build-deploy | fix: 修复浏览器语音识别的拼写错误和语言硬编码问题 | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/178) |
| 177 | open | open | High | classroom-persistence | Add initial Russian locale support to the OpenMAIC UI | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/177) |
| 176 | open | open | High | classroom-persistence | Fix classroom generation language normalization for non-English local… | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/176) |
| 175 | open | open | High | llm-provider,tts-audio | feat/azure-asr-support | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/175) |
| 171 | closed | merged | Medium | classroom-persistence | docs(skill): clarify language field options | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/171) |
| 170 | open | open | Low | llm-provider | feat: add MiniMax M2.7 and M2.5-highspeed models | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/170) |
| 169 | open | open | Low | ui-ux | Revert "feat: add pan, zoom, and auto-fit to whiteboard canvas" | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/169) |
| 168 | closed | merged | Low | - | fix: add missing i18n keys pdfLoadFailed, pdfParseFailed, streamNotRe… | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/168) |
| 167 | closed | merged | Low | - | fix: wrap mml2omml() return with String() for type safety | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/167) |
| 164 | closed | closed-unmerged | Medium | build-deploy | Claude/merge all branches be z0 b | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/164) |
| 163 | open | open | Low | llm-provider,ui-ux | Fix action filtering logic and add safety improvements | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/163) |
| 160 | open | open | Critical | - | feat: support multiple PDF uploads per generation | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/160) |
| 153 | closed | merged | Medium | llm-provider,tts-audio | fix(tts): fix browser-native TTS playback and add provider switching … | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/153) |
| 151 | closed | closed-unmerged | Medium | build-deploy | Claude/code review wg kt d | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/151) |
| 149 | open | open | Low | - | fix(asr-settings): 检查mediaDevices API是否可用 | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/149) |
| 147 | closed | closed-unmerged | Critical | security,llm-provider | feat(interview): add /api/interview/turn route via orchestration syst… | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/147) |
| 144 | open | open | Critical | llm-provider,web-search | test: add Vitest infrastructure with provider-config and settings-syn… | 2026-03-20 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/144) |
| 142 | open | open | High | llm-provider,build-deploy | chore: Remove GPT-4o, GPT-4o-mini, GPT-4-turbo, and Gemini 3 Pro Prev… | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/142) |
| 139 | closed | closed-unmerged | Low | llm-provider,web-search | fix: guard web search toggle & submit when selected provider is unusa… | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/139) |
| 137 | closed | merged | Low | llm-provider,web-search | fix: gracefully handle stale provider IDs in localStorage | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/137) |
| 136 | open | open | High | classroom-persistence,ui-ux | fix: persist whiteboard history (per-stage) and whiteboard content ac… | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/136) |
| 134 | closed | merged | Medium | llm-provider,tts-audio | feat: add ElevenLabs TTS provider | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/134) |
| 133 | open | open | High | tts-audio,classroom-persistence | feat: add presentation mode with fullscreen, idle-hide, and keyboard … | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/133) |
| 131 | closed | merged | Low | tts-audio | feat: add 1.25x playback speed option | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/131) |
| 129 | closed | merged | Low | tts-audio | feat: discussion buffer-level pause (freeze text reveal without abort… | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/129) |
| 128 | open | open | Medium | llm-provider | fix: clean up Roundtable UI state after QA/Discussion request failure | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/128) |
| 126 | open | open | High | llm-provider,build-deploy | fix: auto-select usable provider when local model is stale | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/126) |
| 124 | open | open | High | classroom-persistence | fix: harden classroom persistence and editor flows | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/124) |
| 123 | closed | merged | High | classroom-persistence,ui-ux | fix: prevent video placeholder src from causing 404 requests (#117) | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/123) |
| 122 | closed | merged | High | web-search | fix: truncate Tavily query to 400-char limit (#119) | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/122) |
| 121 | closed | closed-unmerged | High | llm-provider,web-search | fix: normalize Tavily queries before search | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/121) |
| 114 | closed | merged | High | llm-provider,build-deploy | fix: forward providerType to chat API for custom provider support | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/114) |
| 113 | closed | merged | Medium | llm-provider,web-search | feat: add Grok (xAI) support as an LLM, image generation, and video g… | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/113) |
| 111 | open | open | High | classroom-persistence | fix(generate): persist generated agents in API classrooms | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/111) |
| 108 | open | open | High | llm-provider,tts-audio | adds configurable model support for TTS and ASR | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/108) |
| 107 | closed | closed-unmerged | Medium | build-deploy | test: introduce Vitest and add initial unit test suite for core utili… | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/107) |
| 105 | closed | closed-unmerged | Low | tts-audio | Add Language Support documentation (Issue #100) | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/105) |
| 104 | open | open | High | build-deploy | Add Vitest unit testing infrastructure (Issue #79) | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/104) |
| 99 | closed | closed-unmerged | Low | tts-audio | fix(audio): fix Qwen ASR always returning "嗯。" | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/99) |
| 98 | open | open | Medium | llm-provider,build-deploy | feat: add Sora video generation adapter and integrate with video prov… | 2026-03-19 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/98) |
| 97 | closed | closed-unmerged | Medium | llm-provider,build-deploy | Add self-hosted deployment stack with Keycloak, Cloudflare Tunnel, an… | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/97) |
| 96 | closed | closed-unmerged | Low | llm-provider,tts-audio | fix: resolve React 19 insertBefore DOM errors from conditional icon r… | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/96) |
| 95 | open | open | High | llm-provider,tts-audio | feat: add Traditional Chinese (zh-TW) language support | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/95) |
| 94 | open | open | Critical | security,llm-provider | feat: Ollama local LLM support | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/94) |
| 93 | open | open | Low | llm-provider | feat: add one-click latest model sync for provider settings | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/93) |
| 91 | open | open | High | llm-provider,tts-audio | feat(tts): add Gemini TTS provider support | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/91) |
| 90 | open | open | Critical | security,llm-provider | Update Node.js version requirements and fix 11 bugs | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/90) |
| 89 | closed | closed-unmerged | Critical | security,llm-provider | Update Node.js version requirements and fix 11 bugs | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/89) |
| 85 | closed | merged | Low | tts-audio | fix(prompts): prevent teacher identity and verbose text on slides | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/85) |
| 83 | open | open | High | llm-provider,tts-audio | Enhance MediaPopover | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/83) |
| 82 | closed | closed-unmerged | Low | tts-audio,ui-ux | fix(audio): prevent Qwen ASR from returning placeholder text | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/82) |
| 80 | open | open | Critical | security,build-deploy | Add unit testing infrastructure with Vitest | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/80) |
| 75 | closed | merged | High | llm-provider,tts-audio | feat(generate): server-side media & TTS generation | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/75) |
| 71 | closed | merged | Medium | build-deploy | chore: fix some minor issues in the comments | 2026-03-18 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/71) |
| 67 | closed | merged | Medium | llm-provider,tts-audio | fix: reset ASR language when changing provider | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/67) |
| 66 | open | open | Critical | classroom-persistence | docs: improve hosted mode API documentation | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/66) |
| 65 | open | open | Critical | - | feat: add PDF content summarization for long documents | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/65) |
| 64 | open | open | High | classroom-persistence,build-deploy | Add quiz assessment context MVP | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/64) |
| 63 | open | open | High | llm-provider,tts-audio | fix: improve browser TTS preview and dedupe provider options | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/63) |
| 62 | closed | closed-unmerged | Medium | llm-provider,tts-audio | fix: support browser-native TTS in classroom playback | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/62) |
| 61 | closed | closed-unmerged | Medium | build-deploy | Copilot/implement critical fixes | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/61) |
| 59 | open | open | Low | llm-provider,web-search | feat: support HTTP_PROXY/HTTPS_PROXY env vars for all outbound reques… | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/59) |
| 58 | open | open | High | classroom-persistence,ui-ux | feat: add course rename (partial #34) | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/58) |
| 54 | open | open | Critical | llm-provider,tts-audio | fix: Resolve Mac Chrome TTS invocation, Qwen TTS missing parameters a… | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/54) |
| 50 | closed | closed-unmerged | Medium | llm-provider,tts-audio | fix: add configurable models for tts and asr | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/50) |
| 48 | closed | merged | High | llm-provider,build-deploy | fix: isolate settings API key autofill fields | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/48) |
| 45 | closed | merged | Low | build-deploy | fix: remove invalid bodyParser config in vercel.json | 2026-03-17 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/45) |
| 44 | open | open | High | build-deploy,ui-ux | feat: add question bank reference for course generation | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/44) |
| 42 | open | open | High | llm-provider,web-search | feat: add Brave Search & Baidu Search integration with sub-source sup… | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/42) |
| 41 | open | open | High | classroom-persistence | feat: support MD/TXT file upload alongside PDF | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/41) |
| 40 | closed | merged | Medium | classroom-persistence,ui-ux | feat: whiteboard history and auto-save | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/40) |
| 31 | closed | merged | Medium | ui-ux | feat: add pan, zoom, and auto-fit to whiteboard canvas | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/31) |
| 30 | closed | merged | Critical | security,llm-provider | Fix SSRF/credential forwarding via client-supplied baseUrl | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/30) |
| 28 | closed | merged | Medium | llm-provider,tts-audio | fix: use browser speechSynthesis for playback when browser-native-tts… | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/28) |
| 24 | closed | closed-unmerged | Low | llm-provider,tts-audio | feat: add TTS Model ID configuration UI | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/24) |
| 21 | closed | merged | Medium | build-deploy | fix(build):Next.js 16 要求 Node.js >= 20.9.0 | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/21) |
| 20 | closed | merged | Medium | build-deploy | fix(build): use cross-platform file copy in mathml2omml | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/20) |
| 17 | closed | merged | Low | - | docs: add GitHub issue and PR templates | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/17) |
| 16 | closed | merged | High | llm-provider,tts-audio | fix(tts): fix GLM TTS silent failure due to text length limit and err… | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/16) |
| 13 | closed | merged | Low | llm-provider,tts-audio | fix(tts): use provider's default voice when testing non-active provid… | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/13) |
| 10 | closed | closed-unmerged | Low | llm-provider,tts-audio | fix: use provider-specific default voice when testing TTS in settings | 2026-03-16 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/10) |
| 4 | closed | merged | Critical | security,tts-audio | feat: add OpenClaw plugin and upgrade generate-classroom API | 2026-03-13 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/4) |
| 3 | closed | merged | Medium | llm-provider,build-deploy | fix: correct MinerU deployment and add PDF provider test | 2026-03-13 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/3) |
| 2 | closed | merged | Medium | llm-provider,build-deploy | feat: support Vercel one-click deploy | 2026-03-12 | [link](https://github.com/THU-MAIC/OpenMAIC/pull/2) |

## 十、源引用

- 仓库主页：[https://github.com/THU-MAIC/OpenMAIC](https://github.com/THU-MAIC/OpenMAIC)
- Issues 列表：[https://github.com/THU-MAIC/OpenMAIC/issues](https://github.com/THU-MAIC/OpenMAIC/issues)
- PR 列表：[https://github.com/THU-MAIC/OpenMAIC/pulls](https://github.com/THU-MAIC/OpenMAIC/pulls)
- 最新主干提交：[https://github.com/THU-MAIC/OpenMAIC/commit/1f84f4c4a75a2385621db3b851a1ab33b6a939e1](https://github.com/THU-MAIC/OpenMAIC/commit/1f84f4c4a75a2385621db3b851a1ab33b6a939e1)
- 上表每一项都带对应 issue / PR 原始链接。

## 十一、结合本地 PRD 的人工研判（比启发式分级更值得优先看）

> 这一节是把本地 PRD、仓库结构与 OpenMAIC issue / PR 交叉后，做的**人工筛选严重项**。如果你要决定是否 fork / selective merge，请优先看本节；上面的全量表格仍然保留，便于追溯。

### 11.1 PRD 与 OpenMAIC 的关系

| 维度 | 结论 | 本地依据 |
|---|---|---|
| 入口 1 | 明确要做“完整虚拟教室 / 课堂服务”，核心能力直接借鉴 OpenMAIC | `/Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/_bmad-output/planning-artifacts/prd.md` |
| 入口 2 | 单题讲解视频，主线来自 ManimToVideoClaw，不应从 OpenMAIC 直接搬运 | `/Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/references/manim-to-video-claw/README.zh-CN.md` |
| 用户系统 | 走 RuoYi，和 OpenMAIC 解耦 | `/Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/packages/RuoYi-Vue-Plus-5.X/README.md` |
| 当前状态 | OpenMAIC 主要仍是只读参考，ToC 实现层尚未落地 | `/Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/references/openmaic/README-zh.md`、`/Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/packages/fastapi-backend/README.md` |

### 11.2 人工判定的阻断级 / P0 issues

| 编号 | 主题 | 为什么是 P0 | 源链接 |
|---:|---|---|---|
| 220 | chat 路由误用客户端 key，服务端 API key 回退失效 | 会让 server-configured 部署直接 401，属于基线级回归 | [#220](https://github.com/THU-MAIC/OpenMAIC/issues/220) |
| 216 | 图片不显示、头像与语音不一致、第二页 slide 无法载入 | 课堂内容正确性和可播放性被破坏 | [#216](https://github.com/THU-MAIC/OpenMAIC/issues/216) |
| 181 | 互动页面生成后无法交互 | 直接打断互动课堂核心链路 | [#181](https://github.com/THU-MAIC/OpenMAIC/issues/181) |
| 53 | 课程数据没有写入服务器磁盘 | 换浏览器 / 重启后课件丢失，跨设备不可用 | [#53](https://github.com/THU-MAIC/OpenMAIC/issues/53) |
| 118 | 旧 provider 本地缓存没有被自动纠正 | 请求会落到不可用 provider，生成直接失败 | [#118](https://github.com/THU-MAIC/OpenMAIC/issues/118) |
| 109 | 课堂讨论没有声音，且轮次提前中断 | 讨论场景不可用，严重影响课堂体验 | [#109](https://github.com/THU-MAIC/OpenMAIC/issues/109) |
| 55 | 图片生成模型测试通过但实际使用失败 | 配置验证与真实可用性不一致，会误导上线判断 | [#55](https://github.com/THU-MAIC/OpenMAIC/issues/55) |
| 26 | 豆包 / Qwen 生图实际失败 | 核心图像生成能力不可用 | [#26](https://github.com/THU-MAIC/OpenMAIC/issues/26) |
| 7 | 生图配置验证通过，但真实生成失败 | “能测通”不代表“能用” | [#7](https://github.com/THU-MAIC/OpenMAIC/issues/7) |
| 8 | PDF 导入后无法生成课堂 | 课程导入链路断裂 | [#8](https://github.com/THU-MAIC/OpenMAIC/issues/8) |

### 11.3 人工判定的高风险 / P1 issues

| 编号 | 主题 | 影响 | 源链接 |
|---:|---|---|---|
| 208 | 多人讨论时白板文字重叠 | 讨论内容可读性差 | [#208](https://github.com/THU-MAIC/OpenMAIC/issues/208) |
| 74 | 多轮讨论时白板内容重叠 | 多 Agent 场景不可读 | [#74](https://github.com/THU-MAIC/OpenMAIC/issues/74) |
| 115 | 白板和做题区域过小 | 学习操作受阻 | [#115](https://github.com/THU-MAIC/OpenMAIC/issues/115) |
| 127 | QA / Discussion 失败后 Roundtable 状态不清理 | 页面可能卡死、需要刷新恢复 | [#127](https://github.com/THU-MAIC/OpenMAIC/issues/127) |
| 185 | 失败后 stale session 被重放，误触发 Tavily 错误 | 重试逻辑混乱，调试成本高 | [#185](https://github.com/THU-MAIC/OpenMAIC/issues/185) |
| 88 | 数学公式乱码 | 学科内容准确性下降 | [#88](https://github.com/THU-MAIC/OpenMAIC/issues/88) |
| 35 | 模型配置了但列表里不出现 | provider 发现 / 选择链路不稳定 | [#35](https://github.com/THU-MAIC/OpenMAIC/issues/35) |
| 60 | 画板框架布局问题 | 白板体验受损 | [#60](https://github.com/THU-MAIC/OpenMAIC/issues/60) |
| 159 | 未完成页面显示异常 | 生成中状态不可靠 | [#159](https://github.com/THU-MAIC/OpenMAIC/issues/159) |

### 11.4 建议优先吸收的 PR

| 编号 | 状态 | 主题 | 为什么优先 | 源链接 |
|---:|---|---|---|---|
| 221 | merged | 修复 chat 路由对服务端 API key 的误处理 | 是 #220 的直接修复，属于基线 bugfix | [#221](https://github.com/THU-MAIC/OpenMAIC/pull/221) |
| 217 | open | SSRF 防护增强 + session ID 改为安全随机 | 安全底线，建议尽快吸收 | [#217](https://github.com/THU-MAIC/OpenMAIC/pull/217) |
| 218 | open | 课程数据持久化到服务端，支持跨设备访问 | 对应 PRD 的稳定性 / 持久化核心诉求 | [#218](https://github.com/THU-MAIC/OpenMAIC/pull/218) |
| 213 | open | 浏览器 UI 流程也写入服务器磁盘 | 解决“只在当前浏览器可见”的问题 | [#213](https://github.com/THU-MAIC/OpenMAIC/pull/213) |
| 211 | open | 讨论环节每个 Agent 使用独立声音 | 对课堂讨论与角色塑造很关键 | [#211](https://github.com/THU-MAIC/OpenMAIC/pull/211) |
| 194 | open | 失败后清理 stale generation session | 直接修复 #185 类重试污染 | [#194](https://github.com/THU-MAIC/OpenMAIC/pull/194) |
| 136 | open | 白板历史和持久化 | 对教学过程保存重要 | [#136](https://github.com/THU-MAIC/OpenMAIC/pull/136) |
| 133 | open | 演示模式支持全屏、自动隐藏与键盘导航 | 对正式课堂演示实用性强 | [#133](https://github.com/THU-MAIC/OpenMAIC/pull/133) |
| 128 | open | QA / Discussion 失败后清理 Roundtable 状态 | 解决 UI 卡死和状态残留 | [#128](https://github.com/THU-MAIC/OpenMAIC/pull/128) |
| 126 | open | 当本地 model 已失效时自动切到可用 provider | 直接应对 #118 这类 provider 污染 | [#126](https://github.com/THU-MAIC/OpenMAIC/pull/126) |
| 124 | open | 加固课堂持久化和编辑流程 | 与你方核心稳定性目标一致 | [#124](https://github.com/THU-MAIC/OpenMAIC/pull/124) |
| 108 | open | TTS / ASR 支持可配置模型 | 对后续多供应商扩展重要 | [#108](https://github.com/THU-MAIC/OpenMAIC/pull/108) |

### 11.5 最终 fork 结论

| 结论 | 建议 |
|---|---|
| 是否值得 fork | **值得**，但应把它视为“课堂核心参考基线”，不是稳定黑盒 |
| 是否直接整仓合并 | **不建议** |
| 推荐方式 | **fork + selective merge + 自己的适配层 / 回归测试** |
| UI 层 | 借鉴交互结构，不直接复制样式 |
| 视频服务 | 保持 Manim 路线，不从 OpenMAIC 强行合并 |
| 用户系统 | 保持 RuoYi 路线，不和 OpenMAIC 深耦合 |
| 许可证注意事项 | OpenMAIC 为 **AGPL-3.0**，如直接复用 / 修改 / 分发代码，请先评估合规影响 |
