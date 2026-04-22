# Context: Epic 8/9 审计 — LLM 接入与测验流程重构

**Date**: 2026-04-22
**Mode**: 定向审计（非完整 6 维打分）
**Areas discussed**: LLM 接入缺口 / Mock 覆盖率 / 测验入口流程
**User priorities (已确认)**:
1. P0 — 课后测验题目生成
2. P0 — 学习路径规划
3. P1 — 学习中心推荐/摘要
4. P1 — 答题后讲解/反馈

---

## 一、Gap 报告（证据 → 事实）

### 1. 后端 LLM 接入：**基础设施齐全，但推荐/反馈未接**

| 模块 | 状态 | 证据 |
|------|------|------|
| `learning_coach/llm_generator.py` | ✅ 真 LLM 调用链 | `provider.generate(prompt)` + failover + JSON 校验 + 占位符拒绝（391 L） |
| `service._resolve_question_bank` | ✅ LLM 优先，失败降级 | `service.py:280-308` — `provider_chain` 非空则调 LLM；异常走 `_fallback_question_bank` |
| `service._resolve_learning_path` | ✅ LLM 优先 | `service.py:310-335` 同上 |
| `service._resolve_knowledge_points` | ✅ LLM 优先 | `service.py:337-360` |
| **推荐（recommendation）** | ❌ **硬编码字符串** | `service.py:650` 写死「推荐：先回看错题对应知识点，再完成一次 5 题小测巩固。」— **完全未调 LLM** |
| **答题后讲解（per-answer feedback）** | ⚠️ **出题时预烘焙** | `explanation` 字段在题库生成时随题返回；判题阶段（`submit_quiz`）不做第二次 LLM 调用做个性化讲解 |
| **`_fallback_question_bank`** | ❌ **忽略 topic_hint** | `service.py:79-151` `_ = topic_hint` 主动丢弃参数，**无论用户学什么都返回 5 道链式法则/导数题**（占位题库） |

### 2. 运行时 LLM 真实可用性：**配置链路待验证**

- `get_llm_provider_chain()` 从 `factory.assemble_from_settings()` 取链。
- 默认 `FASTAPI_DEFAULT_LLM_PROVIDER=stub-llm`（`config.py:184`，`.env.example:73`）。
- 当前 `.env.local` 仅设 `FASTAPI_PROVIDER_RUNTIME_SOURCE=ruoyi`，**依赖 RuoYi 数据库里有真实 LLM provider binding**。
- 若 ruoyi DB 里没配：链路跑 stub-llm → 返回 stub 内容 → JSON 解析失败 → `LLMGenerationError` → 降级到硬编码 5 题。
- **风险**：在没人显式检查"这次响应 generation_source 是 llm 还是 fallback"的情况下，页面永远看起来"能出题"，实际全是占位题。

### 3. 前端 Mock 覆盖率：**全局 Mock 开关已关，但卡片级硬编码仍在**

**全局开关**: `VITE_APP_USE_MOCK=N`（`.env.development`）→ `learning-center-adapter` / `learning-coach-adapter` 默认走 real path。

**但以下组件绕过 adapter，纯静态渲染**：

| 组件 | 证据 | 影响 |
|------|------|------|
| `learning-center-sidebar-recommendation.tsx` | 组件头部 `TODO(epic-9)` 明确承认「目前是 i18n 占位文案，没有调真实推荐接口」 | 推荐栏与 `xm_learning_recommendation` 表无任何联系 |
| `learning-center-sidebar-path-card.tsx` | `COMPLETED_STEP_COUNT=0 / TOTAL_STEP_COUNT=0` 常量硬编码；TODO 承认 schema 缺 `completedStepCount/totalStepCount` | 路径进度永远 `0%` |
| `learning-center-page.tsx:119` | `quizScore = 86` 硬编码 fallback；TODO 承认应改为后端 `averageQuizScore` 真实聚合 | 无 quiz 记录时展示虚假 86 分 |
| `learning-center-sidebar-quiz-health.tsx` | 依赖上面的 86 分 | 连锁假数据 |
| `history-record-card-quiz.tsx:8` | `const score = extractFirstNumber(record.summary) ?? 86` | summary 字段缺数字 → 显示假 86 分 |

### 4. 测验入口流程：**用户吐槽的点真实存在**

**当前流程图**：

