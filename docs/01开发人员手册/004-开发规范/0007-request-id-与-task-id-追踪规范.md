# request_id 与 task_id 追踪规范

## 目标

- 为每个进入 FastAPI 的 HTTP 请求建立统一 `request_id`。
- 为每个进入任务框架的异步任务建立统一 `task_id`。
- 保证请求日志、任务日志、SSE 事件与错误响应能够通过同一组字段串联。

## HTTP 请求追踪

- 统一请求头字段：`X-Request-ID`。
- 外部传入 `X-Request-ID` 时，仅在值匹配 `^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$` 时信任并透传。
- 外部值为空或不合法时，服务端生成新值，格式为 `req_{timestamp}_{short_uuid}`。
- 任意 HTTP 响应都必须回写 `X-Request-ID`，包括错误响应。

## 任务追踪

- 统一任务 ID 字段：`task_id`。
- 任务 ID 生成规则：`{prefix}_{timestamp}_{short_uuid}`。
- `TaskContext` 必须承载 `task_id`、`task_type`、`request_id`、`user_id`、`retry_count`。
- 非任务场景禁止伪造 `task_id`；日志中统一使用 `-` 表示空值。

## 日志格式

- 统一时间格式：`yyyy-MM-dd HH:mm:ss`。
- 统一日志格式：

```text
yyyy-MM-dd HH:mm:ss [thread] LEVEL logger - message | request_id=... task_id=... error_code=...
```

- `request_id`、`task_id`、`error_code` 由统一日志上下文注入，不允许业务模块自行发明 `traceId`、`jobId`、`executionId` 等平行字段。
- 无错误码场景统一输出 `error_code=-`。

## SSE 与错误响应

- SSE 事件必须继续使用统一 `task_id`。
- SSE broker 的发布与回放日志必须带上当前 `task_id`。
- 错误响应 `data` 中统一包含 `request_id`、`task_id`；`details` 继续保留业务上下文并回填当前链路的追踪字段。
- 未处理异常统一映射到 `COMMON_INTERNAL_ERROR`，并保留 `request_id` 以便排障。

## 当前实现落点

- `packages/fastapi-backend/app/core/logging.py`
- `packages/fastapi-backend/app/core/middleware/request_context.py`
- `packages/fastapi-backend/app/core/errors.py`
- `packages/fastapi-backend/app/shared/task_framework/context.py`
- `packages/fastapi-backend/app/shared/task_framework/scheduler.py`
- `packages/fastapi-backend/app/infra/sse_broker.py`

## 验证要求

- 普通请求日志中能看到 `request_id`，且响应头存在同值 `X-Request-ID`。
- 有效上游 `X-Request-ID` 会被透传，无效值会被替换为服务端生成值。
- 任务创建、调度成功、调度失败、SSE publish / replay 日志都带 `task_id`。
- 任务失败时，错误日志与 SSE `failed` 事件能通过同一 `task_id` 串联。
