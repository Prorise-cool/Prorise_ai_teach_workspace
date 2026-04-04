# Story 2.5 SSE 事件目录冻结

## 通用字段

所有 SSE 事件与 broker 内部事件对象统一包含以下公共字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | 是 | 事件唯一 ID，格式 `{taskId}:evt:{sequence}` |
| `sequence` | `integer` | 是 | 同一 `taskId` 下从 `1` 开始严格递增 |
| `event` | `string` | 是 | 事件类型，固定为八类枚举之一 |
| `taskId` | `string` | 是 | 任务唯一 ID |
| `taskType` | `string` | 是 | 任务类型，例如 `video`、`classroom` |
| `status` | `string` | 是 | 对外五态之一 |
| `progress` | `integer` | 是 | `0-100` |
| `message` | `string` | 是 | 面向用户的可读说明 |
| `timestamp` | `string` | 是 | UTC ISO 8601 时间戳 |
| `requestId` | `string \| null` | 是 | 请求链路追踪 ID |
| `errorCode` | `string \| null` | 是 | 失败语义，只有 `failed` 必须非空 |
| `stage` | `string \| null` | 否 | 任务阶段标识 |
| `from` | `string \| null` | 条件必填 | `provider_switch` 的原 Provider ID |
| `to` | `string \| null` | 条件必填 | `provider_switch` 的目标 Provider ID |
| `reason` | `string \| null` | 条件必填 | `provider_switch` 的切换原因 |
| `result` | `object \| null` | 否 | `completed` 的最小结果摘要 |
| `resumeFrom` | `string \| null` | 条件必填 | `snapshot` 对应的最近已稳定事件 ID |

## 八类事件

### `connected`

- 触发时机：客户端 SSE 通道建立完成。
- 约束：必须是某次连接会话发出的首个事件。
- 最小额外语义：`status` 反映当前已知任务状态，`progress` 可为 `0`。

### `progress`

- 触发时机：任务阶段推进或进度更新。
- 约束：同一任务的 `sequence` 严格递增，不允许倒序覆盖旧状态。

### `provider_switch`

- 触发时机：运行时决定从一个 Provider 切换到另一个 Provider。
- 约束：必须包含 `from`、`to`、`reason`，字段值使用统一 Provider ID 风格，例如 `gemini-2_5-pro`、`azure-neural`。
- 注意：该事件只冻结契约，不代表已实现 Failover。

### `completed`

- 触发时机：任务成功收敛。
- 约束：应为终态事件；如补充结果摘要，写入 `result`。

### `failed`

- 触发时机：任务失败收敛。
- 约束：`errorCode` 必须为统一错误码且不得为空。

### `cancelled`

- 触发时机：任务被用户或系统显式取消并完成收敛。
- 约束：属于终态事件；若存在取消原因，应通过 `message` 与统一错误码 `TASK_CANCELLED` 表达。
- 注意：`progress` 表示取消前最后一次稳定进度，不要求强制回写为 `100`。

### `heartbeat`

- 触发时机：长连接保活。
- 约束：不改变业务状态，但仍消耗新的 `id` 与 `sequence`。

### `snapshot`

- 触发时机：断线恢复、轮询降级或重连后返回当前最小快照。
- 约束：必须包含 `resumeFrom`，表示客户端已经可以将该事件视为“覆盖到哪个事件 ID 的当前状态”。
- 注意：`snapshot` 只表达当前最小状态，不承载完整历史。

## Broker 写入约定

1. broker 内部统一接收与缓存结构化事件对象，不直接缓存原始 SSE 文本。
2. 若调用方未显式提供 `id` / `sequence`，broker 必须在写入前补齐。
3. 同一 `taskId` 的事件顺序以 `sequence` 为准，序列单调递增且不回退。
4. `replay(taskId, afterEventId=...)` 仅返回 `sequence` 大于指定事件的事件，为 `Last-Event-ID` 恢复预留接口。
5. `encode_sse_event(...)` 输出时必须同时写入 SSE `id:` 行和 JSON payload 内的 `id` 字段。