```
视频结果页  ──learningCoachTo──► /coach/:sessionId（coach entry page）──► /quiz/:sessionId ✅ 正常
                                                                      └──► /checkpoint/:sessionId ✅

学习中心 Library   ❌ 故意不放 quiz 入口（注释明确，设计正确）
学习中心 Continue  ──► /video/:taskId 或 /classroom/input（不进测验，正确）
学习中心 History ──► HistoryRecordCardQuiz ──"回看"按钮──► /quiz/:sourceSessionId
                                                               ▲
                                              🔴 这里就是用户看到的"从学习中心卡片直接进测验"
                                              🔴 语义叫「回看」但实际会重新调 quiz/generate 出新题
                                              🔴 不是展示历史答题记录
```

**根因**：
- `/quiz/:sessionId` 路由挂的是 `learning-assessment-page.tsx`（mode="quiz"），**只会生成新 quiz**，没有「给定 quiz_id 回放历史答卷」的分支。
- `HistoryRecordCardQuiz` 的 Link 直接跳到该页，省掉了 coach entry 的上下文推断（sourceType/topicHint/returnTo），也省掉了 checkpoint 前置。

---

## 二、Decisions

### Decision 1: 测验入口流程形态

- **Context**: 用户要求「学习中心保留入口但改成『从视频记录生成』」。`Library` 已正确不放入口；问题在 `History` 里的 quiz 卡片伪装成「回看」实为「重新生成」。
- **Options**:
  1. 完全删除 `HistoryRecordCardQuiz` 的 "回看" 按钮（只留错题详情链接）
  2. "回看" 改为**只读模式**，展示历史答卷 + 得分 + 解析（无法重新作答）
  3. "回看" 拆成两个按钮：「查看原卷」（只读）+「基于同一来源再测一次」（走 coach entry 重新生成）
- **Chosen**: **Option 3**（拆两按钮）
- **Reason**: 既满足"历史能回看"的基本预期，又保留"基于此视频记录生成新测验"的路径；且"再测一次"按钮走 coach entry 意味着复用视频结果页同一入口语义，消除流程分叉。
- **Impact**: 需要新增 "quiz 只读回看页" 或在现有 assessment 页加 `?replay=1` 查询参数分支；需要后端 `quiz/history/:quiz_id` 读历史答卷接口（从 `xm_quiz_result` + detail 表取）。

### Decision 2: LLM 接入实施范围（按 P0/P1 分层）

- **Locked（本轮必做）**:
  1. 统一 coach entry 为**唯一"生成新测验"入口**：无论从视频结果页、学习中心 history "再测一次"、classroom 结果页进来，都走 `/coach/:sessionId?sourceType=&topicHint=&returnTo=`，不允许其他路径直接调 `quiz/generate`。
  2. **LLM 真接入验证**：实测 `quiz/generate` / `path/plan` / `checkpoint/generate` 的 `generation_source` 字段，确保在正常配置下返回 `llm`；当 stub/fallback 命中时前端必须展示明确提示（而非默默展示假数据）。
  3. **修复 `_fallback_question_bank` 忽略 topic_hint**：要么根据 topic 做最小程度分发，要么直接抛硬错不降级（避免静默输出无关题目）。
  4. **推荐 LLM 化**：`submit_quiz` 内的硬编码推荐字符串改为调 LLM 根据错题 + topic_hint 生成；写入 `xm_learning_recommendation`。
  5. **Learning Center 三张 sidebar 卡真数据接入**：
     - `SidebarRecommendation` → 读 `xm_learning_recommendation`
     - `SidebarPathCard` → 读 `xm_learning_path` + 真实 `completedStepCount/totalStepCount`（需扩 schema）
     - `SidebarQuizHealth` / `quizScore` → 后端新增 `averageQuizScore` 聚合字段，无记录时显示空态而非 86

- **Free（实现者裁量）**:
  - "回看"按钮是 Link 新开页还是 Dialog 就地展开
  - 推荐 LLM 调用是同步（`submit_quiz` 内阻塞）还是异步（写入队列后台补齐）
  - `averageQuizScore` 在 RuoYi 侧用 SQL 聚合还是 FastAPI 读后计算

- **Deferred（下轮/其他 Epic）**:
  - 答题后"个性化讲解/追问"LLM 接入（需要 Evidence 域对接，涉及 Epic 6/7；本轮先保证生成期的 explanation 质量）
  - 学习路径的"阶段完成度追踪 + 提醒"机制（需要用户手动标记 step completed 的 UI，超出本次范围）
  - Wrongbook 的"同类题自动生成变式"（依赖稳定的 tag 体系）

