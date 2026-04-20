# Story 4.3 补丁：修复重试上限收敛为 1 + Dramatiq Worker time_limit 对齐

## 背景

近期 6 镜头视频生成任务出现“长时间纯等待 + 最终被硬性超时强杀”的失败形态。典型特征是：

- 分镜渲染失败后进入 `patch retry` 修复循环，LLM 反复调用导致总耗时快速累积。
- 同时 Dramatiq 的 `TimeLimit` middleware 默认上限为 `600000ms`（10 分钟），与我们在任务侧展示/记录的 `FASTAPI_DRAMATIQ_TASK_TIME_LIMIT_MS`（例如 20 分钟）不一致，导致任务在“预算未到”的情况下被强制注入异常并丢弃结果。

目标是**让流水线可打通**：优先保证任务不会因为修复风暴 + 中途强杀而永远等不到最终结果。

## 变更

### 1) patch retry：硬性收敛到“最多 1 次修复”

- `video_patch_retry_max_retries` 默认值下调为 `1`，并在运行态对 `patch_retry_max_retries` 做硬上限钳制（`0..1`）。
- 目的：避免单个分镜因多轮修复导致整体任务耗时指数级上升；让失败更早暴露，并依赖“degraded 模式 + quality gate”去产出可用结果。

涉及文件：

- `packages/fastapi-backend/app/core/config.py`
- `packages/fastapi-backend/app/features/video/pipeline/engine/agent.py`
- `packages/fastapi-backend/app/features/video/pipeline/orchestration/orchestrator.py`
- `packages/fastapi-backend/.env.example`

### 2) Dramatiq time_limit：与 FASTAPI_DRAMATIQ_TASK_TIME_LIMIT_MS 对齐

在 `app.worker` 注册的 `execute_task` actor 上显式设置 `time_limit`，使其跟随 `settings.dramatiq_task_time_limit_ms`，避免 Dramatiq 默认 10 分钟上限提前强杀 Worker。

涉及文件：

- `packages/fastapi-backend/app/worker.py`

## 预期效果

- `patch retry` 不再出现“单分镜多轮修复拖垮整任务”的常态路径；每个分镜最多触发 1 次修复信号。
- Worker 的硬超时上限与任务框架展示的预算一致，避免出现 `budget_ms=1200000` 但仍在 ~11 分钟被 TimeLimit 强杀的矛盾现象。

