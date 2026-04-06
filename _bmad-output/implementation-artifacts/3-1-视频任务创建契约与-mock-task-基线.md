# Story 3.1: 视频任务创建契约与 mock task 基线

Status: backlog

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 前后端协作团队，
I want 先冻结视频任务创建所需的接口、字段与 mock 样例，
so that 输入页、创建接口和等待页可以围绕同一任务起点并行开发。

## Acceptance Criteria

1. `POST /api/v1/video/tasks` 请求与响应 schema 明确冻结，至少包含 `inputType`（text / image）、`sourcePayload`（文本内容或图片引用）、`userProfile`（可选学习偏好透传）、`clientRequestId`（幂等键），返回 `202 Accepted` 并携带 `taskId`、`taskType: video`、`status: pending`、`createdAt`。
2. 校验失败（输入为空、格式不支持、超长等）返回 `422` 并遵循统一 `{code, msg, data}` 结构，`code` 使用 `TaskErrorCode` 字典中的视频域扩展码；权限失败返回 `403`，与 Epic 1 认证契约保持一致。
3. 同一接口支持 `inputType: text` 与 `inputType: image` 两种提交路径，各自的最小必填字段集在 schema 中明确区分，前端无需猜测哪些字段在哪种模式下必填。
4. `contracts/video/v1/` 下至少交付 `create-task-request.schema.json`、`create-task-response.schema.json`、`create-task-errors.md`，资产格式与 `contracts/tasks/` 保持一致。
5. `mocks/video/` 下至少交付文本创建成功、图片创建成功、校验失败、权限失败四组样例，前端 mock handler 可直接消费这些样例。
6. 前端 mock handler 注册后，`/video/input` 页面可在 mock 模式下完成创建 → 跳转等待页的完整流程，不依赖真实后端。

## Tasks / Subtasks

- [ ] 冻结视频任务创建请求 schema（AC: 1, 3）
  - [ ] 定义 `VideoTaskCreateRequest` 包含 `inputType`、`sourcePayload`、`userProfile`、`clientRequestId` 等字段。
  - [ ] 明确 `inputType: text` 时 `sourcePayload` 为 `{ text: string }`，`inputType: image` 时为 `{ imageRef: string, ocrText?: string }`。
  - [ ] 明确字段校验规则：文本 10–5000 字符，图片引用不超过 10MB、仅 JPG/PNG/WebP。
- [ ] 冻结视频任务创建响应 schema（AC: 1, 2）
  - [ ] 定义成功 `202 Accepted` 响应 `{ taskId, taskType, status, createdAt }` 并对齐 Story 2.1 统一字段口径（camelCase）。
  - [ ] 定义 `422` 校验失败、`403` 权限失败、`429` 限流、`500` 内部错误的 payload，均遵循 `{ code, msg, data }`。
  - [ ] 为视频域新增 `VIDEO_INPUT_EMPTY`、`VIDEO_INPUT_TOO_LONG`、`VIDEO_IMAGE_FORMAT_INVALID`、`VIDEO_IMAGE_TOO_LARGE` 等错误码并注册到 `TaskErrorCode` 字典。
- [ ] 输出契约资产到 `contracts/video/v1/`（AC: 4）
  - [ ] `create-task-request.schema.json`
  - [ ] `create-task-response.schema.json`
  - [ ] `create-task-errors.md`（含错误码、触发场景、前端建议处理方式）
  - [ ] 更新 `contracts/video/README.md`。
- [ ] 输出 mock 样例到 `mocks/video/`（AC: 5）
  - [ ] `create-task.text-success.json`
  - [ ] `create-task.image-success.json`
  - [ ] `create-task.validation-error.json`
  - [ ] `create-task.permission-denied.json`
- [ ] 注册前端 mock handler（AC: 6）
  - [ ] 在 `packages/student-web/src/services/mock/handlers/` 下新增 `video-task.ts`，消费上述 mock 样例。
  - [ ] 确保 mock 模式下 `POST /api/v1/video/tasks` 返回正确 payload 并可被 adapter 消费。
- [ ] 建立契约测试基线（AC: 4, 5, 6）
  - [ ] schema 序列化一致性测试。
  - [ ] mock 样例与 schema 合法性校验。
  - [ ] 前端 adapter + mock handler 往返测试。

## Dev Notes

### Story Metadata

- Story ID: `3.1`
- Story Type: `Contract Story`
- Epic: `Epic 3`
- Depends On: `2.1`（统一任务状态、错误码与结果 schema）、`2.5`（SSE 事件契约）、`1.1`（认证契约）
- Blocks: `3.2`、`3.3`、`3.4`、`3.5`、`3.6`
- Contract Asset Path: `contracts/video/v1/`
- Mock Asset Path: `mocks/video/`
- API / Event / Schema Impact: 新增 `POST /api/v1/video/tasks` schema；扩展 `TaskErrorCode` 字典加入视频域错误码
- Persistence Impact: 无长期数据落库；只定义接口契约与 mock 边界
- Frontend States Covered: 创建中（submitting）、创建成功（跳转等待页）、校验失败（inline error）、权限失败（toast / redirect）
- Error States Covered: 输入为空、输入超长、图片格式不支持、图片过大、权限不足、限流、内部错误
- Acceptance Test Notes: 必须覆盖文本创建、图片创建、校验失败、权限失败四组路径的 schema 一致性与 mock 往返

