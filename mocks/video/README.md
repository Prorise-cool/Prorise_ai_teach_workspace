# Video Mocks

视频域 Mock 资产。

## v1/

Story 3.1 冻结的视频任务创建 mock 样例：

| 文件 | 场景 | HTTP Status |
|------|------|-------------|
| `create-task.text-success.json` | 文本输入创建成功 | `202` |
| `create-task.image-success.json` | 图片输入创建成功 | `202` |
| `create-task.validation-error.json` | 输入校验失败 | `422` |
| `create-task.permission-denied.json` | 权限不足 | `403` |
| `preprocess.success.json` | 预处理成功 | `200` |
| `preprocess.ocr-low-confidence.json` | OCR 低置信度 | `200` |
| `preprocess.ocr-failed.json` | OCR 失败但图片已存储 | `200` |
| `preprocess.ocr-timeout.json` | OCR 超时降级 | `200` |
| `preprocess.validation-error.json` | 文件类型或大小不合法 | `422` |
| `public-videos.json` | 公开视频发现区列表成功 | `200` |
| `public-videos.empty.json` | 公开视频发现区空列表 | `200` |

## 约定

- 所有 mock 样例必须通过对应 `contracts/video/v1/` schema 校验。
- `taskId` 格式遵循 `vtask_<ulid>`；静态 JSON 样例允许使用示例值，但运行态 fixture 不应依赖固定常量。
- 前端 mock handler 直接消费本目录样例。
