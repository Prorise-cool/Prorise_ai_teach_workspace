# Video Contracts

视频域契约目录。

## v1/

Story 3.1 冻结的视频任务创建契约资产：

| 文件 | 说明 |
|------|------|
| `create-task-request.schema.json` | `POST /api/v1/video/tasks` 请求 schema |
| `create-task-response.schema.json` | 成功（202）与错误（422/403/429/500）响应 schema |
| `create-task-errors.md` | 视频域错误码定义、触发场景与前端处理建议 |
| `preprocess-request.schema.json` | `POST /api/v1/video/preprocess` 请求 schema |
| `preprocess-response.schema.json` | 预处理成功响应 schema |
| `pipeline-stages.md` | Story 4.1 冻结的视频阶段枚举、进度区间与显示语义 |
| `video-result.schema.json` | Story 4.1 冻结的视频成功结果 schema |
| `video-failure.schema.json` | Story 4.1 冻结的视频失败结果 schema |
| `video-artifact-graph.md` | Story 4.9 冻结的视频 artifact graph 契约 |
| `publish-api.md` | Story 4.10 冻结的视频公开发布 API |
| `CHANGELOG.md` | 视频域契约变更记录 |

## 约定

- 视频域契约是统一任务契约（`contracts/tasks/`）的**领域扩展**。
- 公共字段（`taskId`、`taskType`、`status` 等）复用统一定义。
- 视频专属字段（`inputType`、`sourcePayload` 等）在本目录定义。
- 错误码已同步注册到 `contracts/tasks/task-error-codes.md`。
- 视频流水线阶段与结果契约以后端 `packages/fastapi-backend/app/features/video/pipeline/models.py` 为代码落点。
