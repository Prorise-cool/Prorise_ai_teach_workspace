# Story 10.3: FastAPI 与 RuoYi 防腐层客户端

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 后端团队，
I want 通过防腐层而不是直接耦合 RuoYi 领域模型进行交互，
so that FastAPI 维持功能服务层定位，不膨胀成第二个业务后台。

## Acceptance Criteria

1. FastAPI 需要回写或查询长期业务数据时，通过统一的防腐层客户端、DTO 或适配对象与 RuoYi 交互，而不直接依赖 RuoYi 的领域模型、Mapper 或内部服务实现。
2. RuoYi 业务字段调整时，优先在防腐层映射中消化差异，不把 RuoYi 领域结构变化直接扩散到所有 FastAPI feature 模块。
3. 某次回写失败时，FastAPI 能返回明确的集成失败语义并记录日志，业务层不会收到大量未映射的框架级异常。

## Tasks / Subtasks

- [x] 建立共享 RuoYi Client 抽象（AC: 1, 3）
  - [x] 设计统一的 `ruoyi_client` 入口、认证 / 请求头策略、超时与重试边界。
  - [x] 区分单条响应 `{code, msg, data}` 与分页响应 `{code, msg, rows, total}` 的解包逻辑。
  - [x] 约束 FastAPI feature 只依赖 Client 接口与 DTO，不直接依赖 RuoYi Java 领域对象。
- [x] 定义 DTO、Mapper 与调用语义（AC: 1, 2）
  - [x] 为写入、查询、分页查询和错误返回分别定义 DTO / mapper。
  - [x] 在 mapper 层吸收 RuoYi 字段命名、状态枚举与日期格式差异。
  - [x] 为视频、课堂、Companion、Evidence、Learning Coach 等场景设计可扩展的资源调用方法。
- [x] 建立错误映射与日志策略（AC: 2, 3）
  - [x] 将 401、403、404、409、5xx 与网络异常映射为可解释的集成错误。
  - [x] 记录 request_id、task_id、目标资源、失败原因与重试结果。
  - [x] 禁止把原始框架堆栈直接透出到业务层或前端。
- [x] 补齐单元与集成测试（AC: 1, 2, 3）
  - [x] 使用 mock HTTP 覆盖成功、分页、字段漂移与失败语义。
  - [x] 覆盖回写失败、权限不足、目标资源不存在与超时重试场景。
  - [x] 验证新增资源接入时只需扩展 mapper / DTO，而不是复制一套新 client。

### Story Metadata

- Story ID: `10.3`
- Story Type: `Backend Story`
- Epic: `Epic 10`
- Depends On: `10.1`、`10.2`
- Blocks: `10.4`、`10.5`、`10.6`、`10.7`
- Contract Asset Path: `packages/fastapi-backend/app/shared/ruoyi_client.py`
- Mock Asset Path: `N/A`
- API / Event / Schema Impact: 冻结 FastAPI 侧统一 RuoYi client、DTO / mapper、`{code, msg, data}` / `{code, msg, rows, total}` 解包与错误映射
- Persistence Impact: 本 Story 不直接落长期数据；负责稳定访问 RuoYi 长期宿主
- Frontend States Covered: 间接支撑学习中心与后台查询所依赖的回写成功、空数据、权限不足、资源不存在
- Error States Covered: `401`、`403`、`404`、`409`、`5xx`、网络异常、超时重试、字段漂移
- Acceptance Test Notes: 必须覆盖单条 / 分页解包、字段映射、超时重试与集成失败语义

## Dev Notes

### Business Context

- `10.3` 是 Epic 10 的技术底座 Story，后续 `10.4` 到 `10.7` 的回写与查询都会依赖这层防腐封装。
- 它的目标不是让 FastAPI 变成第二个后台，而是让 FastAPI 继续专注功能执行，并把长期数据访问委托给 RuoYi。
- 一旦没有统一防腐层，后续业务 Story 会把 RuoYi 字段和异常语义散落进多个 feature 模块，返工成本很高。

### Technical Guardrails

- 防腐层必须是 FastAPI 侧的唯一 RuoYi 集成入口，不允许各 feature 自建 HTTP 调用散落实现。
- 响应格式必须对齐全局 `{code, msg, data}` 与 `{code, msg, rows, total}` 语义。
- DTO / mapper 负责隔离 RuoYi 字段变化，业务层只消费稳定的 Python 对象或协议。
- 错误处理需要可观测但不可泄露内部实现，日志应保留 request_id / task_id 便于跨服务排障。
- 防腐层不负责权限真值判断，它只消费 RuoYi 返回的权限 / 错误结果。

### Suggested File Targets

- `packages/fastapi-backend/app/shared/ruoyi_client.py`
- `packages/fastapi-backend/app/shared/ruoyi_mapper.py`
- `packages/fastapi-backend/app/core/errors.py`
- `packages/fastapi-backend/tests/unit/test_ruoyi_client.py`
- `packages/fastapi-backend/tests/integration/test_ruoyi_client_integration.py`

### Project Structure Notes