### Business Context

- `Story 3.1` 是 `Epic 3` 的前置契约 Story，决定视频输入页（3.2）、OCR 预处理（3.3）、后端创建接口（3.4）、等待页承接（3.5）和公开视频复用（3.6）的共同字段语言。
- 本 Story 完成后，前端可在 mock 模式下开始输入页与等待页开发，后端可在不依赖真实流水线的前提下推进创建接口。
- 视频任务创建契约必须对齐 Story 2.1 统一任务语义（五态、错误码、camelCase 序列化），不能另起一套字段命名。
- 与 `contracts/tasks/` 的关系：视频域契约是统一任务契约的**领域扩展**，不是替代品。公共字段（taskId、taskType、status 等）复用统一定义，视频专属字段（inputType、sourcePayload 等）在 `contracts/video/v1/` 中定义。

### Technical Guardrails

- 对外字段口径必须一次冻结，与 Story 2.1 保持 camelCase 对外、Python 内部 snake_case 的约定。
- `inputType` 使用字面量联合 `"text" | "image"`，不使用数字枚举，便于 schema 校验与前端类型推导。
- `clientRequestId` 作为幂等键，后端需在契约中明确其唯一性约束与重复提交行为（返回已有 taskId 或 409 Conflict）。
- 视频域错误码必须注册到统一 `TaskErrorCode` 字典（`contracts/tasks/task-error-codes.md`），不能在视频模块内部私建错误码命名空间。
- mock 样例中的 `taskId` 格式必须与 Story 2.1 定义的 task ID 生成规则一致（如 `video_<ulid>` 或 `vtask_<uuid>`），前端 mock handler 不得使用硬编码常量 ID。
- 契约 Story 完成定义不是"文档写了就算完成"，而是 schema、示例 payload、mock 数据与校验测试必须一起存在。

### Suggested File Targets

- `contracts/video/v1/create-task-request.schema.json`
- `contracts/video/v1/create-task-response.schema.json`
- `contracts/video/v1/create-task-errors.md`
- `contracts/video/README.md`（更新）
- `contracts/tasks/task-error-codes.md`（追加视频域错误码）
- `mocks/video/create-task.text-success.json`
- `mocks/video/create-task.image-success.json`
- `mocks/video/create-task.validation-error.json`
- `mocks/video/create-task.permission-denied.json`
- `packages/student-web/src/services/mock/handlers/video-task.ts`
- `packages/student-web/src/services/api/adapters/video-task-adapter.ts`
- `packages/student-web/src/types/video.ts`
- `packages/student-web/src/test/services/mock/video-task-contract.test.ts`

### Project Structure Notes

- `contracts/video/README.md` 已存在但仅为预留说明，本 Story 需在 `contracts/video/v1/` 下填充正式 schema 资产。
- `mocks/video/` 目录尚未创建，需新建并提供 README。
- 前端 `packages/student-web/src/types/video.ts` 尚不存在，应在本 Story 中新建视频域类型定义并复用 `task.ts` 中的公共类型。
- 前端 `packages/student-web/src/features/video/pages/video-input-page.tsx` 已有输入页壳层实现，但提交按钮当前仅有 `console.log` 占位，Story 3.2 将对接本 Story 冻结的 adapter。
- `packages/student-web/src/services/mock/handlers/` 下已有 `auth.ts` 等 mock handler 示范，视频 mock handler 应遵循同样的注册模式。

### Testing Requirements

- 校验 `create-task-request.schema.json` 对文本和图片两种 inputType 的字段约束。
- 校验 `create-task-response.schema.json` 的成功响应与错误响应结构。
- 校验四组 mock 样例均通过对应 schema 校验。
- 校验前端 mock handler 在 MSW 环境下能正确拦截 `POST /api/v1/video/tasks` 并返回预期 payload。
- 校验前端 adapter 能正确解析成功与错误响应并映射到前端状态。
- 校验视频域错误码已正确注册到统一 `TaskErrorCode` 字典。

### References

- `_bmad-output/planning-artifacts/epics/16-epic-3.md`：Epic 3 范围、Story 3.1 AC 与 Deliverables。
- `_bmad-output/implementation-artifacts/2-1-统一任务状态枚举错误码与结果-schema-冻结.md`：统一任务语义基线。
- `_bmad-output/implementation-artifacts/2-5-sse-事件类型payload-与-broker-契约冻结.md`：SSE 事件契约基线。
- `_bmad-output/planning-artifacts/architecture/05-5-运行机制与关键链路.md`：视频生成全流程时序。
- `_bmad-output/planning-artifacts/architecture/08-8-模块划分与实现策略.md`：视频模块实现策略。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-VS-001`、`FR-UI-003`。
- `_bmad-output/planning-artifacts/architecture/10-10-一致性规则与项目规范.md`：命名约定与错误处理。
- `contracts/tasks/task-error-codes.md`：统一错误码字典。
- `contracts/tasks/task-result.schema.json`：统一任务结果 schema。
