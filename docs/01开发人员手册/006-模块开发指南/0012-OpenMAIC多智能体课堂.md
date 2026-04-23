# OpenMAIC 多智能体课堂模块

**模块状态**：P0 + P1 核心路径已跑通真 LLM（2026-04-23）
**功能分支**：`feature/openmaic-port`（master 之上 14 commit，最新 `d52c65e`）
**参考项目**：`references/OpenMAIC/`（Next.js 16 + React 19 + LangGraph + Vercel AI SDK）
**移植策略**：直接照搬参考项目行为 → LLM 层替换为我们既有 FastAPI `LLMProvider` 协议；UI 入口复用既有 `/classroom/input` 现成样式，不自建重复首页。

---

## 1. 功能概述

OpenMAIC 把一句主题变成一堂完整的多智能体 AI 课堂：

| 阶段 | 输入 | 输出 | 后端服务 |
|------|------|------|----------|
| Stage 1：提纲生成 | 主题文本（可叠加 PDF 文本） | 4-10 个场景提纲（slide / quiz / interactive / PBL） | `POST /api/v1/openmaic/classroom` 派发 Dramatiq 任务，内部调 `outline_generator` |
| Stage 1.5：智能体档案 | 提纲 + 主题 | 1-4 个 Agent 人设（teacher / assistant / student） | `agent_profiles` 生成器 |
| Stage 2：场景内容 | 每条提纲 + Agent 列表 | 幻灯片内容 / 习题 / 交互 HTML / 项目任务 | `scene_generator` 调 LLM 一次 / 场景 |
| Stage 2.5：Agent 动作 | 场景内容 + Agent 人设 | 动作数组（speech / spotlight / draw_* 等） | `scene_actions` 生成器 |
| 持久化 | 上述全部 | 一整份 Classroom JSON | Redis 运行态（FastAPI `JobStore`）；前端 Dexie IndexedDB 客户端持久化 |
| 讨论 | 用户提问 + 课堂上下文 + agents | 多 Agent 讨论 SSE 事件流 | `POST /api/v1/openmaic/chat` → Team C `DirectorGraph` (Python LangGraph) |

---

## 2. 已完成（P0 + P1 核心）

### 2.1 后端（FastAPI）

- **`app/features/openmaic/` feature 完整落地**，12 个端点（bootstrap / classroom CRUD / SSE / 4 个 generate / chat / quiz-grade / parse-pdf / web-search）。
- **`ProviderRuntimeResolver.resolve_by_module_code(module_code, stage_code, access_token, client_id)`** — 新增通用单阶段 LLM 链路解析器，按阶段过滤 `xm_ai_module_binding` 并按 priority 组装 Provider 链，未授权/RuoYi 不可用时降级到 settings。
- **Access token 全链路穿透 Dramatiq**：`/classroom` route → `OpenMAICService.create_classroom_job` → `run_classroom_generation.send(access_token=...)` → worker 的 `resolve_openmaic_providers(stage, access_token, client_id)`，让 worker 能从 token-scoped 会话读 RuoYi 的 binding。
- **DB bindings**：`xm_ai_module` 新增 `openmaic`（id 202604230001）+ `xm_ai_module_binding` 11 条（outline / scene_content / scene_actions / agent_profiles / director / quiz_grade），主链路 **gemini-3-flash**（`2043680434583482370`）+ 备链路 **deepseek-v3-chat**。
- **多智能体编排 (Team C LangGraph)**：`director_graph.py` + `director_prompt.py` + `tool_schemas.py` + `prompt_builder.py` + `summarizers.py` + `ai_sdk_adapter.py` 共 ~2100 LOC，22 个单测全绿。
- **Chat 路由 ↔ Team C 桥接**：`ChatRequest` → `DiscussionRequest` 形状映射（`messages[].parts`、`ClassroomContext` 正确字段），orchestration `ChatEvent` → 前端友好形状在 SSE 边界翻译。
- **Chat 防死循环**：director_node 在 agents 为空时直接返回 `should_end`（避免硬编码 `default-1` 无限 dispatch 到 25 层 LangGraph 递归限）；`recursion_limit` 按 `max_turns*2+4` 自动扩展。
- **Schema 兼容性**：`AgentProfile.persona` 默认 `""`，`ChatRequest.model_config = {"extra": "ignore"}` 容忍前端 `storeState/config` 旧字段。
- **56 + 22 = 78 单测**全部绿（routes / llm_adapter / outline / scene / json_repair / director_graph）。