- 当前 `packages/fastapi-backend` 目录还没有真正的 `app/` 代码树；架构文档中的 `app/shared/ruoyi_client.py` 是目标落位，而不是现状。
- 当前仓库里前端已有 `packages/student-web/src/services/api/client.ts`，但那是浏览器端 HTTP client，不能被 FastAPI 后端直接复用。
- 该 Story 应优先创建共享 client 骨架与测试基线，再让各 feature 在其上挂接资源级调用。

### Testing Requirements

- 覆盖单条响应、分页响应、空数据与字段缺失场景。
- 覆盖权限不足、资源不存在、服务不可达、超时与幂等重试场景。
- 验证 mapper 可以吸收字段重命名或额外字段，而业务层调用签名保持稳定。
- 验证日志中包含 request_id、task_id、目标接口与集成失败语义。

### References

- `_bmad-output/planning-artifacts/epics/27-epic-10-ruoyi.md`：Story 10.3 AC 与交付物。
- `_bmad-output/planning-artifacts/prd/08-8-数据与集成约束.md`：FastAPI 与 RuoYi 通过防腐层交互的总约束。
- `_bmad-output/planning-artifacts/architecture/07-7-职责边界与集成关系.md`：FastAPI / RuoYi 职责分离与后台承接边界。
- `_bmad-output/planning-artifacts/architecture/10-10-一致性规则与项目规范.md`：API 响应格式、分页语义、状态码规范。
- `_bmad-output/planning-artifacts/architecture/14-14-项目结构与边界定义.md`：`shared/ruoyi_client.py` 的目标落位与项目结构。
- `_bmad-output/planning-artifacts/ux-design-specification/12-11-frontend-backend-interaction-boundary前端与双后端交互边界.md`：双后端交互模型与认证边界。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 无

### Completion Notes List

- 已实现统一 `RuoYiClient`，支持单条与分页响应解包、请求头传播、超时与重试、错误映射。
- 已实现 `RuoYiMapper`，用于字段名、状态值与日期格式的双向归一。
- 已补充单元与集成测试，覆盖成功、分页、字段漂移、权限不足、资源不存在、网络异常与超时重试。
- 2026-04-08 补记：已将 RuoYi 回源默认工厂切换为显式 `from_service_auth`，不再允许业务 service 静默回退到无鉴权 `from_settings`。
- 2026-04-08 补记：已补齐 FastAPI 的环境分层加载规则，区分共享基础配置、本地覆盖、预发覆盖与生产覆盖，并同步 `.env.example` / `.env.local.example` / `.env.staging.example` / `.env.production.example`。
- 2026-04-08 补记：已新增服务级 token file 规范文档，明确禁止继续把 RuoYi `access_token` 直接写入通用 `.env`。
- 2026-04-08 补记：当前仍保留旧 `.env` 与 `FASTAPI_ENV_FILE` 的兼容读取能力，但推荐入口已切换为 `.env.defaults`、`.env.<env>`、`.env.<env>.local`、`.env.local`；同时新增 `packages/fastapi-backend/scripts/migrate_legacy_ruoyi_env.py` 用于清理历史 `FASTAPI_RUOYI_ACCESS_TOKEN` / `FASTAPI_RUOYI_CLIENT_ID`。
- 2026-04-08 补记：服务级 token file 当前兼容三种格式：纯 JWT 字符串、`{"access_token":"...", "client_id":"..."}` JSON 对象，以及完整的 RuoYi 登录响应 envelope。
- 2026-04-08 补记：视频 worker 已停止把用户 token 写入 Redis 运行态；后台异步写回、公开列表回源与 provider runtime 查询统一转向显式服务级鉴权。

### File List

- `_bmad-output/implementation-artifacts/10-3-fastapi-与-ruoyi-防腐层客户端.md`
- `packages/fastapi-backend/app/core/config.py`
- `packages/fastapi-backend/app/core/errors.py`
- `packages/fastapi-backend/app/shared/ruoyi_client.py`
- `packages/fastapi-backend/app/shared/ruoyi_auth.py`
- `packages/fastapi-backend/app/shared/ruoyi_mapper.py`
- `packages/fastapi-backend/.env.example`
- `packages/fastapi-backend/.env.local.example`
- `packages/fastapi-backend/.env.staging.example`
- `packages/fastapi-backend/.env.production.example`
- `packages/fastapi-backend/scripts/migrate_legacy_ruoyi_env.py`
- `packages/fastapi-backend/app/features/video/pipeline/orchestrator.py`
- `packages/fastapi-backend/app/features/video/services/create_task.py`
- `packages/fastapi-backend/tests/unit/test_ruoyi_client.py`
- `packages/fastapi-backend/tests/unit/test_ruoyi_mapper.py`
- `packages/fastapi-backend/tests/integration/test_ruoyi_client_integration.py`
- `packages/fastapi-backend/tests/unit/core/test_config.py`
- `packages/fastapi-backend/tests/unit/shared/test_ruoyi_auth.py`
- `packages/fastapi-backend/tests/unit/shared/test_ruoyi_service_mixin.py`
- `packages/fastapi-backend/tests/unit/video/test_video_create_task.py`
- `packages/fastapi-backend/tests/unit/video/test_video_ruoyi_auth_paths.py`
- `packages/fastapi-backend/tests/integration/video/test_video_pipeline_api.py`
- `docs/01开发人员手册/004-开发规范/0110-FastAPI-RuoYi-环境与鉴权分层规范.md`
