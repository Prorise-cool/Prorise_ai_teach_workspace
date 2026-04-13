# Story 4.8 补充热修：视频结果页 `result_detail` 运行态回退修复

> 日期：2026-04-12
> 范围：`packages/fastapi-backend`
> 状态：已完成

## 背景

视频任务完成后，Pipeline 会把完整 `VideoResultDetail` 写入 Redis `xm_video_task:{task_id}:result_detail`，但结果查询接口此前只在 `detail_ref` 指向文件时读取完整详情；当 `detail_ref` 缺失时，接口只会回退到 `xm_task_runtime:{task_id}:state`，最终返回 `{status: completed, result: null}`，导致前端结果页误判为 `video-missing`。

## 本次修复

1. 在 `app/features/video/service/result_service.py` 新增统一的发布态叠加辅助方法，避免文件详情与运行态详情出现分叉逻辑。
2. 当 `detail_ref` 缺失或文件不存在时，结果接口现在会优先读取 Redis `result_detail`：
   - key: `xm_video_task:{task_id}:result_detail`
   - model: `VideoResultDetail`
3. 仅当 `result_detail` 也不存在时，才继续保留原有的 `task_state` 降级逻辑。

## 同日补充收口

为避免“完成态 / 超时 / 部分渲染”继续向结果页暴露错误语义，同日补充了以下运行态收口：

1. `app/worker.py`
   - 捕获 `TimeLimitExceeded`
   - 发射超时失败 snapshot / event
   - 把 `EXECUTION_TIMEOUT` 写回视频 `result_detail`
2. `app/features/video/pipeline/orchestration/orchestrator.py`
   - 将 Code2Video 主链显式拆为 `understanding -> storyboard -> manim_gen -> render -> tts -> compose -> upload`
   - 最终结果新增 `taskElapsedSeconds` 与 `renderSummary`
   - 日志明确区分 wall-clock `elapsed_ms` 与视频内容时长 `output_duration_s`
3. `app/features/video/pipeline/engine/agent.py`
   - 渲染阶段记录结构化 `render_summary`
   - 质量门禁达到后仍继续等待剩余 section，在 grace window 内尽量跑满全部片段
   - 若最终不是全量成功，结果中会显式保留 `completionMode=degraded`

## 变更文件

- `packages/fastapi-backend/app/features/video/service/result_service.py`
- `packages/fastapi-backend/app/features/video/pipeline/orchestration/orchestrator.py`
- `packages/fastapi-backend/app/features/video/pipeline/engine/agent.py`
- `packages/fastapi-backend/app/features/video/pipeline/models.py`
- `packages/fastapi-backend/app/shared/task_framework/status.py`
- `packages/fastapi-backend/app/worker.py`
- `packages/fastapi-backend/tests/unit/video/test_video_result_service.py`
- `packages/fastapi-backend/tests/unit/video/test_video_pipeline_engine.py`
- `packages/fastapi-backend/tests/unit/video/test_video_pipeline_orchestrator_runtime.py`
- `packages/fastapi-backend/tests/unit/video/test_video_worker_timeout.py`

## 验证

已执行：

```bash
cd packages/fastapi-backend
pytest \
  tests/unit/video/test_video_pipeline_engine.py \
  tests/unit/video/test_video_pipeline_orchestrator_runtime.py \
  tests/unit/video/test_video_worker_timeout.py \
  tests/unit/video/test_video_result_service.py -q
python -m compileall \
  app/worker.py \
  app/features/video/pipeline/orchestration/orchestrator.py \
  app/features/video/pipeline/engine/agent.py \
  app/features/video/pipeline/models.py \
  app/features/video/service/result_service.py
```

验证结果：

- `completed` 任务在 `detail_ref` 缺失时可恢复 `result.videoUrl`
- `pending` / `queued` 任务在没有 `result_detail` 时仍返回 `processing`
- Worker 超时时会返回 `failed + EXECUTION_TIMEOUT`
- `duration`（视频内容时长）与 `taskElapsedSeconds`（任务 wall-clock）已分离
- 渲染摘要 `renderSummary` 可区分 `full` / `degraded`

## 真实 E2E 验证

- 任务：`vtask_20260412135924_6a80addf`
- 创建 / 完成：`2026-04-12T13:59:24Z` -> `2026-04-12T14:16:53Z`
- 监控脚本 wall-clock：`1053.215s`
- `taskElapsedSeconds=1048`
- `duration=57`
- `renderSummary={allSectionsRendered: true, completionMode: full, successfulSections: 5}`
- Worker 最终日志：

```text
Pipeline done  task_id=vtask_20260412135924_6a80addf  elapsed_ms=1048011  output_duration_s=57  render_success=5/5
Task worker execution finished task_type=video status=completed elapsed_ms=1048023 budget_ms=1200000
```

## 第二轮计时样本

- 任务：`vtask_20260412143844_92ee9db0`
- 创建 / 完成：`2026-04-12T14:38:44Z` -> `2026-04-12T14:48:39Z`
- 监控脚本 wall-clock：`599.213s`
- `taskElapsedSeconds=594`
- `duration=45`
- `renderSummary={allSectionsRendered: true, completionMode: full, successfulSections: 5}`
- 基于 SSE 阶段切换时间估算：

```json
{
  "understanding": 38.579,
  "storyboard": 41.692,
  "manim_gen": 459.229,
  "render": 49.412,
  "tts": 4.86,
  "compose": 0.521,
  "upload": 4.567
}
```

- Worker 最终日志：

```text
Pipeline done  task_id=vtask_20260412143844_92ee9db0  elapsed_ms=594357  output_duration_s=45  render_success=5/5
Task worker execution finished task_type=video status=completed elapsed_ms=594373 budget_ms=1200000
```

## 已知边界

- 本次为最小风险热修，仍依赖 Redis TTL。
- 若历史任务的 `result_detail` 已过期且 `detail_ref` 仍为空，结果接口仍只能返回基础状态。
- 后续可在 Story 4.6 / 4.8 的长期收口中补齐文件持久化与 `detail_ref` 回写，彻底消除该边界。
- 长时间停留在同一 stage 时，SSE heartbeat 能证明任务活性，但 `/status.timestamp` 仍不会随 heartbeat 刷新；这属于等待态观测优化，不影响最终成功 / 失败语义。
