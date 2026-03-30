# Story 2.5: SSE 事件类型、payload 与 broker 契约冻结

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 前后端协作团队，
I want 冻结统一 SSE 事件类型与 payload 结构，
so that 所有等待页、结果页和任务型接口都能消费一致的实时语义。

## Acceptance Criteria

1. 统一 SSE 契约至少包含 `connected`、`progress`、`provider_switch`、`completed`、`failed`、`heartbeat`、`snapshot` 七类事件，且每类事件的触发时机与字段语义被明确写入契约资产。
2. 前端在 mock 模式下消费任务事件时，只需围绕统一 payload 字段进行状态判断，不需要为视频、课堂、文档解析分别维护不同的 SSE 解析器。
3. 后端写入 broker 的事件至少稳定包含事件类型、任务 ID、任务类型、状态、进度、消息、时间戳与事件 ID；失败事件可附带统一错误码，Provider 切换事件可附带 `from`、`to` 与 `reason`。

## Tasks / Subtasks

- [x] 冻结事件目录与 payload schema（AC: 1, 3）
  - [x] 为七类事件定义触发条件、必填字段、可选字段与示例数据。
  - [x] 明确 `id` / `Last-Event-ID` 与 `snapshot` 的公共语义。
- [x] 冻结 broker 事件写入约定（AC: 1, 3）
  - [x] 定义 broker 内部事件对象、序列化口径与事件顺序保证。
  - [x] 定义 `heartbeat` 与 `provider_switch` 的最小字段集。
- [x] 提供 mock 事件序列与前端消费样例（AC: 2）
  - [x] 在 `mocks/tasks/` 下补齐连接、进度、失败、恢复快照与 Provider 切换样例。
  - [x] 在前端 `services/sse` 层建立统一 parser 输入输出约定。
- [x] 建立契约测试与回放测试（AC: 1, 2, 3）
  - [x] 校验事件 schema。
  - [x] 校验同一份 mock 序列可以被前端消费层和后端 broker 测试共同复用。

## Dev Notes

### Story Metadata

- Story ID: `2.5`
- Story Type: `Contract Story`
- Epic: `Epic 2`
- Depends On: `2.1`
- Blocks: `2.6`、`3.5`、`4.7`、`5.3`，以及所有统一等待页相关 Story
- Contract Asset Path: `contracts/tasks/`
- Mock Asset Path: `mocks/tasks/`
- API / Event / Schema Impact: 冻结 SSE 事件目录、payload、事件 ID、顺序与 broker 写入约定
- Persistence Impact: 无长期数据落库；只定义实时事件与恢复快照的公共格式
- Frontend States Covered: 连接中、处理中、切换 Provider、完成、失败、心跳、恢复快照
- Error States Covered: 失败事件、缺失事件、恢复快照、未知事件类型
- Acceptance Test Notes: 必须覆盖事件 schema、顺序回放、前端 parser 一致性与 `provider_switch` 示例

### Business Context

- `Story 2.5` 和 `Story 2.1` 一起构成任务运行时的双契约基线：`2.1` 冻结任务语义，`2.5` 冻结实时事件语义。
- 只有先把事件类型、事件 ID 和 payload 口径定死，后续等待页与恢复逻辑才能真正并行，而不是每个模块自行猜测事件结构。
- 这张卡完成后，前端可以基于 `mocks/tasks/` 开始统一等待组件与 transport 层开发。

### Technical Guardrails

- 当前架构文档同时出现 `task_id` / `taskId`、`error` / `errorCode` 两种写法，本 Story 必须冻结唯一的对外事件字段口径，并让 broker、SSE、mock 与前端 parser 保持完全一致。
- SSE 只承担实时推送，不承担长期审计历史；恢复所需 `snapshot` 也只能表达“当前最小状态”，不能演变成历史记录替代品。
- 事件契约必须包含 `id` 与顺序语义，否则 `Story 2.6` 无法可靠实现 `Last-Event-ID` 恢复。
- `provider_switch` 事件需要在契约层明确，而不能等到 Failover 实现时再临时决定字段。

### Suggested File Targets

