# Video Contracts

视频域契约目录。

## v1/

Story 3.1 冻结的视频任务创建契约资产：

| 文件 | 说明 |
|------|------|
| `create-task-request.schema.json` | `POST /api/v1/video/tasks` 请求 schema |
| `create-task-response.schema.json` | 成功（202）与错误（422/403/429/500）响应 schema |
| `create-task-errors.md` | 视频域错误码定义、触发场景与前端处理建议 |

## 约定

- 视频域契约是统一任务契约（`contracts/tasks/`）的**领域扩展**。
- 公共字段（`taskId`、`taskType`、`status` 等）复用统一定义。
- 视频专属字段（`inputType`、`sourcePayload` 等）在本目录定义。
- 错误码已同步注册到 `contracts/tasks/task-error-codes.md`。
