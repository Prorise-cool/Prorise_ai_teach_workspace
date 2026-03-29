# Story 0.1: Monorepo 基础目录与工程骨架冻结

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 前后端协作团队，
I want 冻结 Monorepo 的基础目录和最小工程骨架，
so that 后续每个 Epic 都能在统一结构中落位而不会边做边改根目录组织。

## Acceptance Criteria

1. 团队创建代码仓目录结构时，`packages/student-web`、`packages/fastapi-backend`、`packages/RuoYi-Vue-Plus-5.X/`、`docs/`、`contracts/`、`mocks/` 等基础路径与架构文档保持一致，后续 Epic 不需要再因为根目录规划返工移动大量文件。
2. 开发者首次拉取项目后，能够根据根目录 `README.md` 与各 package 启动说明，让学生端、FastAPI、RuoYi 至少以空壳模式启动，不会因为入口脚本、工作区配置或环境示例缺失而无法开始开发。
3. 工程骨架只冻结结构和最小运行面，不把业务实现、业务表设计或具体页面开发混进 Epic 0。

## Tasks / Subtasks

- [x] 冻结根目录与 workspace 骨架（AC: 1）
  - [x] 对齐根目录 `README.md`、`pnpm-workspace.yaml`、`package.json` 与架构文档中的目录职责说明。
  - [x] 明确 `packages/`、`docs/`、`contracts/`、`mocks/`、`_bmad-output/` 的边界与用途。
  - [x] 明确 `references/` 默认只读，不作为业务代码落点。
- [x] 为三端建立最小启动壳层（AC: 1, 2）
  - [x] 学生端保留现有 Vite/React 入口和最小 smoke test。
  - [x] FastAPI 至少补齐 `app/` 目标骨架或明确占位结构与启动方式。
  - [x] RuoYi 侧明确现有基座与未来 `ruoyi-xiaomai` 业务模块的边界。
- [x] 补齐环境与启动说明（AC: 2）
  - [x] 为根目录与关键 package 提供 `.env.example` 或等效环境变量说明。
  - [x] 将本地开发最小启动命令、依赖版本与常见失败项写入 README。
  - [x] 明确哪些模块当前是占位骨架，避免开发者误判“功能已具备”。
- [x] 增加结构稳定性检查（AC: 1, 2, 3）
  - [x] 提供最小目录 / 启动 smoke checklist。
  - [x] 验证新增骨架不引入业务代码耦合或与架构路径冲突。

## Dev Notes

### Story Metadata

- Story ID: `0.1`
- Story Type: `Infrastructure Story`
- Epic: `Epic 0`
- Depends On: 已冻结的 PRD / Architecture 索引与当前 Monorepo 根目录
- Blocks: `0.2`、`0.3`、`0.4`、`0.5`、`0.6`，以及所有后续 Epic 的正式开发落位
- Contract Asset Path: `N/A`
- Mock Asset Path: `N/A`
- API / Event / Schema Impact: 无直接业务契约；为后续契约资产提供稳定目录宿主
- Persistence Impact: 无
- Frontend States Covered: 根应用可启动、根应用缺少环境变量、根应用缺少依赖
- Error States Covered: 工作区未安装、入口脚本缺失、目录落位错误
- Acceptance Test Notes: 以目录检查、启动检查、README 步骤验证为主

### Business Context

- `Story 0.1` 是 Epic 0 的结构冻结卡，目标是让后续所有 Story 有统一落点，而不是交付任何用户可见功能。
- 这张卡的价值在于“结构稳定”，不是“功能完整”；只要能让团队在同一套目录与启动方式上协作，它就完成了基础使命。
- 后续 `0.2 ~ 0.5` 会分别把契约、mock、schema 与日志骨架补齐，但它们都依赖这里先把根目录组织钉住。

### Technical Guardrails

- 必须遵循双后端分层：学生端在 `packages/student-web/`，FastAPI 功能服务在 `packages/fastapi-backend/`，RuoYi 基座在 `packages/RuoYi-Vue-Plus-5.X/`。
- `references/` 只作参考来源，不直接承接业务代码。
- 当前阶段禁止为了“先跑起来”把业务逻辑塞进根目录脚本或临时目录；应按目标结构放置占位骨架。
- 该 Story 不负责定义业务接口、业务表或学习中心聚合逻辑，避免把 Epic 0 做成隐藏业务 Epic。

### Suggested File Targets

- `README.md`
- `pnpm-workspace.yaml`
- `package.json`
- `packages/INDEX.md`
- `packages/fastapi-backend/README.md`
- `packages/fastapi-backend/INDEX.md`
- `packages/student-web/README.md`
- `docs/01开发人员手册/005-环境搭建/0001-最小启动说明.md`

### Project Structure Notes

