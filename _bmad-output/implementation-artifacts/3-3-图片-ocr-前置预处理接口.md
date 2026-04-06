# Story 3.3: 图片 / OCR 前置预处理接口

Status: backlog

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 提交图片题目的用户，
I want 系统在创建视频任务前完成最小可行的图片校验与 OCR 预处理，
so that 我可以在任务真正进入主流水线前知道输入是否可用。

## Acceptance Criteria

1. 提供 `POST /api/v1/video/preprocess` 接口，接收图片文件（multipart/form-data），返回结构化预处理结果，至少包含 `imageRef`（存储引用）、`ocrText`（识别文本，可为空）、`confidence`（识别置信度）、`suggestions`（补充建议列表）。
2. 接口至少校验文件类型（JPG/PNG/WebP）、文件大小（≤10MB）、基础可读性（非空文件、可解码），明显无效输入在创建任务前被拦截。
3. OCR 识别质量有限时，返回 `confidence < 0.6` 并在 `suggestions` 中建议用户补充手动文本；不把低质量 OCR 结果直接伪装成高可信输入。
4. OCR 失败、识别为空或图像质量不足时，返回明确错误码（`VIDEO_OCR_FAILED`、`VIDEO_OCR_EMPTY`、`VIDEO_IMAGE_UNREADABLE`）与补充建议，用户可在当前页继续修改输入。
5. 预处理接口响应时间 P95 < 5s，不阻塞用户长时间等待；若 OCR 超时则降级返回"仅存储成功、OCR 跳过"的结果，而非整体失败。
6. `contracts/video/v1/` 下交付 `preprocess-request.schema.json`、`preprocess-response.schema.json`，`mocks/video/` 下交付预处理成功与失败样例。
7. 后端图片存储 MVP 阶段使用本地文件系统或 MinIO，预留 COS 切换接口；`imageRef` 使用 URI 格式（如 `local://...` 或 `cos://...`），前端不直接操作存储路径。

## Tasks / Subtasks

- [ ] 设计预处理接口契约（AC: 1, 6）
  - [ ] 定义 `PreprocessRequest`：multipart/form-data，字段 `file`（图片二进制）。
  - [ ] 定义 `PreprocessResponse`：`{ imageRef, ocrText, confidence, width, height, format, suggestions }` 。
  - [ ] 输出 `contracts/video/v1/preprocess-request.schema.json` 与 `preprocess-response.schema.json`。
- [ ] 实现图片校验层（AC: 2）
  - [ ] 校验文件 MIME type（image/jpeg、image/png、image/webp）。
  - [ ] 校验文件大小 ≤ 10MB。
  - [ ] 校验文件可解码（尝试读取图片头部元数据）。
  - [ ] 校验失败返回 `422` 并携带对应错误码。
- [ ] 实现图片存储层（AC: 7）
  - [ ] 抽象 `ImageStorage` 接口：`upload(file) -> imageRef`。
  - [ ] MVP 实现 `LocalImageStorage`（存到 `data/uploads/video/`），预留 `CosImageStorage` 占位。
  - [ ] `imageRef` 格式约定：`local://<relative_path>` 或 `cos://<bucket>/<key>`。
- [ ] 实现 OCR 预处理层（AC: 3, 4, 5）
  - [ ] 抽象 `OcrProvider` 接口：`recognize(imageRef) -> OcrResult { text, confidence, raw }`。
  - [ ] MVP 实现 `TencentOcrProvider`（调用腾讯云 OCR API），预留 `MockOcrProvider`。
  - [ ] OCR 超时（>3s）降级：返回 `ocrText: null, confidence: 0, suggestions: ["OCR 超时，建议手动输入文本"]`。
  - [ ] OCR 失败：返回错误码 `VIDEO_OCR_FAILED` 但不阻断图片存储成功。
  - [ ] OCR 空结果：返回 `VIDEO_OCR_EMPTY` 并建议补充文本。
- [ ] 组装预处理接口路由（AC: 1, 5）
  - [ ] 在 `app/features/video/routes.py` 下注册 `POST /api/v1/video/preprocess`。
  - [ ] 接口编排：校验 → 存储 → OCR → 组装响应。
  - [ ] 添加 `request_id` 追踪日志。
- [ ] 提供 mock 样例与前端 adapter（AC: 6）
  - [ ] `mocks/video/preprocess.success.json`（含 OCR 文本）。
  - [ ] `mocks/video/preprocess.ocr-low-confidence.json`（低置信度）。
  - [ ] `mocks/video/preprocess.ocr-failed.json`（OCR 失败但图片存储成功）。
  - [ ] `mocks/video/preprocess.validation-error.json`（文件类型/大小不合法）。
  - [ ] 前端 mock handler 注册 `POST /api/v1/video/preprocess`。
  - [ ] 前端 adapter `preprocessImage(file) -> PreprocessResult`。
- [ ] 测试覆盖（AC: 2, 3, 4, 5）
  - [ ] 校验文件类型过滤（非图片文件被拒）。
  - [ ] 校验大小限制（>10MB 被拒）。
  - [ ] 校验 OCR 正常、低置信度、失败、超时四种路径。
  - [ ] 校验存储引用格式合法。
  - [ ] 校验接口响应 schema 合法性。

## Dev Notes

### Story Metadata

