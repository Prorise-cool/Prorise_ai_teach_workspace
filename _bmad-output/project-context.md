---
project_name: '小麦 - AI 教学视频智能体'
user_name: 'Prorise'
date: '2026-04-06'
sections_completed:
  - 'technology_stack'
  - 'language_rules'
  - 'framework_rules'
  - 'testing_rules'
  - 'quality_rules'
  - 'workflow_rules'
  - 'anti_patterns'
existing_patterns_found: 24
status: 'complete'
rule_count: 64
optimized_for_llm: true
planning_context_entry: '_bmad-output/INDEX.md'
runtime_workspaces:
  - 'packages/'
  - 'contracts/'
  - 'mocks/'
---

# AI 代理项目上下文

_本文件只保留 AI 代理最容易遗漏、但对当前仓库实现质量影响最大的规则。规划事实源以 `_bmad-output/` 为准；运行态实现面以 `packages/`、`contracts/`、`mocks/` 为准。_

---

## Technology Stack & Versions

- **BMAD 事实源总入口**：`_bmad-output/INDEX.md`。规划细节再顺着 `_bmad-output/planning-artifacts/index.md` 下钻；若导航文件、归档文档或旧 Story 与 `_bmad-output/` 当前内容冲突，以 `_bmad-output/` 当前文件树为准。
- **运行态实现面**：`packages/`、`contracts/`、`mocks/` 共同构成真实实现上下文；涉及接口、任务状态、SSE、认证或前端状态机时，不能只看规划文档。
- **Node / pnpm**：`Node >=20.19.0`，`pnpm >=10.5.0`。
- **学生端前端**：`React 19.2.4`、`Vite 6.4.1`、`TypeScript 5.9.3`、`Tailwind CSS 4.2.2`、`react-router-dom 7.13.2`、`@tanstack/react-query 5.95.2`、`zustand 5.0.12`、`react-hook-form 7.72.0`、`zod 4.3.6`、`Motion 12.27.5`、`Vitest 4.1.2`、`Storybook 8.6.14`、`MSW 2.12.14`。
- **学生端共享原语现状**：`packages/student-web/src/components/ui/` 已落地 `badge`、`button`、`card`、`checkbox`、`dialog`、`input`、`label`、`popover`、`tabs`、`textarea` 十个共享原语，同职责交互默认优先复用。
- **学生端业务域现状**：`auth`、`home`、`classroom`、`video` 之外，`profile` 已是已落地业务域，包含 `api / hooks / pages / schemas / shared / stores / styles` 分层。
- **功能后端**：`Python >=3.11`、`FastAPI >=0.115`、`uvicorn[standard] >=0.34`、`pydantic-settings >=2.7`、`dramatiq[redis] >=1.17`、`pytest >=8.3`、`httpx >=0.28`。
- **功能后端架构现状**：`packages/fastapi-backend/app/` 已按 `core / infra / providers / features / shared` 分层；任务运行态、SSE 与 Provider 工厂已进入真实契约和测试覆盖阶段，不要按“仅骨架”处理。
- **Java 管理后端基座**：`Java 21`、`Spring Boot 3.5.9`、`RuoYi-Vue-Plus 5.5.3`、`Sa-Token 1.44.0`、`MyBatis-Plus 3.5.16`、`Redisson 3.52.0`。
- **管理端前端基座**：`Vue 3.5.26`、`Vite 7.3.0`、`TypeScript 5.9.3`、`Naive UI 2.43.2`、`Pinia 3.0.4`、`Vue Router 4.6.4`。
- **近期语义漂移提醒**：自 `2026-04-04` 起，Story 1.5 的真实语义已从“老师风格选择”修正为“用户配置系统（个人简介与学习偏好）”；任何引用旧说法的文档或实现推断都应视为过时。

## Current Delivery Snapshot

