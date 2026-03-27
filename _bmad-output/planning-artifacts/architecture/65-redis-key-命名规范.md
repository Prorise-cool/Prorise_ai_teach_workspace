# 6.5 Redis Key 命名规范

## 6.5.1 基础格式
```text
{prefix}:{business_id}
```

## 6.5.2 RuoYi 共享 Key
| Key 前缀 | 用途 | 完整格式 |
|----------|------|----------|
| `online_tokens:` | 在线用户 Token | `online_tokens:{tokenValue}` |
| `sys_config:` | 参数管理缓存 | `sys_config:{configKey}` |
| `sys_dict:` | 字典缓存 | `sys_dict:{dictType}` |
| `pwd_err_cnt:` | 密码错误计数 | `pwd_err_cnt:{username}` |

## 6.5.3 小麦运行时 Key
| Key 前缀 | 用途 | 完整格式 | TTL |
|----------|------|----------|-----|
| `xm_task:` | 异步任务状态 | `xm_task:{task_id}` | 2h |
| `xm_task_events:` | SSE 事件缓存 | `xm_task_events:{task_id}` | 1h |
| `xm_video_runtime:` | 视频任务运行态 | `xm_video_runtime:{task_id}` | 2h |
| `xm_classroom_runtime:` | 课堂会话运行态 | `xm_classroom_runtime:{session_id}` | 会话结束后 1h |
| `xm_provider_health:` | Provider 健康状态 | `xm_provider_health:{provider}` | 60s |
