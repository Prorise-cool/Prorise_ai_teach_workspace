# Story 6.3: 视频 Context Adapter（三级降级读取）

Status: ready-for-dev

## Story

As a 后端团队，
I want 通过三级降级读取视频 artifact-graph 获取当前时间点的上下文，
So that Companion 服务在 Redis 过期、本地文件清理等场景下仍能获取可靠数据。

## Acceptance Criteria

1. Context Adapter 按 Redis 运行态 -> 本地 artifact-graph.json -> COS 远端文件优先级尝试，返回 `CompanionContext` DTO 标注实际命中源（`context_source_hit`）。
2. Redis 命中时直接返回，不重复读取后续层。
3. 本地文件命中时成功解析 `artifact-graph.json` 并构建包含 `current_section`、`adjacent_sections`、`knowledge_points`、`solution_steps`、`topic_summary` 的 `CompanionContext`。
4. 本地文件不存在时从 COS 下载 `artifact-graph.json` 并解析，结果与本地文件版本一致。
5. 三级全部失败时返回 `degraded` 上下文（仅包含 task_id 和题目文本，从 `xm_video_task` 元数据获取），不抛出未处理异常。

## Tasks / Subtasks

- [ ] 重写 `video_adapter.py`（AC: 1-5）
  - [ ] 定义 `get_video_context(task_id: str, seconds: int) -> CompanionContext` 异步函数
  - [ ] 实现第一级：从 Redis runtime 读取 `xm_video_task:{task_id}:result_detail`，解析为 CompanionContext
  - [ ] 实现第二级：调用 `load_artifact_graph(asset_store, task_id)` 读取本地 artifact-graph.json
  - [ ] 实现第三级：从 COS 下载 artifact-graph.json（通过 `cos_client.py` 或 asset store 的远端读取能力）
  - [ ] 实现降级：三级失败后从 Redis 或 RuoYi 获取 task 元数据（task_id + 题目文本）
- [ ] 实现 artifact-graph → CompanionContext 解析（AC: 3）
  - [ ] 从 `VideoArtifactGraph.artifacts` 列表中按 `ArtifactType` 提取数据
  - [ ] 根据 `seconds` 参数匹配当前 section（`timeline.scenes` 的 startTime/endTime 区间）
  - [ ] 构建当前 section 内容：标题 + 旁白文本 + 时间范围
  - [ ] 构建相邻 sections：前后各 1 段摘要
  - [ ] 提取 `knowledge_points` 和 `solution_steps`
  - [ ] 提取 `topic_summary`（从 storyboard 或 understanding 中）
- [ ] Redis runtime 读取集成（AC: 1, 2）
  - [ ] 复用 `VideoRuntimeStateStore` 读取 result_detail
  - [ ] Redis key: `xm_video_task:{task_id}:result_detail`（TTL 2h）
  - [ ] 命中时直接从 result_detail 构建 CompanionContext，context_source_hit="redis"
- [ ] 降级路径实现（AC: 5）
  - [ ] 定义 `build_degraded_context(task_id: str, question_text: str) -> CompanionContext`
  - [ ] 从 Redis runtime 获取 task 元数据或调用 RuoYi 查询 task 基本信息
  - [ ] context_source_hit="degraded"，persistence 不受影响
- [ ] 单元测试覆盖（AC: 1-5）
  - [ ] 测试 Redis 命中路径
  - [ ] 测试 Redis 未命中 → 本地文件命中路径
  - [ ] 测试 Redis + 本地未命中 → COS 命中路径
  - [ ] 测试三级全部失败 → degraded 路径
  - [ ] 测试 artifact-graph 解析各字段正确性

### Story Metadata

- Story ID: `6.3`
- Story Type: `Backend Story`
- Epic: `Epic 6`
- Depends On: `6.1` 契约、`6.7` 持久化修复（推荐先完成）
- Blocks: `6.4`
- FRs: FR-CP-001

## Dev Notes

### 已有基础设施

- `VideoRuntimeStateStore`：Redis 运行态存储，key 前缀 `xm_video_task`，TTL 2h（`runtime.py:TASK_RUNTIME_TTL_SECONDS`）
- `load_artifact_graph(asset_store, task_id)`：从本地资产路径读取 artifact-graph.json（`video/service/_helpers.py`）
- `persist_result_detail(asset_store, task_id, detail)`：将 result-detail 写入本地资产路径
- `VideoArtifactGraph` 模型：包含 `session_id`、`session_type`、`artifacts` 列表（`pipeline/models.py`）
- `ArtifactType` 枚举：`TIMELINE`、`STORYBOARD`、`NARRATION`、`KNOWLEDGE_POINTS`、`SOLUTION_STEPS`、`MANIM_CODE`
- `VideoResultDetail` 包含 sections（含 startTime/endTime/title/narration_text）可直接用于构建 CompanionContext

### section 匹配算法

```python
def find_current_section(sections: list[VideoResultSection], seconds: int) -> VideoResultSection | None:
    for section in sections:
        if section.start_time <= seconds < section.end_time:
            return section
    return sections[-1] if sections else None  # fallback 到最后一段
```

### CompanionContext DTO 结构

```python
class CompanionContext(BaseModel):
    current_section: SectionContext | None          # 标题 + 旁白 + 时间范围
    adjacent_sections: list[SectionSummary]         # 前后各 1 段摘要
    knowledge_points: list[dict]                    # 知识点列表
    solution_steps: list[dict]                      # 解题步骤列表
    topic_summary: str | None                       # 主题摘要
    context_source_hit: CompanionContextSource       # 命中源
    task_id: str                                    # 关联任务
```

### 降级上下文结构

```python
def build_degraded_context(task_id: str) -> CompanionContext:
    return CompanionContext(
        current_section=None,
        adjacent_sections=[],
        knowledge_points=[],
        solution_steps=[],
        topic_summary=None,
        context_source_hit=CompanionContextSource.DEGRADED,
        task_id=task_id,
    )
```

### COS 读取策略

- COS 中 artifact-graph.json 与视频文件同级目录
- 使用现有 `cos_client.py` 或 asset store 的远端读取能力
- 下载后缓存到本地资产路径，后续读取直接走本地文件

### 技术约束

- 不修改 `VideoRuntimeStateStore` 或 Redis key 结构
- 不引入新的 Redis key（复用已有运行态）
- 异常处理：每一级读取失败只 log warning，不抛出异常
- COS 下载失败不计入重试（避免阻塞 Ask API 响应时间）

### Suggested File Targets

- `packages/fastapi-backend/app/features/companion/context_adapter/video_adapter.py` — 重写
- `packages/fastapi-backend/app/features/companion/schemas.py` — CompanionContext DTO
- `packages/fastapi-backend/tests/unit/test_video_context_adapter.py` — 单元测试

### References

- [Source: _bmad-output/planning-artifacts/epics/23-epic-6.md#Story 6.3]
- [Source: packages/fastapi-backend/app/features/video/pipeline/models.py#VideoArtifactGraph,ArtifactType]
- [Source: packages/fastapi-backend/app/features/video/service/_helpers.py#load_artifact_graph,persist_result_detail]
- [Source: packages/fastapi-backend/app/features/video/pipeline/orchestration/runtime.py#TASK_RUNTIME_TTL_SECONDS]
