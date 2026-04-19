# Story 6.4: Ask API 与 LLM 回答生成

Status: ready-for-dev

## Story

As a 正在学习的用户，
I want 围绕视频当前时间点直接提问并获得基于上下文的解释，
So that 我得到的是"现在这一段"的解释而不是泛化回答。

## Acceptance Criteria

1. Ask API 处理请求时基于当前 `CompanionContext`（section 内容 + 知识点 + 解题步骤）构建 LLM prompt 并生成回答，回答与当前锚点内容相关。
2. 上下文不足（degraded 模式）时仍返回与当前锚点相关的引导或澄清提示，不用泛化答案敷衍。
3. LLM Provider 失败或超时时返回结构化降级响应（`persistence_status: overall_failure`），包含可理解的失败原因和重试建议。
4. 一轮问答完成后自动调用 `persist_turn()` 将问答记录写入 `xm_companion_turn`。

## Tasks / Subtasks

- [ ] 实现 `POST /companion/ask` 端点（AC: 1-4）
  - [ ] 在 `companion/routes.py` 新增 `ask` 路由，接收 `AskRequest`，返回 `AskResponse`
  - [ ] 调用 `video_adapter.get_video_context(task_id, seconds)` 获取 CompanionContext
  - [ ] 调用 LLM Provider 生成回答
  - [ ] 调用 `CompanionService.persist_turn()` 持久化
  - [ ] 组装 `AskResponse` 返回
- [ ] LLM prompt 构建逻辑（AC: 1, 2）
  - [ ] 在 `companion/service.py` 或新建 `companion/llm_prompt.py` 中实现 `build_ask_prompt(context: CompanionContext, question: str) -> str`
  - [ ] Prompt 模板包含：系统角色定义、当前 section 内容、知识点、解题步骤、用户问题
  - [ ] degraded 模式下 prompt 引导 LLM 基于有限信息给出引导性回答
  - [ ] 明确超出范围时 prompt 引导 LLM 建议用户查看来源依据
- [ ] LLM Provider 调用集成（AC: 1, 3）
  - [ ] 通过 `get_llm_provider()` 获取 LLM 实例（`providers/llm/factory.py`）
  - [ ] 调用 `llm.generate(prompt)` 获取回答
  - [ ] 捕获超时和异常，返回结构化降级响应
  - [ ] 降级响应中 persistence_status=OVERALL_FAILURE
- [ ] 自动持久化集成（AC: 4）
  - [ ] 从 AskRequest 和 LLM 回答构建 `CompanionTurnCreateRequest`
  - [ ] 调用 `CompanionService.persist_turn()` 写入 `xm_companion_turn`
  - [ ] 持久化失败时 log error 但不阻塞 Ask API 返回（异步或 try/except）
- [ ] 降级策略实现（AC: 2, 3）
  - [ ] 上下文 degraded → prompt 中标注信息不足，引导澄清
  - [ ] LLM 超时 → 返回 `{ answer_text: "生成超时，请稍后重试", persistence_status: "overall_failure" }`
  - [ ] LLM 异常 → 返回 `{ answer_text: "服务暂时不可用", persistence_status: "overall_failure" }`
- [ ] 单元测试 + 集成测试（AC: 1-4）
  - [ ] 测试正常流程：有完整上下文 → LLM 回答 → 持久化成功
  - [ ] 测试 degraded 上下文 → 仍返回有效回答
  - [ ] 测试 LLM 失败 → 结构化降级响应
  - [ ] 测试持久化失败 → 不阻塞 API 返回

### Story Metadata

- Story ID: `6.4`
- Story Type: `Backend Story`
- Epic: `Epic 6`
- Depends On: `6.1` 契约、`6.3` Context Adapter
- Blocks: `6.5`、`6.6`
- FRs: FR-CP-002、FR-CP-006

## Dev Notes

### LLM Provider 调用方式

```python
from app.providers.llm.factory import get_llm_provider

llm = get_llm_provider()  # 使用默认配置
result = await llm.generate(prompt)
answer_text = result.content
```

`LLMProvider.generate(prompt: str) -> ProviderResult`，ProviderResult 包含 `provider`、`content`、`metadata`。

### Prompt 模板参考

```python
ASK_PROMPT_TEMPLATE = """你是一个数学讲解助手，正在围绕视频当前播放片段回答学生的提问。

## 当前视频片段信息
- 时间点: {time_point}
- 片段标题: {section_title}
- 旁白内容: {narration_text}

## 相关知识点
{knowledge_points}

## 解题步骤
{solution_steps}

## 学生提问
{question}

请基于当前片段内容进行解释。如果信息不足以完整回答，请给出引导性解释并建议查看更多来源。
"""
```

### 已有基础设施

- `CompanionService.persist_turn()` 已实现，接收 `CompanionTurnCreateRequest` 写入 RuoYi `xm_companion_turn` 表
- `CompanionTurnCreateRequest` 模型已定义，包含所有必需字段
- `PersistenceStatus.OVERALL_FAILURE` 已在枚举中定义
- RuoYi 端点 `/internal/xiaomai/companion/turns` 已就绪

### anchor_ref 解析

`anchor_ref` 格式为 `{task_id}@{seconds}`，解析方式：
```python
task_id, seconds_str = anchor_ref.split("@")
seconds = int(seconds_str)
```

### 持久化策略

持久化调用不阻塞 Ask API 响应。使用 `try/except` 包裹，失败时 log warning：
```python
try:
    await service.persist_turn(turn_request, access_context=access_context)
except Exception:
    logger.warning("Failed to persist companion turn", exc_info=True)
```

### 技术约束

- Ask API 路由需要认证（`Depends(get_access_context)`）
- 响应时间控制在 10s 内（LLM 超时 + 上下文读取）
- 不在 Ask API 中做白板动作生成（白板在 Story 6.6 独立实现）
- `whiteboard_actions` 在本 Story 中返回空列表 `[]`

### Suggested File Targets

- `packages/fastapi-backend/app/features/companion/routes.py` — 新增 ask 路由
- `packages/fastapi-backend/app/features/companion/service.py` — 新增 ask 逻辑
- `packages/fastapi-backend/app/features/companion/llm_prompt.py` — 新建 prompt 构建
- `packages/fastapi-backend/tests/unit/test_companion_ask.py` — 单元测试

### References

- [Source: _bmad-output/planning-artifacts/epics/23-epic-6.md#Story 6.4]
- [Source: packages/fastapi-backend/app/providers/llm/factory.py#get_llm_provider]
- [Source: packages/fastapi-backend/app/features/companion/service.py#persist_turn]
- [Source: packages/fastapi-backend/app/shared/long_term/models.py#CompanionTurnCreateRequest]
