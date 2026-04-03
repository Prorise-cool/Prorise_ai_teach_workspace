# Workspace Agent Instructions

## Canonical Source

- `_bmad-output/` 是本仓库唯一的事实来源。
- 产品、PRD、UX、架构、Epic、Story 与实现状态，统一以 `_bmad-output/` 为准。
- 所有导航文件仅作入口使用；若与 `_bmad-output/` 冲突，以 `_bmad-output/` 为准。

## Documentation Output

- 开发过程中的总结文档、排查结论、实现说明与维护记录，统一沉淀到 `docs/01开发人员手册/`。
- 快速导航入口优先查看 `docs/01开发人员手册/0000-AI快速导航索引.md`。
- 如果需要新增过程约定，优先补充到 `docs/01开发人员手册/004-开发规范/`。
- 如果需要新增阶段性总结，优先补充到 `docs/01开发人员手册/009-里程碑与进度/`。

## Workspaces

- 主代码工作区：`packages/`
- 参考或照抄来源：`references/`
- `references/` 默认按只读参考处理；实际业务代码不要直接写在这里。
- 借鉴或照抄外部项目时，需同时记录来源项目与许可证约束。

## Frontend Guardrails

以下规则默认适用于 `packages/student-web/`，除非 Story 或架构文档明确说明例外：

- `src/styles/theme.css` 只允许承载全局设计令牌与 CSS Variables 桥接，不允许写入页面、feature 或场景私有变量。
- 页面或 feature 私有样式变量必须放在对应 feature 的局部样式文件中，例如 `src/features/<feature>/styles/*.css`，并挂在 feature 根选择器作用域下。
- 新增样式前优先复用现有 `src/styles/tokens/*`、`theme.css` 中的 `--xm-*` 令牌和已存在组件；能抽成通用组件的，不要继续堆页面专属实现。
- 若已有令牌可表达颜色、字号、间距、圆角、阴影、层级、动效，则前端禁止重复硬编码同类视觉值。
- 小麦前端坚持单一品牌风格；Agent 风格只允许作为局部点缀数据，不允许演化成页面级全局主题切换。
- 非 `mock`、`test` 前端源码文件必须包含规范化文件头注释，明确文件职责、边界和主要承载内容。
- 非 `mock`、`test` 前端源码中的函数、组件、hooks、工具函数必须补充规范 `JSDoc` 注释；说明用途，并在适用时补齐 `@param`、`@returns`、`@throws`。
- import 必须按块分组，至少区分框架/第三方依赖、项目内模块、相对路径模块、样式或资源引入；禁止无序混排，类型导入遵循现有风格单独处理。
- 页面容器只负责业务编排、路由参数、服务调用、会话写入与回跳等业务状态；纯展示态、动画态、插画态、浮层态等非业务 `useState` 应下沉到局部组件或抽离为 hooks。
- 当一个页面同时承载业务状态与大量 UI 交互状态时，优先拆成 `page + hooks + components + styles + schemas/shared` 的 feature 内结构，避免单文件失控。
- 页面默认按路由级别做懒加载和分包，避免把独立业务页面长期塞进主包。
- `app/` 只做 Provider、Router、Layout 和页面装配；业务实现优先沉淀到 `features/`，共享能力沉淀到 `components/`、`lib/`、`services/`、`stores/`。
- 还原设计稿时必须结合当前业务语义落地，视觉尽量一比一复现，但实现层必须遵守组件复用、令牌复用、状态分层和可维护性约束。


**Frontend 最佳实践**

### 1. 设计令牌（Design Tokens）—— Tailwind v4 @theme 单源真理
- **唯一权威来源**：`src/styles/theme.css` 中使用 `@theme` 指令定义**所有**设计令牌（颜色、间距、排版、圆角、阴影、动效、断点等）。这是 Tailwind v4 官方推荐的单源真理，所有 `--xm-*` CSS Variables 必须在此生成。
- **原始令牌 vs 语义令牌**（shadcn/ui + Tailwind v4 最佳实践）：
  - 原始令牌（如 `--color-blue-500`、`--space-4`）仅在 `src/styles/tokens/*` 中定义。
  - 语义令牌（如 `--background`、`--foreground`、`--primary`、`--card`、`--muted`、`--radius`）必须在 `@theme` 中暴露，供所有组件使用。
  - 新增任何视觉值**必须**先在 `@theme` 中定义语义令牌，再生成 CSS Variables。**严禁**先硬编码后提炼。
- **暗黑模式与主题化**：在 `theme.css` 的 `:root` 和 `.dark`（或 `data-theme="dark"`）中覆盖语义令牌。所有组件**只能**使用语义类（`bg-background text-foreground`），禁止写死亮/暗色值。
- **禁止**：任意值（arbitrary values 如 `bg-[#123456]`、`p-[17px]`）、内联 `style={}` 对象（除非动态 CSS var 如 `style={{ '--dynamic-var': value }}`）、重复硬编码。

