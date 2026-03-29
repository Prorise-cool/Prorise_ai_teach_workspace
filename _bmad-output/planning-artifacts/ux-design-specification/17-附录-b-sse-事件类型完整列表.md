## 附录 B: SSE 事件类型完整列表

| 事件类型 | 触发时机 | Payload 结构 |
|----------|----------|-------------|
| `connected` | 连接建立 | `{ taskId, timestamp }` |
| `progress` | 任务进度更新 | `{ taskId, stage, progress, message }` |
| `provider_switch` | Provider 切换 | `{ taskId, from, to, reason }` |
| `completed` | 任务完成 | `{ taskId, result }` |
| `failed` | 任务失败 | `{ taskId, error, message }` |
| `heartbeat` | 心跳检测 | `{ timestamp }` |
| `snapshot` | 断线恢复快照 | `{ taskId, status, progress, stage }` |

***
