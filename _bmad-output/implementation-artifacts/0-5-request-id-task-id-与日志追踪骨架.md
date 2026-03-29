# Story 0.5: request_id / task_id / 日志追踪骨架

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 运维与开发协作团队，
I want 让 request_id、task_id 与统一日志字段从一开始就进入链路，
so that 后续出现跨服务错误时可以进行最小可行排障。

## Acceptance Criteria

1. 任一进入 FastAPI 的请求在经过中间件后都具备 `request_id`，并能进入日志上下文与响应头或等效调试信息中。
2. 任一长任务进入异步执行流程后，`task_id` 会贯穿创建日志、执行日志、SSE 事件与异常日志，排障时可以通过 `task_id` 串联整条任务链路。
3. 日志格式、时间格式和字段口径与架构规范保持一致，不会出现一部分链路有追踪字段、一部分链路完全丢失上下文的情况。

## Tasks / Subtasks

- [ ] 建立 `request_id` 生成与透传机制（AC: 1）
  - [ ] 定义中间件或等效入口，为每个请求生成或继承 `request_id`。
  - [ ] 约束日志、错误响应和调试头部使用同一字段名。
  - [ ] 明确外部传入 `request_id` 的信任与覆盖规则。
- [ ] 建立 `task_id` 规则与日志贯穿机制（AC: 2）
  - [ ] 对齐统一任务 ID 生成规则。
  - [ ] 让任务创建、调度、执行、SSE 推送与失败日志都带上 `task_id`。
  - [ ] 明确无任务场景不得强行注入伪造 `task_id`。
- [ ] 冻结统一日志格式与上下文字段（AC: 1, 2, 3）
  - [ ] 日志格式对齐 `yyyy-MM-dd HH:mm:ss [thread] LEVEL logger - message`。
  - [ ] 明确最小字段集：时间、级别、logger、request_id、task_id、错误码。
  - [ ] 避免日志字段命名漂移。
- [ ] 增加追踪验证（AC: 1, 2, 3）
  - [ ] 覆盖普通请求、有任务请求、任务失败请求和 SSE 事件日志。
  - [ ] 验证日志链路中 `request_id` / `task_id` 不丢失。

## Dev Notes

### Story Metadata

- Story ID: `0.5`
- Story Type: `Infrastructure Story`
- Epic: `Epic 0`
- Depends On: `0.1`、`0.4`
- Blocks: `2.1`、`2.2`、`2.5`、`2.6` 以及所有长任务排障相关 Story
- Contract Asset Path: `contracts/task/`
- Mock Asset Path: `mocks/tasks/`
- API / Event / Schema Impact: `request_id`、`task_id`、错误日志字段、SSE 事件调试字段
- Persistence Impact: 无
- Frontend States Covered: 请求成功但带追踪头、任务处理中、任务失败、断线恢复
- Error States Covered: 请求失败无追踪、任务失败无上下文、SSE 事件缺失 task_id
- Acceptance Test Notes: 必须验证请求链路和任务链路的追踪字段一致性

### Business Context

- `Story 0.5` 解决的是“系统刚起步时最容易被忽略，但后续最难补”的排障基础设施问题。
- 这张卡不直接提升用户可见功能，但会极大影响 Epic 2 以后的视频、课堂、Companion 等长任务链路可观测性。
- 它与 `0.4` 互相配合：`0.4` 定义对外 schema，`0.5` 保证内部执行与异常排查能定位到对应请求与任务。

### Technical Guardrails

- `request_id` 与 `task_id` 必须作为统一字段使用，禁止各模块再引入 `traceId`、`jobId`、`executionId` 等平行命名。
- 日志时间格式必须与架构文档对齐，便于跨服务排障。
- SSE 事件可以附带任务追踪字段，但 SSE 本身仍不是长期历史宿主。
- 该 Story 不负责建设完整监控平台，只负责把最小追踪字段打进链路。

### Suggested File Targets

- `packages/fastapi-backend/app/core/logging.py`
- `packages/fastapi-backend/app/core/errors.py`
- `packages/fastapi-backend/app/core/middleware/request_context.py`
- `packages/fastapi-backend/app/shared/task_framework/context.py`
- `packages/fastapi-backend/app/shared/task_framework/base.py`
- `packages/fastapi-backend/tests/unit/test_request_context.py`
- `packages/fastapi-backend/tests/unit/test_task_trace.py`
- `docs/01开发人员手册/004-开发规范/0006-request-id-与-task-id-追踪规范.md`

### Project Structure Notes

- 当前 `packages/fastapi-backend/` 仍未落地 `app/` 代码树，因此日志与中间件骨架需要与 FastAPI 最小应用骨架一起建立。
- 架构文档已经冻结了统一任务模型与日志格式，本 Story 应直接沿用这些规则，而不是再自定义另一套追踪格式。
- 学生端当前已有统一 API client，但这张卡的核心在后端功能服务链路；前端只需在必要时透传或显示 `request_id` 调试信息。

### Testing Requirements

- 验证普通请求日志中存在 `request_id`。
- 验证任务创建到完成 / 失败全过程都能通过 `task_id` 串联。
- 验证 SSE 事件和错误日志能关联到对应任务。
- 验证日志格式和时间格式与架构文档一致。

### References

- `_bmad-output/planning-artifacts/epics/13-epic-0.md`：Story 0.5 AC 与交付物。
- `_bmad-output/planning-artifacts/prd/07-7-非功能需求.md`：`NFR-AR-006`。
- `_bmad-output/planning-artifacts/architecture/05-5-运行机制与关键链路.md`：统一任务模型、任务 ID 规则与事件模型。
- `_bmad-output/planning-artifacts/architecture/10-10-一致性规则与项目规范.md`：日志格式、时间格式、SSE 事件与统一状态约束。
- `_bmad-output/planning-artifacts/epics/31-final-validation-checklist.md`：运行态与并行开发基础设施的验证项。
- `packages/fastapi-backend/README.md`：当前 FastAPI 工作区现状。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 无

### Completion Notes List

- 已为 Epic 0 的追踪骨架 Story 补齐 request_id、task_id、统一日志字段与校验要求。

### File List

- `_bmad-output/implementation-artifacts/0-5-request-id-task-id-与日志追踪骨架.md`
