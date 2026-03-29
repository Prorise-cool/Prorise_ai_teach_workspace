# Story 2.4: Redis 运行态 Key、TTL 与事件缓存落地

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 后端团队，
I want 将 Redis 运行态 Key、TTL 与事件缓存规则真正落地，
so that 任务恢复、SSE 补发与 Provider 健康缓存有统一的运行时存储边界。

## Acceptance Criteria

1. 系统写入任一运行态 key 时，命名符合统一规范，例如 `xm_task:{task_id}`、`xm_task_events:{task_id}`、`xm_provider_health:{provider}`，并且所有运行态 key 都设置 TTL。
2. 任务执行过程中持续产生事件时，系统可按任务 ID 读取最近事件、快照或恢复所需的最小状态，但不会把 SSE 事件当作长期审计数据永久保存在 Redis。
3. 需要长期回看、查询或审计的数据不得仅存储在 Redis，Redis 只承担运行态、事件缓存与短期恢复，不承担长期业务数据宿主职责。

## Tasks / Subtasks

- [ ] 落地统一 Redis key builder 与 TTL 常量（AC: 1）
  - [ ] 实现 `xm_task`、`xm_task_events`、`xm_provider_health` 等 key 生成器。
  - [ ] 固化 2h、1h、60s 等 TTL 规则，并禁止无过期时间写入。
- [ ] 实现运行态快照与事件缓存封装（AC: 1, 2）
  - [ ] 提供任务快照写入、最新状态读取、事件列表追加与恢复读取能力。
  - [ ] 保证恢复逻辑读取的是“最小必要状态”，而不是依赖数据库历史重放。
- [ ] 明确 Redis 与长期数据宿主边界（AC: 2, 3）
  - [ ] 为视频、课堂、Companion、Provider 健康状态定义运行态与长期态分界说明。
  - [ ] 防止业务开发把长期结果直接留在 Redis。
- [ ] 补充运行态测试与清理策略（AC: 1, 2, 3）
  - [ ] 覆盖 key 命名、TTL 生效、事件缓存读取与过期清理。
  - [ ] 覆盖错误写法的保护，例如无 TTL 写入或把长期数据误写到运行态 namespace。

## Dev Notes

### Story Metadata

- Story ID: `2.4`
- Story Type: `Infrastructure Story`
- Epic: `Epic 2`
- Depends On: `2.1`、`2.2`、`2.3`
- Blocks: `2.6`、`2.8`，以及所有依赖恢复态与事件缓存的后续 Story
- Contract Asset Path: `contracts/tasks/redis-runtime.md`
- Mock Asset Path: `mocks/tasks/`
- API / Event / Schema Impact: 运行态 key 规范、TTL policy、事件缓存读写约定
- Persistence Impact: Redis 仅承担运行态；长期数据必须进入 RuoYi/MySQL 或 COS
- Frontend States Covered: 间接支撑等待页恢复与状态查询
- Error States Covered: key 过期、事件缓存缺失、无 TTL 写入、把长期数据误写入 Redis
- Acceptance Test Notes: 必须验证 key 命名、TTL 生效、事件恢复读取与长期数据边界保护

### Business Context

- `Story 2.4` 是 SSE 恢复、Provider 健康缓存与等待页恢复体验的基础支撑层。
- 这张卡的核心不是“把数据存进 Redis”，而是把 Redis 的职责严格收敛为运行态边界，避免后续业务偷懒把长期数据塞进去。
- 后续 `Story 2.6`、`Story 2.8` 以及视频/课堂等待页的恢复语义都直接依赖本 Story。

### Technical Guardrails

- Redis 只允许保存运行时状态、事件缓存、短期上下文与健康探针，不允许成为长期业务存储替代品。
- 所有 key 都必须强制 TTL；没有 TTL 的运行态写入应视为实现缺陷。
- `xm_provider_health:{provider}` 可以在本 Story 预留统一 key builder，但具体健康判定与 Failover 逻辑属于 `Story 2.8`。
- 恢复读取必须基于最近快照与短期事件缓存，而不是查询数据库回放全部过程。

### Suggested File Targets

- `packages/fastapi-backend/app/infra/redis_client.py`
- `packages/fastapi-backend/app/shared/task_framework/runtime_store.py`
- `packages/fastapi-backend/app/shared/task_framework/key_builder.py`
- `contracts/tasks/redis-runtime.md`
- `contracts/tasks/redis-keys.md`
- `mocks/tasks/task-events.progress.json`
- `packages/fastapi-backend/tests/unit/task_framework/test_runtime_store.py`

### Project Structure Notes

- `contracts/README.md` 已明确 `contracts/tasks/` 是任务状态、SSE 事件、恢复与降级契约入口，本 Story 应同步把 Redis 运行态约束写入该目录。
- 目前仓库中还没有现成的 Redis 运行态封装文件；后续实现应在 FastAPI 的 `infra/` 与 `shared/task_framework/` 之间分层，而不是直接在业务模块中裸调 Redis。
- `mocks/tasks/` 目录目前仅有 README 级说明，本 Story 提供的事件与快照样例会直接成为前端恢复逻辑的测试输入。

### Testing Requirements

- 覆盖所有标准 key 的命名与 TTL。
- 覆盖快照写入、事件追加、恢复读取与过期后的兜底行为。
- 覆盖错误示例：无 TTL 写入、长期数据误入 `xm_*` 运行态空间。
- 覆盖 Provider 健康缓存 key 的 TTL 与刷新准备能力。

### References

- `_bmad-output/planning-artifacts/epics/15-epic-2.md`：Story 2.4 AC 与 Deliverables。
- `_bmad-output/planning-artifacts/prd/07-7-非功能需求.md`：`NFR-AR-003`。
- `_bmad-output/planning-artifacts/architecture/06-6-数据分层与存储策略.md`：三层存储策略、Redis 边界、key 命名与 TTL 表。
- `_bmad-output/planning-artifacts/architecture/07-7-职责边界与集成关系.md`：运行态与长期数据归属速查表。
- `_bmad-output/planning-artifacts/architecture/03-3-核心术语与架构原则.md`：Redis 只承担运行时状态的原则。
- `_bmad-output/planning-artifacts/prd/08-8-数据与集成约束.md`：Redis 不作为长期学习数据宿主的约束。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 无

### Completion Notes List

- 已把 Redis 运行态 Story 收敛为 key 命名、TTL、事件缓存与长期数据边界四个清晰交付面。

### File List

- `_bmad-output/implementation-artifacts/2-4-redis-运行态-keyttl-与事件缓存落地.md`
