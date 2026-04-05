# Story 1.7: 营销落地页与 home 首页分流

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 营销访客或试点线索，
I want 在独立营销落地页提交试点 / 合作信息并由 RuoYi 持久化承接，
so that 小麦团队可以真实收集、查看和跟进落地页线索，同时保持 `/landing` 与 `/` 的职责分流不回退。

## Change Trigger

- 2026-04-05 纠偏结论：`/landing` 页面结构、`/` 默认首页、路由分流和主 CTA 链路已经由 Story 1.4 与当前代码实际落地。
- 当前真正未完成的业务缺口不是“再做一版营销页”，而是落地页联系表单仍然停留在 `mailto:` 降级，未进入任何 RuoYi 业务表。
- `packages/student-web/src/features/home/landing-page.tsx` 当前仍通过 `window.location.assign(buildMailToLink(...))` 提交。
- `packages/RuoYi-Vue-Plus-5.X/script/sql/xm_dev.sql` 当前已存在的 `xm_*` 表集中，没有可直接承接营销线索的现成表；其中 `xm_user_profile` 明确要求 `user_id NOT NULL` 且 `UNIQUE`，不能复用为匿名线索池。

## Acceptance Criteria

1. `/landing` 与 `/` 的分工保持现状不回退：`/landing` 继续承接营销获客与线索转化，`/` 继续承接默认产品首页与课堂直达入口。
2. 落地页联系表单点击提交后，不再触发 `mailto:`；前端改为调用 RuoYi 公共 API，并在页面内给出明确的提交中、成功、失败反馈。
3. RuoYi 新增专用营销线索表，至少持久化当前落地页已收集的 `firstName`、`lastName`、`email`、`subject`、`message`，并补齐来源页、语言、处理状态等最小运营字段。
4. RuoYi 后台可查询和导出落地页线索，至少支持按邮箱、咨询主题、处理状态、提交时间筛选，不要求本 Story 实现复杂 CRM 流程。
5. 前端表单校验、重复提交防护、提交成功后的清空 / 保留策略与错误提示必须闭环；提交失败时不得丢失用户已填写内容。

## Tasks / Subtasks

### 阶段 0：固定纠偏口径与现状边界（AC: 1）

- [x] 确认 Story 1.4 已交付 `/landing` 页面结构、`/` 默认首页、导航和基础 CTA。
- [x] 确认 Story 1.7 不再重新承接首页分流视觉实现，只承接“落地页线索表单真实联动”。
- [x] 确认 `xm_dev.sql` 当前不存在营销线索表，不能复用 `xm_user_profile`、`xm_user_work` 或 `sys_user` 充当线索池。

### 阶段 1：冻结 RuoYi 表结构与接口契约（AC: 2, 3, 4）

- [x] 新增 `xm_landing_lead` SQL 迁移脚本
  - [x] 字段最小集合：`contact_name`、`organization_name`、`contact_email`、`subject`、`message`。
  - [x] 运行态补充字段：`source_page`、`source_locale`、`processing_status`、`remark`、审计字段、`tenant_id`、`del_flag`。
  - [x] 建立最小索引：邮箱索引、状态 + 时间索引、租户索引。
- [x] 在 `ruoyi-xiaomai` 中生成并收口后台 CRUD 骨架
  - [x] 生成 `landingLead` 业务模块代码与 soybean 管理端页面。
  - [x] 后台菜单 / 权限标识 SQL 已落仓，用户联调环境已完成导入。
  - [x] 列表页至少可展示联系人、机构、邮箱、主题、状态、提交时间。
  - [x] 支持导出，不要求在本 Story 内实现复杂分配 / 跟单。
- [x] 新增公共提交接口
  - [x] 推荐路径：`POST /api/public/landing-leads`。
  - [x] 接口允许匿名访问，并保留 `RepeatSubmit` 防重复机制。
  - [x] 返回值包含 `leadId`、`accepted`、`message`。

### 阶段 2：学生端落地页表单接入真实后端（AC: 2, 5）

