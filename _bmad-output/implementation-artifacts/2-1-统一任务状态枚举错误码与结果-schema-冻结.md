# Story 2.1: 统一任务状态枚举、错误码与结果 schema 冻结

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 前后端协作团队，
I want 冻结统一任务状态、错误码与结果 schema，
so that 视频、课堂、文档解析与 Learning Coach 都能围绕同一运行时语义并行开发。

## Acceptance Criteria

1. 系统对外暴露的长任务状态固定为 `pending`、`processing`、`completed`、`failed`、`cancelled`，任务型能力域不得再发明不兼容的状态名；若后端内部存在 `queued`、`running` 等中间态，必须定义到统一外部状态的映射关系。
2. 统一任务结果、任务快照与进度事件至少稳定包含 `taskId`、`taskType`、`status`、`progress`、`message`、`timestamp` 与必要的 `errorCode`，前端可使用同一套状态机消费详情接口、SSE 事件与 `/status` 返回。
3. 关键失败类型具备统一错误码字典，错误结果可关联 `request_id` / `task_id`，前端可基于错误码稳定映射文案、重试动作与排障提示，而不是解析自由文本。

## Tasks / Subtasks

- [x] 冻结统一任务状态与状态机映射（AC: 1）
  - [x] 定义对外五态与后端内部 `queued`、`running`、`retrying` 等状态的映射规则。
  - [x] 明确取消、重试、失败收敛与“不允许悬挂态”的约束。
- [x] 冻结任务结果、快照与事件 schema（AC: 1, 2）
  - [x] 在 `contracts/tasks/` 下补齐 `TaskResult`、`TaskSnapshot`、`TaskProgressEvent` 等契约文档或 schema。
  - [x] 提供成功、失败、恢复快照与 Provider 切换的示例 payload。
- [x] 冻结错误码与追踪字段（AC: 2, 3）
  - [x] 建立 `TaskErrorCode` 字典，并定义 `request_id`、`task_id`、`errorCode` 的追踪语义。
  - [x] 明确前端展示层只消费稳定字段，不猜测 `message` 文案的结构。
- [x] 建立 mock 与契约测试基线（AC: 1, 2, 3）
  - [x] 在 `mocks/tasks/` 下提供最小生命周期、失败态与恢复态样例。
  - [x] 为 schema 序列化与错误码映射增加单元测试或契约测试。

## Dev Notes

### Story Metadata

- Story ID: `2.1`
- Story Type: `Contract Story`
- Epic: `Epic 2`
- Depends On: `Epic 0`，重点依赖 `0.2` 契约资产规范、`0.4` schema 输出基线、`0.5` 日志追踪骨架
- Blocks: `2.2`、`2.5`、`2.6`，以及所有消费统一任务语义的后续业务 Story
- Contract Asset Path: `contracts/tasks/`
- Mock Asset Path: `mocks/tasks/`
- API / Event / Schema Impact: 冻结 `TaskStatus`、`TaskErrorCode`、`TaskResult`、`TaskSnapshot`、`TaskProgressEvent`
- Persistence Impact: 无长期数据落库；只定义运行时与序列化边界
- Frontend States Covered: `pending`、`processing`、`completed`、`failed`、`cancelled`
- Error States Covered: 未知错误、超时、取消、外部服务不可用、Provider 全失败
- Acceptance Test Notes: 必须覆盖成功、失败、取消、恢复快照、错误码映射与字段序列化一致性

### Business Context

- `Story 2.1` 是 `Epic 2` 的前置契约 Story，和 `Story 2.5` 一起决定所有等待页、结果页、Worker 与任务型 API 的共同语言。
- 这张卡完成后，前端可以在 mock 模式下开始统一等待壳层和状态机开发，后端可以在不引入业务细节的前提下推进任务骨架。
- 本 Story 的目标是先把字段、状态和错误语义钉死，再允许后续 Story 写代码，而不是边实现边猜 schema。

### Technical Guardrails

- 对外公开字段口径必须一次冻结。目前规划文档同时出现了 `task_id` / `taskId` 两种写法，本 Story 必须显式定稿一套对外命名；建议前端与 SSE 对外统一使用 camelCase，Python 内部模型可保留 snake_case，但序列化输出不得混用。
- `failed` 结果必须明确 `errorCode` 的公共语义；若需要更丰富错误对象，也必须定义与 `errorCode` 的关系，不能只留下模糊的 `error` 字段。
- 状态枚举与错误码一旦进入 `contracts/tasks/`，后续业务 Story 只能扩展约定内字段，不能在业务模块里另起命名空间。
- 契约 Story 的完成定义不是“文档写了就算完成”，而是 schema、示例 payload、mock 数据与校验测试必须一起存在。

### Suggested File Targets

- `contracts/tasks/task-status.md`
- `contracts/tasks/task-error-codes.md`
- `contracts/tasks/task-result.schema.json`
- `contracts/tasks/task-progress-event.schema.json`
- `mocks/tasks/task-lifecycle.success.json`
- `mocks/tasks/task-lifecycle.failed.json`
- `mocks/tasks/task-lifecycle.snapshot.json`
- `packages/student-web/src/types/task.ts`
- `packages/fastapi-backend/app/shared/task_framework/status.py`

### Project Structure Notes

