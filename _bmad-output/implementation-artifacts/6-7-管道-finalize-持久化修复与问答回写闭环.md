# Story 6.7: 管道 finalize 持久化修复与问答回写闭环

Status: ready-for-dev

## Story

As a 回访用户，
I want 几天后回看视频时仍能使用 Companion 问答，
So that 我的问答数据可靠保存且视频上下文数据不丢失。

## Acceptance Criteria

1. 视频管道 `_run_finalize` 执行时调用 `persist_result_detail()` 将 `result-detail.json` 写入本地资产路径，上传 `artifact-graph.json` 到 COS，调用 `sync_artifact_graph()` 将产物索引写入 RuoYi `xm_session_artifact`。
2. 管道 finalize 持久化失败（COS 写入或 RuoYi 索引异常）时，任务仍标记为 completed，但设置 `artifact_writeback_failed` 或 `long_term_writeback_failed` 标记，不因持久化失败导致管道整体报错。
3. 一轮 Companion 问答完成后，问答记录已通过 `CompanionService.persist_turn()` 写入 `xm_companion_turn`，白板动作已写入 `xm_whiteboard_action_log`。
4. 通过 `GET /sessions/{session_id}/replay` 查询历史时，可看到该视频的所有 Companion 问答记录，`persistence_status` 准确区分各状态。

## Tasks / Subtasks

- [ ] 管道 `_run_finalize` 补调 `persist_result_detail()`（AC: 1）
  - [ ] 在 `orchestrator.py:_run_finalize()` 中，在 `runtime.save_model("result_detail", detail)` 之后增加 `persist_result_detail(asset_store, task.task_id, detail)` 调用
  - [ ] 确保 result-detail.json 写入本地资产路径
- [ ] 管道 finalize 上传 artifact-graph 到 COS（AC: 1）
  - [ ] 在 `_run_finalize()` 中增加 artifact-graph.json 上传到 COS 的逻辑
  - [ ] COS 路径与视频文件同级目录
  - [ ] 使用现有 COS 上传能力（`cos_client.py` 或 asset store）
- [ ] 管道 finalize 调用 `sync_artifact_graph()`（AC: 1）
  - [ ] 调用 `build_session_artifact_batch_request()` 构建 RuoYi 同步请求（已有 `long_term/records.py`）
  - [ ] 通过 RuoYi client 将产物索引写入 `xm_session_artifact` 表
- [ ] 持久化失败容错（AC: 2）
  - [ ] COS 上传异常：catch → log error → 设置 `artifact_writeback_failed = True`
  - [ ] RuoYi 索引异常：catch → log error → 设置 `long_term_writeback_failed = True`
  - [ ] 任务状态仍为 completed，不回退为 failed
  - [ ] 这些标记可在 TaskResult 或 result_detail 中体现
- [ ] Ask API 持久化集成验证（AC: 3）
  - [ ] 确认 Story 6.4 的 Ask API 已正确调用 `persist_turn()`
  - [ ] 确认 `CompanionTurnCreateRequest` 包含所有必需字段
  - [ ] 确认白板动作通过 `whiteboard_actions` 字段一并持久化
  - [ ] `xm_whiteboard_action_log` 通过 RuoYi 内部接口自动创建（companion_turn 关联）
- [ ] 回放 API 集成验证（AC: 4）
  - [ ] `GET /companion/sessions/{session_id}/replay` 已在 routes.py 中实现
  - [ ] 验证 `CompanionService.replay_session()` 正确返回所有问答记录
  - [ ] 验证 `persistence_status` 准确区分：complete_success、whiteboard_degraded、reference_missing、overall_failure
- [ ] 端到端测试（AC: 1-4）
  - [ ] 测试管道 finalize 后 artifact-graph.json 存在于本地和 COS
  - [ ] 测试管道 finalize 后 RuoYi xm_session_artifact 有索引记录
  - [ ] 测试管道 finalize 持久化失败不影响任务完成状态
  - [ ] 测试 Ask API → persist_turn → replay 全链路

### Story Metadata

- Story ID: `6.7`
- Story Type: `Persistence Story`
- Epic: `Epic 6`
- Depends On: 无（可与 Story 6.3 并行推进）
- Blocks: `6.3`（推荐先完成）
- FRs: FR-CP-005