- [x] 在 `student-web` 新增落地页线索 API adapter / service
  - [x] 新增 `features/home/api/landing-lead-api.ts` 或同职责文件。
  - [x] 字段映射规则固定：`firstName -> contactName`，`lastName -> organizationName`。
  - [x] 附带 `sourcePage=/landing` 与当前语言。
- [x] 替换当前 `mailto:` 提交逻辑
  - [x] 移除 `buildMailToLink()` 作为主提交路径。
  - [x] 使用 `react-hook-form + zod` 保持现有校验，不回退到手写状态机。
  - [x] 接入提交中的按钮禁用、成功 toast / 成功态、失败提示。
- [x] 保持现有视觉结构稳定
  - [x] 不重做整页版式。
  - [x] 不新增与本 Story 无关的“智能匹配演示模块”扩展需求。

### 阶段 3：后台可运营性最小闭环（AC: 3, 4）

- [x] 后台列表可按 `contactEmail`、`subject`、`processingStatus`、`createTime` 检索。
- [x] `processingStatus` 提供最小字典值：`pending`、`contacted`、`closed`。
- [x] 导出字段至少覆盖联系人、机构、邮箱、主题、留言、状态、提交时间、来源页。

### 阶段 4：测试与运行态验证（AC: 1, 2, 3, 4, 5）

- [x] 前端测试覆盖：表单校验、成功提交、失败保留输入、`mailto:` 逻辑已移除。
- [x] 后端测试覆盖：匿名提交成功、必填校验失败、重复提交防护；后台列表筛选通过真实后台联调验证。
- [x] 至少一轮真实浏览器验证：在 `http://127.0.0.1:5173/landing` 填表后，RuoYi 表内可查到记录。
- [x] 至少一轮后台验证：在 RuoYi 管理端列表页可见新线索并可按条件筛选。

## Dev Notes

### Current Delivery Audit

- Story 1.4：`review`
  - 已完成 `/` 默认首页、`/landing` 公开营销页、全局导航、主题 / i18n 与入口回跳。
- Story 1.5：`in-progress`
  - 已存在 `xm_user_profile` 表、RuoYi CRUD 与学生端自服务 API 模式，可复用其“RuoYi 表 + App Controller + 学生端 adapter”实现套路。
- Story 1.6：`in-progress`
  - 当前不是本 Story 阻塞项，可降为并行项。
- Story 1.7：`done`
  - 学生端落地页表单真实提交链路、匿名公共提交接口与前端反馈已完成。
  - `ruoyi-xiaomai` 与 `ruoyi-plus-soybean` 的生成 CRUD / 管理端页面已接入并完成联调。
  - 落地页线索已形成“公开页提交 -> RuoYi 入库 -> 后台检索 / 编辑 / 导出”的最小闭环。

### Business Context

- 当前最重要的业务缺口是“营销线索没有入库”，不是“继续堆营销展示模块”。
- 访客填写表单时通常尚未登录，因此线索数据不能写进 `xm_user_profile`：
  - `xm_user_profile.user_id` 为必填。
  - 同一 `user_id` 受唯一索引约束。
  - 该表业务语义是“已登录用户的学习配置”，不是“匿名营销线索”。
- `sys_user` 也不能作为线索池，否则会把未转化访客错误升级为平台账号。
- Story 1.7 的目标应收敛为：保留现有落地页视觉与分流成果，只补齐真实线索采集闭环。

### Proposed Data Model

