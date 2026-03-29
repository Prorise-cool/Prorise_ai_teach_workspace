# Story 10.2: RuoYi 小麦业务模块与权限承接规则

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 平台团队，
I want 在 RuoYi 中为小麦业务建立独立业务模块与权限承接规则，
so that 长期数据、查询与审计能够在既有框架内稳定落位。

## Acceptance Criteria

1. 团队设计 RuoYi 承接方案时，小麦业务通过新增业务模块、业务表、CRUD 与菜单权限扩展落位，而不修改 RuoYi 核心认证与权限框架。
2. 需要对视频、课堂、学习记录等长期数据进行权限管理时，小麦业务权限标识遵循统一 `模块:资源:操作` 规则，FastAPI 不自建第二套独立 RBAC 表结构。
3. 业务模块结构冻结后，后续能够承接 CRUD、查询、导出等管理扩展，但当前版本不把它扩展成新的独立 ToB 产品域。

## Tasks / Subtasks

- [ ] 规划 `ruoyi-xiaomai` 模块边界与注册方式（AC: 1, 3）
  - [ ] 确认模块位于 `ruoyi-modules` 体系内的落位、`pom.xml` 注册方式与包结构命名。
  - [ ] 明确小麦业务模块与 `ruoyi-system`、`ruoyi-common-*` 的边界，不在核心认证与权限框架里硬编码业务逻辑。
  - [ ] 约束模块初始化只承接小麦业务表、菜单、权限与后台查询能力。
- [ ] 冻结权限标识与菜单 / 按钮规则（AC: 2, 3）
  - [ ] 为视频任务、课堂会话、学习记录、收藏、问答日志、Learning Coach 结果、审计 / 导出定义统一权限标识。
  - [ ] 复用 RuoYi 的 `模块:资源:操作` 规则设计菜单权限、按钮权限与导出权限。
  - [ ] 明确哪些能力仅后台可见，哪些只提供查询不提供修改。
- [ ] 定义 CRUD / 查询扩展生成策略（AC: 1, 3）
  - [ ] 识别可直接用 RuoYi Generator 生成的标准业务表与需要手写聚合查询的场景。
  - [ ] 规定 Controller、Service、Mapper、Bo / Vo、菜单路由的最小目录规范。
  - [ ] 为后续 `10.8` 的审计 / 导出边界预留统一扩展点。
- [ ] 补齐权限验证与运维约束（AC: 1, 2, 3）
  - [ ] 为关键查询、导出与敏感操作加上统一权限校验与操作日志要求。
  - [ ] 验证 FastAPI 只消费 RuoYi 权限结果，不复制权限真值。
  - [ ] 明确当前阶段不建设与 RuoYi 平行的新后台产品域。

## Dev Notes

### Business Context

- `10.2` 负责回答“小麦业务如何进入 RuoYi”，它是后台查询、长期数据管理与审计能力的结构前置。
- 该 Story 完成后，后续 `10.4` 到 `10.8` 才能围绕统一业务模块沉淀表、CRUD、查询与导出能力。
- 当前版本只承接与小麦长期业务数据有关的后台能力，不扩展与需求无关的 ToB 产品功能。

### Technical Guardrails

- 严禁修改 RuoYi 核心认证、Sa-Token / 权限主干逻辑来适配小麦业务。
- 所有权限标识都必须遵循 `模块:资源:操作`，并由 RuoYi RBAC 统一承载。
- 标准业务 CRUD 优先落在 RuoYi 管理端 / 业务表，FastAPI 不重复建设完整后台 CRUD 面。
- 对导出、审计和查询类操作要预留权限与操作日志挂点，避免后期补日志导致接口返工。
- 模块命名、包结构与生成代码模式应尽量贴近当前 RuoYi 现有模块与 Generator 模板。

### Suggested File Targets

- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/pom.xml`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/pom.xml`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/`
- `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260328_xm_menu_permission.sql`
- `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260328_xm_module_bootstrap.sql`

### Project Structure Notes

- 当前 `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/` 里已有 `ruoyi-demo`、`ruoyi-generator`、`ruoyi-job`、`ruoyi-system`，但还没有 `ruoyi-xiaomai`。
- 仓库中已经存在 RuoYi Generator 模板和 `@SaCheckPermission`、`@Log` 等典型写法，可直接复用这些现有模式，而不是发明新的后台结构。
- 架构文档把 `ruoyi-xiaomai/` 定义为新增业务模块，因此本 Story 应把“新增模块”作为预期结果，而不是尝试把小麦业务散落进现有系统模块。

### Testing Requirements

- 验证 `ruoyi-xiaomai` 模块注册后构建链路可识别，不破坏现有 `ruoyi-modules` 聚合结构。
- 验证权限标识命名与菜单 / 按钮权限一一对应，不出现同义不同名。
- 验证关键查询 / 导出接口具备 `403` 拒绝路径与操作日志要求。
- 验证 FastAPI 未新增平行 RBAC 真值存储或自建后台角色表。

### References

- `_bmad-output/planning-artifacts/epics/27-epic-10-ruoyi.md`：Story 10.2 AC、交付物与 Epic 10 边界。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-LR-005` 与学习中心 / 后台职责边界。
- `_bmad-output/planning-artifacts/prd/07-7-非功能需求.md`：`NFR-AR-001`、`NFR-AR-002`、`NFR-SE-002`。
- `_bmad-output/planning-artifacts/architecture/07-7-职责边界与集成关系.md`：RuoYi 集成定位、可承接业务表与后台职责。
- `_bmad-output/planning-artifacts/architecture/10-10-一致性规则与项目规范.md`：权限标识规范、分页与响应规则。
- `_bmad-output/planning-artifacts/architecture/14-14-项目结构与边界定义.md`：`ruoyi-xiaomai` 目标目录与模块边界。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 无

### Completion Notes List

- 已补齐 RuoYi 小麦业务模块、权限命名与 CRUD / 查询扩展的结构化约束。

### File List

- `_bmad-output/implementation-artifacts/10-2-ruoyi-小麦业务模块与权限承接规则.md`
