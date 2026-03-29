# OpenAPI 与 Schema 输出规范

## 目标

- 后端对外响应统一采用 `{code, msg, data}` 或 `{code, msg, rows, total}`。
- OpenAPI 中必须同时暴露成功示例、错误示例、分页结构与任务状态快照示例。
- 根目录 `contracts/_shared/` 维护共享响应 schema，避免各业务域重复发明包装结构。

## 最小要求

- 单对象响应：
  - 使用 `{code, msg, data}`。
  - `data` 必须由显式 schema 定义字段，不允许只返回自由字典。
- 分页响应：
  - 使用 `{code, msg, rows, total}`。
  - `rows` 的元素必须由显式 item schema 定义。
- 错误响应：
  - 仍使用 `{code, msg, data}`。
  - `data.error_code`、`data.retryable`、`data.details` 必须齐全。

## OpenAPI 发布要求

- 至少为 200、401、403、409、500 提供示例。
- 任务类接口至少额外提供状态快照示例，状态值必须来自已冻结枚举。
- 分页接口必须让 `rows`、`total` 在 OpenAPI 与共享 schema 中都可见。

## 资产落点

- `packages/fastapi-backend/app/schemas/`：FastAPI 运行时 schema 与 examples。
- `contracts/_shared/common-response.schema.json`：单对象成功包装。
- `contracts/_shared/error-response.schema.json`：统一错误包装。

## 验证方式

- 通过 `pytest` 校验 `/openapi.json` 中存在成功 / 错误 / 分页示例。
- 校验共享 schema 资产的必填字段和包装结构未漂移。
