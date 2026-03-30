# Story 2.3: Dramatiq + Redis broker 基础接入

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 后端团队，
I want 将 Dramatiq 与 Redis broker 作为统一队列底座接入，
so that 视频、课堂与文档解析任务都能在一致的异步执行环境中运行。

## Acceptance Criteria

1. 系统提交一个 demo task 后，FastAPI 可将任务分发到 Worker，Worker 能通过 Dramatiq + Redis broker 收到任务并开始执行，开发者可以观察到最小的投递、消费与完成链路。
2. Worker 进程短暂重启或任务执行失败时，系统可区分“尚未执行”“执行中”“失败”“已完成”等状态，不会因为缺乏队列层状态管理而把任务永久留在不确定状态。
3. 新任务类型注册到统一队列层后，无需重构底层 broker 或重新设计分发方式，新旧任务可以在同一套异步执行基础设施上共存。

## Tasks / Subtasks

- [x] 建立 Dramatiq + Redis broker 基础配置（AC: 1, 2）
  - [x] 在 FastAPI 配置层补齐 broker 连接、序列化与环境变量约定。
  - [x] 区分 Web 进程与 Worker 进程的启动方式。
- [x] 打通 demo task 的 dispatch / consume 链路（AC: 1, 3）
  - [x] 让 `TaskScheduler` 能把 demo task 投递到队列。
  - [x] 在 Worker 中执行 demo task，并回写最小运行态。
- [x] 处理队列层状态与失败收敛（AC: 2, 3）
  - [x] 明确已投递、已消费、失败、重启恢复时的状态推进规则。
  - [x] 保证失败任务不会卡在模糊的“处理中”。
- [x] 增加本地运行说明与测试（AC: 1, 2, 3）
  - [x] 提供 Worker 启动脚本或 README。
  - [x] 为 broker 初始化、消息消费与失败收敛增加测试。

## Dev Notes

### Story Metadata

- Story ID: `2.3`
- Story Type: `Infrastructure Story`
- Epic: `Epic 2`
- Depends On: `2.1`、`2.2`
- Blocks: `2.4`，以及所有需要异步执行环境的后续任务型 Story
- Contract Asset Path: `contracts/tasks/`
- Mock Asset Path: `mocks/tasks/`
- API / Event / Schema Impact: 新增任务投递、Worker 消费与队列层运行约定
- Persistence Impact: Redis broker 仅承担队列与运行态；不引入长期业务落库
- Frontend States Covered: 间接支撑等待页状态来源；不直接交付 UI
- Error States Covered: broker 连接失败、Worker 崩溃、消费异常、消息未确认
- Acceptance Test Notes: 必须验证 demo task 的完整 dispatch / consume 链路与失败后的可恢复性

### Business Context

- `Story 2.3` 把统一任务框架从“同步骨架”推进到“可异步执行的运行时底座”。
- `Epic 2` 明确要求所有长任务共享队列基础设施，因此该 Story 完成后，后续业务 Story 只需注册新任务，而不应重复搭建消息通道。
- 这张卡的重点是统一执行环境，而不是优化单个业务任务的性能。

### Technical Guardrails

- 队列引擎已在架构中冻结为 `Dramatiq + Redis broker`，本 Story 不应再引入第二套调度或消息框架。
- 队列层必须与 `TaskScheduler` 对齐统一状态语义，不能让 broker 自己的概念直接变成前端状态。
- Worker 重启、消费失败与未确认消息的处理必须能回到统一任务状态机，不允许留下“消息丢了，但任务还显示 processing”的坏状态。
- 运行时消息与执行中间态仅存在于 FastAPI / Redis / Worker 协作层，不进入 RuoYi 长期业务表。

### Suggested File Targets

- `packages/fastapi-backend/app/core/config.py`
- `packages/fastapi-backend/app/core/lifespan.py`
- `packages/fastapi-backend/app/infra/redis_client.py`
- `packages/fastapi-backend/app/shared/task_framework/scheduler.py`
- `packages/fastapi-backend/app/worker.py`
- `packages/fastapi-backend/scripts/start-worker.sh`
- `packages/fastapi-backend/tests/integration/test_dramatiq_broker.py`

### Project Structure Notes

- 当前后端包尚未落地 `app/` 结构，本 Story 需要顺带建立最小可运行骨架，但应严格贴合架构文档中的路径，而不是在仓库根目录堆临时入口文件。
- 前端暂时不会直接依赖 Dramatiq，但后续等待页 Story 的数据可信度完全建立在本 Story 的最小链路之上。
- `packages/student-web/.env.example` 已预留 `VITE_FASTAPI_BASE_URL`，说明前端后续会直连 FastAPI 任务接口；队列与任务状态来源应围绕 FastAPI 而非 RuoYi 设计。

### Testing Requirements

- 覆盖 broker 初始化成功与失败场景。
- 覆盖 demo task 被成功投递、消费、完成的完整链路。
- 覆盖 Worker 异常退出后任务状态不会永久停留在处理中。
- 覆盖同一队列层可注册多个任务类型且互不冲突。

### References

- `_bmad-output/planning-artifacts/epics/15-epic-2.md`：Story 2.3 AC 与 Deliverables。
- `_bmad-output/planning-artifacts/architecture/05-5-运行机制与关键链路.md`：视频全流程、`Dramatiq + Redis broker` 决策、统一状态推进。
- `_bmad-output/planning-artifacts/architecture/08-8-模块划分与实现策略.md`：P0 底座明确包含统一任务框架与队列调度。
- `_bmad-output/planning-artifacts/architecture/14-14-项目结构与边界定义.md`：FastAPI 目标目录结构。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-TF-002`、`FR-SE-001`。
- `_bmad-output/planning-artifacts/epics/07-story-definition-standard.md`：基础设施 Story 需可被后续业务 Story 复用。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm setup:fastapi-backend`
- `.venv/bin/python -m pytest tests/integration/test_dramatiq_broker.py`
- `.venv/bin/python -m pytest tests/unit/test_task_trace.py tests/test_health.py tests/test_bootstrap_routes.py`
- `.venv/bin/python -m pytest tests/unit/task_framework/test_base_task.py tests/unit/task_framework/test_scheduler.py`
- `.venv/bin/python -m pytest tests/unit/test_task_contracts.py`

### Completion Notes List

- 已补齐 Dramatiq broker 配置、Web / Worker 分离入口与 `dev:fastapi-worker` 启动脚本。
- 已让 `TaskScheduler` 支持把注册任务投递到队列，并在 Worker 中复用统一任务框架完成消费与状态推进。
- 已为 demo task、失败收敛与多任务类型共存补齐 Dramatiq 集成测试，并保持 2.2 / 2.5 相关单测回归通过。

### File List

- `_bmad-output/implementation-artifacts/2-3-dramatiq-redis-broker-基础接入.md`
- `package.json`
- `packages/fastapi-backend/pyproject.toml`
- `packages/fastapi-backend/app/core/config.py`
- `packages/fastapi-backend/app/core/lifespan.py`
- `packages/fastapi-backend/app/infra/redis_client.py`
- `packages/fastapi-backend/app/shared/task_framework/publisher.py`
- `packages/fastapi-backend/app/shared/task_framework/scheduler.py`
- `packages/fastapi-backend/app/worker.py`
- `packages/fastapi-backend/scripts/start-worker.sh`
- `packages/fastapi-backend/tests/integration/test_dramatiq_broker.py`
