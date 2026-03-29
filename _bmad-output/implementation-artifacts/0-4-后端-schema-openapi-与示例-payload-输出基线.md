# Story 0.4: 后端 schema、OpenAPI、示例 payload 输出基线

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 后端团队，
I want 建立统一的 schema、OpenAPI 和示例 payload 输出机制，
so that 前端可以从机器可读资产而非自然语言猜测接口结构。

## Acceptance Criteria

1. 当一个新的后端接口被声明为“契约冻结”时，前端与测试都可以拿到机器可读 schema、示例 request、示例 response 与错误示例，不需要靠口头说明推断字段含义。
2. 当任务接口包含状态枚举、错误码或分页结构时，OpenAPI / schema 输出中必须可见这些语义，不允许只给一个成功示例而缺失失败示例。
3. 后端 schema 输出基线与 `contracts/` 资产互相对齐，后续 Story 不得再各自发明文档格式或只在代码注释里隐式定义接口。

## Tasks / Subtasks

- [x] 建立 FastAPI schema 输出骨架（AC: 1, 3）
  - [x] 明确公共响应模型、分页响应模型、错误响应模型的统一位置。
  - [x] 约束新接口必须以 schema / model 方式定义，而不是仅返回自由字典。
  - [x] 为后续自动导出 OpenAPI 留出入口。
- [x] 冻结示例 payload 规则（AC: 1, 2）
  - [x] 每类接口至少提供成功、失败和边界示例。
  - [x] 任务类接口额外提供状态快照或事件示例。
  - [x] 分页类接口提供 `rows`、`total` 示例。
- [x] 对齐统一 API 规范（AC: 1, 2, 3）
  - [x] 响应格式对齐 `{code, msg, data}` / `{code, msg, rows, total}`。
  - [x] 明确日期格式、状态码、错误码与命名风格。
  - [x] 避免后续业务 Story 再定义互相冲突的包装结构。
- [x] 建立最小验证机制（AC: 1, 2, 3）
  - [x] 为 schema 序列化、示例 payload 完整性与 OpenAPI 导出增加测试或校验脚本。
  - [x] 验证错误示例不会缺席。

## Dev Notes

### Story Metadata

- Story ID: `0.4`
- Story Type: `Infrastructure Story`
- Epic: `Epic 0`
- Depends On: `0.1`、`0.2`
- Blocks: 所有后端契约 Story，尤其是 `1.1`、`2.1`、`3.1`、`4.1`、`5.1`
- Contract Asset Path: `contracts/`
- Mock Asset Path: `mocks/`
- API / Event / Schema Impact: 公共响应模型、错误模型、分页模型、OpenAPI 导出与示例 payload 规范
- Persistence Impact: 无
- Frontend States Covered: 成功返回、分页返回、失败返回、权限失败返回
- Error States Covered: 400、401、403、404、409、500、601
- Acceptance Test Notes: 必须验证 schema 可读、示例完整、错误示例齐全

### Business Context

- `Story 0.4` 不是实现具体业务接口，而是先把“后端如何对外发布契约”这件事统一掉。
- 这张卡直接服务前端、测试和后续 Contract Story；只要 schema 与示例 payload 稳定，前端就能在真实接口尚未完成时推进页面与 mock。
- 它与 `0.2` 的差异在于：`0.2` 冻结资产目录规则，`0.4` 冻结后端如何产出可消费的机器可读内容。

### Technical Guardrails

- 所有 FastAPI 响应必须对齐统一格式 `{code, msg, data}` 或 `{code, msg, rows, total}`。
- 示例 payload 必须包含失败示例，禁止只输出 happy path。
- 公共 schema 不得散落在单个业务模块里反复复制；应有共享响应与错误模型。
- 当前 `packages/fastapi-backend` 还没有真正的 `app/` 代码树，因此本 Story 允许先从最小骨架做起，但不允许继续停留在 README 级口头描述。

### Suggested File Targets

- `packages/fastapi-backend/app/main.py`
- `packages/fastapi-backend/app/core/errors.py`
- `packages/fastapi-backend/app/schemas/common.py`
- `packages/fastapi-backend/app/schemas/pagination.py`
- `packages/fastapi-backend/app/schemas/examples/`
- `contracts/_shared/common-response.schema.json`
- `contracts/_shared/error-response.schema.json`
- `docs/01开发人员手册/004-开发规范/0005-openapi-与-schema-输出规范.md`