### Decision 3: 降级语义

- **Context**: 当前 LLM 失败静默降级到硬编码链式法则题，用户看到的题 ≠ 用户学的内容。
- **Options**:
  1. 保持静默降级，但前端强制展示 `generation_source=fallback` 的警示条
  2. 完全禁用降级，LLM 失败返回 5xx，前端展示"暂不可用"
  3. 降级改为"仅返回 1-2 道通用元学习题"（如"刚学的内容你觉得最关键的是什么？"），而非领域错配的微积分题
- **Chosen**: **Option 1 + Option 3 组合**
- **Reason**: 生产环境不应因 LLM 抖动整块不可用；但展示错配题目比"明确告知降级"危害更大。让 fallback 题本身通用化，同时前端提示"AI 出题暂不可用，已切换为通用热身"。
- **Impact**: 需要重写 `_fallback_question_bank` 为通用元学习题；`CheckpointGeneratePayload` / `QuizGeneratePayload` 已有 `generation_source` 字段，前端需展示。

---

## 三、Code Context

### 关键文件与行号

**后端**：
- `packages/fastapi-backend/app/features/learning_coach/llm_generator.py:161-195` — `_call_with_failover` provider chain 调用
- `packages/fastapi-backend/app/features/learning_coach/service.py:79-151` — `_fallback_question_bank` 硬编码链式法则题
- `packages/fastapi-backend/app/features/learning_coach/service.py:598-681` — `submit_quiz`；**647-653 行硬编码推荐**
- `packages/fastapi-backend/app/features/learning_coach/routes.py:46-64` — provider_chain 装配
- `packages/fastapi-backend/app/core/config.py:184-185` — `FASTAPI_DEFAULT_LLM_PROVIDER=stub-llm`

**前端**：
- `packages/student-web/src/features/learning-center/pages/learning/learning-center-sidebar-recommendation.tsx:6-9` — TODO 明确承认 mock
- `packages/student-web/src/features/learning-center/pages/learning/learning-center-sidebar-path-card.tsx:6-11` — 常量硬编码进度
- `packages/student-web/src/features/learning-center/pages/learning/learning-center-page.tsx:116-123` — quizScore=86 fallback
- `packages/student-web/src/features/learning-center/pages/history/history-record-card-quiz.tsx:46` — **"回看"按钮链接到 `/quiz/:sessionId`（问题根源）**
- `packages/student-web/src/features/learning-center/pages/learning/learning-center-library.tsx:11-18` — 正确的设计说明（保留作为 plan 依据）
- `packages/student-web/src/features/video/pages/video-result-page.tsx:97-110` — `learningCoachTo` CTA 装配（正确参考实现）

### Schema 扩展需求
- `LearningPathPlanPayload` 需加 `completedStepCount` / `totalStepCount`
- 学习中心聚合 API 需加 `averageQuizScore`、`latestRecommendation`、`activeLearningPath`（让前端一次拉齐，不再需要 sidebar 独立请求）
- `quiz/history/:quiz_id` 新接口（回看只读）

---

## 四、未覆盖待后续规划的问题

1. **LLM Provider 真实配置验证**：是否要写一个"provider self-check"命令来检测 ruoyi DB 的 LLM provider binding，避免"跑起来了但用的是 stub"这种隐蔽问题？
2. **测验重复作答语义**：同一 sessionId 多次进入 coach，quiz 该每次重新生成还是沿用第一次生成的题？（关系到 LLM 成本）
3. **i18n 一致性**：现有 mock 文案是中文 i18n key，真数据接入后仍需保留 i18n 层还是直接渲染后端文本？

---

## 五、下一步

进入 `maestro-plan` 对以下 5 项 Locked 决策做 wave 拆分与任务定义：
1. 统一 coach entry 为唯一生成入口（删/改 history quiz 卡按钮 + 新增只读回看页）
2. LLM 真接入验证与降级语义重写（后端 +前端 generation_source 展示）
3. `_fallback_question_bank` 通用化（去领域错配）
4. 推荐 LLM 化（`submit_quiz` 接 LLM + 写库）
5. 学习中心三张 sidebar 接真数据（聚合接口扩字段 + 前端换数据源）

建议 wave 顺序：Wave 1 = 第 2/3 项（基础设施，解锁后续真实验收）→ Wave 2 = 第 1/4 项（流程与生成质量）→ Wave 3 = 第 5 项（展示层，依赖前两轮产出的真数据）。