### 2.2 前端（student-web）

- **入口复用 `/classroom/input`**（删除了冗余的 `/openmaic` 首页）：既有 `ClassroomInputCard` 的 `onSubmit` 接入 `useClassroomCreate`；按钮标签动态展示 `生成中... <progress>%`。
- **播放页 `/openmaic/classroom/:classroomId`** 三栏布局（课程大纲 / 主画布 / 伴学助手）对齐设计稿 `01-classroom.html`。
- **场景渲染器全部按后端真实 shape 对齐**：
  - `slide-renderer.tsx`：绝对定位 960×540 画布，`transform: scale` 自适应，text 用 `dangerouslySetInnerHTML` 渲染富 HTML；shape 支持 `extra.fill/stroke/radius`；`spotlightId` 高亮高亮当前元素。
  - `quiz-renderer.tsx`：按 `stem / options[{id,label,content}] / correctAnswers / explanation` 渲染，客户端选择题自评 + `short_answer` 走 `/quiz-grade` 真 LLM。
  - `interactive-renderer.tsx`：沙箱 iframe `srcDoc` 渲染完整 HTML（已在 Matter.js 物理模拟 + KaTeX 公式上验证）。
  - `pbl-renderer.tsx`：`projectTitle / projectOverview / issues[{id,title,description,assigneeRole}]`，按 role 显示老师/学员/助教图标。
- **动作播放器 `use-action-player.ts`**：
  - 按序执行 `scene.actions`，`spotlight`/`laser` → `currentSpotlightId` 驱动 `SlideRenderer` 高亮；
  - `speech` → 调 `window.speechSynthesis` 中文朗读 + `AgentBubble` 显示真实讲稿（`currentSpeech.text`）；
  - 切场景/暂停时 cancel speechSynthesis；
  - `wb_*` 白板动作 P1：占位短延时（未接入绘制）。
- **Chat SSE 接入**：`use-director-chat.ts` 把 store 里的真实 agents + `classroom.name` + 当前 scene title 拼成 `classroomContext` 发给 `/chat`，前端流式接 `agent_start → text_delta* → done` 并渲染到右侧面板。
- **Store 稳定性修复**：`useSceneList` 返回 frozen `EMPTY_SCENES` 稳定引用，解决 Zustand selector 空数组新引用导致的 maximum-update-depth 死循环；SlideRenderer ResizeObserver 改为 ref-callback + window resize。
- **类型对齐**：`types/scene.ts` 完全重写以匹配 FastAPI `schemas.py`（去除 `content.type` discriminator，`scene.type` 作为联合类型分辨键）。
- **课堂页水合修复**：刷新 `/openmaic/classroom/:id` 时从 `classroom.agents` 回灌 `store.agents`，修复刷新后教师气泡消失。
- **TS / Lint**：`pnpm typecheck` 零错误。

### 2.3 数据库 & 依赖

- **`xm_ai_module_binding` 11 条**已幂等执行（`packages/RuoYi-Vue-Plus-5.X/script/sql/openmaic_bootstrap.sql`）。
- **Python 新增**：`langgraph>=0.2` `langchain-core>=0.3` `pypdf>=5.0` `partial-json-parser>=0.2`。
- **TypeScript 新增**：零（全部复用 student-web 既有 React 19 / Radix UI / Dexie 4.2.1 / Lucide / @assistant-ui/react / TanStack Query / Zustand 5）。

### 2.4 E2E 证据链

1. **主题输入**：`/classroom/input` 输入"用生活案例讲解牛顿第二定律 F=ma 的核心原理和实际应用" → 点击"生成课堂"。
2. **真 LLM 调度**：worker 日志 `resolve_by_module_code called module=openmaic stage=outline source=ruoyi has_token=True`、`HTTP 200 from https://synai996.space/v1/chat/completions model=gemini-3-flash`，13 次 LLM 调用覆盖 outline + agents + 10 个 scene content + scene actions。
3. **课堂完成**：`openmaic.job_runner.completed job_id=classroom_53cb33bb816c scenes=10`。
4. **大纲**：真实场景标题 10 个（生活中的推与拉 → 加速度 → 力与加速度 → 虚拟实验室（互动）→ 质量与惯性 → 核心公式 F=ma → 原理检测站（测验）→ 赛车与交通安全 → 项目实战：货运小车（项目）→ 总结）。
5. **场景渲染**：4/4 类型正确渲染（截图 `.workflow/.scratchpad/slide-01-rendered.png` / `quiz-rendered.png` / `interactive-v2.png` / `pbl-rendered.png`）。
6. **动作播放**：点击场景 → 林老师头像 + 真实讲稿气泡 "想象一下，当你推着一辆空的超市车，它的质量 m 较小..." + `speechSynthesis.speaking=true`（截图 `action-playing-v2.png`）。
7. **Chat 多智能体**：输入 "为什么质量越大加速越难？举个生活例子" → 林老师流式回复 "想象下你在超市推购物车，空的很轻一推就走，装满大米就挣扎..."（截图 `chat-reply-v4.png`）。

