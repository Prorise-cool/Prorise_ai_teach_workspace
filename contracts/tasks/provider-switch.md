# Provider Switch Contract

Story `2.8` 约定当主 Provider 不可用且切换到备 Provider 时，系统必须保留可解释的切换语义。

## 切换字段

- `event`：固定为 `provider_switch`
- `taskId` / `taskType`：当前任务上下文
- `status` / `progress`：当前任务进度语义
- `message` / `requestId`：用户提示与链路追踪字段
- `from`：原始 Provider ID。
- `to`：切换后的 Provider ID。
- `reason`：触发切换的直接原因，例如 timeout、rate-limit、cached-unhealthy。
- `errorCode`：统一错误码，必须复用任务框架已有错误码。

## 约束

- 如果上层通过 SSE 暴露切换过程，事件类型必须是 `provider_switch`。
- 切换语义只能描述运行时主备变化，不能附带长期业务结果。
- 全部 Provider 都不可用时，最终错误码必须收敛为 `TASK_PROVIDER_ALL_FAILED`。
