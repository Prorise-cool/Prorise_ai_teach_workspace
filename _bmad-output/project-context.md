---
project_name: '小麦 - AI 教学视频智能体'
user_name: 'Prorise'
date: '2026-04-03'
sections_completed:
  - 'technology_stack'
  - 'language_rules'
  - 'framework_rules'
  - 'testing_rules'
  - 'quality_rules'
  - 'workflow_rules'
  - 'anti_patterns'
existing_patterns_found: 20
status: 'complete'
rule_count: 46
optimized_for_llm: true
planning_context_entry: '_bmad-output/planning-artifacts/index.md'
runtime_workspaces:
  - 'packages/'
  - 'contracts/'
  - 'mocks/'
---

# AI 代理项目上下文

_本文件只保留 AI 代理最容易遗漏、但对当前仓库实现质量影响最大的规则。规划事实源以 `_bmad-output/` 为准；运行态实现面以 `packages/`、`contracts/`、`mocks/` 为准。_

---

## Technology Stack & Versions

- **规划入口**：`_bmad-output/planning-artifacts/index.md` 是当前工作流的规划入口；若导航文件与 `_bmad-output/` 冲突，一律以 `_bmad-output/` 为准。
- **实际开发面**：`packages/` 是主代码工作区；`contracts/` 是并行开发契约资产；`mocks/` 是前端独立开发与联调样本资产。`contracts/`、`mocks/` 虽未完整体现在规划入口，但已属于真实交付面。
- **Node / pnpm**：`Node >=20.19.0`，`pnpm >=10.5.0`。
- **学生端前端**：`React 19.2.4`、`Vite 6.4.1`、`TypeScript 5.9.3`、`Tailwind CSS 4.2.2`、`react-router-dom 7.13.2`、`@tanstack/react-query 5.95.2`、`zustand 5.0.12`、`react-hook-form 7.72.0`、`zod 4.3.6`、`Motion 12.27.5`、`Vitest 4.1.2`、`Storybook 8.6.14`、`MSW 2.12.14`。
- **学生端共享原语现状**：`packages/student-web/src/components/ui/` 已落地 `badge`、`button`、`card`、`checkbox`、`dialog`、`input`、`label`、`popover`、`tabs`、`textarea` 这批 `shadcn/ui + Radix UI` 风格原语；后续同职责交互默认优先复用，不再回退到页面散件实现。
- **功能后端**：`Python >=3.11`、`FastAPI >=0.115`、`uvicorn[standard] >=0.34`、`pydantic-settings >=2.7`、`dramatiq[redis] >=1.17`、`pytest >=8.3`、`httpx >=0.28`。
- **Java 管理后端基座**：`Java 21`、`Spring Boot 3.5.9`、`RuoYi-Vue-Plus 5.5.3`、`Sa-Token 1.44.0`、`MyBatis-Plus 3.5.16`、`Redisson 3.52.0`。
- **管理端前端基座**：`Vue 3.5.26`、`Vite 7.3.0`、`TypeScript 5.9.3`、`Naive UI 2.43.2`、`Pinia 3.0.4`、`Vue Router 4.6.4`。

## Critical Implementation Rules

### Language-Specific Rules

- 新业务前端代码优先落在 `packages/student-web/src/`；状态变复杂的页面优先拆成 `page + hooks + components + styles + schemas/shared`，不要继续堆单文件。
- 前端非 `mock`、非 `test` 源码文件必须带规范化文件头注释；函数、组件、hooks、工具函数必须带 `JSDoc`。
- import 必须分组：框架 / 第三方、项目内模块、相对路径、样式或资源；禁止无序混排。
- 代码标识符保持英文；注释、说明性文档字符串优先使用中文；命令、路径、日志与错误文本保持英文。
- 后端业务实现按 `app/features/*` 分域；跨域能力只放在 `app/core`、`app/infra`、`app/providers`、`app/shared`，不要把通用逻辑散落到 feature 内私有文件。
- `references/` 默认只读；借鉴外部实现时记录来源项目与许可证，禁止直接把业务代码写进 `references/`。

### Framework-Specific Rules

