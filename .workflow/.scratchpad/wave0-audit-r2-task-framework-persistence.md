# Wave 0 R2 — Task framework + 持久化统一性审计

## 总览

| 指标 | 值 |
|------|------|
| TaskType 当前值 | VIDEO, CLASSROOM（缺失 OPENMAIC 等） |
| 用了 task framework 的 feature | classroom, video |
| 用了 task framework SSE 的 feature | classroom, video（共享 `/api/v1/tasks/{task_id}/events`） |
| 用了 long_term 的 feature | companion, knowledge（落 xm_companion_turn / xm_knowledge_chat_log） |
| 完全无任务/持久化的 feature | auth, learning, learning_coach, openmaic |

---

## 详细发现

### F1: openmaic — P0 阻塞性

- **任务持久化**: ❌ 自建 JobStore 用 Redis-only（`jobs/job_store.py:17-21` key=`xm_openmaic_job_{job_id}_{...}`，24h TTL 自动过期）
- **TaskType 枚举**: ❌ 完全缺失（routes.py:108-125 `create_classroom()` 返回 job_id 无 TaskType 标记）
- **SSE 端点**: ❌ 自建 `_event_stream()`（routes.py:145-203），轮询 JobStore 2s 间隔，max 300 轮（10 分钟），与 classroom/video 的 SSE 不兼容
- **chat 落库**: ❌ 无 long_term 集成（无 CompanionTurn/KnowledgeChat 导入）
- **白板落库**: ❌ 无 WhiteboardActionLog
- **大产物落库**: ❌ scenes/agents/actions 全在内存或 Redis，无 xm_session_artifact 拆条目

**严重程度**: P0 — openmaic 与 classroom 的任务生命周期完全分离；同用户同教室无法复用追溯回放；24h Redis 过期数据丢失。

### F2: classroom — 样板

- 任务持久化: ✅ BaseTaskMetadataService（service.py:8）+ xm_classroom_session（task/metadata.py:132）
- TaskType: ✅ TaskType.CLASSROOM（service.py:13）
- SSE: ✅ 复用共享（routes.py:9 + 140-147）

### F3: video — 样板

- 任务持久化: ✅ BaseTaskMetadataService（service/base_service.py:21）+ xm_video_task
- TaskType: ✅ TaskType.VIDEO
- SSE: ✅ 复用共享（routes.py:20-21）
- 大产物落库: ⚠️ 部分集成（VideoArtifactIndexService 存在）

### F4: companion — 部分集成

- 任务持久化: ❌ 无（伴学轮次不算任务）
- chat 落库: ✅ persist_turn() → RuoYi `/internal/xiaomai/companion/turns`（service.py:80-94）+ routes.py:81-88
- 白板落库: ✅ WhiteboardActionRecord 嵌入 CompanionTurnSnapshot（service.py:195-199）

### F5: knowledge — 部分集成

- 任务持久化: ❌
- chat 落库: ✅ persist_chat_log() → RuoYi `/internal/xiaomai/knowledge/chat-logs`（service.py:36-55）
- 大产物落库: ❌ 检索结果无产物表

### F6: learning — 无

- 任务持久化/chat/产物：❌

### F7: learning_coach — 缺 quiz 落库

- 任务持久化: ❌（用 Redis rate limit）
- quiz 结果: ❌ quiz_grade 端点（routes.py:156）有结果但**未落 xm_quiz_result**（schema 已就绪）

### F8: auth — 纯认证代理

### F9: tasks — 空目录

---

## TaskType 推荐变更

当前 (`app/shared/task/metadata.py:16-19`):
```python
class TaskType(StrEnum):
    VIDEO = "video"
    CLASSROOM = "classroom"
```

| Feature | 是否新增 TaskType | 理由 |
|---|---|---|
| openmaic | **是** — `OPENMAIC_CLASSROOM_GENERATION` | 与 classroom 是不同工作流（Dramatiq + 24h），需独立追踪 |
| learning_coach | 否 | 只生成练习/建议 |
| knowledge | 否 | 已有 long_term + KnowledgeChat |
| companion | 否 | 已有 long_term + CompanionTurn |
| learning | 否 | 只是结果集合 |

---

## 推荐 Wave 0 热修清单

### P0：OpenMAIC 最小一致化
1. **service.py:create_classroom_job** 后同步写 metadata（用现有 `TaskType.CLASSROOM` 兼容，Wave 1 拆出 OPENMAIC_CLASSROOM_GENERATION）
2. **routes.py:145-203 SSE** 改为 `return await get_shared_task_events(job_id, request, None, access_context)`

### P1：留到 Wave 1
- learning_coach quiz_grade → xm_quiz_result
- companion/knowledge chat 同步落 xm_session_artifact 条目

---

## Wave 1 大重构

| 优先级 | 项 | 预算 |
|---|---|---|
| 1 | OpenMAIC JobStore → TaskMetadataRepository 完整迁移 | 200-300 行 |
| 2 | LongTerm → xm_session_artifact 完整映射（companion/knowledge/whiteboard） | 150-250 行 |
| 3 | learning + learning_coach 接入 task framework + xm_quiz_result | 100-200 行 |

---

## 最终交付状态矩阵

| Feature | Task FW | Long Term | SSE | RuoYi 落库 | Wave 0 | 备注 |
|---|---|---|---|---|---|---|
| classroom | ✅ | ❌ | ✅ | xm_classroom_session | ✅ | 样板 |
| video | ✅ | ⚠️ | ✅ | xm_video_task | ✅ | 样板 |
| companion | ❌ | ✅ | ❌ | xm_companion_turn | ✅ | 只 long_term |
| knowledge | ❌ | ✅ | ❌ | xm_knowledge_chat_log | ✅ | 只 long_term |
| **openmaic** | ❌ | ❌ | ❌ | ❌ | **⚠️ P0** | **阻塞** |
| learning_coach | ❌ | ❌ | ❌ | ❌（应 xm_quiz_result） | ⚠️ 优化 | 可用不落库 |
| learning | ❌ | ❌ | ❌ | ❌ | ⚠️ 预留 | 结果集合 |
| auth | ❌ | ❌ | ❌ | 代理 RuoYi | ✅ | 纯认证 |
