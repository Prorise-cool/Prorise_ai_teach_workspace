---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/prd/06-6-功能需求.md
  - _bmad-output/planning-artifacts/epics/04-requirements-inventory.md
  - _bmad-output/planning-artifacts/architecture/08-8-模块划分与实现策略.md
  - _bmad-output/planning-artifacts/ux-design-specification/09-8-companion-layer-ux会话伴学层.md
  - _bmad-output/planning-artifacts/epics/07-story-definition-standard.md
scope: video-only (classroom deferred)
---

## Epic 6: 视频伴学 -- 当前时刻解释与追问

用户可以在视频播放页围绕当前播放时间点持续追问，并获得白板解释、连续上下文和清晰降级反馈。

**FRs covered:** `FR-CP-001~006`
**NFRs covered:** `NFR-UX-003`、`NFR-AR-004`、`NFR-AR-006`
**Primary Story Types:** `Contract Story`、`Frontend Story`、`Backend Story`、`Persistence Story`

### Objective

Epic 6 负责"视频播放时即时伴学"这一共享消费层。它的唯一职责是围绕**当前播放时间点**解释"现在这一步发生了什么、为什么这样、能不能换种说法"。

它包括（MVP）：
- `TimeAnchor` schema（仅 video timestamp 类型）
- 视频 Context Adapter（三级降级读取）
- 当前时刻提问与 LLM 回答生成
- 连续追问与 Redis 上下文窗口
- 白板动作协议与结构化降级
- 问答长期回写
- 管道 finalize 持久化修复

它不包括：
- 课堂页 Companion（`deferred`，等课堂服务恢复后扩展）
- Evidence / Retrieval 主检索
- 正式 quiz 插入会话

### 已有基础设施（调查确认）

以下组件已完成，不在本次 Story 范围内：

| 层 | 已有代码 | 位置 |
|---|---------|------|
| Schema | `AnchorKind.VIDEO_TIMESTAMP`、`CompanionTurnCreateRequest`、`AnchorContext`、`PersistenceStatus`、`WhiteboardActionRecord` | `shared/long_term/models.py` |
| 路由 | `POST /turns`、`GET /turns/:id`、`GET /sessions/:id/replay` | `companion/routes.py` |
| 持久化服务 | `persist_turn()`、`get_turn()`、`replay_session()` 调 RuoYi | `companion/service.py` |
| RuoYi 表 | `xm_companion_turn` + `xm_whiteboard_action_log` 建表 SQL 已有 | `script/sql/xm_dev.sql` |
| 前端侧栏壳层 | 锚点显示、聊天气泡、快速标签、输入框 | `companion-sidebar.tsx` |
| 视频页集成 | 已挂载 CompanionSidebar，已跟踪 `currentTimeSeconds` + `activeSection` | `video-result-page.tsx` |

### Stub / 空壳（需重写）

| 组件 | 现状 | 需做什么 |
|------|------|---------|
| `video_adapter.py` | 返回 `{source: video, task_id}` | 实现 Redis -> 本地 -> COS 三级读取 artifact-graph |
| `whiteboard/renderer.py` | 直接 dump dict | 定义实际白板动作渲染协议 |
| `whiteboard/action_schema.py` | 仅 `action` + `payload` | 已有 `shared/long_term/models.py` 的 `WhiteboardActionRecord` 更完整，对齐 |

### 完全缺失（核心新功能）

| 缺失项 | 说明 |
|--------|------|
| Ask API | 没有 `POST /companion/ask` 端点 |
| LLM 回答生成 | 没有调用 LLM Provider 生成回答的逻辑 |
| 上下文窗口 | 没有多轮追问的 Redis 上下文管理 |
| 管道持久化修复 | `_run_finalize` 未调 `persist_result_detail()`，未上传 artifact-graph 到 COS |
| 前端数据流 | CompanionSidebar 没接真实数据，没调 ask API |