## Dev Notes

### 当前管道 finalize 代码位置

`orchestrator.py:_run_finalize()` 约在 L1145：
- 当前仅执行 `runtime.save_model("result_detail", detail)` 保存到 Redis（TTL 2h）
- **缺失**：`persist_result_detail()` 本地持久化、COS 上传、`sync_artifact_graph()` RuoYi 索引

### 已有持久化函数

```python
# video/service/_helpers.py
persist_result_detail(asset_store, task_id, detail) → (detail, public_url)
persist_runtime_result_detail(runtime_store, task_id, detail) → None
load_artifact_graph(asset_store, task_id) → VideoArtifactGraph | None

# video/long_term/records.py
build_session_artifact_batch_request(graph, user_id, session_id) → BatchCreateRequest
```

### 容错策略

```python
# _run_finalize 中增加的持久化代码（伪代码）
try:
    persist_result_detail(asset_store, task.task_id, detail)
except Exception:
    logger.error("persist_result_detail failed", exc_info=True)
    artifact_writeback_failed = True

try:
    upload_artifact_graph_to_cos(asset_store, task.task_id, artifact_graph)
except Exception:
    logger.error("artifact-graph COS upload failed", exc_info=True)
    artifact_writeback_failed = True

try:
    sync_artifact_graph(ruoyi_client, artifact_graph, user_id, session_id)
except Exception:
    logger.error("sync_artifact_graph failed", exc_info=True)
    long_term_writeback_failed = True
```

### 数据流闭环

```
视频管道完成
  → _run_finalize()
    → persist_result_detail()      # 本地 JSON
    → upload to COS                # 远端 artifact-graph.json
    → sync_artifact_graph()        # RuoYi xm_session_artifact 索引
  → TaskResult(completed)

Companion Ask API
  → LLM 生成回答
  → persist_turn()                 # xm_companion_turn
  → whiteboard_actions 挂接       # xm_whiteboard_action_log

回访用户
  → Context Adapter 三级读取       # Redis → local → COS
  → replay_session()               # 加载历史问答
```

### 已有 RuoYi 表结构

- `xm_companion_turn`：turn_id, session_id, context_type, anchor_kind, anchor_ref, question_text, answer_summary, persistence_status 等
- `xm_whiteboard_action_log`：action_id, turn_id, action_type, action_payload_json, render_uri, render_state
- `xm_session_artifact`：artifact 索引表

### 技术约束

- 管道 finalize 持久化是"尽力而为"——失败不阻塞任务完成
- COS 上传路径必须与视频文件同级，确保 Context Adapter 第三级能正确找到
- `sync_artifact_graph()` 使用 `build_session_artifact_batch_request()` 构建 RuoYi 请求
- 回放 API 已实现，仅需验证数据完整性

### Suggested File Targets

- `packages/fastapi-backend/app/features/video/pipeline/orchestration/orchestrator.py` — 修改 `_run_finalize()`
- `packages/fastapi-backend/app/features/video/service/_helpers.py` — 已有 persist_result_detail
- `packages/fastapi-backend/app/features/video/long_term/records.py` — 已有 build_session_artifact_batch_request
- `packages/fastapi-backend/app/features/companion/routes.py` — 验证 replay 路由
- `packages/fastapi-backend/app/features/companion/service.py` — 验证 persist_turn
- `packages/fastapi-backend/tests/unit/test_pipeline_finalize.py` — 单元测试

### References

- [Source: _bmad-output/planning-artifacts/epics/23-epic-6.md#Story 6.7]
- [Source: packages/fastapi-backend/app/features/video/pipeline/orchestration/orchestrator.py#_run_finalize]
- [Source: packages/fastapi-backend/app/features/video/service/_helpers.py#persist_result_detail]
- [Source: packages/fastapi-backend/app/features/video/long_term/records.py#build_session_artifact_batch_request]
- [Source: packages/fastapi-backend/app/shared/long_term/models.py#PersistenceStatus]
- [Source: packages/RuoYi-Vue-Plus-5.X/script/sql/xm_dev.sql#xm_companion_turn,xm_whiteboard_action_log]