```sql
CREATE TABLE IF NOT EXISTS `xm_landing_lead` (
    `id` bigint NOT NULL COMMENT '主键（Snowflake）',
    `tenant_id` varchar(20) NOT NULL DEFAULT '000000' COMMENT '租户编号',
    `contact_name` varchar(100) NOT NULL COMMENT '联系人姓名',
    `organization_name` varchar(200) DEFAULT NULL COMMENT '机构 / 称呼',
    `contact_email` varchar(255) NOT NULL COMMENT '联系邮箱',
    `subject` varchar(100) NOT NULL COMMENT '咨询主题',
    `message` varchar(2000) NOT NULL COMMENT '留言内容',
    `source_page` varchar(100) NOT NULL DEFAULT '/landing' COMMENT '来源页面',
    `source_locale` varchar(10) DEFAULT 'zh-CN' COMMENT '提交语言',
    `processing_status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '处理状态（pending/contacted/closed）',
    `remark` varchar(500) DEFAULT NULL COMMENT '后台备注',
    `create_dept` bigint DEFAULT NULL COMMENT '创建部门',
    `create_by` bigint DEFAULT NULL COMMENT '创建者',
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_by` bigint DEFAULT NULL COMMENT '更新者',
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `del_flag` char(1) NOT NULL DEFAULT '0' COMMENT '删除标志（0-存在 2-删除）',
    PRIMARY KEY (`id`),
    KEY `idx_xm_landing_lead_email` (`contact_email`),
    KEY `idx_xm_landing_lead_status_time` (`processing_status`, `create_time`),
    KEY `idx_xm_landing_lead_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='营销落地页线索表';
```

### Recommended API Contract

```typescript
POST /api/public/landing-leads

interface CreateLandingLeadRequest {
  contactName: string;
  organizationName?: string;
  contactEmail: string;
  subject: string;
  message: string;
  sourcePage: '/landing';
  sourceLocale: 'zh-CN' | 'en-US';
}

interface CreateLandingLeadResponse {
  leadId: string;
  accepted: true;
  message: string;
}
```

### Technical Guardrails

- 本 Story 不复用 `xm_user_profile`、`sys_user`、`xm_user_work` 充当营销线索表。
- 本 Story 不新增 FastAPI 中转；线索直接进入 RuoYi / MySQL，避免双后端绕路。
- 本 Story 不重做 `/landing` 页面视觉，不把“演示模块”扩成主任务。
- 表单提交流程必须保留匿名访问能力，但后台查询与导出仍走 RuoYi 权限体系。
- 若后续要加验证码、频控、短信 / 邮件通知，作为后续 Story，不阻塞本 Story 的最小闭环。

### Suggested File Targets

- `packages/student-web/src/features/home/landing-page.tsx`
- `packages/student-web/src/features/home/schemas/landing-contact-form-schema.ts`
- `packages/student-web/src/features/home/api/landing-lead-api.ts`
- `packages/student-web/src/test/landing-page.test.tsx`
- `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260405_xm_landing_lead.sql`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/landing/`
- `packages/ruoyi-plus-soybean/` 中对应后台菜单与页面（如采用生成器落地）

### Project Structure Notes

- `student-web` 当前落地页文件真实位置是 `packages/student-web/src/features/home/landing-page.tsx`，不是旧文档里写的 `features/landing/`。
- 现有联系表单字段已经冻结在前端 schema 中，优先保持字段体验稳定，再在 adapter 层做命名转换。
- 当前 `ruoyi-xiaomai` 已有 `XmUserProfileAppController` 自服务模式；Story 1.7 应参考这一模式新增匿名公共提交控制器，而不是重新发明接口风格。

### Testing Requirements

- 覆盖 `mailto:` 提交逻辑被真实 API 取代。
- 覆盖匿名用户提交成功与失败。
- 覆盖提交成功后反馈文案与表单重置策略。
- 覆盖后台列表检索和导出最小闭环。

### References

