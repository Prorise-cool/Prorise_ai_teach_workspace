# Story 0.3: 前端 adapter、mock handler 与环境切换基线

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 前端团队，
I want 建立统一的 adapter 与 mock handler 机制，
so that 正式页面可以在真实后端缺席时仍然按契约推进到可验收状态。

## Acceptance Criteria

1. 任一页面接入数据层时，只依赖统一 adapter 接口而不直接依赖具体 HTTP 实现；页面在 mock 与 real 两种模式下不需要重写组件状态逻辑。
2. 当前端运行在 mock 模式时，列表、详情、任务状态与 SSE 事件流都能返回与真实契约一致的字段结构，至少覆盖空态、加载态、处理中、完成态、失败态与权限失败态。
3. mock 不只是静态 JSON，而是可驱动页面状态机、可组合成功与失败分支、可被测试消费的可编排样例。

## Tasks / Subtasks

- [x] 冻结 adapter 接口分层（AC: 1）
  - [x] 约束页面只调用 `services/*` 或 `services/api/adapters/*`，不直接散落 `fetch/axios` 调用。
  - [x] 明确 real adapter、mock adapter 与领域类型之间的边界。
  - [x] 约束分页、详情、任务状态和 SSE 消费使用同一套领域对象。
- [x] 冻结 mock handler 与 fixture 组织方式（AC: 2, 3）
  - [x] 统一 `fixtures/`、`handlers/`、`index.ts` 的职责。
  - [x] 为列表、详情、任务状态、SSE 事件、401 / 403、空结果提供标准样例。
  - [x] 定义“状态流 mock”规则，避免只返回 happy path。
- [x] 建立环境切换规则（AC: 1, 2）
  - [x] 统一 mock / real 模式切换变量与初始化入口。
  - [x] 明确 Storybook、Vitest、本地 dev 的 mock 接入方式。
  - [x] 确保切换模式不要求改页面组件代码。
- [x] 增加前端消费测试（AC: 1, 2, 3）
  - [x] adapter 测试覆盖 real / mock 映射一致性。
  - [x] handler / fixture 测试覆盖成功、失败、权限失败、处理中等状态。
  - [x] smoke 测试覆盖默认启动时的数据层初始化。

## Dev Notes

### Story Metadata

- Story ID: `0.3`
- Story Type: `Infrastructure Story`
- Epic: `Epic 0`
- Depends On: `0.1`、`0.2`
- Blocks: 所有正式前端页面 Story，尤其是 `1.2`、`1.4`、`3.2`、`4.7`、`5.3`、`9.1`
- Contract Asset Path: `contracts/`
- Mock Asset Path: `mocks/`
- API / Event / Schema Impact: 统一前端 adapter、mock handler、fixture 与环境切换约定
- Persistence Impact: 无
- Frontend States Covered: 空态、加载态、处理中、完成态、失败态、401、403
- Error States Covered: 字段不匹配、权限失败、任务失败、SSE 中断降级
- Acceptance Test Notes: 必须覆盖 mock / real 切换与状态机闭环，不接受只测成功路径

### Business Context

- `Story 0.3` 是前端并行开发的底板。没有 adapter 与 mock handler 基线，任何“页面先行”都会变成对未来接口的猜测。
- 这张卡完成后，前端可以基于统一的领域类型和模拟状态流推进认证、首页、等待页、结果页，而不是为每个页面各造一套 mock 逻辑。
- 它与 `0.2` 一起构成“契约先行、mock 先行”的工程化最小闭环。

### Technical Guardrails

- 页面组件不得直接发 HTTP 请求；必须通过 `services` / `adapters` 访问数据层。
- mock handler 返回字段必须来自同一份契约，不允许为了“先跑通页面”临时拼装第二套字段结构。
- SSE mock 必须模拟 `connected`、`progress`、`completed`、`failed`、`heartbeat` 等关键事件语义，而不是只给一次性完成结果。
- 环境切换必须通过集中入口控制，不能让开发者在组件里手改 import 来切换 mock / real。

### Suggested File Targets

- `packages/student-web/src/services/api/client.ts`
- `packages/student-web/src/services/api/adapters/index.ts`
- `packages/student-web/src/services/api/adapters/base-adapter.ts`
- `packages/student-web/src/services/mock/index.ts`
- `packages/student-web/src/services/mock/fixtures/`
- `packages/student-web/src/services/mock/handlers/`
- `packages/student-web/src/services/sse/index.ts`
- `packages/student-web/src/types/env.d.ts`
- `packages/student-web/src/test/setup.ts`