- **当前 Epic 状态快照**：截至 `2026-04-06`，`Epic 0 / 1 / 2 / 10` 已完成，`Epic 3 / 4 / 5` 进行中，`Epic 6+` 仍处于 `backlog`。
- **当前视频主链路进度**：`Story 3.5` 已完成，视频创建成功后跳转等待页、SSE 状态消费、刷新恢复、失败重试与 mock 恢复 404 修复都已进入 `master`；不要再按“等待页未完成”处理。
- **近期已合并基线**：`PR #109` 收敛 `fastapi-backend` 结构边界，`PR #110` 收敛共享壳层并实现视频等待页主链路，`PR #111` 修复 mock 视频等待页动态 `taskId` 恢复 404；这些变更都已是默认基线，而不是功能分支特例。
- **当前进度导航入口**：开发过程进度、验收清单与阶段收口优先查看 `docs/01开发人员手册/009-里程碑与进度/index.md`；Story 真值与状态真值仍以 `_bmad-output/implementation-artifacts/index.md` 和 `sprint-status.yaml` 为准。
- **当前分支判断规则**：若本地工作区出现未跟踪过程文档或草稿，不自动把它们视为仓库事实；仓库事实仍以已纳入版本管理的 `_bmad-output/`、`docs/`、`packages/`、`contracts/`、`mocks/` 为准。

## Critical Implementation Rules

### Language-Specific Rules

- 新业务前端代码优先落在 `packages/student-web/src/`；状态变复杂的页面优先拆成 `page + hooks + components + styles + schemas/shared`，不要继续堆单文件。
- 前端非 `mock`、非 `test` 源码文件必须带规范化文件头注释；函数、组件、hooks、工具函数必须带 `JSDoc`。
- import 必须分组：框架 / 第三方、项目内模块、相对路径、样式或资源；禁止无序混排。
- 代码标识符保持英文；注释、说明性文档字符串优先使用中文；命令、路径、日志与错误文本保持英文。
- `profile` 域的路径常量、Storage Key、语言默认值、性格类型与导师标签枚举统一来自 `packages/student-web/src/features/profile/types.ts`；不要在页面、表单或 mock 中再写第二套常量。
- 前端与 RuoYi 的 `snake_case` / `camelCase`、Envelope 解包、fallback 降级逻辑只允许收敛在 API adapter / API service 层，不要把字段映射散落到页面组件。
- 后端业务实现按 `app/features/*` 分域；跨域能力只放在 `app/core`、`app/infra`、`app/providers`、`app/shared`，不要把通用逻辑散落到 feature 内私有文件。
- `references/` 默认只读；借鉴外部实现时记录来源项目与许可证，禁止直接把业务代码写进 `references/`。

### Framework-Specific Rules

- `packages/student-web/src/styles/theme.css` 只承载全局设计令牌与 CSS Variables 桥接，不允许写页面、feature 或场景私有样式。
- 新增样式前优先复用现有 `--xm-*` 令牌、已有组件与现有视觉体系；不要重复硬编码颜色、字号、间距、圆角、阴影、层级、动效。
- feature 私有样式变量必须放在对应 `src/features/<feature>/styles/*.scss`，并挂在 feature 根选择器作用域下。
- 所有 class 合并统一走 `cn()`；可变体组件统一用 `CVA`；`Radix UI` / `@base-ui/react` 样式通过 `data-*` 状态和 Tailwind 落地，不直接拼接无约束类名。
- `Tailwind` 的主要职责是服务 `components/ui/` 共享原语、令牌消费与少量结构拼装；页面级复杂视觉默认由 feature `SCSS` 承接。
- `SCSS` 必须真实用于 `partials` 分包、BEM 命名与嵌套组织；仅把 `.css` 改名为 `.scss` 但继续平铺选择器，视为未落地。
- `student-web` 当前已明确采用 feature `SCSS` 分层：`auth/styles/login-page.scss + partials/`、`home/styles/entry-pages.scss + partials/`、`profile/styles/profile-onboarding.scss + partials/`、`classroom/styles/classroom-input-page.scss`、`video/styles/video-input-page.scss`。
- 全局短反馈统一通过 `sonner` 落地，`FeedbackProvider` 只保留 `toast + spotlight + top loading bar` 三类反馈能力；旧 `feedback-viewport` 与手写 notice phase 队列已移除。
- `sonner` 只属于独立反馈依赖，不计入 `shadcn/ui` 原语层落地完成度；`shadcn/ui` 是否落地，以 `components/ui/` 下真实封装与页面消费为准。
- `app/` 只做 Provider、Router、Layout 和页面装配；业务实现优先沉淀到 `features/`，共享能力沉淀到 `components/`、`lib/`、`services/`、`stores/`。
- `profile` onboarding 的回跳拼接、归一化和路径判断统一走 `packages/student-web/src/features/profile/shared/profile-routing.ts`；不要在登录页、callback 页和 profile 页面各自手写 `returnTo`。
- `profile` 数据读写统一走 `packages/student-web/src/features/profile/api/profile-api.ts` 的 real / local fallback API；页面只关心状态与动作，不直接拼接接口或自己处理降级逻辑。
- `profile` 查询和提交动作统一走 `react-query + zustand` 组合；不要回退成页面级 `useState + useEffect + fetch` 的临时状态机。
- `student-web` 的 SSE transport 必须优先复用已装的 `eventsource-parser` 与统一 `services/sse` 入口，不再长期维护分散在页面内的手写文本解析器。
- FastAPI 负责功能服务与 AI 编排；RuoYi 负责认证、RBAC、标准业务持久化、后台 CRUD。不要在 FastAPI 侧重建一套平行业务后台真值。
- Redis 只承担运行态状态，如 Token 在线态、任务状态、事件缓存、会话临时上下文；长期业务数据必须进入 RuoYi / MySQL 或 COS。
- `ruoyi-xiaomai` 已承接小麦后台业务模块；新增小麦管理域能力优先进入 `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/`，不要散落回 `ruoyi-system` 或临时模块。
- Classroom Engine 与 Video Engine 可以共享基础设施，但生成链路保持独立；不要把两条流水线硬合并成一个“大一统”实现。