- `packages/student-web/src/styles/theme.css` 只承载全局设计令牌与 CSS Variables 桥接，不允许写页面、feature 或场景私有样式。
- 新增样式前优先复用现有 `--xm-*` 令牌、已有组件与现有视觉体系；不要重复硬编码颜色、字号、间距、圆角、阴影、层级、动效。
- feature 私有样式变量必须放在对应 `src/features/<feature>/styles/*.scss`，并挂在 feature 根选择器作用域下。
- 所有 class 合并统一走 `cn()`；可变体组件统一用 `CVA`；`Radix UI` / `@base-ui/react` 样式通过 `data-*` 状态和 Tailwind 落地，不直接拼接无约束类名。
- `Tailwind` 的主要职责是服务 `components/ui/` 共享原语、令牌消费与少量结构拼装；页面级复杂视觉默认由 feature `SCSS` 承接。
- `SCSS` 必须真实用于 `partials` 分包、BEM 命名与嵌套组织；仅把 `.css` 改名为 `.scss` 但继续平铺选择器，视为未落地。
- `student-web` 当前已明确采用 feature `SCSS` 分层：`auth/styles/login-page.scss + partials/`、`home/styles/entry-pages.scss + partials/`、`classroom/styles/classroom-input-page.scss`、`video/styles/video-input-page.scss`。
- 全局短反馈统一通过 `sonner` 落地，`FeedbackProvider` 只保留 `toast + spotlight + top loading bar` 三类反馈能力；旧 `feedback-viewport` 与手写 notice phase 队列已移除。
- `sonner` 只属于独立反馈依赖，不计入 `shadcn/ui` 原语层落地完成度；`shadcn/ui` 是否落地，以 `components/ui/` 下真实封装与页面消费为准。
- `app/` 只做 Provider、Router、Layout 和页面装配；业务实现优先沉淀到 `features/`，共享能力沉淀到 `components/`、`lib/`、`services/`、`stores/`。
- 页面容器只负责业务编排、路由参数、服务调用、会话写入与回跳；展示态、动画态、浮层态等非业务 `useState` 必须下沉。
- FastAPI 负责功能服务与 AI 编排；RuoYi 负责认证、RBAC、标准业务持久化、后台 CRUD。不要在 FastAPI 侧重建一套平行业务后台真值。
- Redis 只承担运行态状态，如 Token 在线态、任务状态、事件缓存、会话临时上下文；长期业务数据必须进入 RuoYi / MySQL 或 COS。
- Classroom Engine 与 Video Engine 可以共享基础设施，但生成链路保持独立；不要把两条流水线硬合并成一个“大一统”实现。

### Testing Rules

- 公共函数、契约适配器、路由守卫和运行态分支必须测试边界与失败路径，不能只测 happy path。
- 只要改动认证、注册开关、路由守卫、`returnTo`、`zustand persist/localStorage`、验证码、第三方登录入口这类“运行态 + 持久化 + 导航”耦合逻辑，必须补一轮真实浏览器验证。
- `student-web` 本地浏览器验证统一以 `http://127.0.0.1:5173` 为准，不要混用 `localhost` 造成会话误判。
- 只要需求包含“应该跳到哪里”，测试必须至少一条直接断言 `pathname` / `search`，不能只看页面文案。
- 运行态耦合场景不能只靠 `mock`、`MemoryRouter` 或纯文本断言宣布完成；进入联调、自测或修 bug 时必须做真实运行态验证。
- 任务状态、SSE 事件、认证会话等语义一旦变化，`contracts/` 与 `mocks/` 必须同步更新。
- Mock 资产必须覆盖成功态与失败态；长任务类域还必须覆盖处理中、快照 / 恢复态、空态或降级态。

### Code Quality & Style Rules

- 遵守 Monorepo 边界：学生侧业务代码在 `student-web/`，功能服务在 `fastapi-backend/`，管理域整合在 `RuoYi-Vue-Plus-5.X/` 与 `ruoyi-plus-soybean/`。
- 优先复用现有模式，不重复发明后台结构、权限标识、组件变体与令牌体系；RuoYi Generator、权限注解、现有组件与目录组织都优先沿用。
- 前端基础设施依赖一旦已在架构文档中确认且已写入 `package.json`，对应场景必须优先消费真实依赖，不得长期保留同职责手写替代实现。
- 维持单一职责、DRY、YAGNI；优先无惊喜的“无聊方案”，避免为未来假设提前抽象。
- 还原设计稿时，视觉尽量一比一，但实现层必须同时满足组件复用、令牌复用、状态分层和可维护性。
- 开发总结、排查结论、实现说明与维护记录统一沉淀到 `docs/01开发人员手册/`，不要把过程文档散落到其他位置。

