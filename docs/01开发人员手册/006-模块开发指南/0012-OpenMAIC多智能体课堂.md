# OpenMAIC 多智能体课堂模块

**模块状态**：P0 MVP 已跑通（2026-04-23）
**功能分支**：`feature/openmaic-port`（已合并 Team A/B/C 三支协作分支）
**参考项目**：`references/OpenMAIC/`（Next.js 16 + React 19 + LangGraph + Vercel AI SDK）
**移植策略**：直接抄袭参考项目行为 → 用项目既有 FastAPI Provider 体系替换 Vercel AI SDK；UI 照搬设计稿 `Ux/.../08-课堂结果页/01-classroom.html` 三栏布局。

---

## 1. 功能概述

OpenMAIC 把一句主题变成一堂完整的多智能体 AI 课堂：

| 阶段 | 输入 | 输出 | 后端服务 |
|------|------|------|----------|
| Stage 1：提纲生成 | 主题文本（可叠加 PDF 文本） | 4-6 个场景提纲（slide / quiz / interactive / PBL） | `POST /api/v1/openmaic/classroom` 派发 Dramatiq 任务，内部调 `outline_generator` |
| Stage 1.5：智能体档案 | 提纲 + 主题 | 2-4 个 Agent 人设（teacher / assistant / student） | `agent_profiles` 生成器 |
| Stage 2：场景内容 | 每条提纲 + Agent 列表 | 幻灯片内容 / 习题 / 交互 HTML / 项目任务 | `scene_generator` 调 LLM 一次 / 场景 |
| Stage 2.5：Agent 动作 | 场景内容 + Agent 人设 | 动作数组（speak / draw / write_text / highlight / laser_pointer） | `scene_actions` 生成器 |
| 持久化 | 上述全部 | 一整份 Classroom JSON | Redis 运行态（由 FastAPI 使用 `JobStore`）；前端用 Dexie IndexedDB 做客户端持久化 |
| 讨论 | 用户提问 + 课堂上下文 | 多 Agent 讨论 SSE 事件流 | `POST /api/v1/openmaic/chat` → Team C `DirectorGraph` (Python LangGraph) |

---

## 2. 代码结构

### 2.1 FastAPI 后端 — `packages/fastapi-backend/app/features/openmaic/`

| 文件 | 职责 | LOC |
|------|------|-----|
| `routes.py` | 12 个 HTTP 端点（classroom CRUD/SSE、4 个 generate、chat、quiz-grade、parse-pdf、web-search、bootstrap） | 464 |
| `schemas.py` | Pydantic 模型（Scene / Action / AgentProfile / Classroom / 所有请求/响应） | 396 |
| `service.py` | `OpenMAICService` 编排器（提纲 + 场景 + Agent，Job 生命周期） | 201 |
| `llm_adapter.py` | `call_llm` / `stream_llm` / `resolve_openmaic_providers`，所有 LLM 走 `app.providers.protocols.LLMProvider` | 149 |
| `generation/outline_generator.py` | Stage 1 提纲生成 + SSE 流 | ~200 |
| `generation/scene_generator.py` | Stage 2 四种场景 + 动作生成 | 407 |
| `generation/action_parser.py` + `json_repair.py` | 鲁棒 JSON 解析（使用 `partial_json_parser`） | ~100 |
| `generation/prompts/*.py` | 中文主文案、英文回退提示词 | ~200 |
| `jobs/job_runner.py` | Dramatiq actor，串起 outline → agents → scenes 全链路 | 147 |
| `jobs/job_store.py` | 基于 RuntimeStore 的 Redis 作业状态存储 | 110 |
| `pdf/parser.py` | `pypdf` 提取 PDF 文本 | 52 |
| `search/tavily_client.py` | 可选 Tavily Web 搜索包装 | 73 |
| `orchestration/director_graph.py` | **Team C** LangGraph 多 Agent 状态机 | 475 |
| `orchestration/*.py` | `tool_schemas` / `director_prompt` / `prompt_builder` / `summarizers` / `ai_sdk_adapter` | ~900 |

**测试**：`tests/unit/openmaic/` + `app/features/openmaic/orchestration/tests/` 合计 **56 + 22 = 78** 个单测，全部绿。

### 2.2 student-web 前端 — `packages/student-web/src/features/openmaic/`

| 子目录 | 内容 |
|--------|------|
| `pages/` | `openmaic-home-page.tsx`（主题输入 + PDF 上传 + 最近课堂）、`openmaic-classroom-page.tsx`（3 栏布局播放页）、`openmaic-settings-page.tsx` |
| `components/scene-renderers/` | `slide / quiz / interactive / pbl` 四种场景渲染器 |
| `components/{agent, chat, whiteboard, generation}/` | Agent 头像 / 讨论面板 / SVG 白板 / 生成工具栏 |
| `components/stage.tsx` | 主画布组合（动作播放 + 白板 + 场景） |
| `hooks/` | `use-classroom`（提交 + 轮询 + 持久化）、`use-classroom-db`（Dexie）、`use-scene-player`（场景状态机）、`use-director-chat`（SSE chat） |
| `store/classroom-store.ts` | Zustand 课堂状态（localStorage 持久化） |
| `db/classroom-db.ts` | Dexie 4.2.1 schema：classrooms / scenes / chatHistory / whiteboardHistory |
| `api/openmaic-adapter.ts` | 所有后端调用经 `fastapiClient` + SSE 流解析 |
| `types/` | scene / action / classroom / agent / chat / quiz / slides |

**路由**：
```
/openmaic                          → OpenMAICHomePage
/openmaic/classroom/:classroomId   → OpenMAICClassroomPage
/openmaic/settings                 → OpenMAICSettingsPage
```

所有路由在 `RequireAuthRoute` 内，需要登录。