### Dependencies
- 强依赖 `Epic 4` 的视频侧 artifact-graph 数据
- 依赖 `Epic 2` 的 Provider 抽象（LLM Provider）
- 依赖 `Epic 10` 的长期数据回写能力（已有 xm_companion_turn 表）
- 依赖视频管道 finalize 持久化修复（Story 6.7）

### Cross-Epic Parallel Guardrail
- Companion 只拥有"当前时刻提问侧栏"和其历史区
- 不拥有资料抽屉、文档上传和术语解释区域
- 不得通过直接改视频引擎内部对象来绕过 artifact-graph

### Entry Criteria
- 视频 artifact-graph 数据结构已稳定
- LLM Provider 可用（Epic 2 Provider 抽象已就绪）
- Companion 侧栏最小 UI 结构已冻结（已有壳层）

### Exit Criteria
- 视频页可围绕当前播放时间点提问并获得回答
- 所有提问都绑定 `TimeAnchor`（video_timestamp）
- 连续追问具备上下文继承
- 白板解释成功或结构化降级
- 问答记录已长期回写到 xm_companion_turn
- 管道 finalize 后数据可靠持久化（本地 + COS + RuoYi 索引）

### Frontend Design Reference
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/05-视频结果页/02-video-result.html`
- 当前侧栏组件：`packages/student-web/src/features/video/components/companion-sidebar.tsx`

### Parallel Delivery Rule
- Story 6.1 是所有前后端工作的前置契约
- 管道持久化修复（Story 6.7 的修复部分）应在 Story 6.3 之前完成，可独立提交
- Story 6.2 与 6.3 可并行（6.2 用 mock，6.3 纯后端）
- Story 6.4~6.6 依赖 6.3 的 `CompanionContext` DTO
- Story 6.7 的持久化回写部分（xm_companion_turn）已有基础设施，仅需集成

### FR Coverage Map

| FR | Story | 说明 |
|----|-------|------|
| FR-CP-001 | 6.1, 6.2, 6.3 | TimeAnchor schema + 侧栏锚点展示 + Context Adapter |
| FR-CP-002 | 6.2, 6.3, 6.4 | 侧栏提问入口 + 上下文获取 + Ask API + LLM 回答 |
| FR-CP-003 | 6.6 | 白板动作协议与渲染 |
| FR-CP-004 | 6.5 | 连续追问与 Redis 上下文窗口 |
| FR-CP-005 | 6.7 | 问答持久化回写 + 管道 finalize 修复 |
| FR-CP-006 | 6.4, 6.6 | 提问降级 + 白板降级 |

---

### Story 6.1: 数据读取契约 + Ask API 契约与 mock 数据基线

**Story Type:** `Contract Story`
**FRs covered:** FR-CP-001（部分）
**Dependencies:** 无

As a 前后端协作团队，
I want 先冻结 Companion 数据读取路径、Ask API 契约与 mock turns 数据，
So that 前端和后端可以基于同一契约并行推进。

**Acceptance Criteria:**

**Given** Companion 域开始实施
**When** 契约首次冻结
**Then** `CompanionContextSource` 枚举定义三级降级路径：`redis` / `local_file` / `cos` / `degraded`

**Given** 前端发起伴学提问
**When** 查看 Ask API request schema
**Then** 请求包含 `session_id`、`anchor`（含 `anchor_kind: video_timestamp`、`anchor_ref: "{task_id}@{seconds}"`）、`question_text`、可选 `parent_turn_id`
**And** 响应包含 `turn_id`、`answer_text`、`anchor`、`whiteboard_actions`、`source_refs`、`persistence_status`、`context_source_hit`

**Given** artifact-graph.json 被定义
**When** 团队查看 Companion 消费字段
**Then** 明确列出：`timeline.scenes[].sceneId/startTime/endTime`、`narration.segments[].sceneId/text/startTime/endTime`、`knowledge_points`、`solution_steps`、`topic_summary`

**Given** 前端在本地以 mock 方式开发
**When** 页面请求 companion adapter
**Then** 可获得稳定的 mock turns（首轮提问、连续追问、白板成功、白板降级、无上下文降级 5 种场景）

**Deliverables:**
- Ask API request/response schema（Pydantic 模型）
- `CompanionContextSource` 枚举
- artifact-graph.json Companion 消费字段清单
- mock turns 数据集（5 种场景）
- 契约说明文档

---

### Story 6.2: 视频页 Companion 侧栏接入真实数据

**Story Type:** `Frontend Story`
**FRs covered:** FR-CP-001、FR-CP-002
**Dependencies:** Story 6.1 契约

As a 正在学习的用户，
I want 在视频播放页看到基于当前播放时间点的 Companion 侧栏实时更新，
So that 我能围绕"现在这一秒"精准提问。

**Acceptance Criteria:**

**Given** 用户进入视频结果页且视频正在播放
**When** Companion 侧栏渲染
**Then** 锚点区显示当前播放时间点（如"T=01:23"）和对应 section 标题
**And** 播放进度变化时锚点区实时更新（不依赖手动刷新）

**Given** 侧栏已展示当前锚点
**When** 用户在输入框输入问题并发送
**Then** 请求携带当前 `anchor`（`video_timestamp` + 时间秒数）发送到 Ask API（mock handler）
**And** 侧栏显示用户消息气泡和 AI 回答气泡

**Given** 前端处于 mock 模式
**When** 侧栏完整交互
**Then** 至少能演示：空态、首轮提问成功、连续追问、白板成功、白板降级、服务不可用 6 种状态

**Given** 用户正在追问
**When** 追问进行中
**Then** 视频播放不被打断，用户仍可继续看视频

**Deliverables:**
- CompanionSidebar 组件重构：接收 `currentTime`、`activeSection` props
- Ask API adapter + mock handler
- 6 种交互状态闭环

---

### Story 6.3: 视频 Context Adapter（三级降级读取）

**Story Type:** `Backend Story`
**FRs covered:** FR-CP-001
**Dependencies:** Story 6.1 契约、Story 6.7 持久化修复（推荐先完成）

As a 后端团队，
I want 通过三级降级读取视频 artifact-graph 获取当前时间点的上下文，
So that Companion 服务在 Redis 过期、本地文件清理等场景下仍能获取可靠数据。

**Acceptance Criteria:**

**Given** 用户在视频第 N 秒发起提问
**When** Context Adapter 被调用
**Then** 按 Redis 运行态 -> 本地 artifact-graph.json -> COS 远端文件 优先级尝试
**And** 返回 `CompanionContext` DTO 标注实际命中源（`context_source_hit`）

**Given** 三级都命中的情况
**When** Context Adapter 读取
**Then** 优先使用 Redis 数据（最快），不重复读取后续层

**Given** Redis 过期（2小时 TTL）
**When** Context Adapter 尝试本地文件
**Then** 成功解析 `artifact-graph.json` 并构建 `CompanionContext`
**And** `CompanionContext` 包含：`current_section`（标题+旁白+时间范围）、`adjacent_sections`（前后各 1 段摘要）、`knowledge_points`、`solution_steps`、`topic_summary`

**Given** 本地文件已被清理
**When** Context Adapter 尝试 COS 远端
**Then** 从 COS 下载 `artifact-graph.json` 并解析
**And** 解析结果与本地文件版本一致

**Given** 三级全部失败
**When** Context Adapter 无法获取数据
**Then** 返回 `degraded` 上下文（仅包含 task_id 和题目文本，从 `xm_video_task` 元数据获取）
**And** 不抛出未处理异常导致整轮伴学失败

**Deliverables:**
- 重写 `video_adapter.py`：三级降级读取 + artifact-graph 解析
- `CompanionContext` DTO
- `CompanionContextSource` 枚举实现
- 单元测试覆盖三级降级路径

---

### Story 6.4: Ask API 与 LLM 回答生成

**Story Type:** `Backend Story`
**FRs covered:** FR-CP-002、FR-CP-006
**Dependencies:** Story 6.1 契约、Story 6.3 Context Adapter

As a 正在学习的用户，
I want 围绕视频当前时间点直接提问并获得基于上下文的解释，
So that 我得到的是"现在这一段"的解释而不是泛化回答。

**Acceptance Criteria:**

**Given** 用户停留在视频第 N 秒并发起提问
**When** Ask API 处理请求
**Then** 系统基于当前 `CompanionContext`（section 内容 + 知识点 + 解题步骤）构建 LLM prompt 并生成回答
**And** 回答与当前锚点内容相关，不是脱离上下文的泛化答案

**Given** 当前上下文信息不足（如 degraded 模式）
**When** Companion 处理用户问题
**Then** 系统仍返回与当前锚点相关的引导或澄清提示
**And** 不用与当前会话无关的泛化答案敷衍

**Given** 当前问题明显超出会话内上下文解释范围
**When** Companion 生成结果
**Then** 回答中可包含"建议查看来源依据"等引导提示
**And** 不把资料型问题伪装成当前时刻解释

**Given** LLM Provider 失败或超时
**When** Companion 生成回答
**Then** 返回结构化降级响应（`persistence_status: overall_failure`），包含可理解的失败原因和重试建议
**And** 不污染会话状态机

**Given** 一轮问答完成
**When** Ask API 返回
**Then** 自动调用 `persist_turn()` 将问答记录写入 `xm_companion_turn`

**Deliverables:**
- `POST /companion/ask` 端点
- LLM prompt 构建逻辑（基于 CompanionContext）
- LLM Provider 调用（通过 Epic 2 Provider 抽象）
- 降级策略（上下文不足 / Provider 失败）
- 自动持久化集成

---

### Story 6.5: 连续追问与 Redis 上下文窗口

**Story Type:** `Backend Story`
**FRs covered:** FR-CP-004
**Dependencies:** Story 6.4 Ask API

As a 想继续追问的用户，
I want 进行连续追问并继承上一轮上下文，
So that 我不需要每次都重复描述前文。

**Acceptance Criteria:**

**Given** 用户已完成至少一轮 Companion 对话
**When** 用户发起"继续解释 / 举例 / 更通俗"等追问（携带 `parent_turn_id`）
**Then** 系统从 Redis 加载上一轮上下文窗口，继承当前锚点和对话历史
**And** LLM prompt 包含上一轮问答摘要，用户无需重复背景

**Given** 多轮追问持续进行
**When** 上下文窗口接近约定边界（如 10 轮）
**Then** 系统至少保留当前锚点、最近 3 轮问答摘要与必要会话元信息
**And** 不因窗口截断导致回答与当前轮次脱节

**Given** 上下文窗口存储在 Redis
**When** 开发者检查存储边界
**Then** 窗口 Key 使用 `xm_companion_ctx:{session_id}`，TTL 为 24 小时
**And** 不会把短期运行态当成长期业务存储

**Given** 用户显式切换锚点（如跳转到其他 section）
**When** 新提问携带不同 anchor_ref
**Then** 系统保留对话历史但更新锚点为新位置
**And** 回答围绕新锚点上下文生成

**Deliverables:**
- Redis 上下文窗口设计（Key schema + TTL）
- 多轮追问继承逻辑
- 上下文裁剪规则（窗口边界策略）
- 锚点切换处理

---

### Story 6.6: 白板动作协议与结构化降级

**Story Type:** `Backend Story` + `Frontend Story`
**FRs covered:** FR-CP-003、FR-CP-006
**Dependencies:** Story 6.4 Ask API

As a 正在理解难点的用户，
I want 在回答旁看到白板解释，并在失败时得到结构化降级内容，
So that 即使遇到异常也能继续理解当前知识点。

**Acceptance Criteria:**

**Given** 当前问题适合白板辅助解释（如几何、函数图像、公式推导）
**When** Companion 生成回答
**Then** Ask API 响应中包含 `whiteboard_actions` 数组
**And** 每个 action 包含 `action_type`（如 `draw_function`、`highlight_region`、`animate_step`）、`payload`（参数）、可选 `render_uri`

**Given** 白板能力失败或当前问题不适合图形化
**When** 系统执行降级
**Then** 返回结构化文本解释（分步骤说明列表）作为回答的一部分
**And** `persistence_status` 标记为 `whiteboard_degraded`
**And** Companion 主回答仍然可用

**Given** 前端收到白板 action
**When** 白板 action schema 合法
**Then** 侧栏内按统一协议展示白板渲染结果
**And** 白板内容与回答锚点一致

**Given** 白板 action schema 不合法或前端无法渲染
**When** 前端消费白板响应
**Then** 前端安全退回到文本型降级展示
**And** 整条问答流不因白板局部失败而崩溃

**Deliverables:**
- 白板动作协议定义（`action_type` 枚举 + payload schema）
- 后端 LLM 白板动作生成（在 Ask API 中集成）
- 前端白板渲染区组件（替换现有 chat-only 布局）
- 降级逻辑（后端 fallback + 前端安全降级）

---

### Story 6.7: 管道 finalize 持久化修复与问答回写闭环

**Story Type:** `Persistence Story`
**FRs covered:** FR-CP-005
**Dependencies:** 无（可与 Story 6.3 并行推进）

As a 回访用户，
I want 几天后回看视频时仍能使用 Companion 问答，
So that 我的问答数据可靠保存且视频上下文数据不丢失。

**Acceptance Criteria:**

**Given** 视频管道完成生成
**When** `_run_finalize` 执行
**Then** 调用 `persist_result_detail()` 将 `result-detail.json` 写入本地资产路径
**And** 上传 `artifact-graph.json` 到 COS（与视频文件同级目录）
**And** 调用 `sync_artifact_graph()` 将产物索引写入 RuoYi `xm_session_artifact`

**Given** 管道 finalize 持久化失败
**When** 写入 COS 或 RuoYi 索引异常
**Then** 任务仍标记为 completed，但 `artifact_writeback_failed` 或 `long_term_writeback_failed` 标记为 true
**And** 不因持久化失败导致管道整体报错

**Given** 一轮 Companion 问答完成
**When** Ask API 返回后
**Then** 问答记录已通过 `CompanionService.persist_turn()` 写入 `xm_companion_turn`
**And** 白板动作已写入 `xm_whiteboard_action_log`

**Given** 用户回访视频结果页
**When** 通过 `GET /sessions/{session_id}/replay` 查询历史
**Then** 可看到该视频的所有 Companion 问答记录
**And** 记录中 `persistence_status` 准确区分"完全成功"、"白板降级"、"整轮失败"等状态

**Deliverables:**
- 管道 `_run_finalize` 补调 `persist_result_detail()`
- 管道 finalize 中上传 `artifact-graph.json` 到 COS
- 管道 finalize 中调用 `sync_artifact_graph()`
- Ask API 中集成 `persist_turn()` 回写
- 回放 API (`GET /sessions/{session_id}/replay`) 集成验证

---

### Story Dependency Graph

```
6.1 (Contract) ─────┬──> 6.2 (Frontend 侧栏)
                     ├──> 6.3 (Context Adapter) ──> 6.4 (Ask API) ──> 6.5 (追问窗口)
                     │                                          └──> 6.6 (白板)
6.7 (管道修复) ──────────> 6.3 (推荐先完成，可并行)
```

### UX Design Requirements Coverage

| UX-DR | Story | 说明 |
|-------|-------|------|
| UX-DR-010 | 6.2 | 视频结果页以播放器为主区域，Companion 作为侧区域 |
| UX-DR-014 | 6.1, 6.2 | 所有提问绑定上下文锚点（video timestamp） |
| UX-DR-015 | 6.2 | 侧栏包含当前锚点、提问框、问答流与白板解释区 |
| UX-DR-016 | 6.2 | Companion 不劫持主叙事，追问后仍能继续播放视频 |
| UX-DR-017 | 6.4, 6.6 | 降级规则：暂不可用、白板失败、锚点缺失、资料不足 |