### 2. 样式文件分层与作用域（严格隔离）
- `src/styles/theme.css` **仅**负责 `@import "tailwindcss";` + `@theme { ... }` + 全局 `:root`/`.dark` 令牌桥接。**禁止**任何页面/组件/特性私有样式。
- 特性私有样式必须放在 `src/features/<feature>/styles/*.css`，并**严格 scoped** 在 feature 根选择器下（e.g. `.home-page { --local-*: ... }`）。
- `src/styles/globals.css` 仅引入 Tailwind base、tokens 生成的 CSS Variables 和必要 reset。**禁止**组件/页面级样式。
- 所有自定义 CSS **必须**使用 `var(--xm-*)`，不得出现裸露的 `#hex`、`16px` 等。

### 3. 类名处理规范 —— 强制使用 `cn()` + tailwind-merge + clsx
- **必须**在 `src/lib/utils.ts`（或同等位置）定义并全局使用 `cn` 工具函数：
  ```ts
  import { type ClassValue, clsx } from "clsx"
  import { twMerge } from "tailwind-merge"
  export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
  ```
- **所有** className（包括 CVA、Radix/Base UI、Motion 组件）**必须**通过 `cn()` 合并。**禁止**直接拼接字符串或模板字面量。
- 这符合 tailwind-merge + clsx 官方最佳实践：自动处理条件类、去重、解决冲突（后声明的胜出）。

### 4. 组件变体与复用 —— 强制 CVA（class-variance-authority）
- **所有**可变体组件（Button、Card、Dialog 内容等）**必须**使用 CVA 定义 base + variants + compoundVariants + defaultVariants。
- 全局推荐 `defineConfig` 配置 CVA + twMerge（官方最佳实践），确保冲突自动解决。
- **优先级**（新增样式前必须遵守）：
  1. 复用 `components/` 中已存在的 CVA 组件。
  2. 复用 `@theme` 中的语义令牌。
  3. 仅在以上无法满足时，才在 feature 局部 CSS 中新增 scoped 语义令牌。
- 任何可抽成通用组件的 UI 片段**禁止**堆页面专属实现，必须抽到 `components/` 并用 CVA + `cn()`。

### 5. Radix UI Primitives + @base-ui/react 样式最佳实践
- **Radix UI**：使用 `data-[state=open/closed/checked/disabled]` 属性选择器（官方推荐）。示例：`data-[state=open]:animate-in`、`[&[data-state=open]>svg]:rotate-180`。
- Radix 暴露的 CSS Variables（如 `--radix-accordion-content-height`、`--radix-select-trigger-width`）**必须**在动画/布局中使用。
- **@base-ui/react**：通过 `className` prop（支持函数形式 `(state) => ...`）或 data 属性（如 `[data-checked]`）应用 Tailwind 类。支持 `style` prop 但仅限动态 CSS var。
- 两者均为 **unstyled**，所有样式通过 Tailwind + CVA + `cn()` 实现。**禁止**覆盖 Radix 默认样式（使用 CSS layers 确保 Tailwind 优先）。

### 6. Motion（v12，前 Framer Motion）动画最佳实践
- 静态样式用 Tailwind 类（`className`），动态动画用 Motion props（`whileHover`、`animate`、`variants`、`layout` 等）。
- **禁止**同时使用 CSS `transition-*` 与 Motion 相同属性（会导致冲突/卡顿）。
- 复杂动画、弹簧物理、手势、布局动画**必须**使用 Motion。
- 性能：为频繁变换的元素添加 `will-change: transform`（或 Motion 自动处理）。
- 简单 hover/fade 等优先 Tailwind `animate-*` + `cn()`（轻量）。

### 7. lucide-react 图标规范
- 所有图标**必须**通过 `<LucideIcon className={cn("...")} />` 使用 Tailwind 类控制 `size`、`color`、`stroke-width` 等。
- **禁止**使用图标的 `size`/`color` prop（除非动态），统一走语义令牌（`text-foreground`、`w-4 h-4` 等）。
- 确保图标与设计令牌完全一致。

### 8. 其他样式强制约束（全库通用）
- **a11y**：所有交互元素必须使用语义令牌提供足够对比度；focus 状态统一使用 `--xm-focus-ring` 等令牌；颜色不得作为唯一信息载体。
- **动画**：所有动效令牌必须来自 `@theme` 中的 `--animate-*` / `--ease-*` / `--duration-*`。
- **Storybook**：所有新组件/样式必须在 Storybook 中验证 light/dark 一致性，并关联对应令牌。
- **文件头**：非 mock/test 的样式相关文件必须包含规范化注释，说明负责的令牌/组件范围。
- **小麦前端风格**：坚持单一品牌风格。Agent 风格仅作为局部点缀，禁止页面级主题切换覆盖主令牌。