---

## 3. 数据库 & Provider 绑定

### 3.1 `xm_ai_module` 新行
| id | module_code | module_name |
|----|-------------|-------------|
| `202604230001` | `openmaic` | OpenMAIC 多智能体课堂 |

### 3.2 `xm_ai_module_binding` 新行（6 阶段 × 1-2 绑定 = 11 行，id `20260423010x`）

| stage_code | primary provider (priority 1) | fallback (priority 10) | timeout_s |
|------------|-------------------------------|------------------------|-----------|
| `outline` | gemini-3-flash (`2043680434583482370`) | deepseek-v3-chat | 60 |
| `scene_content` | gemini-3-flash | deepseek-v3-chat | 120 |
| `scene_actions` | gemini-3-flash | deepseek-v3-chat | 90 |
| `agent_profiles` | gemini-3-flash | — | 45 |
| `director` | gemini-3-flash | deepseek-v3-chat | 60 |
| `quiz_grade` | gemini-3-flash | deepseek-v3-chat | 30 |

SQL：`packages/RuoYi-Vue-Plus-5.X/script/sql/openmaic_bootstrap.sql`（已幂等执行）。

---

## 4. 依赖

### 4.1 Python（`packages/fastapi-backend/pyproject.toml` 新增）
```
langgraph>=0.2,<1.0
langchain-core>=0.3,<1.0
pypdf>=5.0,<6.0
partial-json-parser>=0.2,<1.0
```

### 4.2 TypeScript
**零新增**。全部复用 `student-web` 既有依赖（React 19、Radix UI、Dexie 4.2.1、@assistant-ui/react、Shiki、KaTeX、Lucide、TanStack Query、Zustand 5）。

---

## 5. 核心集成契约

### 5.1 后端响应状态机
```
submit  ──► pending
       ──► generating_outline (progress 5-20)
       ──► generating_scenes  (progress 30-90)
       ──► ready              (progress 100, classroom JSON 完整)
             │
             └─► failed       (error string)
```

**前端必须对齐** `status === 'ready'`（不是 `completed`）并从响应根字段（非 `{code, data}` 外壳）直接取 `classroom`。

### 5.2 `LLMProvider` 统一接口（P0 仅文本）
```python
from app.providers.protocols import LLMProvider, ProviderError

# Team A llm_adapter.py：
async def call_llm(params, provider_chain):
    for p in provider_chain:
        try: return (await p.generate(combined)).content
        except ProviderError: continue
```

### 5.3 Team C Director Graph 协议
```python
from app.features.openmaic.orchestration import run_discussion
async for event in run_discussion(request, provider_chain):
    # event.type ∈ {'agent_switch', 'text_delta', 'tool_call', 'agent_turn_end', 'summary', 'end'}
    yield f"data: {event.model_dump_json()}\n\n"
```

---

## 6. 已知限制 / P1+

| 编号 | 内容 | 影响 |
|------|------|------|
| L1 | `ProviderRuntimeResolver.resolve_by_module_code` 未实现，Team A `llm_adapter` 已兜底到 `default_llm_provider` settings 值（当前为 `stub-llm`） | 真实 LLM 输出未接通；切到 DeepSeek/Gemini 需补这个方法（对标 `resolve_learning_coach`） |
| L2 | Team A `stream_llm` P0 是整块产出而不是真 token 流 | 前端 SSE 只看到一次 chunk；可后续在 `LLMProvider` 协议上扩 `stream_generate` |
| L3 | Deep Interactive Mode（3D / 游戏 / 思维导图）未移植 | 对应渲染器只有 `interactive-renderer.tsx` 的 `iframe srcdoc` 基础版 |
| L4 | PPTX / HTML / ZIP 导出未移植 | OpenMAIC 参考用 `pptxgenjs` fork，我们 P1+ 再谈 |
| L5 | ASR（麦克风）未接入；TTS 仅通过浏览器 `speechSynthesis` 兜底 | 不影响主流程 |
| L6 | 图片 / 视频生成 provider 未接 | 场景内图片只有占位符 |
| L7 | RuoYi `captcha.enable` 被改为 `false`（dev）以便 E2E | 生产部署前需要改回 `true` |

---

## 7. 运行方式

1. **基础设施**（用户持续运行）：Docker Compose 里的 `dev-mysql`、`dev-redis`、`dev-mongodb`、`openai-edge-tts`。
2. **RuoYi 后端**：`cd packages/RuoYi-Vue-Plus-5.X/ruoyi-admin && java -Dspring.profiles.active=dev -jar target/ruoyi-admin.jar`（端口 8080）
3. **FastAPI 后端**：`cd packages/fastapi-backend && .venv/bin/python run_dev.py`（端口 8090）
4. **Dramatiq Worker**：`cd packages/fastapi-backend && .venv/bin/python -m dramatiq app.worker -p 1 -t 2`
5. **前端**：`cd packages/student-web && pnpm dev`（端口 5173）
6. 浏览器访问 `http://localhost:5173/openmaic`

---

## 8. 并行协作记录

2026-04-23 晚，单次对话内三团队并行：

| Team | 分支 | 产出 | 测试 |
|------|------|------|------|
| A — Backend | `feature/openmaic-backend` | 23 文件，2900 行 | 34/34 绿 |
| B — Frontend | `feature/openmaic-frontend` | 37 文件，3700 行 | `pnpm typecheck` 0 错误 |
| C — Orchestration | `feature/openmaic-orchestration` | 9 文件，2100 行 | 22/22 绿 |

**集成**：单一冲突（`orchestration/__init__.py`，接受 Team C 真实版本），其他文件零冲突（Teams 本来就分目录）。集成修复：Dramatiq 队列归默、职工 import、前端状态字段对齐。
