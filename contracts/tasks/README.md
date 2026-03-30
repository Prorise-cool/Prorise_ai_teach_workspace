# Task Contracts

Story `2.1` 正式冻结统一任务运行时契约。

## 版本

- 当前版本：`1.0.0`
- 来源 Story：`2.1`
- 适用范围：视频、课堂、文档解析、Learning Coach 等所有长任务能力

## 资产清单

- `task-status.md`：对外五态、内部状态映射与收敛规则
- `task-error-codes.md`：统一错误码字典与追踪语义
- `task-result.schema.json`：统一任务结果 schema
- `task-snapshot.schema.json`：`/status` / 快照 schema
- `task-progress-event.schema.json`：SSE / broker 统一事件 schema

## 命名规则

- 对外任务字段统一使用 camelCase：`taskId`、`taskType`、`requestId`、`errorCode`
- Python 内部允许继续使用 snake_case，但序列化输出不得混用
- 任一业务 Story 只允许在 `context` 扩展位内追加字段，不允许改动基础字段名
