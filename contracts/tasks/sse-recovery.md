# Story 2.6 SSE 断线恢复与 `/status` 降级契约

## 目标

- 在 SSE 短断线、刷新、重连失败或浏览器不适合持续连接时，保持任务上下文可恢复。
- 恢复优先级必须统一，不能由各个页面自行决定。
- 恢复与降级只依赖 Redis 运行态快照与短期事件缓存，不回放数据库历史。

## 恢复顺序

1. 客户端重连时，优先携带最近一次成功收到的 SSE `id` 作为 `Last-Event-ID`。
2. 服务端先按 `Last-Event-ID` 去 Redis 事件缓存补发 `sequence` 更大的结构化事件。
3. 如果当前没有可补发事件，客户端读取 `/status` 返回的最小快照恢复当前状态。
4. 如果 SSE 重连次数超过上限、浏览器不支持持续连接、或网络环境不稳定，客户端切换到 `/status` 轮询。

## `Last-Event-ID` 语义

- `Last-Event-ID` 必须使用完整 SSE 事件 ID，格式为 `{taskId}:evt:{sequence}`。
- 该值是排他性下界，服务端只能补发更大的 `sequence`，不能重复重放已确认事件。
- 无法识别、格式非法或不属于当前 `taskId` 的 `Last-Event-ID`，都应视为“没有恢复游标”；服务端可以回放全部可用事件，或要求客户端退回快照恢复。
- 补发事件必须保留原始 `id` 与 `sequence`，不得重新编号。

## `snapshot` 与 `/status` 语义

- `snapshot` 是恢复锚点，不是完整历史压缩包。
- `/status` 的返回值必须与 `TaskSnapshot` 对齐，核心字段包括：
  - `taskId`、`taskType`、`status`、`progress`、`message`、`timestamp`、`requestId`、`errorCode`
- 若服务端已知最新恢复边界，还应补充：
  - `resumeFrom`：当前快照覆盖到的最近稳定事件 ID
  - `lastEventId`：服务端已知的最新 SSE 事件 ID
- 需要附带降级原因、轮询间隔或展示提示时，只允许放在 `context` 扩展位。
- 推荐的 `context` 字段如下：
  - `source`: 固定建议值 `status-polling`
  - `pollIntervalMs`: 建议的下一次轮询间隔
  - `fallbackReason`: 触发降级的原因，例如 `sse_reconnect_limit`、`eventsource_unsupported`、`event_gap`、`snapshot_missing`、`network_unavailable`

## 轮询建议

- 轮询只作为降级通道，不是主通道。
- 推荐间隔由服务端通过 `context.pollIntervalMs` 提示，默认值可由前端兜底，但不得为每个页面单独定义一套规则。
- 当 `status` 进入终态时，轮询应立即停止。
- 一旦 SSE 恢复成功，客户端必须停止轮询并切回事件流。
- 轮询期间不得伪造从头开始的进度，只能暴露当前真实状态。

## 兼容约束

- 恢复逻辑只允许读取最近快照与短期事件缓存，不得依赖数据库历史回放。
- 恢复期间不得创建新任务，不得用“重新提交”掩盖恢复失败。
- 新增恢复提示只能通过 `context` 扩展位追加，不得修改现有基础字段命名。
