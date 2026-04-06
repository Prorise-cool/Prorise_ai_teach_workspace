# Story 5.1: 课堂任务契约、结果 schema 与 mock session 基线

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 前后端协作团队，
I want 在课堂域先冻结任务契约、结果 schema 和 mock session 数据，
so that 课堂输入、等待与结果浏览可以并行实现而不依赖真实生成链先完成。

## Acceptance Criteria

1. 当课堂域首次冻结契约时，任务创建、详情、状态、事件流、结果页所需的 slides、discussion、whiteboard、completion signal 等 schema 必须被明确约定，且前后端共享同一套字段语义和样例数据。
2. 当前端使用 mock 模式开发课堂页面时，页面通过统一 classroom adapter 可以稳定模拟输入成功、等待中、完成、失败与恢复态，结果页不需要等待真实课堂生成引擎跑通后才开始实现。
3. 当 Companion 与 Learning Coach 后续消费课堂结果时，团队能够明确哪些字段属于课堂主展示、哪些字段属于 artifact 索引、哪些字段属于会话结束信号，避免后期因为字段职责不清而整体返工。

## Tasks / Subtasks

- [ ] 冻结课堂创建、状态、结果与 completion signal 的最小契约（AC: 1, 3）
  - [ ] 定义 `POST /api/v1/classroom/tasks` 的创建请求字段，至少覆盖 `requirement`、`language`、`userProfile`、`webSearchEnabled` 与 `evidenceScope`。
  - [ ] 定义课堂结果 payload，至少覆盖 `slides`、`discussion`、`whiteboard`、`chapterSummary`、`completionSignal` 与 `artifactSummary`。
  - [ ] 明确课堂域在 `contracts/tasks/` 统一任务契约之上的 `context` 扩展位，禁止重写任务基础字段。
- [ ] 补齐课堂域 mock 资产与样例 payload（AC: 1, 2, 3）
  - [ ] 产出处理中、完成、失败、恢复、白板降级、讨论为空的 mock session 样例。
  - [ ] 产出至少一套课堂任务 SSE 序列与一套 `/status` 快照样例，保证与 `contracts/tasks/` 一致。
  - [ ] 产出 `request / result / error` 示例，覆盖前端表单、等待页与结果页共同消费字段。
- [ ] 对齐前端类型、后端 schema 与契约目录（AC: 1, 2)
  - [ ] 为前端添加课堂域类型入口，避免页面继续通过 `any` 或临时映射消费课堂结果。
  - [ ] 为 FastAPI classroom feature 补齐 schema 占位与 OpenAPI 示例。
  - [ ] 保持 `contracts/classroom/v1/` 与 `mocks/classroom/v1/` 的版本目录一致。
- [ ] 形成跨 Epic 的消费说明（AC: 3）
  - [ ] 标注 Companion 消费字段与 Learning Coach 消费字段。
  - [ ] 标注哪些字段由 `5.8` 长期回写承接，哪些字段只属于运行态。

### Story Metadata

- Story ID: `5.1`
- Story Type: `Contract Story`
- Epic: `Epic 5`
- Depends On: `2.1`、`2.5`、`2.6`、`10.1`
- Blocks: `5.2`、`5.3`、`5.4`、`5.5`、`5.6`、`5.7`、`5.8`、`5.9`、`5.10`、`6.1`、`8.1`
- Contract Asset Path: `contracts/classroom/v1/`、`contracts/tasks/`
- Mock Asset Path: `mocks/classroom/v1/`、`mocks/tasks/`
- API / Event / Schema Impact: 新增课堂域创建请求、结果 payload、completion signal、artifact summary 以及基于统一任务契约的课堂扩展字段
- Persistence Impact: 本 Story 仅冻结字段宿主与职责边界，不直接落长期存储；为 `5.8` 与 `10.4` 的回写结构提供前置定义
- Frontend States Covered: 创建成功、处理中、完成、失败、恢复、白板降级、讨论为空
- Error States Covered: 字段缺失、伪成功结果、任务恢复字段不全、前后端字段漂移
- Acceptance Test Notes: 必须校验 schema、示例 payload、mock 资产与前后端类型的一致性，禁止“契约一套、mock 一套、页面再拼一套”

## Dev Notes

### Business Context

- 这是 Epic 5 的前置 Contract Story，决定课堂输入页、等待页、结果页能否在真实链路尚未完成前并行开发。
- Classroom Engine 是主链路，但它不拥有 Companion、Evidence 或 Learning Coach 的页面职责；契约里必须提前把这些边界写清楚。
- 当前仓库 `contracts/classroom/` 与 `mocks/classroom/` 仍是预留目录，本 Story 需要把它们从“占位”推进到“可消费”。

### Technical Guardrails

- 课堂域必须继承 `contracts/tasks/` 已冻结的统一任务状态、SSE 事件和恢复语义，不得另造一套事件名或状态值。
- 课堂结果字段必须可被前端稳定渲染，不允许把运行时私有对象直接暴露给页面消费。
- completion signal 与 artifact summary 必须在契约层先行冻结，避免 `5.7`、`5.8`、`6.x`、`8.x` 后续重复改字段。
- mock 资产必须覆盖成功态与失败态；长任务类场景还必须覆盖处理中、快照恢复态与降级态。

### Suggested File Targets

- `contracts/classroom/v1/README.md`
- `contracts/classroom/v1/schemas/`
- `contracts/classroom/v1/examples/`
- `mocks/classroom/v1/`
- `packages/fastapi-backend/app/features/classroom/schemas.py`
- `packages/student-web/src/features/classroom/`
- `packages/student-web/src/types/`

### Project Structure Notes

- 当前 student-web 仅有课堂输入页壳层，课堂等待页、结果页与课堂专属类型入口尚未落地。
- 当前 FastAPI classroom feature 主要承接元数据接口，真实课堂创建 / 状态 / 结果 schema 仍待补齐。
- `contracts/tasks/README.md` 已明确课堂必须复用统一任务契约，因此课堂域契约应只在业务扩展位上新增字段。

### Testing Requirements

- 校验课堂创建请求、结果 payload 与 completion signal 的 schema 可机器校验。
- 校验 mock session 样例覆盖处理中、完成、失败、恢复与降级结果。
- 校验 FastAPI OpenAPI 示例、前端类型与 mock 资产字段一致，不出现字段命名漂移。
- 校验课堂域不改写统一任务基础字段，只在 `context` 或课堂业务结构中扩展。

### References

- `_bmad-output/planning-artifacts/epics/18-epic-5.md`：Epic 5 Story 5.1 摘要与边界
- `_bmad-output/planning-artifacts/epics/28-cross-epic-integration-matrix.md`：课堂结果与 artifact 的下游消费矩阵
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-CS-001`、`FR-CS-003`、`FR-CS-004`、`FR-CS-005`、`FR-CS-006`、`FR-CS-008`、`FR-CS-009`
- `_bmad-output/planning-artifacts/architecture/05-5-运行机制与关键链路.md`：课堂任务、结果与回写主链路
- `_bmad-output/planning-artifacts/architecture/06-6-数据分层与存储策略.md`：artifact、completion signal 与运行态 / 长期态边界
- `_bmad-output/planning-artifacts/epics/32-final-notes-for-story-writers.md`：完整 Story 元数据要求
- `contracts/classroom/README.md`：课堂契约目录当前为空，需要在本 Story 正式冻结
- `mocks/classroom/README.md`：课堂 mock 目录当前为空，需要在本 Story 正式冻结

## Change Log

- 2026-04-06：基于 Epic 5 摘要、PRD、架构、UX 与当前代码树，创建 Story 5.1 完整开发卡片。
