# Story 2.6: SSE 断线恢复与 `/status` 查询降级

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 等待长任务结果的用户，
I want 在事件流中断时恢复状态或自动降级查询，
so that 我不会因为刷新、网络波动或浏览器重连而丢失任务上下文。

## Acceptance Criteria

1. SSE 连接短暂中断时，客户端可基于 `Last-Event-ID`、任务快照或 Redis 事件缓存恢复当前状态，不需要用户重新提交任务。
2. 事件流恢复失败或运行环境不适合持续连接时，系统会自动降级到 `/status` 查询接口，页面仍可展示当前阶段、状态与下一步动作，而不是完全失去进度感知。
3. 用户刷新等待页后，页面可恢复到正确阶段而不是从 0% 重新伪装运行，恢复逻辑不依赖数据库回放全部历史过程。

## Tasks / Subtasks

- [x] 实现 SSE 恢复链路（AC: 1, 3）
  - [x] 支持基于 `Last-Event-ID` 的缺失事件补发。
  - [x] 支持在事件缺失时读取任务快照并恢复当前状态。
- [x] 实现 `/status` 降级接口与前端 fallback（AC: 2, 3）
  - [x] 统一 `/status` 响应结构，保证字段与 `TaskSnapshot` 对齐。
  - [x] 超过重连上限后自动切换到状态查询模式。
- [x] 建立前端连接管理与资源清理（AC: 1, 2, 3）
  - [x] 处理页面切换、刷新、离开页面时的连接关闭与恢复。
  - [x] 处理重连次数、退避策略与 polling 间隔。
- [x] 增加恢复与降级测试（AC: 1, 2, 3）
  - [x] 覆盖短暂断线、长期断线、刷新页面、轮询兜底等场景。
  - [x] 覆盖恢复后状态连续性，不出现从头开始的假进度。

## Dev Notes

### Story Metadata

- Story ID: `2.6`
- Story Type: `Backend Story`
- Epic: `Epic 2`
- Depends On: `2.4`、`2.5`，并依赖 `2.2`、`2.3` 提供的运行骨架
- Blocks: `3.5`、`4.7`、`5.3`，以及所有统一等待壳层 Story
- Contract Asset Path: `contracts/tasks/sse-recovery.md`
- Mock Asset Path: `mocks/tasks/`
- API / Event / Schema Impact: 新增 `Last-Event-ID` 恢复语义、`/status` 返回结构与前端 polling 兜底约定
- Persistence Impact: 仅消费 Redis 事件缓存与快照；不引入数据库历史回放
- Frontend States Covered: 连接中断、恢复中、降级轮询、恢复成功、恢复失败
- Error States Covered: 心跳超时、事件缺失、恢复失败、轮询兜底、刷新恢复
- Acceptance Test Notes: 必须覆盖短断线恢复、超过重试上限降级、刷新恢复与状态连续性

### Business Context

- `Story 2.6` 是统一等待体验真正可用的关键卡，它把“有 SSE”推进为“网络波动下仍可恢复”。
- 视频等待页、课堂等待页以及未来任何任务型页面，都直接复用这张卡沉淀下来的 transport 与 fallback 语义。
- 本 Story 完成后，前端才有资格宣称“等待态不是一次性假流，而是可恢复的运行时体验”。

### Technical Guardrails

- 恢复依据只能是 Redis 中的运行时快照与事件缓存，不能回退到数据库回放全部历史过程。
- `Last-Event-ID`、重连上限、心跳判定和 `/status` 结构必须在契约层写清楚，不能留给业务页面各自决定。
- 当前 `packages/student-web/src/services/api/client.ts` 只绑定 `VITE_RUOYI_BASE_URL`；本 Story 的 `/status` 查询必须显式走 `VITE_FASTAPI_BASE_URL` 对应的任务接口，而不是复用 RuoYi client。
- 等待页刷新后的恢复属于“回到当前任务上下文”，不是重新创建任务或重新播放历史事件。

### Suggested File Targets

- `packages/fastapi-backend/app/core/sse.py`
- `packages/fastapi-backend/app/infra/sse_broker.py`
- `packages/fastapi-backend/app/shared/task_framework/runtime_store.py`
- `packages/fastapi-backend/app/features/video/routes.py`
- `packages/fastapi-backend/app/features/classroom/routes.py`
- `packages/student-web/src/services/sse/index.ts`
- `packages/student-web/src/services/api/adapters/task-adapter.ts`
- `packages/student-web/src/hooks/use-task-recovery.ts`
- `packages/student-web/src/stores/task-store.ts`
- `mocks/tasks/task-status.polling.json`

### Project Structure Notes

- `packages/student-web/.env.example` 已预留 `VITE_FASTAPI_BASE_URL` 与 `VITE_APP_SSE`，说明前端 transport 层应从一开始就区分 RuoYi 与 FastAPI 两类接口来源。
- 当前路由树只有首页，等待页正式 UI 会在后续 Epic 中实现；本 Story 应优先落地 transport、adapter 与状态恢复层，为后续页面复用做好准备。
- `packages/student-web/src/services/sse/index.ts` 当前为空，最适合作为 EventSource、重连、降级 polling 的统一封装，不应在页面组件里直接操作原生 EventSource。

