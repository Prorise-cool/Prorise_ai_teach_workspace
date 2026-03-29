# 错误码规则

## 目标

错误码必须作为稳定契约资产维护，不能依赖自由文本 `message` 承载业务语义。

## 命名规则

- 错误码使用全大写加下划线，例如 `AUTH_INVALID_CREDENTIALS`。
- 公共错误码使用 `COMMON_` 前缀。
- 业务域错误码使用域前缀，例如 `TASK_`、`VIDEO_`、`CLASSROOM_`。

## 每条错误码必须说明

- `code`
- `httpStatus`
- `meaning`
- `retryable`
- `userAction`
- `relatedStory`

## 发布要求

- 错误码必须与失败示例 payload 一起发布。
- 新增错误码时，必须说明是否影响既有前端映射逻辑。
- 同一错误码不得在不同业务域复用不同语义。