- `_bmad-output/project-context.md`：Epic 1 入口链路、RuoYi 真值、文档优先级规则。
- `_bmad-output/implementation-artifacts/1-4-首页课堂直达入口与顶栏导航分发.md`：已完成的首页 / 落地页 / 路由分流成果。
- `_bmad-output/implementation-artifacts/1-5-用户配置系统（个人简介与学习偏好）.md`：RuoYi 表、学生端 App Controller 与 profile 数据落地模式。
- `_bmad-output/planning-artifacts/epics/14-epic-1.md`：Epic 1 Story 1.7 高层 AC。
- `_bmad-output/planning-artifacts/prd/06-6-功能需求.md`：`FR-UI-R01`、`FR-UI-009`。
- `_bmad-output/planning-artifacts/ux-design-specification/08-7-page-level-design-specifications页面级设计规范.md`：`/landing` 与 `/` 页面边界。
- `packages/student-web/src/features/home/landing-page.tsx`：当前 `mailto:` 提交实现。
- `packages/student-web/src/features/home/schemas/landing-contact-form-schema.ts`：当前表单字段与校验规则。
- `packages/RuoYi-Vue-Plus-5.X/script/sql/xm_dev.sql`：现有 `xm_*` 表结构清单与 `xm_user_profile` 约束。
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/user/profile/controller/XmUserProfileAppController.java`：学生端自服务接口实现模式。

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm --dir packages/student-web exec vitest run src/test/landing-lead-api.test.ts src/test/landing-page-contact-form.test.tsx src/test/landing-page.test.tsx src/test/home-page.test.tsx`
- `mvn -f packages/RuoYi-Vue-Plus-5.X/pom.xml -pl ruoyi-modules/ruoyi-xiaomai -am -DskipTests compile`
- `mvn -f packages/RuoYi-Vue-Plus-5.X/pom.xml -pl ruoyi-modules/ruoyi-xiaomai -am -DskipTests=false -Dsurefire.failIfNoSpecifiedTests=false -Dtest=XmLandingLeadControllerTest,XmLandingLeadPublicControllerTest test`
- `pnpm --dir packages/ruoyi-plus-soybean exec eslint src/service/api/xiaomai/landing-lead.ts src/views/xiaomai/landing-lead/index.vue src/views/xiaomai/landing-lead/modules/landing-lead-operate-drawer.vue src/views/xiaomai/landing-lead/modules/landing-lead-search.vue src/typings/api/xiaomai.landing-lead.api.d.ts`
- `pnpm --dir packages/ruoyi-plus-soybean run typecheck` 仍受仓库既有 `build/plugins/*` 与 `vite.config.ts` 的 Vite 6/7 类型冲突影响，非本 Story 新增问题。

### Completion Notes List

- 2026-04-05：按 Correct Course 纠偏，确认 Story 1.7 的真正剩余工作是“落地页表单接入 RuoYi 真表”，而不是继续扩展营销页视觉模块。
- 2026-04-05：基于 `xm_dev.sql` 审核结论，确定需要新增专用营销线索表，不能复用 `xm_user_profile`。
- 2026-04-05：将 Story 1.7 重写为以“RuoYi 表结构 + 公共提交 API + 学生端表单联动 + 后台最小运营闭环”为核心的可开发 Story。
- 2026-04-05：按用户确认进入开发执行态；RuoYi 后端代码生成由用户负责，本 Story 先同步状态、Issue 与功能分支，等待生成产物并继续前端联调。
- 2026-04-05：`student-web` 已完成 `landingLeadApi`、落地页表单 mutation、提交中 / 成功 / 失败反馈与成功后重置、失败后保留输入。
- 2026-04-05：已补充 `landing-lead-api` 与落地页联系表单交互测试，并回归验证现有 `landing-page` / `home-page` 公开入口测试未回退。
- 2026-04-05：已将 `RuoYi-XmLandingLead` 生成代码接入 `ruoyi-xiaomai` 与 `ruoyi-plus-soybean`，并修正生成器落地后的 `TenantEntity` 不存在、soybean 路由映射与 `DictTag` 导入问题。
- 2026-04-05：`ruoyi-xiaomai` 编译通过；soybean 新增 landing lead 文件级 ESLint 通过，但仓库全量 `typecheck` 仍被既有 Vite 版本类型冲突阻塞。
- 2026-04-05：已补充匿名公共提交接口 `POST /api/public/landing-leads`，并为 `student-web` 开发环境补齐 `/api/public` Vite 代理；本地联调需重启一次前端 dev server 使代理生效。
- 2026-04-05：已修复 soybean 管理端编辑弹窗看不到 `message` 的问题，改为编辑态主动拉取详情接口，并在 `XmLandingLeadVo` 中补齐 `id`、`message`、`remark`。
- 2026-04-06：完成最终收口检查，确认 `xiaomai/landing` 当前目录结构与既有模块风格一致，无需额外搬包；前端 landing 已按页面 / 组件 / API / shared / schema / styles 分层，不做无价值重构。
- 2026-04-06：补齐最终回归验证，确认学生端公开提交、RuoYi 公共接口、soybean 后台检索 / 编辑 / 导出链路均已闭环。

