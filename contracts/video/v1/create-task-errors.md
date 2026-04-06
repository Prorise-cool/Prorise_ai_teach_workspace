# 视频任务创建错误码

> Story 3.1 冻结。视频域错误码已同步注册到统一 `TaskErrorCode` 字典（`contracts/tasks/task-error-codes.md`）。

## 视频域专属错误码

| code | httpStatus | retryable | userAction | 触发场景 | 前端建议处理方式 |
|------|------------|-----------|------------|----------|------------------|
| `VIDEO_INPUT_EMPTY` | `422` | `false` | 填写内容后重新提交 | `inputType: text` 时 `sourcePayload.text` 为空或仅空白 | 输入框 inline error，禁用提交按钮 |
| `VIDEO_INPUT_TOO_LONG` | `422` | `false` | 缩减内容后重新提交 | `sourcePayload.text` 超过 5000 字符上限 | 输入框 inline error + 字符计数器高亮 |
| `VIDEO_IMAGE_FORMAT_INVALID` | `422` | `false` | 选择 JPG/PNG/WebP 格式图片 | `inputType: image` 时图片格式不在支持列表内 | toast 提示支持的格式 |
| `VIDEO_IMAGE_TOO_LARGE` | `422` | `false` | 压缩图片或选择更小文件 | `inputType: image` 时图片体积超过 10MB | toast 提示文件大小限制 |
| `VIDEO_OCR_FAILED` | `200` | `false` | 手动补充文本后继续创建任务 | 图片已存储但 OCR 识别失败 | 在预处理结果区提示用户补充文本 |
| `VIDEO_OCR_EMPTY` | `200` | `false` | 补充文本或更换图片 | OCR 未识别到可用文本 | 提示图片内容可能不可读 |
| `VIDEO_OCR_TIMEOUT` | `200` | `true` | 可重试预处理或直接手动输入文本 | OCR 超时降级 | 允许继续使用图片并补充文本 |

## 复用统一任务错误码

| code | httpStatus | retryable | 触发场景 |
|------|------------|-----------|----------|
| `TASK_INVALID_INPUT` | `400` | `false` | 请求体结构不合法或必填字段缺失 |
| `TASK_UNHANDLED_EXCEPTION` | `500` | `true` | 服务端未预期异常 |

## 权限与限流

| httpStatus | 场景 | 响应说明 |
|------------|------|----------|
| `403` | 当前账号无视频任务创建权限 | 返回统一 `{code, msg, data}`，`data.errorCode` 推荐为 `AUTH_PERMISSION_DENIED` |
| `429` | 同一用户短时间内重复提交过多 | `Retry-After` 头部指示重试间隔 |

## 幂等键行为

- `clientRequestId` 在同一 `userId` 维度内生效，避免跨用户碰撞。
- `clientRequestId` 在首次创建后 24 小时内重复提交，后端返回已有 `taskId`，HTTP 状态为 `409`。
- 超过幂等窗口后相同 `clientRequestId` 视为新请求。
