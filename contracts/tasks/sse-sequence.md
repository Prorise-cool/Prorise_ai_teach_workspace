# Story 2.5 SSE 顺序与恢复语义

## 事件 ID 规则

- 格式：`{taskId}:evt:{sequence}`
- `sequence` 为 6 位补零十进制整数，例如 `000001`
- `id` 在单个任务流内唯一，不要求跨任务全局唯一

## 顺序保证

1. 同一 `taskId` 内，`sequence` 从 `1` 开始，严格单调递增。
2. `connected` 必须是一次 SSE 会话输出的首个事件。
3. `completed` / `failed` / `cancelled` 为终态事件；终态之后不允许再写入 `progress` 或 `provider_switch`。
4. `heartbeat` 只负责保活，但仍然占用新的 `sequence`，保证客户端可检测事件缺口。
5. `snapshot` 用于恢复当前最小状态，它本身也具有新的 `id` / `sequence`，同时通过 `resumeFrom` 指向最近已稳定可恢复的事件 ID。

## `Last-Event-ID` 预留口径

- 客户端重连时，可以把最近收到的 `id` 通过 HTTP Header `Last-Event-ID` 传给后端。
- broker 的回放接口接受 `afterEventId` 参数，用于筛选 `sequence` 更大的事件。
- 如果 `afterEventId` 无法识别，当前 Story 允许退化为“回放全部可用事件”；精确恢复逻辑由 Story `2.6` 实现。

## 推荐事件序列

### 正常完成

`connected -> progress -> heartbeat -> completed`

### Provider 切换后失败

`connected -> progress -> provider_switch -> heartbeat -> failed`

### 显式取消

`connected -> progress -> cancelled`

### 断线恢复

`connected -> progress -> snapshot`