- 当前仓库已存在 `contracts/` 与 `mocks/` 入口说明，但 `tasks/` 子目录与具体资产尚未落地；本 Story 应优先填充这些目录，而不是把契约散落在页面代码或接口实现里。
- `packages/student-web/src/services/sse/index.ts` 当前为空，适合作为前端统一任务事件消费入口；类型定义不应散落到各业务页面。
- `packages/fastapi-backend` 当前仍是说明级骨架，后续后端实现应按架构目标路径 `app/shared/task_framework/` 落位，而不是在根目录平铺脚本文件。

### Testing Requirements

- 校验统一五态与内部状态映射的一致性。
- 校验成功、失败、取消、恢复快照样例的 schema 合法性。
- 校验错误码字典能稳定映射到前端提示，不依赖自由文本。
- 校验同一份 mock 数据可被前端 parser 与后端序列化测试共同消费。

### References

- `_bmad-output/planning-artifacts/epics/15-epic-2.md`：Epic 2 范围、Parallel Delivery Rule、Story 2.1 AC。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-TF-001`、`FR-TF-002`、`FR-TF-003`。
- `_bmad-output/planning-artifacts/prd/07-7-非功能需求.md`：`NFR-AR-006`。
- `_bmad-output/planning-artifacts/architecture/05-5-运行机制与关键链路.md`：统一任务状态、错误码、事件模型、任务框架组件。
- `_bmad-output/planning-artifacts/architecture/10-10-一致性规则与项目规范.md`：SSE payload 字段与错误处理约定。
- `_bmad-output/planning-artifacts/architecture/14-14-项目结构与边界定义.md`：`task_framework` 目标落位。
- `_bmad-output/planning-artifacts/epics/32-final-notes-for-story-writers.md`：Story 需补齐的元数据字段与禁忌写法。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 无

### Implementation Plan

- 先冻结 `contracts/tasks/` 与 `mocks/tasks/` 的正式资产，再让前后端共享同一套字段口径。
- 后端通过 `TaskErrorCode`、内部状态映射与 camelCase 序列化模型对齐 Story 2.1 公共契约。
- 前端通过 `packages/student-web/src/types/task.ts`、mock fixtures 与 adapter 测试统一消费 `taskId / taskType / status / progress / message / timestamp / errorCode`。

### Completion Notes List

- 已新增 `contracts/tasks/` 与 `mocks/tasks/` 正式资产，冻结统一五态、错误码、结果 schema、快照 schema 与事件 schema。
- 已在 FastAPI 侧补齐 `TaskErrorCode` 字典、内部状态映射、camelCase 序列化与 ISO 8601 时间戳输出。
- 已在 student-web 侧统一任务类型、mock fixture、snapshot 结构与共享契约测试，确保前后端围绕同一套 runtime 字段工作。
- 已通过以下验证：
  - `packages/fastapi-backend/.venv/bin/python -m pytest packages/fastapi-backend/tests`
  - `pnpm --filter @xiaomai/student-web test`
  - `pnpm --filter @xiaomai/student-web typecheck`
  - `pnpm --filter @xiaomai/student-web lint`

### File List

- `_bmad-output/implementation-artifacts/2-1-统一任务状态枚举错误码与结果-schema-冻结.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `contracts/tasks/README.md`
- `contracts/tasks/task-status.md`
- `contracts/tasks/task-error-codes.md`
- `contracts/tasks/task-result.schema.json`
- `contracts/tasks/task-snapshot.schema.json`
- `contracts/tasks/task-progress-event.schema.json`
- `mocks/tasks/README.md`
- `mocks/tasks/task-lifecycle.success.json`
- `mocks/tasks/task-lifecycle.failed.json`
- `mocks/tasks/task-lifecycle.cancelled.json`
- `mocks/tasks/task-lifecycle.snapshot.json`
- `mocks/tasks/task-lifecycle.provider-switch.json`
- `packages/fastapi-backend/app/api/routes/contracts.py`
- `packages/fastapi-backend/app/core/logging.py`
- `packages/fastapi-backend/app/core/sse.py`
- `packages/fastapi-backend/app/schemas/common.py`
- `packages/fastapi-backend/app/schemas/examples.py`
- `packages/fastapi-backend/app/schemas/pagination.py`
- `packages/fastapi-backend/app/shared/task_framework/base.py`
- `packages/fastapi-backend/app/shared/task_framework/contracts.py`
- `packages/fastapi-backend/app/shared/task_framework/scheduler.py`
- `packages/fastapi-backend/app/shared/task_framework/status.py`
- `packages/fastapi-backend/tests/test_openapi_contracts.py`
- `packages/fastapi-backend/tests/unit/test_task_contracts.py`
- `packages/fastapi-backend/tests/unit/test_task_trace.py`
- `packages/student-web/public/mockServiceWorker.js`
- `packages/student-web/src/services/api/adapters/task-adapter.ts`
- `packages/student-web/src/services/mock/fixtures/task.ts`
- `packages/student-web/src/services/sse/index.ts`
- `packages/student-web/src/test/services/api/adapters/task-adapter.test.ts`
- `packages/student-web/src/test/services/mock/fixtures/task-contract-assets.test.ts`
- `packages/student-web/src/test/services/mock/task-handlers.test.ts`
- `packages/student-web/src/types/task.ts`

## Change Log

- 2026-03-30：完成 Story 2.1 统一任务契约冻结，新增 contracts / mocks 正式资产，并同步收口前后端公共类型与契约测试。