- Story ID: `3.3`
- Story Type: `Backend Story`
- Epic: `Epic 3`
- Depends On: `3.1`（视频创建契约基线，含 inputType: image 的字段约定）、`2.7`（Provider 工厂与注册骨架）
- Blocks: `3.4`（创建接口需消费 imageRef）、`3.2`（前端需调用预处理接口获取 imageRef 后才能提交 image 类型任务）
- Contract Asset Path: `contracts/video/v1/`
- Mock Asset Path: `mocks/video/`
- API / Event / Schema Impact: 新增 `POST /api/v1/video/preprocess`；扩展 `TaskErrorCode` 加入 OCR 域错误码
- Persistence Impact: 图片文件存储到本地或对象存储；不涉及关系数据库
- Frontend States Covered: 上传中（progress）、预处理成功（显示 OCR 文本/建议）、预处理失败（显示错误提示）
- Error States Covered: 文件类型不支持、文件过大、文件不可读、OCR 失败、OCR 空结果、OCR 超时、存储失败
- Acceptance Test Notes: 必须覆盖图片校验、OCR 正常/低置信度/失败/超时四条路径

### Business Context

- 图片输入是视频生成的重要入口——学生拍照题目是高频使用场景。预处理接口的职责是"尽早告知输入质量"，避免用户等了几分钟视频生成后才发现题目识别错了。
- OCR 的精度在 MVP 阶段不必做到完美，但必须在 UI 上给用户足够的信息让其决定"是否补充手动文本"或"直接用 OCR 结果"。
- 预处理接口独立于视频任务创建接口，是一个同步的前置调用。前端先调预处理获得 `imageRef` 和 `ocrText`，再组装到 `createVideoTask` 的 `sourcePayload` 中提交。

### Technical Guardrails

- 预处理接口必须是同步接口（非异步任务），前端在提交前调用并等待结果。响应时间 P95 < 5s。
- OCR 通过 `OcrProvider` 抽象层调用，MVP 阶段使用腾讯云 OCR，但不直接在业务代码中调用 SDK——必须通过 Provider 工厂（Story 2.7 已定义）注册。
- 图片存储通过 `ImageStorage` 抽象层完成，MVP 用本地文件系统，后续切 COS 只需更换实现类。
- `imageRef` 是对前端不透明的引用标识，前端只负责把它放进 `sourcePayload.imageRef`，不需要知道存储细节。
- OCR 错误码（`VIDEO_OCR_FAILED`、`VIDEO_OCR_EMPTY`、`VIDEO_IMAGE_UNREADABLE`）必须注册到统一 `TaskErrorCode` 字典。
- 预处理接口的文件上传走 multipart/form-data，不使用 base64 编码（避免请求体膨胀）。

### Suggested File Targets

- `contracts/video/v1/preprocess-request.schema.json`（新建）
- `contracts/video/v1/preprocess-response.schema.json`（新建）
- `contracts/tasks/task-error-codes.md`（追加 OCR 域错误码）
- `mocks/video/preprocess.success.json`（新建）
- `mocks/video/preprocess.ocr-low-confidence.json`（新建）
- `mocks/video/preprocess.ocr-failed.json`（新建）
- `mocks/video/preprocess.validation-error.json`（新建）
- `packages/fastapi-backend/app/features/video/routes.py`（新建）
- `packages/fastapi-backend/app/features/video/services/preprocess.py`（新建）
- `packages/fastapi-backend/app/features/video/providers/ocr.py`（新建）
- `packages/fastapi-backend/app/features/video/providers/image_storage.py`（新建）
- `packages/fastapi-backend/tests/unit/test_video_preprocess.py`（新建）
- `packages/student-web/src/services/api/adapters/video-task-adapter.ts`（扩展）
- `packages/student-web/src/services/mock/handlers/video-task.ts`（扩展）

### Project Structure Notes

- `packages/fastapi-backend/app/features/` 下尚未创建 `video/` 子目录，需按架构目标路径新建 `features/video/` 并包含 `routes.py`、`services/`、`providers/`。
- `packages/fastapi-backend/app/shared/task_framework/` 已有 Provider 抽象基础（Story 2.7），OCR Provider 应注册到同一工厂。
- 前端侧预处理 adapter 可直接扩展 `video-task-adapter.ts`，不需要单独文件。

### Testing Requirements

- 校验图片类型过滤：GIF、BMP、PDF 等非法格式返回 422。
- 校验图片大小限制：>10MB 返回 422。
- 校验正常 OCR 返回包含 text 与 confidence > 0.6。
- 校验低置信度 OCR 返回包含 suggestions 建议。
- 校验 OCR 失败返回 `VIDEO_OCR_FAILED` 但 imageRef 仍然有效。
- 校验 OCR 超时降级返回 ocrText: null 但不整体失败。
- 校验响应 payload 与 schema 一致。
- 前端 mock handler 往返测试。

### References

- `_bmad-output/planning-artifacts/epics/16-epic-3.md`：Story 3.3 AC 与 Deliverables。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-VS-001`（文本/图片输入与 OCR fallback）。
- `_bmad-output/planning-artifacts/architecture/08-8-模块划分与实现策略.md`：视频模块 100% 自研，TTS via Provider 抽象。
- `_bmad-output/planning-artifacts/architecture/09-9-外部平台集成策略.md`：腾讯云 OCR 集成策略。
- `_bmad-output/implementation-artifacts/2-7-provider-protocol工厂与优先级注册骨架.md`：Provider 抽象与工厂注册。
- `_bmad-output/implementation-artifacts/3-1-视频任务创建契约与-mock-task-基线.md`：inputType: image 字段约定。