### Testing Rules

- 公共函数、契约适配器、路由守卫和运行态分支必须测试边界与失败路径，不能只测 happy path。
- 只要改动认证、注册开关、路由守卫、`returnTo`、`zustand persist/localStorage`、验证码、第三方登录入口这类“运行态 + 持久化 + 导航”耦合逻辑，必须补一轮真实浏览器验证。
- `student-web` 本地浏览器验证统一以 `http://127.0.0.1:5173` 为准，不要混用 `localhost` 造成会话误判。
- 只要需求包含“应该跳到哪里”，测试必须至少一条直接断言 `pathname` / `search`，不能只看页面文案。
- `profile` onboarding 的简介页、偏好页、导览页、跳过逻辑和登录后回跳都属于回归重点；改动这一链路时，至少补 route 结果断言、持久化断言与真实运行态验证。
- Mock 模式与真实模式必须共用同一套 `profile` / task 数据模型；禁止出现“local fallback 一套字段，真实接口另一套字段”的双轨漂移。
- 任务状态、SSE 事件、认证会话等语义一旦变化，`contracts/` 与 `mocks/` 必须同步更新；前端 parser、后端 broker 与契约测试要围绕同一组 payload 共同校验。
- Mock 资产必须覆盖成功态与失败态；长任务类域还必须覆盖处理中、快照 / 恢复态、空态或降级态。
- 任何涉及 SSE 的变更都必须至少覆盖八类公开事件、`id / sequence / Last-Event-ID` 语义，以及未知事件容错路径。

### Code Quality & Style Rules

- 遵守 Monorepo 边界：学生侧业务代码在 `student-web/`，功能服务在 `fastapi-backend/`，管理域整合在 `RuoYi-Vue-Plus-5.X/` 与 `ruoyi-plus-soybean/`。
- 优先复用现有模式，不重复发明后台结构、权限标识、组件变体与令牌体系；RuoYi Generator、权限注解、现有组件与目录组织都优先沿用。
- RuoYi Generator 产出的代码只能视为 CRUD 骨架；涉及 `userName / nickName` 关联展示、JSON 字段回显、头像 URL 展示、字典桥接、数据权限与业务校验时，必须补手工收口。
- 前端基础设施依赖一旦已在架构文档中确认且已写入 `package.json`，对应场景必须优先消费真实依赖，不得长期保留同职责手写替代实现。
- 维持单一职责、DRY、YAGNI；优先无惊喜的“无聊方案”，避免为未来假设提前抽象。
- 还原设计稿时，视觉尽量一比一，但实现层必须同时满足组件复用、令牌复用、状态分层和可维护性。
- 开发总结、排查结论、实现说明与维护记录统一沉淀到 `docs/01开发人员手册/`，不要把过程文档散落到其他位置。

### Development Workflow Rules