---

## 3. 尚未完成（P1 扩展 + P2 高阶）

以下功能 **OpenMAIC 参考项目有、我们还没接**。按优先级排序：

### 3.1 P1 — 功能完整性相关，建议后续迭代补齐

| 项 | 现状 | 需要做什么 |
|---|---|---|
| 白板实时绘制 | 后端正确生成 `wb_draw_text` / `wb_draw_shape` / `wb_draw_latex` / `wb_draw_line` / `wb_clear` 等动作；前端 `Whiteboard` 组件存在但未接 action 流 | 让 `use-action-player` 对 `wb_*` 事件调用 Whiteboard 的 SVG 渲染 API（draw_shape/write_text/highlight/laser_pointer 等原语已在 `types/action.ts` 定义） |
| TTS 高音质 | 当前仅浏览器 `speechSynthesis`（中文音色取决于 OS） | 接我们既有 Edge TTS Docker（`openai-edge-tts:5050/v1`）：`SpeechAction.audioUrl` 由后端预合成后返回，前端 `<audio>` 播放替代 speechSynthesis |
| ASR 语音输入 | 占位按钮未接 | 复用 student-web 既有 `useBrowserAsr` 或接后端 Whisper provider（TBD） |
| 图像生成（slide 中的插图） | slide 元素 `type:"image"` 已预留但 `src` 大多为空 | 新增 `image` capability provider（豆包/SeedEdit/Qwen），scene_generator 产出 image 元素时异步触发图像生成 API，回写 URL |
| 课堂历史列表（OpenMAIC "最近课堂"） | 后端 classroom 持久化到 Redis，Dexie 保存本地；UI 上没入口卡片集 | 在 `/classroom/input` 浏览区下方加"最近课堂" tab；或把 `useRecentClassrooms` 挂到侧栏 |
| Scene 自动过渡 | 手动点击场景才切换；播放结束后未 auto next | `use-scene-player` 的 `goNext` 在 `useActionPlayer` 完成回调后自动调用（可配置 autoPlay 开关） |
| Discussion action（多 Agent 课内讨论） | action 类型已定义，但没有在 `use-action-player` 中触发真实 director graph 调用 | 遇到 `DiscussionAction` 时调 `/chat` 带 `discussion_topic`，在气泡/chat panel 交替呈现多 Agent 发言 |
| 字幕 / Lecture Notes | 左侧笔记 tab 只有 "课堂笔记将在场景播放时自动记录" 占位 | 在动作播放时把 `SpeechAction.text` 按场景累加写入 `store.notes[]`；显示到 companion 侧栏 |
| Chat 断线重连 / 消息持久化 | 已经 saveChatHistory 到 Dexie；未做断线重连 | 用既有 SSE 基础设施（`src/services/sse/*` 有 polling fallback）套到 `streamChat` |
| Classroom 导出 / 导入 | 无 | 前端 `lib/export` 未移植；OpenMAIC 参考项目用 `pptxgenjs`（自定义 fork）+ `mathml2omml` |
| PDF 多模态处理 | `/parse-pdf` 只提纯文本，无图 | 接 MinerU / vision provider 输出结构化版式 + 图像 |

### 3.2 P2 — OpenMAIC v0.2.0+ 高阶特性，工作量较大

