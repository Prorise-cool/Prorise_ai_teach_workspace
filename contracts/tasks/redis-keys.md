# Story 2.4 Redis Key 与 TTL 规范

| Key | 用途 | TTL |
|-----|------|-----|
| `xm_task:{task_id}` | 任务最小快照 | `2h` |
| `xm_task_events:{task_id}` | 结构化 SSE 事件缓存 | `1h` |
| `xm_task_message:{message_id}` | 异步消息到任务 ID 的短期映射 | `2h` |
| `xm_provider_health:{provider}` | Provider 健康状态缓存 | `60s` |

## 约束

1. 所有 key 必须使用 `xm_` 命名空间。
2. 所有 key 必须带 TTL，不允许永不过期的运行态写入。
3. `xm_task_events:{task_id}` 仅保存短期恢复所需的最近结构化事件，不作为长期审计库。