- 当前工作流的规划事实入口从 `_bmad-output/INDEX.md` 开始；需要展开细节时，再顺着 `planning-artifacts/index.md` 与 `implementation-artifacts/index.md` 下钻。
- 运行态真实实现面必须同时看 `packages/`、`contracts/`、`mocks/`；不要因为规划入口未完整列出，就忽略契约与 mock 资产。
- 遇到 Epic 1 入口链路、Story 1.5 用户配置、Epic 2 任务/SSE 相关需求时，优先检查最近的 correction / change proposal / implementation artifact，不要只信早期归档文档。
- `student-web` 前端依赖消费、`SCSS` 分层与样式职责边界，优先参考 `docs/01开发人员手册/004-开发规范/0010-student-web-前端依赖落地与-scss-分层规范.md`；若项目级规范与根级约束冲突，以根目录 `AGENTS.md` 为准。
- 默认交付路径是 `Issue -> branch -> Draft PR -> review -> squash merge`；不要停留在“代码改完”。
- 创建 PR 前必须完成自测、联调、运行态验证与文档回写，并给出可点击、可验证的验收入口。
- 基于 BMAD Story 开发时，收口前必须回写 Story 状态、任务勾选、`Dev Agent Record`、`File List`、`Change Log`，并更新 `_bmad-output/implementation-artifacts/sprint-status.yaml`。
- 只 stage 当前任务直接产出的文件；遇到与现有未提交改动冲突时，停止并报告，不覆盖其他正在进行的工作。

### Critical Don't-Miss Rules

- 认证真值来自 RuoYi 的真实配置与真实响应，不来自设计稿，也不来自前端 mock 假设。
- Story 1.5 的真实语义是“用户配置系统（个人简介与学习偏好）”，不是“老师风格选择”；营销文案、表单字段、任务透传和实现判断都必须跟随这个纠偏结果。
- `profile` 配置透传的对外业务语义是 `userProfile`，后端根据配置动态生成 / 匹配 AI agents；前端负责采集、保存、回填和透传，不负责生成 Agent 配置真值。
- Frontend Story 默认必须参考 `docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/`，但设计稿不能覆盖 Epic / PRD / UX 已冻结的业务语义。
- 小麦学生端坚持单一品牌风格；Agent 差异只允许作为局部点缀数据，不允许演化成页面级主题切换。
- 不要再把 `sonner` 当成 `shadcn/ui` 落地证据；两者职责不同，前者解决全局短反馈，后者负责共享交互原语层。
- 不要在 `student-web` 回退到超长单文件页面样式；复杂页面样式必须留在 feature `SCSS` 入口和 `partials` 体系中维护。
- `contracts/` 是一等交付资产：契约采用 `x.y.z` 版本语义；破坏性变更必须新建 `v{major}/`；`schema`、示例、变更记录必须一起更新。
- 错误码是稳定契约资产：使用全大写下划线、业务域前缀，且必须伴随失败示例 payload 与影响说明发布。
- `mocks/` 禁止引入契约未定义字段；需要新增字段时，先改契约，再改 mock。
- SSE 公开事件集已经冻结为 `connected`、`progress`、`provider_switch`、`completed`、`failed`、`cancelled`、`heartbeat`、`snapshot` 八类；不要在页面、mock 或 broker 中私自扩展对外事件名。
- SSE 的 `id / sequence / Last-Event-ID / snapshot` 语义是恢复链路基础，不要把 snapshot 演变成历史审计替代品，也不要绕开统一 parser / broker 约定。
- 认证跳转不要把 `setTimeout`、白屏 `return null`、纯动画等待当成主控制流；应使用确定性导航逻辑，并给出明确过渡反馈。
- 临时排查脚本、抓包脚本、浏览器复现脚本必须使用 `.tmp-*` 明显临时命名，并在任务收口前删除。

---

## Usage Guidelines

**For AI Agents:**

- 先从 `_bmad-output/INDEX.md` 建立事实上下文，再按需进入 `planning-artifacts/`、`implementation-artifacts/`、`packages/`、`contracts/`、`mocks/`。
- 在修改架构、契约、认证、`profile` onboarding、任务状态、SSE、样式令牌前，先读本文件。
- 如果规划说明与运行态现状看起来不一致，规划真值以 `_bmad-output/` 为准，运行态现状以当前代码树为准，再判断需要补文档还是补实现。
- 只要变更影响接口、会话、任务状态或前端状态机，默认假设代码、契约、mock、测试和文档都可能要一起改。

**For Humans:**

- 当技术栈版本、Monorepo 边界、契约版本规则、认证验证规则发生变化时，及时更新本文件。
- 保持精简，只保留 AI 代理最容易遗漏的约束。
- 如果 `contracts/`、`mocks/` 或 `ruoyi-xiaomai` 新增业务域，除了补各自 README / 文档，也要同步更新本文件，避免代理漏看。

Last Updated: 2026-04-06