| 项 | 说明 |
|---|---|
| **Deep Interactive Mode**：3D 可视化 / 小游戏 / 思维导图 / 在线代码编辑器 | OpenMAIC v0.2.0 新增，需要 @xyflow/react / three.js / Monaco editor 全套 widget；agent 要能"控制"这些 widget（需扩展 tool schema） |
| **Agent 控制 interactive widget** | OpenMAIC 支持老师 agent 主动操作 interactive 组件（点击、输入、演示）。我们的 interactive scene 目前是 iframe 孤岛 |
| **ACCESS_CODE 中间件** | OpenMAIC 提供可选的 ACCESS_CODE 共享部署模式；我们走 RuoYi 认证，不需要，**明确不移植** |
| **Vercel AI SDK → 我们 provider 体系** | 已做。P2 可考虑扩展 `LLMProvider` 协议增加 `stream_generate(prompt) → AsyncIterator[str]` 真 token 流（当前 `stream_llm` 是整块 yield） |
| **LangChain tool calling (native function calling)** | 参考项目是 JSON-in-text 解析；真 tool calling 对 Anthropic/OpenAI 更可靠，但需在 Provider 协议级别扩展 |
| **Extended thinking（o1/o3/Claude thinking）** | 参考项目有 `thinking-context` 配置；我们的 provider 目前直接吞回复，没有 thinking budget 语义 |

### 3.3 明确不移植（与项目定位冲突或冗余）

- OpenMAIC 自带的 **视频生成 provider**（Seedance / Kling / Veo / Sora / MiniMax）：我们已有自己的 Manim 视频管道（参见 `features/video/pipeline/`），不重复。
- **OpenClaw skills**（`skills/openmaic/`）：那是 ChatGPT 插件入口，和我们学生端无关。
- **eval / evaluation harnesses**：评测基础设施，教学平台不用。

---

## 4. 代码与文件结构

### 4.1 FastAPI — `packages/fastapi-backend/app/features/openmaic/`

| 文件 | 职责 | LOC |
|------|------|-----|
| `routes.py` | 12 个 HTTP 端点 + SSE 事件翻译 | ~560 |
| `schemas.py` | Pydantic 模型 | 396 |
| `service.py` | `OpenMAICService` 编排器 | 201 |
| `llm_adapter.py` | `call_llm / stream_llm / resolve_openmaic_providers` | 149 |
| `generation/outline_generator.py` | Stage 1 + SSE | ~200 |
| `generation/scene_generator.py` | Stage 2 + 动作生成 | 407 |
| `generation/action_parser.py` + `json_repair.py` | 鲁棒 JSON 解析 | ~100 |
| `generation/prompts/*.py` | 中文主提示词 | ~200 |
| `jobs/job_runner.py` | Dramatiq actor（全链路编排） | ~150 |
| `jobs/job_store.py` | Redis 作业状态 | 110 |
| `pdf/parser.py` | `pypdf` 文本提取 | 52 |
| `search/tavily_client.py` | 可选 Tavily 包装 | 73 |
| `orchestration/director_graph.py` | LangGraph 多 Agent 状态机 | ~490 |
| `orchestration/*.py` | `tool_schemas` / `director_prompt` / `prompt_builder` / `summarizers` / `ai_sdk_adapter` / `schemas` | ~900 |

### 4.2 student-web — `packages/student-web/src/features/openmaic/`

| 子目录 | 内容 |
|--------|------|
| `pages/` | `openmaic-classroom-page.tsx`（3 栏播放页）、`openmaic-settings-page.tsx`（已删除冗余 home） |
| `components/scene-renderers/` | `slide / quiz / interactive / pbl` 四种渲染器 |
| `components/{agent, chat, whiteboard, generation}/` | Agent 头像 / 讨论面板 / SVG 白板（占位）/ 生成工具栏 |
| `components/stage.tsx` | 主画布组合 |
| `hooks/use-action-player.ts` | **新增**：动作序列播放（speech + spotlight） |
| `hooks/use-classroom.ts` | 课堂提交 + 轮询 + 持久化（已改为与后端 `ready` 状态对齐） |
| `hooks/use-classroom-db.ts` / `use-scene-player.ts` / `use-director-chat.ts` | DB / 场景 / 讨论 |
| `store/classroom-store.ts` | Zustand 状态（已加 `currentSpotlightId` / `currentSpeech` / `currentActionIndex`） |
| `db/classroom-db.ts` | Dexie 4.2.1 schema |
| `api/openmaic-adapter.ts` | `fastapiClient` + SSE |
| `types/` | scene / action / classroom / agent / chat / quiz / slides（**全部与后端 shape 对齐**） |

### 4.3 入口改造（关键）

