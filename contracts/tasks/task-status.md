# Story 2.1 统一任务状态冻结

## 对外状态

| value | label | terminal | 说明 |
|------|------|----------|------|
| `pending` | 待执行 | `false` | 任务已创建，尚未被 Worker 真正消费 |
| `processing` | 处理中 | `false` | 任务已进入执行链路，含运行中与重试中 |
| `completed` | 已完成 | `true` | 任务已成功收敛并可消费结果 |
| `failed` | 已失败 | `true` | 任务已失败收敛，必须附带统一 `errorCode` |
| `cancelled` | 已取消 | `true` | 任务被显式取消或取消流程已完成 |

## 内部状态到对外状态映射

| internalStatus | publicStatus | 说明 |
|---------------|--------------|------|
| `queued` | `pending` | 仅表示队列或调度层等待 |
| `running` | `processing` | 任务正在执行 |
| `retrying` | `processing` | 重试属于处理中，不对外暴露单独状态 |
| `succeeded` | `completed` | 成功收敛 |
| `error` | `failed` | 统一失败收敛 |
| `cancelling` | `cancelled` | 取消中的过渡态不单独对外暴露 |
| `cancelled` | `cancelled` | 取消完成 |

## 约束

1. 任一未处理异常必须收敛到 `failed`，不得留下悬挂态。
2. 终态仅允许 `completed`、`failed`、`cancelled`，终态之间不得直接跳转。
3. 终态任务若需重试，必须创建新的 `taskId`，不得复用旧任务继续推进。
4. 前端状态机只消费对外五态，不得解析 `queued`、`running`、`retrying` 等内部态。