### Testing Requirements

- 覆盖携带 `Last-Event-ID` 的短断线恢复。
- 覆盖超过重试上限后自动降级到 `/status` 轮询。
- 覆盖页面刷新后从快照恢复正确阶段。
- 覆盖心跳超时、事件缺失与轮询失败时的错误提示与重试动作。

### References

- `_bmad-output/planning-artifacts/epics/15-epic-2.md`：Story 2.6 AC 与 Deliverables。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-SE-002`、`FR-SE-003`。
- `_bmad-output/planning-artifacts/architecture/05-5-运行机制与关键链路.md`：SSE 断线重连链路与恢复原则。
- `_bmad-output/planning-artifacts/architecture/10-10-一致性规则与项目规范.md`：SSE 恢复机制与心跳建议。
- `_bmad-output/planning-artifacts/ux-design-specification/12-11-frontend-backend-interaction-boundary前端与双后端交互边界.md`：前端连接管理、重连与 polling 示意。
- `_bmad-output/planning-artifacts/ux-design-specification/13-12-unified-waiting-experience统一等待体验设计.md`：统一等待体验的可恢复性要求。
- `_bmad-output/planning-artifacts/ux-design-specification/08-7-page-level-design-specifications页面级设计规范.md`：视频与课堂等待页都必须支持恢复。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `uv run --project packages/fastapi-backend --extra dev python -m pytest packages/fastapi-backend/tests/test_task_recovery_routes.py packages/fastapi-backend/tests/unit/test_task_contracts.py packages/fastapi-backend/tests/unit/task_framework/test_runtime_store.py packages/fastapi-backend/tests/integration/test_dramatiq_broker.py packages/fastapi-backend/tests/test_health.py packages/fastapi-backend/tests/test_bootstrap_routes.py`
- `pnpm install --frozen-lockfile`
- `pnpm --filter @xiaomai/student-web exec vitest run src/test/services/sse/task-event-stream.test.ts src/test/services/api/adapters/task-adapter.test.ts src/test/services/mock/fixtures/task-contract-assets.test.ts`
- `pnpm --filter @xiaomai/student-web typecheck`
- `pnpm --filter @xiaomai/student-web exec eslint src/services/sse/index.ts src/services/api/adapters/task-adapter.ts src/test/services/sse/task-event-stream.test.ts src/test/services/api/adapters/task-adapter.test.ts`

### Completion Notes List

- 已新增通用任务恢复路由，后端可按 `Last-Event-ID` 补发缺失事件，并在无新事件时通过 `/status` 暴露最小恢复快照。
- 已把 `student-web` transport 收敛到统一 SSE 恢复层，支持重连上限、退避等待、`AbortSignal` 清理与 `/status` polling 降级。
- 已补齐 `sse-recovery` 契约与 `task-status.polling` mock，并把恢复 / 降级资产接入前后端共享测试。
- 已验证短断线恢复、重连耗尽降级、刷新恢复与状态连续性，不依赖数据库历史回放。

### File List

- `_bmad-output/implementation-artifacts/2-6-sse-断线恢复与-status-查询降级.md`
- `_bmad-output/implementation-artifacts/2-1-统一任务状态枚举错误码与结果-schema-冻结.md`
- `_bmad-output/implementation-artifacts/2-2-task-基类taskcontext-与调度骨架.md`
- `_bmad-output/implementation-artifacts/2-3-dramatiq-redis-broker-基础接入.md`
- `_bmad-output/implementation-artifacts/2-4-redis-运行态-keyttl-与事件缓存落地.md`
- `_bmad-output/implementation-artifacts/2-5-sse-事件类型payload-与-broker-契约冻结.md`
- `_bmad-output/implementation-artifacts/2-7-provider-protocol工厂与优先级注册骨架.md`
- `_bmad-output/implementation-artifacts/2-8-provider-健康检查failover-与缓存策略.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `contracts/tasks/README.md`
- `contracts/tasks/sse-recovery.md`
- `mocks/tasks/README.md`
- `mocks/tasks/task-status.polling.json`
- `packages/fastapi-backend/app/api/router.py`
- `packages/fastapi-backend/app/api/routes/contracts.py`
- `packages/fastapi-backend/app/api/routes/tasks.py`
- `packages/fastapi-backend/app/main.py`
- `packages/fastapi-backend/app/schemas/common.py`
- `packages/fastapi-backend/app/schemas/examples.py`
- `packages/fastapi-backend/app/shared/task_framework/publisher.py`
- `packages/fastapi-backend/tests/test_task_recovery_routes.py`
- `packages/fastapi-backend/tests/unit/test_task_contracts.py`
- `packages/student-web/src/services/api/adapters/task-adapter.ts`
- `packages/student-web/src/services/sse/index.ts`
- `packages/student-web/src/test/services/api/adapters/task-adapter.test.ts`
- `packages/student-web/src/test/services/mock/fixtures/task-contract-assets.test.ts`
- `packages/student-web/src/test/services/sse/task-event-stream.test.ts`
