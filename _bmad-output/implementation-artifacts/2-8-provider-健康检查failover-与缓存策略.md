# Story 2.8: Provider 健康检查、Failover 与缓存策略

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 等待外部能力返回的用户，
I want 当主 Provider 不可用时系统能够自动切换，
so that 我不会因为单点外部故障就完全失去结果。

## Acceptance Criteria

1. 主 Provider 健康且响应正常时，业务调用优先走主 Provider，业务层不需要感知具体切换细节。
2. 主 Provider 出现超时、限流、不可达或连续失败时，系统可自动切换到备 Provider，并且前端可在 SSE 或结果数据中观察到 `provider_switch` 或等效切换语义。
3. Provider 健康信息写入 Redis 时，使用短 TTL 的 `xm_provider_health:{provider}` 或等效 key 进行缓存，缓存失效后可自动刷新，不会因长期滞留导致系统误判。

## Tasks / Subtasks

- [x] 实现 Provider 健康检查与健康状态缓存（AC: 1, 3）
  - [x] 定义主动探针或被动失败统计规则。
  - [x] 使用统一 key 与短 TTL 缓存健康状态。
- [x] 实现 Failover 决策逻辑（AC: 1, 2, 3）
  - [x] 在工厂层按优先级、健康状态与错误类型选择备 Provider。
  - [x] 避免在所有 Provider 失败时陷入无限重试循环。
- [x] 对接统一事件与错误语义（AC: 2, 3）
  - [x] 发出符合 `Story 2.5` 契约的 `provider_switch` 事件。
  - [x] 全部 Provider 不可用时返回明确错误码与失败结果。
- [x] 建立健康缓存与切换测试（AC: 1, 2, 3）
  - [x] 覆盖主 Provider 健康、主 Provider 不健康、缓存过期刷新、全部 Provider 不可用等场景。
  - [x] 覆盖切换事件、切换后成功返回与最终失败收敛。

## Dev Notes

### Story Metadata

- Story ID: `2.8`
- Story Type: `Backend Story`
- Epic: `Epic 2`
- Depends On: `2.4`、`2.5`、`2.7`
- Blocks: `4.5`、`5.4`、`7.3`、`8.4` 等所有依赖外部能力主备切换的 Story
- Contract Asset Path: `contracts/tasks/provider-switch.md`
- Mock Asset Path: `mocks/tasks/`
- API / Event / Schema Impact: 引入健康状态缓存、Failover 规则、`provider_switch` 事件与全失败错误语义
- Persistence Impact: 仅使用 Redis 运行态健康缓存；不进入长期业务表
- Frontend States Covered: 主 Provider 正常、自动切换、全部 Provider 失败、降级提示
- Error States Covered: 超时、限流、不可达、连续失败、缓存过期、全部 Provider 不可用
- Acceptance Test Notes: 必须覆盖健康缓存、切换事件、切换成功、全部失败与缓存刷新

### Business Context

- `Story 2.8` 把 Provider 抽象从“可注册”推进为“可在故障下持续可用”，是所有外部能力 Story 真正可投入业务使用的门槛。
- 视频 TTS、课堂多 Agent、Evidence / Retrieval、Learning Coach 等后续 Story 都依赖这张卡提供稳定的主备切换底座。
- 这张卡的目标不是隐藏所有故障，而是在故障发生时优先降级、自动切换，并在最终失败时给出可解释结果。

### Technical Guardrails

- Failover 必须建立在统一工厂与健康缓存之上，不能在业务模块里各自写一套“主失败后改调备”的逻辑。
- `provider_switch` 事件必须严格复用 `Story 2.5` 冻结的事件契约，不能到实现阶段再自定义字段。
- `xm_provider_health:{provider}` 只允许短 TTL 运行态缓存，不能落入 RuoYi 或长期表，也不能因为 TTL 过长造成长期误判。
- 全部 Provider 都不可用时，系统必须返回明确失败结果与错误码，而不是无限重试或静默吞错。

### Suggested File Targets