- `contracts/tasks/sse-events.md`
- `contracts/tasks/sse-event.schema.json`
- `contracts/tasks/sse-sequence.md`
- `mocks/tasks/sse.connected.json`
- `mocks/tasks/sse.progress.json`
- `mocks/tasks/sse.failed.json`
- `mocks/tasks/sse.snapshot.json`
- `mocks/tasks/sse.provider-switch.json`
- `packages/student-web/src/services/sse/index.ts`
- `packages/student-web/src/types/task.ts`
- `packages/fastapi-backend/app/core/sse.py`
- `packages/fastapi-backend/app/infra/sse_broker.py`

### Project Structure Notes

- `packages/student-web/package.json` 已包含 `eventsource-parser`，`packages/student-web/.env.example` 也已预留 `VITE_APP_SSE`，说明前端 transport 层可以围绕统一 SSE 契约直接落地。
- 当前 `packages/student-web/src/services/sse/index.ts` 为空文件，正适合承接统一 parser 和连接管理入口，不应把事件解析逻辑写进单独页面。
- 后端 `app/core/sse.py` 与 `app/infra/sse_broker.py` 已在架构目标结构中有明确落位，本 Story 应先冻结它们要消费和输出的契约。

### Testing Requirements

- 覆盖七类事件的 schema 校验。
- 覆盖事件序列回放顺序与 `id` 连续性。
- 覆盖前端 parser 对成功、失败、心跳、快照、Provider 切换的统一解析。
- 覆盖未知事件类型的容错与日志记录。

### References

- `_bmad-output/planning-artifacts/epics/15-epic-2.md`：Story 2.5 AC 与 Deliverables。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-SE-001`。
- `_bmad-output/planning-artifacts/architecture/10-10-一致性规则与项目规范.md`：SSE 事件目录、payload 字段、恢复机制。
- `_bmad-output/planning-artifacts/ux-design-specification/17-附录-b-sse-事件类型完整列表.md`：七类事件完整清单。
- `_bmad-output/planning-artifacts/ux-design-specification/13-12-unified-waiting-experience统一等待体验设计.md`：统一等待体验与错误处理语义。
- `_bmad-output/planning-artifacts/architecture/14-14-项目结构与边界定义.md`：前后端 SSE 相关目录目标结构。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pytest tests/unit/test_task_contracts.py tests/unit/test_task_trace.py`
- `pnpm --filter @xiaomai/student-web typecheck`
- `pnpm --filter @xiaomai/student-web exec vitest run src/test/services/mock/fixtures/task-contract-assets.test.ts src/test/services/sse/task-event-stream.test.ts`

### Completion Notes List

- 已冻结七类 SSE 事件目录、`id` / `sequence` 规则与 `Last-Event-ID` 预留口径，补齐契约文档与 schema。
- 已让后端 `TaskProgressEvent` 与 `InMemorySseBroker` 统一补齐事件身份、校验关键字段，并支持按 `after_event_id` 回放。
- 已补齐共享 mock 事件与前端统一 parser，确保前后端围绕同一组事件 JSON 做解析与测试。

### File List

- `_bmad-output/implementation-artifacts/2-5-sse-事件类型payload-与-broker-契约冻结.md`
- `contracts/tasks/README.md`
- `contracts/tasks/task-progress-event.schema.json`
- `contracts/tasks/sse-event.schema.json`
- `contracts/tasks/sse-events.md`
- `contracts/tasks/sse-sequence.md`
- `mocks/tasks/README.md`
- `mocks/tasks/sse.connected.json`
- `mocks/tasks/sse.progress.json`
- `mocks/tasks/sse.provider-switch.json`
- `mocks/tasks/sse.completed.json`
- `mocks/tasks/sse.failed.json`
- `mocks/tasks/sse.heartbeat.json`
- `mocks/tasks/sse.snapshot.json`
- `mocks/tasks/sse.sequence.completed.json`
- `mocks/tasks/sse.sequence.failed.json`
- `mocks/tasks/sse.sequence.provider-switch.json`
- `mocks/tasks/sse.sequence.snapshot.json`
- `packages/student-web/src/services/sse/index.ts`
- `packages/student-web/src/types/task.ts`
- `packages/student-web/src/test/services/sse/task-event-stream.test.ts`
- `packages/student-web/src/test/services/mock/fixtures/task-contract-assets.test.ts`
- `packages/fastapi-backend/app/core/sse.py`
- `packages/fastapi-backend/app/infra/sse_broker.py`
- `packages/fastapi-backend/tests/unit/test_task_contracts.py`
