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
| `VIDEO_INPUT_EMPTY` | `422` | `false` | 填写内容后重新提交 | 视频文本输入为空或仅空白 |
| `VIDEO_INPUT_TOO_LONG` | `422` | `false` | 缩减内容后重新提交 | 视频文本输入超过 5000 字符上限 |
| `VIDEO_IMAGE_FORMAT_INVALID` | `422` | `false` | 选择 JPG/PNG/WebP 格式图片 | 图片格式不在支持列表内 |
| `VIDEO_IMAGE_TOO_LARGE` | `422` | `false` | 压缩图片或选择更小文件 | 图片体积超过 10MB 限制 |
| `VIDEO_IMAGE_UNREADABLE` | `422` | `false` | 更换清晰且完整的图片 | 图片为空、损坏或无法解码 |
| `VIDEO_OCR_FAILED` | `200` | `false` | 手动补充题目文本 | OCR 调用失败，但图片已成功存储 |
| `VIDEO_OCR_EMPTY` | `200` | `false` | 手动补充题目文本 | OCR 没有识别到有效文本 |
| `VIDEO_OCR_TIMEOUT` | `200` | `true` | 可重试预处理或直接手动输入文本 | OCR 超时降级 |
| `VIDEO_STORAGE_FAILED` | `500` | `true` | 稍后重试 | 图片存储失败 |
| `VIDEO_DISPATCH_FAILED` | `500` | `true` | 稍后重新提交 | 视频任务创建后消息分发失败 |
| `VIDEO_UNDERSTANDING_FAILED` | `500` | `true` | 稍后重试 | 题目理解阶段失败 |
| `VIDEO_STORYBOARD_FAILED` | `500` | `true` | 稍后重试 | 分镜生成阶段失败 |
| `VIDEO_MANIM_GEN_FAILED` | `500` | `true` | 稍后重试 | Manim 代码生成或修复失败 |
| `VIDEO_RENDER_FAILED` | `500` | `true` | 稍后重试 | Manim 渲染失败 |
| `VIDEO_RENDER_TIMEOUT` | `504` | `true` | 稍后重试 | Manim 渲染超时 |
| `VIDEO_RENDER_OOM` | `500` | `true` | 稍后重试 | 渲染进程内存耗尽 |
| `VIDEO_RENDER_DISK_FULL` | `500` | `true` | 稍后重试 | 渲染临时磁盘空间耗尽 |
| `VIDEO_TTS_ALL_PROVIDERS_FAILED` | `503` | `true` | 稍后重试 | 所有 TTS Provider 都失败 |
| `VIDEO_COMPOSE_FAILED` | `500` | `true` | 稍后重试 | FFmpeg 合成失败 |
| `VIDEO_UPLOAD_FAILED` | `500` | `true` | 稍后重试 | 视频或封面上传失败 |
| `SANDBOX_NETWORK_VIOLATION` | `500` | `false` | 调整脚本后重新生成 | 沙箱检测到非法网络访问 |
| `SANDBOX_FS_VIOLATION` | `500` | `false` | 调整脚本后重新生成 | 沙箱检测到文件系统越界访问 |
| `SANDBOX_PROCESS_VIOLATION` | `500` | `false` | 调整脚本后重新生成 | 沙箱检测到非法子进程或动态执行 |

## 追踪字段语义

- `requestId`：同一次入口请求链路的追踪 ID，用于串联网关、FastAPI、Worker 与日志。
- `taskId`：单个长任务的唯一执行 ID；重试新任务必须生成新 `taskId`。
- `errorCode`：前端唯一允许依赖的失败语义字段，禁止通过解析 `message` 猜测错误类型。
- `message`：只用于人类可读反馈，不承诺可机读结构。
