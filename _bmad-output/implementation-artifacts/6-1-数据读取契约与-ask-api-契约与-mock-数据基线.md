# Story 6.1: 数据读取契约 + Ask API 契约与 mock 数据基线

Status: ready-for-dev

## Story

As a 前后端协作团队，
I want 先冻结 Companion 数据读取路径、Ask API 契约与 mock turns 数据，
So that 前端和后端可以基于同一契约并行推进。

## Acceptance Criteria

1. `CompanionContextSource` 枚举定义三级降级路径：`redis` / `local_file` / `cos` / `degraded`。
2. Ask API request schema 包含 `session_id`、`anchor`（含 `anchor_kind: video_timestamp`、`anchor_ref: "{task_id}@{seconds}"`）、`question_text`、可选 `parent_turn_id`。
3. Ask API response schema 包含 `turn_id`、`answer_text`、`anchor`、`whiteboard_actions`、`source_refs`、`persistence_status`、`context_source_hit`。
4. artifact-graph.json Companion 消费字段清单列出：`timeline.scenes[].sceneId/startTime/endTime`、`narration.segments[].sceneId/text/startTime/endTime`、`knowledge_points`、`solution_steps`、`topic_summary`。
5. mock turns 数据集覆盖 5 种场景：首轮提问、连续追问、白板成功、白板降级、无上下文降级。

## Tasks / Subtasks

- [ ] 定义 Companion 数据读取契约（AC: 1, 4）
  - [ ] 在 `companion/schemas.py` 中定义 `CompanionContextSource` 枚举（`redis` / `local_file` / `cos` / `degraded`）
  - [ ] 定义 `CompanionContext` DTO：`current_section`、`adjacent_sections`、`knowledge_points`、`solution_steps`、`topic_summary`、`context_source_hit`
  - [ ] 编写 artifact-graph.json Companion 消费字段清单文档（放在 story 文件 Dev Notes 中）
- [ ] 定义 Ask API request/response 契约（AC: 2, 3）
  - [ ] 在 `companion/schemas.py` 中定义 `AskRequest`：`session_id`、`anchor`（复用 `AnchorContext`）、`question_text`、`parent_turn_id`(optional)
  - [ ] 定义 `AskResponse`：`turn_id`、`answer_text`、`anchor`、`whiteboard_actions`、`source_refs`、`persistence_status`、`context_source_hit`
  - [ ] AskResponse 中 `persistence_status` 复用已有的 `PersistenceStatus` 枚举
  - [ ] AskResponse 中 `whiteboard_actions` 使用已有的 `WhiteboardActionRecord` 列表
  - [ ] AskResponse 中 `source_refs` 使用已有的 `SourceReference` 列表
- [ ] 创建 mock turns 数据集（AC: 5）
  - [ ] 在 `packages/student-web/src/features/video/mocks/` 创建 `companion-turns.mock.ts`
  - [ ] 5 种场景数据：首轮提问成功、连续追问（含 parent_turn_id）、白板成功（含 whiteboard_actions）、白板降级（persistence_status=whiteboard_degraded）、无上下文降级（context_source_hit=degraded）
- [ ] 编写契约测试（AC: 1-5）
  - [ ] 测试 `AskRequest` / `AskResponse` Pydantic 模型验证
  - [ ] 测试 `CompanionContext` DTO 字段完整性
  - [ ] 测试 mock turns 数据覆盖所有场景

### Story Metadata

- Story ID: `6.1`
- Story Type: `Contract Story`
- Epic: `Epic 6`
- Depends On: 无
- Blocks: `6.2`、`6.3`、`6.4`
- FRs: FR-CP-001（部分）

## Dev Notes

### artifact-graph.json Companion 消费字段清单

Companion Context Adapter 从 `VideoArtifactGraph.artifacts` 列表中提取以下字段：

```python
# 按 ArtifactType 分类消费
ARTIFACT_TYPE_TIMELINE = "timeline"
    -> scenes[].sceneId, scenes[].startTime, scenes[].endTime, scenes[].title
ARTIFACT_TYPE_NARRATION = "narration"
    -> segments[].sceneId, segments[].text, segments[].startTime, segments[].endTime
ARTIFACT_TYPE_KNOWLEDGE_POINTS = "knowledge_points"
    -> data 中的知识点列表
ARTIFACT_TYPE_SOLUTION_STEPS = "solution_steps"
    -> data 中的解题步骤列表
ARTIFACT_TYPE_STORYBOARD = "storyboard"
    -> topic_summary 从 storyboard 或 understanding 中提取
```

### 已有模型复用

以下模型已在 `shared/long_term/models.py` 中定义，直接复用：
- `AnchorKind.VIDEO_TIMESTAMP` — 锚点类型
- `AnchorContext` — 锚点上下文（context_type, anchor_kind, anchor_ref）
- `PersistenceStatus` — 持久化状态枚举
- `WhiteboardActionRecord` — 白板动作记录
- `SourceReference` — 引用来源
- `ContextType.VIDEO` — 上下文类型

### Ask API 契约详解

**Request**: `POST /api/v1/companion/ask`
```json
{
  "session_id": "video-task-uuid",
  "anchor": {
    "context_type": "video",
    "anchor_kind": "video_timestamp",
    "anchor_ref": "task-id@123"
  },
  "question_text": "为什么积分等于面积？",
  "parent_turn_id": null
}
```

**Response**:
```json
{
  "turn_id": "turn-uuid",
  "answer_text": "好问题！...",
  "anchor": { ... },
  "whiteboard_actions": [],
  "source_refs": [],
  "persistence_status": "complete_success",
  "context_source_hit": "redis"
}
```

### 技术约束

- Ask API 路由前缀为 `/api/v1/companion`（复用现有 `router` 的 `prefix="/companion"`）
- 响应格式遵循项目约定：`{code, msg, data}` 信封格式
- 所有新增 schema 必须继承 `BaseModel`（Pydantic v2）
- `CompanionContextSource` 枚举值必须与 Story 6.3 的三级降级路径完全一致
- `anchor_ref` 格式固定为 `{task_id}@{seconds}`，前端和后端统一使用此格式解析

### Suggested File Targets

- `packages/fastapi-backend/app/features/companion/schemas.py` — 新增 AskRequest/AskResponse/CompanionContextSource/CompanionContext
- `packages/fastapi-backend/app/features/companion/routes.py` — 新增 `POST /companion/ask` 路由壳（返回 mock 数据）
- `packages/student-web/src/features/video/mocks/companion-turns.mock.ts` — 前端 mock 数据
- `packages/fastapi-backend/tests/unit/test_companion_schemas.py` — 契约测试

### References

- [Source: _bmad-output/planning-artifacts/epics/23-epic-6.md#Story 6.1]
- [Source: packages/fastapi-backend/app/shared/long_term/models.py#AnchorKind,AnchorContext,PersistenceStatus]
- [Source: packages/fastapi-backend/app/features/companion/routes.py#router]
- [Source: packages/fastapi-backend/app/features/video/pipeline/models.py#VideoArtifactGraph,ArtifactType]