### 认证与运行态验证补充规则

- 凡是涉及登录态、注册开关、路由守卫、`returnTo` 回跳、`zustand persist/localStorage`、验证码、第三方登录入口这类“运行态 + 持久化 + 导航”耦合场景，默认不得只用 mock、`MemoryRouter` 或文本断言宣布完成；进入联调、自测或修 bug 时，必须补一轮真实浏览器验证。
- 当前 student-web 本地联调与浏览器会话验证默认以 `http://127.0.0.1:5173` 为基准地址；不要把 `localhost` 与 `127.0.0.1` 混用后再误判“本地有会话但拿不到”。
- 认证页是否显示注册入口、是否要求验证码、是否允许第三方登录、登录后拿到哪些字段，必须以 RuoYi 真实配置与真实响应为准；设计稿只能决定交互与视觉，不能覆盖后端事实。
- 认证相关跳转不得把 `setTimeout`、白屏 `return null`、纯动画等待当成主控制流；应优先使用可确定触发的导航逻辑，并为用户渲染明确的过渡反馈，而不是让页面空白或卡死在原路径。
- 只要需求包含“应该跳到哪里”，测试就必须至少有一条断言直接检查路由结果，例如 `pathname/search`，不能只看页面上是否出现某段文案。
- 对于“已登录强制访问 `/login`”“未登录强制访问受保护路由”“注册开关切换”“登录后回跳目标恢复”这几类认证基线场景，后续任何重构都必须视为回归重点，默认补测。
- 临时排查脚本、抓包脚本、浏览器复现脚本可以创建，但必须使用明显临时命名，例如 `.tmp-*`，并在任务收口前删除，不得把一次性排查产物留在仓库里。

## Entry Points

- 全局索引：`INDEX.md`
- 架构导航：`ARCHITECTURE.md`
- BMAD 输出索引：`_bmad-output/INDEX.md`
- 代码工作区索引：`packages/INDEX.md`
- 参考项目索引：`references/INDEX.md`

## GitHub Flow 对接方式

实施阶段默认与 GitHub Flow 绑定执行：

1. `Create Story` 或现有 Story 文档确认后，先创建对应 GitHub Issue。
2. 基于 Issue / Story 拉出短分支，例如 `feature/story-1-1-auth-entry`。
3. `Dev Story` 阶段通过 Draft PR 持续暴露实现进度。
4. `Code Review` 阶段以 GitHub PR 为载体执行，审查结论回写到 PR。
5. 审查通过后以 `Squash and merge` 合回 `master`。

### 默认收口规则

- 除非用户明确豁免，开发任务默认按 `Issue -> 分支 -> PR -> merge` 完整收口，不要只停留在“代码已改完”。
- 创建 PR 前，必须先完成本地自测、联调验证和文档回写；不要把“等 PR 再补”当成默认流程。
- 如果任务基于 BMAD Story 执行，收口前必须同步回写 Story 状态、任务勾选、`Dev Agent Record`、`File List`、`Change Log`，并更新 `_bmad-output/implementation-artifacts/sprint-status.yaml`。
- 用户未明确要求直接合并前，默认先给 PR 链接与验收清单，等待用户确认；不要跳过用户验收直接合并。
- 用户明确表示“验收通过后可直接合并”时，才在 PR 创建完成后执行 `Squash and merge`。

### 验收与运行态规则

- 只要任务会影响用户可见行为，完成实现后必须在当前功能分支内启动项目或确认项目已在该分支运行，再给用户验收；不要只给静态代码说明。
- 交付给用户的必须是“可实际点击和验证”的验收入口，至少包含访问地址、前置条件、账号或环境要求、操作步骤、预期结果。
- 默认由 Agent 完成技术侧自验，包括单元测试、集成测试、构建、联调、接口验证等；用户优先负责用户侧体验验收，不应把本应由 Agent 完成的技术验证转交给用户。
- 涉及前后端协同、认证、路由守卫、持久化、权限、回跳、代理、环境变量这类运行态耦合场景时，不能仅凭 mock、文本断言或接口单测宣布完成，必须补真实运行态验证。
- 验收清单应优先沉淀到 `docs/01开发人员手册/`，并在适当索引中补入口，便于后续任务直接复用。

### Story 进入开发前的最小前置条件

1. PRD、架构、Epic / Story 已完成并相互对齐。
2. `004-开发规范` 与 `005-环境搭建` 已初始化。
3. GitHub 仓库已按 `0002-Git工作流.md` 启用受保护分支与 PR 流程。
4. 对于 `story 1-1`，已明确认证由 RuoYi 承载，业务前端承载路径采用架构默认方案。