### Project Structure Notes

- 当前 `packages/fastapi-backend/` 只有 `README.md` 与 `INDEX.md`，尚未落地架构目标中的 `app/` 代码结构；本 Story 需要补齐最小可用的 schema / OpenAPI 输出骨架。
- 当前仓库已经有 `contracts/` 目录，因此示例 payload 与导出 schema 应尽量与根目录契约资产互相链接，而不是只停留在 FastAPI 内部。
- 学生端已经具备 `services/api/client.ts` 与 adapter 基线，后续前端是否能真正消费后端契约，很大程度取决于这里的公共响应模型是否统一。

### Testing Requirements

- 验证 OpenAPI 或等效 schema 输出中能看到成功与失败示例。
- 验证公共响应包装、分页包装和错误响应模型不冲突。
- 验证日期格式、状态码与字段命名符合统一规范。
- 验证前端可基于导出的示例 payload 构造 mock，而不是继续人工猜字段。

### References

- `_bmad-output/planning-artifacts/epics/13-epic-0.md`：Story 0.4 AC 与交付物。
- `_bmad-output/planning-artifacts/prd/12-12-definition-of-ready-definition-of-done.md`：后端 / 接口 Story 的 Ready 条件。
- `_bmad-output/planning-artifacts/architecture/03-3-核心术语与架构原则.md`：契约先行原则。
- `_bmad-output/planning-artifacts/architecture/10-10-一致性规则与项目规范.md`：统一响应格式、分页、日期、状态码规则。
- `_bmad-output/planning-artifacts/architecture/14-14-项目结构与边界定义.md`：FastAPI 目标目录结构。
- `packages/fastapi-backend/README.md`：当前 FastAPI 工作区现状。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `/Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/packages/fastapi-backend/.venv/bin/pytest`
- `python3 -m json.tool contracts/_shared/common-response.schema.json`
- `python3 -m json.tool contracts/_shared/error-response.schema.json`

### Completion Notes List

- 已新增 `app/schemas/` 共享 schema 目录，并落地统一成功响应、分页响应、错误响应与任务快照模型。
- 已新增 `api/v1/contracts/task-snapshot` 与 `api/v1/contracts/tasks` 两个最小契约输出路由，OpenAPI 中可直接看到成功、失败、分页与任务状态示例。
- 已将 health、root 与各 feature bootstrap 路由统一到 `{code, msg, data}` 包装，错误处理统一到 `{code, msg, data.error_code}`。
- 已新增 `contracts/_shared/common-response.schema.json` 与 `contracts/_shared/error-response.schema.json` 共享资产。
- 已补充 `0006-openapi-与-schema-输出规范.md`，并为 OpenAPI 与共享 schema 资产增加测试校验。

### File List

- `_bmad-output/implementation-artifacts/0-4-后端-schema-openapi-与示例-payload-输出基线.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `contracts/_shared/common-response.schema.json`
- `contracts/_shared/error-response.schema.json`
- `docs/01开发人员手册/004-开发规范/0006-openapi-与-schema-输出规范.md`
- `packages/fastapi-backend/app/api/router.py`
- `packages/fastapi-backend/app/api/routes/contracts.py`
- `packages/fastapi-backend/app/api/routes/health.py`
- `packages/fastapi-backend/app/core/errors.py`
- `packages/fastapi-backend/app/features/classroom/routes.py`
- `packages/fastapi-backend/app/features/common.py`
- `packages/fastapi-backend/app/features/companion/routes.py`
- `packages/fastapi-backend/app/features/knowledge/routes.py`
- `packages/fastapi-backend/app/features/learning/routes.py`
- `packages/fastapi-backend/app/features/video/routes.py`
- `packages/fastapi-backend/app/main.py`
- `packages/fastapi-backend/app/schemas/__init__.py`
- `packages/fastapi-backend/app/schemas/common.py`
- `packages/fastapi-backend/app/schemas/examples.py`
- `packages/fastapi-backend/app/schemas/pagination.py`
- `packages/fastapi-backend/tests/test_bootstrap_routes.py`
- `packages/fastapi-backend/tests/test_health.py`
- `packages/fastapi-backend/tests/test_openapi_contracts.py`

### Change Log

- 2026-03-29：补齐统一响应 schema、OpenAPI examples、共享 schema 资产与测试基线，状态更新为 `review`。
