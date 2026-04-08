# Debug Notes

## Common Issues

### Authentication

**问题**: 本地有会话但拿不到
- 检查是否混用 `localhost` 和 `127.0.0.1`
- 统一使用 `http://127.0.0.1:5173`

**问题**: 登录后未跳转
- 检查 `returnTo` 是否正确传递
- 检查路由守卫逻辑
- 不要用 `setTimeout` 作为主控制流

### SSE

**问题**: 断线后无法恢复
- 检查 `Last-Event-ID` 是否正确传递
- 检查 `/status` 降级是否工作
- 检查 `snapshot` 事件处理

**问题**: 事件顺序错乱
- 检查 `sequence` 字段处理
- 检查事件去重逻辑

### Profile

**问题**: 配置未保存
- 检查 API adapter 字段映射
- 检查 RuoYi snake_case/camelCase 转换
- 检查 Envelope 解包

### Video/Classroom

**问题**: 任务创建后 404
- 检查 taskId 是否正确传递
- 检查 mock handler 动态路由匹配
- 检查 Redis 运行态 key

## Debug Commands

```bash
# 检查 Redis 任务状态
redis-cli GET "task:{taskId}:state"

# 检查 SSE 连接
curl -N http://localhost:8090/api/v1/video/tasks/{taskId}/events

# 检查 RuoYi 认证
curl -H "Authorization: Bearer {token}" http://localhost:8080/admin/getInfo
```

## Temporary Files

临时排查脚本必须使用 `.tmp-*` 命名，任务收口前删除。