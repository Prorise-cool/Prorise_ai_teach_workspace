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

## 约定

- 所有 mock 样例必须通过对应 `contracts/video/v1/` schema 校验。
- `taskId` 格式遵循 `vtask_<ulid>`，不使用硬编码常量。
- 前端 mock handler 直接消费本目录样例。