- `packages/fastapi-backend/app/providers/health.py`
- `packages/fastapi-backend/app/providers/failover.py`
- `packages/fastapi-backend/app/providers/factory.py`
- `packages/fastapi-backend/app/infra/redis_client.py`
- `contracts/tasks/provider-switch.md`
- `mocks/tasks/provider-switch.json`
- `mocks/tasks/provider-health-cache.json`
- `packages/fastapi-backend/tests/unit/providers/test_failover.py`

### Project Structure Notes

- 当前前端页面尚未正式消费 `provider_switch` 事件，但 `mocks/tasks/` 中的切换样例会成为后续等待页提示和调试面板的重要输入。
- Redis 健康缓存 key 已在架构文档中固定为 `xm_provider_health:{provider}`，本 Story 只实现判定与刷新，不应改动命名空间。
- 当前 FastAPI 包仍在骨架阶段，适合先把健康检查与 Failover 逻辑封装在 `providers/` 层，避免业务功能 Story 直接绑定厂商 SDK。

### Testing Requirements

- 覆盖主 Provider 健康时始终走主路径。
- 覆盖主 Provider 失败后自动切换备 Provider 并发出 `provider_switch` 事件。
- 覆盖健康缓存过期后的刷新行为与 TTL 生效。
- 覆盖全部 Provider 不可用时的最终失败收敛与错误码输出。

### References

- `_bmad-output/planning-artifacts/epics/15-epic-2.md`：Story 2.8 AC 与 Deliverables。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-PV-002`、`FR-PV-003`。
- `_bmad-output/planning-artifacts/prd/07-7-非功能需求.md`：`NFR-AR-005`、外部依赖降级策略。
- `_bmad-output/planning-artifacts/architecture/05-5-运行机制与关键链路.md`：Provider Failover 链路。
- `_bmad-output/planning-artifacts/architecture/10-10-一致性规则与项目规范.md`：Provider 健康检查、Failover 与健康缓存 TTL。
- `_bmad-output/planning-artifacts/architecture/06-6-数据分层与存储策略.md`：`xm_provider_health:{provider}` key 与 TTL 60s。
- `_bmad-output/planning-artifacts/ux-design-specification/13-12-unified-waiting-experience统一等待体验设计.md`：服务不可用时的降级与切换提示。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `/Volumes/DataDisk/Projects/ProriseProjects/worktrees/prorise-story-2-4/packages/fastapi-backend/.venv/bin/python -m pytest packages/fastapi-backend/tests/unit/providers/test_factory.py packages/fastapi-backend/tests/unit/providers/test_failover.py packages/fastapi-backend/tests/unit/test_task_contracts.py packages/fastapi-backend/tests/unit/task_framework/test_runtime_store.py`
- `/Volumes/DataDisk/Projects/ProriseProjects/worktrees/prorise-story-2-4/packages/fastapi-backend/.venv/bin/python -m pytest packages/fastapi-backend/tests/unit/providers/test_factory.py packages/fastapi-backend/tests/unit/providers/test_failover.py packages/fastapi-backend/tests/unit/task_framework/test_runtime_store.py packages/fastapi-backend/tests/unit/test_task_contracts.py packages/fastapi-backend/tests/test_health.py packages/fastapi-backend/tests/test_bootstrap_routes.py`

### Completion Notes List

- 已新增 `ProviderHealthStore` 与 `ProviderFailoverService`，把健康缓存、失败分类和主备切换从业务层抽离到 provider 基础设施层。
- 已在 `ProviderFactory` 暴露 `generate_with_failover` / `synthesize_with_failover` 统一入口，业务侧无需再手写主备切换循环。
- 已补齐 `provider_switch` 契约文档、健康缓存 mock 与 failover 单测，覆盖主链命中、缓存跳过、TTL 过期恢复与全链失败收敛。

### File List

- `_bmad-output/implementation-artifacts/2-8-provider-健康检查failover-与缓存策略.md`
- `contracts/tasks/README.md`
- `contracts/tasks/provider-switch.md`
- `mocks/tasks/provider-health-cache.json`
- `mocks/tasks/provider-switch.json`
- `packages/fastapi-backend/app/providers/factory.py`
- `packages/fastapi-backend/app/providers/failover.py`
- `packages/fastapi-backend/app/providers/health.py`
- `packages/fastapi-backend/tests/unit/providers/test_failover.py`