### Project Structure Notes

- 当前 `packages/student-web/src/services/api/client.ts`、`src/services/api/adapters/auth-adapter.ts`、`src/services/mock/handlers/auth.ts`、`src/services/mock/fixtures/auth.ts` 已经存在，说明认证域已经形成初步基线；本 Story 应把这套方式抽象为全局规则，而不是另起炉灶。
- `packages/student-web/src/services/sse/index.ts` 已存在但仍是空白入口，适合作为统一 SSE 消费封装的落点。
- 当前前端真实目录使用 `src/app/`、`src/features/`、`src/services/` 结构，而不是架构文档早期的 `src/pages/` 口径；新 Story 应优先遵循当前真实代码树。

### Testing Requirements

- 验证 mock / real 模式切换后页面状态逻辑不需要重写。
- 验证 fixtures / handlers 至少覆盖成功、失败、空态、401、403、处理中。
- 验证 SSE mock 具备可恢复的事件序列，而不是只给静态终态数据。
- 验证 adapter 输出统一领域对象，页面不直接消费后端原始包装。

### References

- `_bmad-output/planning-artifacts/epics/13-epic-0.md`：Story 0.3 AC 与交付物。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：FR-UI 段落中的契约先行、mock 先行、前后端并行规则。
- `_bmad-output/planning-artifacts/prd/12-12-definition-of-ready-definition-of-done.md`：正式前端页面 Story 的 Ready 条件。
- `_bmad-output/planning-artifacts/architecture/03-3-核心术语与架构原则.md`：契约先行、双端并行原则。
- `_bmad-output/planning-artifacts/architecture/10-10-一致性规则与项目规范.md`：统一响应处理与 SSE 事件语义。
- `packages/student-web/src/services/api/client.ts`：当前 HTTP client 基线。
- `packages/student-web/src/services/mock/index.ts`：当前 mock 初始化入口。
- `packages/student-web/src/services/sse/index.ts`：当前 SSE 入口占位。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm -C packages/student-web install --no-lockfile`
- `pnpm -C packages/student-web test`
- `pnpm -C packages/student-web typecheck`

### Completion Notes List

- 已引入 `base-adapter` 统一 mock / real 模式解析，并补齐 `task-adapter` 作为列表、详情与状态快照示例。
- 已新增 `task` 领域 fixtures / handlers，并覆盖空态、处理中、完成、失败、401、403 等标准样例。
- 已实现 `services/sse` 的 mock 事件流读取能力，覆盖 `connected / progress / heartbeat / completed / failed` 语义。
- 已补齐浏览器端 mock 初始化入口和运行时 bootstrap，确保切换模式不需要改页面组件代码。
- 已补齐 adapter、mock handler、SSE 和运行时初始化测试，确保前端基线可验证。

### File List

- `_bmad-output/implementation-artifacts/0-3-前端-adapter-与-mock-handler-环境切换基线.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/student-web/src/main.tsx`
- `packages/student-web/src/services/api/adapters/base-adapter.ts`
- `packages/student-web/src/services/api/adapters/index.ts`
- `packages/student-web/src/services/api/adapters/task-adapter.ts`
- `packages/student-web/src/services/mock/browser.ts`
- `packages/student-web/src/services/mock/fixtures/task.ts`
- `packages/student-web/src/services/mock/handlers/task.ts`
- `packages/student-web/src/services/mock/index.ts`
- `packages/student-web/src/services/runtime/bootstrap.ts`
- `packages/student-web/src/services/sse/index.ts`
- `packages/student-web/src/test/services/api/adapters/base-adapter.test.ts`
- `packages/student-web/src/test/services/api/adapters/task-adapter.test.ts`
- `packages/student-web/src/test/services/mock/task-handlers.test.ts`
- `packages/student-web/src/test/services/runtime/bootstrap.test.ts`
- `packages/student-web/src/test/services/sse/task-event-stream.test.ts`
- `packages/student-web/src/types/task.ts`

### Change Log

- 2026-03-29：引入 task adapter、task fixtures / handlers、SSE mock 与运行时初始化基线，状态更新为 `review`。
