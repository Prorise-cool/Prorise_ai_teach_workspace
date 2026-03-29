# Story 2.2: Task 基类、TaskContext 与调度骨架

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 后端团队，
I want 提供统一的 Task 基类、TaskContext 与调度骨架，
so that 新的长任务不需要从零重写生命周期与状态推进逻辑。

## Acceptance Criteria

1. 新任务类型可基于统一骨架复用初始化、状态推进、异常处理、完成收尾等生命周期钩子，不再为每个业务域单独发明一套任务管理方式。
2. 任务执行过程中访问 `userId`、`requestId`、`taskId`、重试次数、来源模块等信息时，可通过统一 `TaskContext` 获得，而不是跨模块自行拼装上下文字段。
3. 任务抛出未处理异常时，调度器会把任务推进到 `failed` 并同步写入错误码、日志与运行态快照，不会留下无状态挂起任务。

## Tasks / Subtasks

- [ ] 实现统一上下文对象与生命周期接口（AC: 1, 2）
  - [ ] 定义 `TaskContext`，包含任务 ID、请求 ID、用户标识、重试信息与来源能力域。
  - [ ] 设计 `BaseTask` 的 `prepare`、`run`、`handle_error`、`finalize` 等钩子。
- [ ] 建立统一调度骨架（AC: 1, 3）
  - [ ] 实现 `TaskScheduler`，负责状态推进、执行包装、异常兜底与结果收敛。
  - [ ] 明确内部状态与对外五态的映射，不把框架内部细节泄漏到业务层。
- [ ] 接入统一日志与快照写入（AC: 2, 3）
  - [ ] 在调度器内透传 `request_id` / `task_id`，确保日志可追踪。
  - [ ] 异常路径写入失败快照与统一错误码。
- [ ] 提供 demo task 与框架测试（AC: 1, 2, 3）
  - [ ] 编写最小 demo task，演示创建、执行、失败与完成链路。
  - [ ] 为生命周期钩子、上下文透传与异常收敛增加单元测试。

## Dev Notes

### Story Metadata

- Story ID: `2.2`
- Story Type: `Infrastructure Story`
- Epic: `Epic 2`
- Depends On: `2.1`，以及 `Epic 0.5` 的追踪骨架
- Blocks: `2.3`、`2.4`，以及所有后续 FastAPI 任务型业务 Story
- Contract Asset Path: `contracts/tasks/`
- Mock Asset Path: `mocks/tasks/`
- API / Event / Schema Impact: 落地 `BaseTask`、`TaskContext`、`TaskScheduler` 与统一生命周期
- Persistence Impact: 仅运行态快照与日志追踪；不引入长期业务落库
- Frontend States Covered: 间接支撑统一任务状态；不直接交付页面
- Error States Covered: 初始化失败、运行时异常、取消、重试耗尽
- Acceptance Test Notes: 覆盖生命周期钩子调用顺序、上下文透传、异常收敛与 demo task 执行结果

### Business Context

- `Story 2.2` 是后端统一任务底座的第一张代码实现卡，后续视频、课堂、文档解析都将复用它。
- 这张卡完成后，后续 Story 不应再出现“每个模块自己管理任务状态”的实现分叉。
- 本 Story 的价值不在于跑通某个具体业务，而在于让后续任意新 Task 的接入成本稳定可控。

### Technical Guardrails

- `TaskContext` 必须从一开始就承载 `request_id` / `task_id`，不能等日志系统成熟后再补。
- 统一框架只负责执行、协调、追踪与错误收敛，不负责视频分镜、课堂生成等业务语义。
- 外部对接层只允许看到冻结后的五态；`queued`、`running`、重试中等内部状态必须由调度骨架自行映射。
- 框架异常路径必须默认失败收敛，不允许“忘记 catch 导致任务挂死”。

### Suggested File Targets

- `packages/fastapi-backend/app/shared/task_framework/base.py`
- `packages/fastapi-backend/app/shared/task_framework/context.py`
- `packages/fastapi-backend/app/shared/task_framework/scheduler.py`
- `packages/fastapi-backend/app/shared/task_framework/__init__.py`
- `packages/fastapi-backend/app/shared/task_framework/demo_task.py`
- `packages/fastapi-backend/tests/unit/task_framework/test_base_task.py`
- `packages/fastapi-backend/tests/unit/task_framework/test_scheduler.py`

### Project Structure Notes

- 架构文档已经为 `packages/fastapi-backend/app/shared/task_framework/` 预留目标结构；虽然当前后端包尚未落地到该层级，但实现必须沿着这条路径展开，避免临时脚本式堆叠。
- 当前前端尚未消费任务框架代码，本 Story 的主要交付面向 FastAPI；但生成的上下文与状态结构必须与 `contracts/tasks/` 保持一致。
- `packages/fastapi-backend` 当前没有现成测试骨架，建议同步建立 `tests/unit/task_framework/`，否则后续 Story 很难验证统一框架不回归。

### Testing Requirements

- 覆盖 demo task 的成功与失败路径。
- 覆盖 `TaskContext` 中 `request_id`、`task_id`、用户标识、重试次数的透传。
- 覆盖未处理异常被统一收敛为 `failed` 且写入错误码与快照。
- 覆盖生命周期钩子执行顺序与重复调用保护。

### References

- `_bmad-output/planning-artifacts/epics/15-epic-2.md`：Story 2.2 AC 与 Deliverables。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-TF-001`、`FR-TF-002`、`FR-TF-003`。
- `_bmad-output/planning-artifacts/architecture/05-5-运行机制与关键链路.md`：统一任务模型、状态机、框架组件与状态图。
- `_bmad-output/planning-artifacts/architecture/03-3-核心术语与架构原则.md`：契约先行、长任务可追踪可恢复、Redis 运行态边界。
- `_bmad-output/planning-artifacts/architecture/14-14-项目结构与边界定义.md`：后端 `task_framework` 目录目标结构。
- `_bmad-output/planning-artifacts/epics/07-story-definition-standard.md`：基础设施 Story 的完成定义。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 无

### Completion Notes List

- 已把统一任务框架实现所需的上下文对象、生命周期钩子、异常收敛与测试边界整理为可执行 Story。

### File List

- `_bmad-output/implementation-artifacts/2-2-task-基类taskcontext-与调度骨架.md`