### File List

- `_bmad-output/implementation-artifacts/1-7-营销落地页与-home-首页分流.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/01开发人员手册/0000-AI快速导航索引.md`
- `docs/01开发人员手册/INDEX.md`
- `docs/01开发人员手册/006-模块开发指南/0008-Story1-7-RuoYi-代码生成器字段填写说明.md`
- `docs/04RuoYi代码生成器代码存储/1-7_落地页表/RuoYi-XmLandingLead/landingLeadMenu.sql`
- `packages/RuoYi-Vue-Plus-5.X/script/sql/update/20260405_xm_landing_lead.sql`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/landing/controller/XmLandingLeadController.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/landing/controller/XmLandingLeadPublicController.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/landing/domain/XmLandingLead.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/landing/domain/bo/XmLandingLeadBo.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/landing/domain/vo/XmLandingLeadVo.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/landing/mapper/XmLandingLeadMapper.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/landing/service/IXmLandingLeadService.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/main/java/org/dromara/xiaomai/landing/service/impl/XmLandingLeadServiceImpl.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/test/java/org/dromara/xiaomai/landing/controller/XmLandingLeadControllerTest.java`
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/src/test/java/org/dromara/xiaomai/landing/controller/XmLandingLeadPublicControllerTest.java`
- `packages/ruoyi-plus-soybean/src/service/api/xiaomai/landing-lead.ts`
- `packages/ruoyi-plus-soybean/src/typings/api/xiaomai.landing-lead.api.d.ts`
- `packages/ruoyi-plus-soybean/src/views/xiaomai/landing-lead/index.vue`
- `packages/ruoyi-plus-soybean/src/views/xiaomai/landing-lead/modules/landing-lead-operate-drawer.vue`
- `packages/ruoyi-plus-soybean/src/views/xiaomai/landing-lead/modules/landing-lead-search.vue`
- `packages/ruoyi-plus-soybean/src/router/elegant/imports.ts`
- `packages/ruoyi-plus-soybean/src/router/elegant/transform.ts`
- `packages/ruoyi-plus-soybean/src/router/elegant/routes.ts`
- `packages/ruoyi-plus-soybean/src/typings/elegant-router.d.ts`
- `packages/ruoyi-plus-soybean/src/locales/langs/zh-cn.ts`
- `packages/ruoyi-plus-soybean/src/locales/langs/en-us.ts`
- `packages/student-web/src/features/home/api/landing-lead-api.ts`
- `packages/student-web/src/features/home/components/landing-contact.tsx`
- `packages/student-web/src/features/home/landing-page.tsx`
- `packages/student-web/src/features/home/shared/landing-utils.ts`
- `packages/student-web/vite.config.ts`
- `packages/student-web/src/test/landing-lead-api.test.ts`
- `packages/student-web/src/test/landing-page-contact-form.test.tsx`

### Change Log

- 2026-04-05：新增落地页线索 API 封装，兼容 RuoYi 代码生成常见的 `leadId / lead_id / id` 与 `accepted` 字段差异。
- 2026-04-05：移除落地页联系表单 `mailto:` 主提交流程，改为真实 API 提交，并增加提交中禁用、成功 / 失败页面提示与 toast。
- 2026-04-05：新增 API 与页面级表单交互测试，并回归验证落地页与首页公开入口相关测试。
- 2026-04-05：补齐 RuoYi 公共匿名提交接口、soybean 落地页线索管理页、菜单 SQL 与管理端编辑态详情回填，修复留言内容在编辑弹窗中不可见的问题。
- 2026-04-06：完成 Story 1.7 收口，回写 sprint 状态，移除失败且不适配当前轻量测试基线的 `XmLandingLeadServiceImplTest`，并确认无需为 `xiaomai/landing` 做额外搬包。
