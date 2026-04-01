# Story 1.1: 统一认证契约、会话 payload 与 mock 基线

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 前后端协作团队，
I want 冻结统一认证契约、会话 payload 和 mock handler，
so that 登录链路、受保护路由和首页入口可以并行开发而不互相等待。

## Acceptance Criteria

1. 登录、注册、登出、当前用户信息、`401` / `403` 语义和回跳参数格式被文档化并对外公布，前端直接消费同一份类型定义与 mock handler，不再自行猜测字段结构。
2. 认证 adapter 从 mock 切换到真实接口时，页面状态模型、表单提交流程和受保护路由判断逻辑不需要重写，mock payload 与真实 payload 字段语义保持一致。
3. 当前用户 payload 至少稳定包含用户 ID、昵称、头像、角色列表与权限判断所需基础字段，后续页面不再通过额外猜测字段判断身份。

## Tasks / Subtasks

- [x] 固化认证域类型与响应映射约定（AC: 1, 3）
  - [x] 在前端定义 `AuthSession`、`AuthUser`、`AuthRole`、`AuthPermission`、`AuthError` 等类型。
  - [x] 明确 RuoYi `{ code, msg, data }` 包装与前端领域对象之间的映射规则。
  - [x] 明确 `returnTo` 参数格式、允许来源和回跳兜底规则。
- [x] 建立认证 adapter 抽象与 mock 基线（AC: 1, 2）
  - [x] 在 `packages/student-web/src/services/api/adapters/` 下补齐认证 adapter 接口。
  - [x] 在 `packages/student-web/src/services/mock/` 下增加 auth fixtures 与 handlers。
  - [x] 让 mock 与 real adapter 共用同一套领域类型。
- [x] 对齐认证错误语义（AC: 1, 2）
  - [x] 明确 `401` 表示未登录或会话失效，`403` 表示已登录但无权限。
  - [x] 明确错误文案只消费 `msg` 与 error code，不暴露敏感账户信息。
- [x] 补充契约与 mock 测试（AC: 1, 2, 3）
  - [x] 为 adapter、payload mapping、mock handler 增加单元测试。
  - [x] 为未登录、已登录、权限不足三类状态准备测试夹具。

### Story Metadata

- Story ID: `1.1`
- Story Type: `Contract Story`
- Epic: `Epic 1`
- Depends On: `Epic 0`，重点依赖 `0.2` 契约资产规范、`0.3` adapter / mock 基线、`0.4` 统一响应输出
- Blocks: `1.2`、`1.3`、`1.4`、`1.5`、`1.6`
- Contract Asset Path: `contracts/auth/`
- Mock Asset Path: `mocks/auth/`
- API / Event / Schema Impact: 冻结登录 / 注册 / 登出 / 当前用户 payload、`401/403` 语义、`returnTo` 参数格式与 adapter 映射规则
- Persistence Impact: 无新增长期持久化；复用 RuoYi 在线态与认证 Redis 语义
- Frontend States Covered: 未登录、登录成功、注册成功、权限不足、会话失效、回跳恢复
- Error States Covered: `401`、`403`、凭证错误、表单校验失败、回跳参数非法
- Acceptance Test Notes: 必须覆盖 adapter mapping、mock handler、`401/403` 分流与会话样例一致性

## Dev Notes

### Business Context

- Epic 1 是“进入系统”的统一起点，本 Story 是整个 Epic 的前置契约 Story。
- 该 Story 完成后，`/login`、首页双入口、输入壳层和受保护路由都应能在 mock 模式下并行开发。
- 当前版本不要求真实视频或课堂引擎完成，重点是认证契约稳定、mock 可复用、前后端可并行。

### Technical Guardrails

- 统一认证必须走独立 `/login` 页面，不允许首页弹框式认证。
- 登录态判断必须与 RuoYi 保持一致，FastAPI 不自建独立用户体系。
- API 响应格式必须遵循 `{ code, msg, data }`，状态码语义遵循 `401` 未授权、`403` 无权限。
- 前端错误处理遵循统一约定：`401` 清理 Token 并跳转登录，`403` 提示无权限或登录失效。
- 契约先行、mock 先行：先冻结类型、错误码、示例 payload、mock 样例，再进入页面开发。

### Suggested File Targets

- `packages/student-web/src/features/auth/`：认证页面相关 UI 与表单逻辑。
- `packages/student-web/src/services/auth.ts`：认证服务入口。
- `packages/student-web/src/services/api/adapters/auth-adapter.ts`：mock / real 统一接口。
- `packages/student-web/src/services/mock/handlers/auth.ts`：MSW 认证 handlers。
- `packages/student-web/src/services/mock/fixtures/auth.ts`：会话样例与错误样例。
- `packages/student-web/src/stores/auth-store.ts`：认证状态存储。
- `packages/student-web/src/types/auth.ts`：认证领域类型。