- `src/app/routes/index.tsx`：只保留 `/openmaic/classroom/:classroomId` + `/openmaic/settings`，删除 `/openmaic` 冗余首页路由。
- `src/features/classroom/pages/classroom-input-page.tsx`：`onSubmit` 改为调用 `useClassroomCreate().create(...)` 并导航到 `/openmaic/classroom/<id>`；按钮 label 动态显示 `生成中... <progress>%`。

---

## 5. 运行方式

1. **基础设施**（用户持续运行）：Docker Compose 的 `dev-mysql`、`dev-redis`、`dev-mongodb`、`openai-edge-tts`。
2. **RuoYi 后端**：`cd packages/RuoYi-Vue-Plus-5.X/ruoyi-admin && java -Dspring.profiles.active=dev -jar target/ruoyi-admin.jar`（端口 8080，dev captcha 已禁用）。
3. **FastAPI 后端**：`cd packages/fastapi-backend && .venv/bin/python run_dev.py`（端口 8090）。
4. **Dramatiq Worker**：`cd packages/fastapi-backend && .venv/bin/python -m dramatiq app.worker -p 1 -t 2`。
5. **前端**：`cd packages/student-web && pnpm dev`（端口 5173）。
6. 浏览器访问 `http://localhost:5173/classroom/input` 登录 `admin / admin123`。

---

## 6. 已知限制 / 工程债

| 编号 | 内容 | 影响 |
|------|------|------|
| L1 | Chat / action player 里 `Discussion` / `wb_*` 是占位（只短延时不实际执行） | 用户点播放只能看到 speech + spotlight，不会看到白板绘制 |
| L2 | `stream_llm` P0 整块产出不是真 token 流 | 幻灯片内生成看不到 typewriter 效果；scene_outlines SSE 端点里 outline 是一次性拿完才回送 |
| L3 | RuoYi `captcha.enable=false`（dev） | 生产前必须改回 `true` |
| L4 | `OpenAICompatibleLLMProvider` 的 timeout 固定 30s | 大 prompt 可能 524；后续可读 `ProviderRuntimeConfig.timeout_seconds` |
| L5 | classroom payload 在 Redis 里可能偏大（10 个 scene 约 100KB+） | P2 迁到 RuoYi xm_openmaic_classroom 表（schema 已在 master plan 草拟，未执行） |
| L6 | 前端 Dexie schema v1 没做迁移测试 | 后续加字段要 increment 版本号 |

---

## 7. 变更历史

| 提交 | 摘要 |
|------|------|
| `be2e2f5` | 脚手架 + DB seed + Python 依赖 |
| `2ea1a4d` | Team C LangGraph director graph |
| `df9960c` | Team A backend 全套 |
| `5380a63` + `e2d834f` | Team B frontend 全套 + settings 页 |
| `f46af66` + `2d6cab8` + `5a92a63` | 三团队合并 |
| `b2f8be4` | 合并后集成粘合（Dramatiq 队列、worker import） |
| `86f4a36` | 前后端 status 字段对齐 + dev captcha off |
| `9225690` | P0 模块文档 + 验收清单 |
| `32ce9f9` | **真 LLM 接入**：resolver + 入口复用 + 场景渲染器全部重写 |
| `b55f566` | **动作播放器**：speech + spotlight + 真实讲稿气泡 |
| `d52c65e` | **Chat SSE 多智能体**：接通 Team C director graph |

---

## 8. 推荐下一步（给接手人）

1. **接白板 draw 动作**：`use-action-player` 中对 `wb_draw_shape` / `wb_draw_text` / `wb_draw_latex` / `wb_draw_line` 转发到 `Whiteboard` 的 SVG API；参考 `references/OpenMAIC/components/whiteboard/` 的路径合成算法。
2. **接 Edge TTS**：把 `SpeechAction.audioUrl` 在 scene_generator 后台预合成（Dramatiq actor + Edge TTS provider），前端 `<audio>` 替代 `speechSynthesis`。
3. **最近课堂卡片**：在 `/classroom/input` 底部 feed 区旁边加"最近课堂" tab，用 `useRecentClassrooms` 数据源。
4. **真 token 流**：扩展 `LLMProvider` 协议支持 `async def stream_generate(prompt) -> AsyncIterator[str]`，`openai-compatible` 里用 `stream=True`，把 `openmaic/llm_adapter.stream_llm` 改为真 per-chunk yield。
