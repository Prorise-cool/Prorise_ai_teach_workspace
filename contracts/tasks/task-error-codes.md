# Story 2.1 统一任务错误码字典

## 错误码

| code | httpStatus | retryable | userAction | meaning |
|------|------------|-----------|------------|---------|
| `TASK_INVALID_INPUT` | `400` | `false` | 修正输入后重新提交 | 任务参数缺失、格式非法或不满足最小约束 |
| `TASK_PROVIDER_UNAVAILABLE` | `503` | `true` | 稍后重试或等待自动切换 | 当前 Provider 暂不可用 |
| `TASK_PROVIDER_TIMEOUT` | `504` | `true` | 重试当前任务 | Provider 超时或长时间无响应 |
| `TASK_PROVIDER_ALL_FAILED` | `503` | `true` | 稍后重试 | 已尝试的 Provider 全部失败 |
| `TASK_CANCELLED` | `409` | `false` | 如需继续请重新发起任务 | 任务被用户或系统显式取消 |
| `TASK_UNHANDLED_EXCEPTION` | `500` | `true` | 记录 `requestId` / `taskId` 后排障 | 未被业务层显式捕获的异常 |

## 追踪字段语义

- `requestId`：同一次入口请求链路的追踪 ID，用于串联网关、FastAPI、Worker 与日志。
- `taskId`：单个长任务的唯一执行 ID；重试新任务必须生成新 `taskId`。
- `errorCode`：前端唯一允许依赖的失败语义字段，禁止通过解析 `message` 猜测错误类型。
- `message`：只用于人类可读反馈，不承诺可机读结构。
