# Task Mocks

Story `2.1`、`2.5` 与 `2.6` 的统一任务 / SSE Mock 资产。

## 目标

- 为前端状态机提供成功、失败、取消、恢复与 Provider 切换样例
- 为后端契约测试提供可直接消费的 JSON 资产
- 为统一 SSE parser 与 broker 回放测试提供共享事件序列

## 文件

- `task-lifecycle.success.json`
- `task-lifecycle.failed.json`
- `task-lifecycle.cancelled.json`
- `task-lifecycle.snapshot.json`
- `task-lifecycle.provider-switch.json`
- `sse.connected.json`
- `sse.progress.json`
- `sse.provider-switch.json`
- `sse.completed.json`
- `sse.failed.json`
- `sse.heartbeat.json`
- `sse.snapshot.json`
- `sse.sequence.completed.json`
- `sse.sequence.failed.json`
- `sse.sequence.snapshot.json`
- `sse.sequence.provider-switch.json`
- `task-status.polling.json`
