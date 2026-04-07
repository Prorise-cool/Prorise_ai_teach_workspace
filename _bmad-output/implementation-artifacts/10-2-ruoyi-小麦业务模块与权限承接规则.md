# Story 10.2: RuoYi 小麦业务模块与权限承接规则

Status: done

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

- [x] 规划 `ruoyi-xiaomai` 模块边界与注册方式（AC: 1, 3）
  - [x] 确认模块位于 `ruoyi-modules` 体系内的落位、`pom.xml` 注册方式与包结构命名。
  - [x] 明确小麦业务模块与 `ruoyi-system`、`ruoyi-common-*` 的边界，不在核心认证与权限框架里硬编码业务逻辑。
  - [x] 约束模块初始化只承接小麦业务表、菜单、权限与后台查询能力。
- [x] 冻结权限标识与菜单 / 按钮规则（AC: 2, 3）
  - [x] 为视频任务、课堂会话、学习记录、收藏、问答日志、Learning Coach 结果、审计 / 导出定义统一权限标识。
  - [x] 复用 RuoYi 的 `模块:资源:操作` 规则设计菜单权限、按钮权限与导出权限。
  - [x] 明确哪些能力仅后台可见，哪些只提供查询不提供修改。
- [x] 定义 CRUD / 查询扩展生成策略（AC: 1, 3）
  - [x] 识别可直接用 RuoYi Generator 生成的标准业务表与需要手写聚合查询的场景。
  - [x] 规定 Controller、Service、Mapper、Bo / Vo、菜单路由的最小目录规范。
  - [x] 为后续 `10.8` 的审计 / 导出边界预留统一扩展点。
- [x] 补齐权限验证与运维约束（AC: 1, 2, 3）
  - [x] 为关键查询、导出与敏感操作加上统一权限校验与操作日志要求。
  - [x] 验证 FastAPI 只消费 RuoYi 权限结果，不复制权限真值。
  - [x] 明确当前阶段不建设与 RuoYi 平行的新后台产品域。

### Story Metadata

- Story ID: `10.2`
- Story Type: `Integration Story`
- Epic: `Epic 10`
- Depends On: `10.1`
- Blocks: `10.3`、`10.4`、`10.5`、`10.6`、`10.7`、`10.8`
- Contract Asset Path: `docs/01开发人员手册/004-开发规范/0102-RuoYi小麦模块与权限承接规则.md`
- Mock Asset Path: `N/A`
- API / Event / Schema Impact: 冻结 `ruoyi-xiaomai` 模块边界、菜单 / 按钮权限命名、查询 / 导出 / 审计权限挂点
- Persistence Impact: 小麦长期数据通过 RuoYi 业务模块承接，不新增 FastAPI 平行 RBAC 或长期数据库
- Frontend States Covered: 后台菜单可见、查询可见、导出可见、权限拒绝
- Error States Covered: 权限标识漂移、平行 RBAC、自建后台域、查询 / 导出缺少操作日志挂点
- Acceptance Test Notes: 必须验证模块注册、权限命名、`403` 拒绝路径与构建链路稳定

## Dev Notes

### Business Context

- `10.2` 负责回答“小麦业务如何进入 RuoYi”，它是后台查询、长期数据管理与审计能力的结构前置。
- 该 Story 完成后，后续 `10.4` 到 `10.8` 才能围绕统一业务模块沉淀表、CRUD、查询与导出能力。
- 当前版本只承接与小麦长期业务数据有关的后台能力，不扩展与需求无关的 ToB 产品功能。

### Technical Guardrails

- 严禁修改 RuoYi 核心认证、Sa-Token / 权限主干逻辑来适配小麦业务。
- 所有权限标识都必须遵循 `模块:资源:操作`，并由 RuoYi RBAC 统一承载。
- 标准业务 CRUD 优先落在 RuoYi 管理端 / 业务表，FastAPI 不重复建设完整后台 CRUD 面。
- AI 运行配置域采用 `xm_ai_module`、`xm_ai_provider`、`xm_ai_resource`、`xm_ai_module_binding` 多表软关联，不建立物理外键；该域只允许管理员在 RuoYi 后台维护。
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

- `python -m pytest`
- `python -m pytest packages/fastapi-backend/tests/unit/test_epic10_ruoyi_xiaomai_module_assets.py`
- `mvn -pl ruoyi-modules/ruoyi-xiaomai -am test -DskipITs`
- `mvn -pl ruoyi-admin -am -DskipTests compile`

### Completion Notes List

- 已新增 `ruoyi-xiaomai` 模块聚合注册、`ruoyi-admin` 依赖接线和 `SpringDoc` 分组，保持 `RuoYi` 核心认证与权限框架不变。
- 已通过 `XmModuleBoundaryController`、`XmModuleBoundaryService` 和结构化文档冻结模块边界、资源规划、Generator / 手写查询策略及审计扩展点。
- 已新增 `20260328_xm_module_bootstrap.sql` 与 `20260328_xm_menu_permission.sql`，冻结小麦根菜单、模块规划菜单和 Epic 10 资源权限清单。
- 2026-04-07 补记：AI 运行配置域按管理员配置场景落地为 `module/provider/resource/binding` 多表软关联，不建立物理外键；后续 Generator / CRUD 仅承接后台配置，不把该域扩展成新的关系型强约束子系统。
- 已新增 Python 结构测试并跑通 `packages/fastapi-backend` 全量 `pytest`，结果为 `22 passed`。
- `ruoyi-xiaomai` 和 `ruoyi-admin` 的 Maven 编译链路已验证通过；当前仓库的 `surefire` 配置会编译测试类但未实际执行新增 JUnit 用例，后续如需 Java 侧执行断言需继续对齐该仓库测试筛选规则。

### File List

- `_bmad-output/implementation-artifacts/10-2-ruoyi-小麦业务模块与权限承接规则.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/01开发人员手册/004-开发规范/0102-RuoYi小麦模块与权限承接规则.md`
- `packages/RuoYi-Vue-Plus-5.X/pom.xml`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-admin/pom.xml`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-admin/src/main/resources/application.yml`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/pom.xml`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/pom.xml`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/constant/XmPermissionConstants.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/controller/admin/XmModuleBoundaryController.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/domain/bo/XmModuleResourceBo.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/domain/vo/XmModuleBoundaryVo.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/domain/vo/XmModuleResourceVo.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/service/IXmModuleBoundaryService.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/service/impl/XmModuleBoundaryServiceImpl.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/resources/mapper/xiaomai/README.md`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/test/java/org/dromara/xiaomai/service/XmModuleBoundaryServiceImplTest.java`
- `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260328_xm_module_bootstrap.sql`
- `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260328_xm_menu_permission.sql`
- `packages/fastapi-backend/tests/unit/test_epic10_ruoyi_xiaomai_module_assets.py`

## Change Log

- 2026-03-29：完成 `Story 10.2` 的 RuoYi 小麦业务模块骨架、权限承接规则、菜单 SQL、结构文档与测试资产。