### Development Workflow Rules

- 当前工作流的规划事实入口从 `_bmad-output/planning-artifacts/index.md` 开始；需要展开细节时再顺着其分片索引进入 `architecture/`、`epics/`、`prd/`、`ux-design-specification/`。
- 运行态真实实现面必须同时看 `packages/`、`contracts/`、`mocks/`；不要因为规划入口未完整列出，就忽略契约与 mock 资产。
- `student-web` 前端依赖消费、`SCSS` 分层与样式职责边界，优先参考 `docs/01开发人员手册/004-开发规范/0010-student-web-前端依赖落地与-scss-分层规范.md`；若项目级规范与根级约束冲突，以根目录 `AGENTS.md` 为准。
- 默认交付路径是 `Issue -> branch -> Draft PR -> review -> squash merge`；不要停留在“代码改完”。
- 创建 PR 前必须完成自测、联调、运行态验证与文档回写，并给出可点击、可验证的验收入口。
- 基于 BMAD Story 开发时，收口前必须回写 Story 状态、任务勾选、`Dev Agent Record`、`File List`、`Change Log`，并更新 `_bmad-output/implementation-artifacts/sprint-status.yaml`。
- 只 stage 当前任务直接产出的文件；遇到与现有未提交改动冲突时，停止并报告，不覆盖其他正在进行的工作。

### Critical Don't-Miss Rules

- 认证真值来自 RuoYi 的真实配置与真实响应，不来自设计稿，也不来自前端 mock 假设。
- Frontend Story 默认必须参考 `docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/`，但设计稿不能覆盖 Epic / PRD / UX 已冻结的业务语义。
- 小麦学生端坚持单一品牌风格；Agent 差异只允许作为局部点缀数据，不允许演化成页面级主题切换。
- 不要再把 `sonner` 当成 `shadcn/ui` 落地证据；两者职责不同，前者解决全局短反馈，后者负责共享交互原语层。
- 不要在 `student-web` 回退到超长单文件页面样式；复杂页面样式必须留在 feature `SCSS` 入口和 `partials` 体系中维护。
- `contracts/` 是一等交付资产：契约采用 `x.y.z` 版本语义；破坏性变更必须新建 `v{major}/`；`schema`、示例、变更记录必须一起更新。
- 错误码是稳定契约资产：使用全大写下划线、业务域前缀，且必须伴随失败示例 payload 与影响说明发布。
- `mocks/` 禁止引入契约未定义字段；需要新增字段时，先改契约，再改 mock。
- 认证跳转不要把 `setTimeout`、白屏 `return null`、纯动画等待当成主控制流；应使用确定性导航逻辑，并给出明确过渡反馈。
- 临时排查脚本、抓包脚本、浏览器复现脚本必须使用 `.tmp-*` 明显临时命名，并在任务收口前删除。

---

## Usage Guidelines

**For AI Agents:**

- 先从 `_bmad-output/planning-artifacts/index.md` 建立规划上下文，再回到 `packages/`、`contracts/`、`mocks/` 对齐真实实现面。
- 在修改架构、契约、认证、路由、任务状态、SSE、样式令牌前，先读本文件。
- 如果规划说明与运行态现状看起来不一致，规划真值以 `_bmad-output/` 为准，运行态现状以当前代码树为准，再判断需要补文档还是补实现。
- 只要变更影响接口、会话、任务状态或前端状态机，默认假设代码、契约、mock、测试和文档都可能要一起改。

**For Humans:**

- 当技术栈版本、Monorepo 边界、契约版本规则、认证验证规则发生变化时，及时更新本文件。
- 保持精简，只保留 AI 代理最容易遗漏的约束。
- 如果 `contracts/` 或 `mocks/` 新增业务域，除了补各自 README，也要同步更新本文件，避免代理漏看。

Last Updated: 2026-04-03