### Project Structure Notes

- 实际前端代码当前采用 `src/app`、`src/features`、`src/services` 结构，而不是架构文档里较早版本的 `src/pages` 结构；新代码应遵循当前真实目录。
- 当前 `packages/student-web/src/services/mock/index.ts` 为空，适合作为 Epic 1 mock 体系的起点。
- 当前 `packages/student-web/src/services/api/client.ts` 已切为 `fetch-based` thin client，认证契约应围绕它扩展，不要再引入第二套 HTTP 客户端。
- 当前 `packages/fastapi-backend` 只有说明文件，没有后端骨架，因此本 Story 主要以前端契约、适配层和 mock 为先。

### Testing Requirements

- 为认证 adapter、payload mapping、mock fixtures 增加单元测试。
- 至少覆盖成功登录、登录失败、未登录访问、权限不足四类输入输出样例。
- 保持 `packages/student-web` 现有测试栈：Vitest + Testing Library + MSW。

### References

- `_bmad-output/planning-artifacts/epics/14-epic-1.md`：Epic 1 范围、依赖、Parallel Delivery Rule、Story 1.1 AC。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-UM-001`、`FR-UM-002`、`FR-UI-R01`。
- `_bmad-output/planning-artifacts/prd/07-7-非功能需求.md`：`NFR-SE-002`、`NFR-SE-003`、`NFR-UX-003`。
- `_bmad-output/planning-artifacts/architecture/10-10-一致性规则与项目规范.md`：API 格式、状态码、前端响应处理约定。
- `_bmad-output/planning-artifacts/architecture/14-14-项目结构与边界定义.md`：Monorepo 目标结构与前端/后端目标落位。
- `_bmad-output/planning-artifacts/ux-design-specification/12-11-frontend-backend-interaction-boundary前端与双后端交互边界.md`：JWT 共享 Redis 方案与前端处理边界。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- 以 `src/types/auth.ts` 固化前端领域类型与 RuoYi 响应包装。
- 以 `src/services/api/adapters/auth-adapter.ts` 承接 mock / real 统一 adapter 与映射逻辑。
- 以 `src/services/auth.ts` 提供登录后会话聚合与 `returnTo` 归一化规则。
- 以 `src/services/mock/fixtures/auth.ts` 和 `src/services/mock/handlers/auth.ts` 提供可编排 mock 会话样例与 `401/403` 行为。
- 以 `contracts/auth/` 与 `mocks/auth/` 对外公布契约说明与示例 payload。

### Debug Log References

- `pnpm --filter @xiaomai/student-web test`：通过，`5` 个测试文件、`15` 个用例全部通过。
- `pnpm --filter @xiaomai/student-web typecheck`：通过。
- `pnpm --filter @xiaomai/student-web lint`：通过。

### Completion Notes List

- 已补齐 Epic 1 前置契约 Story 所需的开发上下文、落位建议与测试边界。
- 已新增认证领域类型、会话聚合服务、mock / real adapter 与 `401/403` 统一错误语义。
- 已新增认证契约说明与 mock session 示例，补齐对外可消费的文档化资产。
- 已补充 adapter、service、mock handlers 单元测试，并完成 `test`、`typecheck`、`lint` 验证。
- 已按当前 Epic 1 收口状态把 Story 1.1 从 `done` 回调到 `review`，等待与 1.2 ~ 1.7 的合并审查一起闭环。

### File List

- `_bmad-output/implementation-artifacts/1-1-统一认证契约会话-payload-与-mock-基线.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `contracts/auth/story-1.1-统一认证契约与会话语义.md`
- `mocks/auth/session-samples.json`
- `packages/student-web/src/services/api/adapters/index.ts`
- `packages/student-web/src/services/api/adapters/auth-adapter.ts`
- `packages/student-web/src/services/auth.ts`
- `packages/student-web/src/services/mock/index.ts`
- `packages/student-web/src/services/mock/fixtures/auth.ts`
- `packages/student-web/src/services/mock/handlers/auth.ts`
- `packages/student-web/src/test/services/api/adapters/auth-adapter.test.ts`
- `packages/student-web/src/test/services/auth/auth-service.test.ts`
- `packages/student-web/src/test/services/mock/auth-handlers.test.ts`
- `packages/student-web/src/types/auth.ts`

## Change Log

- 2026-03-28：完成 Story 1.1 契约冻结，实现认证领域类型、mock / real adapter、mock handlers、契约文档与单元测试，并将状态推进到 `review`。
- 2026-03-29：补齐 GitHub Flow 收口；确认 `master` 已包含 Story 1.1 实现产物，关闭 Issue `#1`，并将 Story 状态同步为 `done`。
- 2026-04-01：根据 Epic 1 当前统一收口节奏，将 Story 1.1 状态回调为 `review`，与后续入口 / 认证实现一并进入审查。
