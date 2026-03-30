# Task Contracts

Story `2.1` 正式冻结统一任务运行时契约。
Story `2.5` 在此基础上冻结统一 SSE 事件契约。
Story `2.6` 补齐 SSE 恢复与 `/status` 降级口径。

## 版本

- 当前版本：`1.0.0`
- 来源 Story：`2.1`、`2.5`、`2.6`
- 适用范围：视频、课堂、文档解析、Learning Coach 等所有长任务能力

## 资产清单

- `task-status.md`：对外五态、内部状态映射与收敛规则
- `task-error-codes.md`：统一错误码字典与追踪语义
- `task-result.schema.json`：统一任务结果 schema
- `task-snapshot.schema.json`：`/status` / 快照 schema
- `task-progress-event.schema.json`：SSE / broker 统一事件 schema
- `sse-event.schema.json`：Story `2.5` 冻结后的 SSE 事件 schema
- `sse-events.md`：七类事件定义、字段语义与 broker 写入约定
- `sse-sequence.md`：事件顺序、`id` / `sequence` 与 `Last-Event-ID` 语义
- `sse-recovery.md`：`Last-Event-ID` 恢复顺序、`snapshot` 与 `/status` 降级语义
- `redis-runtime.md`：Redis 运行态边界、恢复语义与短期存储约束
- `redis-keys.md`：`xm_*` key 命名规则与 TTL 速查
- `provider-switch.md`：Provider 自动切换的事件语义与错误收敛规则

## 命名规则

- 对外任务字段统一使用 camelCase：`taskId`、`taskType`、`requestId`、`errorCode`
- Python 内部允许继续使用 snake_case，但序列化输出不得混用
- 任一业务 Story 只允许在 `context` 扩展位内追加字段，不允许改动基础字段名
- SSE 事件 ID 统一采用 `{taskId}:evt:{sequence(6 位补零)}`，同一 `taskId` 下严格单调递增