- 当前仓库已经有 `packages/student-web/`、`packages/fastapi-backend/`、`packages/RuoYi-Vue-Plus-5.X/`、`packages/ruoyi-plus-soybean/`、`contracts/`、`mocks/` 等主路径，说明根骨架已经部分存在，本 Story 更偏向“冻结与补齐”，不是从零创建仓库。
- `packages/student-web/src/` 已有 `app/`、`features/`、`services/`、`test/` 等真实代码结构，应被视为前端当前基线。
- `packages/fastapi-backend/` 目前只有 `README.md` 与 `INDEX.md`，尚未落地架构文档中的 `app/` 代码树；因此本 Story 需要明确“占位骨架”和“未来目标结构”的关系。
- `contracts/` 与 `mocks/` 根目录已存在，后续 `0.2` 应直接在这里规范化，不要迁移到别的目录。

### Testing Requirements

- 验证根目录 README 的安装与启动步骤在当前仓库可执行。
- 验证 `packages/student-web`、`packages/fastapi-backend`、`packages/RuoYi-Vue-Plus-5.X` 三端的职责说明与架构一致。
- 验证新增或调整的骨架不破坏现有学生端 workspace。
- 验证不存在把业务代码误放到 `references/` 或根目录临时脚本中的情况。

### References

- `_bmad-output/planning-artifacts/epics/13-epic-0.md`：Epic 0 范围、并行规则与 Story 0.1 AC。
- `_bmad-output/planning-artifacts/prd/03-3-架构对齐摘要.md`：双后端分层与模块边界。
- `_bmad-output/planning-artifacts/prd/07-7-非功能需求.md`：`NFR-AR-001`、`NFR-AR-007`、`NFR-SE-001`。
- `_bmad-output/planning-artifacts/architecture/04-4-系统边界与总体架构.md`：系统组成与三端职责。
- `_bmad-output/planning-artifacts/architecture/14-14-项目结构与边界定义.md`：目标 Monorepo 结构。
- `README.md`：当前仓库入口导航与快速开始。
- `packages/INDEX.md`：当前代码工作区入口与职责说明。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm setup:fastapi-backend`
- `pnpm test:fastapi-backend`
- `pnpm --filter @xiaomai/student-web typecheck`
- `pnpm --filter @xiaomai/student-web test`
- `packages/fastapi-backend/.venv/bin/python -m uvicorn app.main:app --app-dir packages/fastapi-backend --host 127.0.0.1 --port 8091`
- `curl -s http://127.0.0.1:8091/health`
- `curl -s http://127.0.0.1:8091/api/v1/video/bootstrap`

### Completion Notes List

- 已补齐根目录启动说明、Node / pnpm 版本要求与三端启动顺序。
- 已将 `packages/fastapi-backend/` 从纯说明目录提升为对齐架构文档的框架骨架，包含 `core / infra / providers / features / shared / task_framework`。
- 已将 `task_framework` 中会提前冻结后续 Story 的状态枚举与错误码降回中性占位，避免 `Story 0.1` 越界承接 `2.1 / 2.2` 契约职责。
- 已新增 `packages/RuoYi-Vue-Plus-5.X/ruoyi-xiaomai/README.md`，冻结小麦业务模块预留目录边界。
- 已新增 Epic 0 最小启动说明文档，并补充三端职责与 smoke checklist。
- 已让 `pnpm dev:fastapi-backend` 通过 package 内 `.env` 驱动 `host / port / reload`，消除脚本与文档口径不一致问题。
- FastAPI 在本机 `8090` 端口验证时遇到端口占用，因此改用 `8091` 完成真实请求验证；骨架启动与路由响应正常。

### File List

- `_bmad-output/implementation-artifacts/0-1-monorepo-基础目录与工程骨架冻结.md`
- `README.md`
- `package.json`
- `docs/01开发人员手册/005-环境搭建/0005-Epic0-最小启动说明.md`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-xiaomai/README.md`
- `packages/fastapi-backend/.env.example`
- `packages/fastapi-backend/pyproject.toml`
- `packages/fastapi-backend/README.md`
- `packages/fastapi-backend/INDEX.md`
- `packages/fastapi-backend/app/main.py`
- `packages/fastapi-backend/app/api/router.py`
- `packages/fastapi-backend/app/core/*`
- `packages/fastapi-backend/app/infra/*`
- `packages/fastapi-backend/app/providers/*`
- `packages/fastapi-backend/app/features/*`
- `packages/fastapi-backend/app/shared/*`
- `packages/fastapi-backend/tests/test_health.py`
- `packages/fastapi-backend/tests/test_bootstrap_routes.py`

### Change Log

- 2026-03-29：补齐 FastAPI 架构骨架、根级启动说明、RuoYi 业务模块占位与 Epic 0 最小启动文档；状态更新为 `review`。
- 2026-03-29：收敛 `task_framework` 占位语义，避免提前冻结后续任务契约；同时让 FastAPI 开发脚本真正读取 package 内 `.env` 配置。
