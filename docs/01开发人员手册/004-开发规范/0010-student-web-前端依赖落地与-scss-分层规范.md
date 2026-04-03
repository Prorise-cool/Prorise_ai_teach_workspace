# student-web 前端依赖落地与 SCSS 分层规范

> **状态**：生效
> **负责人**：前端 Owner / 架构负责人
> **最后更新**：2026-04-03
> **适用范围**：`packages/student-web/`

---

## 文档目标

本文档用于约束 `student-web` 的前端基础设施落地方式，避免出现“架构文档已选型、`package.json` 已引入、代码仍在纯手写替代”的漂移问题。

本规范优先解决 3 类问题：

1. 已装依赖未消费，导致重复造轮子。
2. Tailwind、SCSS、页面样式职责混乱，导致可维护性下降。
3. 页面级复杂视觉继续堆在超长单文件样式里，无法分包和复用。

## 一、总则

1. 只要架构文档已确定且 `package.json` 已引入某类基础设施依赖，后续相同职责场景默认必须优先消费该依赖，不得继续手写同类基础实现。
2. 同一类问题只能有一个主实现层，不允许“依赖已在、页面继续手写一套并长期并存”。
3. 如果确有理由保留手写实现，必须在 Story、PR 或对应文档中写明豁免原因、替代范围和移除计划；没有说明，默认视为违规。
4. 共享能力先进入 `components/`、`shared/`、`services/`、`hooks/` 等稳定层，再由页面消费；禁止在页面里临时孵化第二套基础设施。

## 二、依赖职责矩阵

### 1. `shadcn/ui` + `Radix UI`

- 用途：承接通用交互原语与可复用组件，例如 `Button`、`Input`、`Textarea`、`Checkbox`、`Tabs`、`Dialog`、`Popover`、`Label`。
- 要求：一旦某类交互已经进入 `components/ui/`，页面和 feature 不得继续维护原生散件版本。
- 要求：可复用组件必须通过 `CVA + cn()` 暴露变体，而不是在页面里复制 className。
- 要求：`shadcn/ui` 是否落地，以 `components/ui/` 下原语组件的真实封装数量、消费范围和替代效果为准，不能拿 `sonner`、`react-query` 这类独立依赖冲抵。

### 2. `Tailwind CSS v4`

- 用途：服务共享组件封装、令牌消费、变体类组合和少量结构性布局表达。
- 要求：Tailwind 的主战场是 `shadcn/ui` 风格的共享组件层，而不是页面级复杂视觉本体。
- 禁止：把整页复杂视觉、长链路动画、大片结构状态全堆进 utility class，形成不可维护的 class 字符串。

### 3. `SCSS`

- 用途：承接页面级和 feature 级复杂视觉，例如多层容器结构、局部动画、复杂响应式、局部变量、整块 BEM 样式族。
- 要求：页面和 feature 的复杂视觉默认用 `SCSS`，而不是继续把数百行到上千行 CSS 混在一个文件里。
- 要求：`SCSS` 不是“把 `.css` 改名成 `.scss`”；必须真实使用 partials、嵌套和 BEM 结构。

### 4. `react-hook-form` + `zod`

- 用途：表单状态、字段绑定、校验规则、错误文案和提交边界。
- 要求：业务表单默认使用这组依赖，禁止继续使用 `useState + 手写校验 + 手写 error visible` 的页面内状态机。

### 5. `@tanstack/react-query`

- 用途：所有服务端状态，包括 query、mutation、重试、缓存、失效和错误态。
- 要求：只要请求结果来自服务端并存在 `loading / success / error / retry` 分支，就应该优先进入 `react-query`，而不是手写 `useEffect + useState + cancelled flag`。

### 6. `sonner`

- 用途：全局 toast / notice。
- 要求：全局短反馈统一走 `sonner`，不再维护手写通知队列、移除计时器和视口宿主。
- 要求：`sonner` 只解决全局反馈，不属于 `components/ui` 原语层建设，也不能作为 `shadcn/ui` 已落地的证明。

### 7. `embla-carousel-react`

- 用途：轮播、卡片滑轨、可滚动内容带分页控制的场景。
- 要求：只要是 carousel / slider，默认走 `Embla`；禁止继续手写 `translateX + resize listener + slidesPerView` 轮播状态机。

## 三、样式分层规范

### 1. 全局层

- `src/styles/theme.css` 只负责全局设计令牌、语义变量和 Tailwind v4 `@theme` 桥接。
- `src/styles/globals.css` 只负责 reset、全局宿主、全局基础规则。
- 全局层禁止写页面私有变量、页面私有动画、页面私有结构样式。

### 2. Feature 层

- 页面与 feature 私有样式统一放在 `src/features/<feature>/styles/`。
- 每个 feature 必须有明确的 `*.scss` 入口文件。
- 复杂页面必须拆成 partials，例如：

```text
src/features/home/styles/
  entry-pages.scss
  partials/
    _landing-page.scss
    _landing-components.scss
    _entry-page-responsive.scss
```

### 3. 命名与写法

- 页面或局部组件的复杂视觉必须使用 BEM block，例如 `.xm-landing-nav`、`.xm-auth-form`、`.xm-classroom-input-page`。
- 必须使用 SCSS 嵌套维护 block、element、modifier，不允许继续把所有选择器平铺。
- 一个 SCSS 文件如果既没有 partial 分拆，也没有嵌套，也没有 BEM block，只是 CSS 改后缀，视为未落地。

## 四、Tailwind 与 SCSS 的职责边界

### 应该使用 Tailwind 的场景

- `components/ui/*` 中的共享组件变体。
- 组件实例上的少量布局拼装，例如 `flex`、`gap-*`、`w-full`、`text-sm`。
- 语义令牌消费，例如 `bg-background`、`text-foreground`、`border-border`。

### 应该使用 SCSS 的场景

- 页面级复杂视觉效果。
- 连续多层的结构样式。
- 同一块 UI 的多状态修饰族。
- 页面局部动画、局部遮罩、飞出层、复杂响应式。
- 同一 feature 下需要长期维护的视觉规则。

### 禁止的混用方式

1. 同一视觉职责同时在 Tailwind 和 SCSS 各写一半，导致样式所有权不清。
2. 页面 block 已经用 BEM 建模，内部又继续大量堆 utility classes 来覆盖同一组视觉属性。
3. 本该沉淀到共享组件的样式长期停留在页面 utility classes 中。

## 五、实现硬约束

### 1. 表单

- 业务表单默认使用 `react-hook-form + zod`。
- 共享输入组件优先使用 `components/ui/` 中的 `Input`、`Textarea`、`Checkbox`、`Label`。
- 校验文案必须回到 i18n 资源，不允许把校验文案写死在页面逻辑里。

### 2. 服务端状态

- query 场景使用 `useQuery`。
- 提交、探针、按钮触发型异步使用 `useMutation`。
- 页面只消费 query / mutation 的状态，不再维护同职责的手写 `idle/loading/success/error` 联合状态。

### 3. 全局反馈

- 短反馈统一使用 `sonner`。
- 过渡型沉浸式反馈可保留独立 spotlight / state card，但必须和 toast 职责分离。

### 4. 导航浮层与对话框

- 抽屉、移动菜单、Popover、Dialog 类交互统一优先用 `Radix` / `shadcn` 原语。
- 禁止继续维护自绘 overlay、手写 focus 管理和手写开关态外壳。

### 5. Carousel

- 轮播统一使用 `Embla`。
- 页面只允许补充按钮、卡片壳层和文案，不再重复实现滚动算法。

## 六、禁止项

以下情况默认视为阻塞问题：

1. `components.json` 已存在，但 `components/ui/` 不落地或页面仍大量使用原生散件替代。
2. `package.json` 已装 `sonner`，项目仍在维护手写 toast 队列。
3. 以“已经接入 `sonner`”为理由，宣称 `shadcn/ui` 已完成落地，但 `components/ui/` 原语层仍明显缺位。
4. `package.json` 已装 `react-query`，页面仍大量使用手写请求状态机。
5. `package.json` 已装 `embla-carousel-react`，carousel 仍由 `translateX` 和窗口监听驱动。
6. `package.json` 已装 `react-hook-form` / `zod`，业务表单仍使用 `useState` 和手写校验。
7. 页面级复杂视觉仍写在单个超长 CSS 文件里，且没有 feature 分层、partials、BEM 和 SCSS 嵌套。
8. 设计令牌已可表达的值继续硬编码，绕过 `theme.css` 和 `--xm-*`。

## 七、代码评审与验收清单

提交前至少自查以下问题：

1. 该场景是否已经有架构指定且已安装的官方依赖可用。
2. 我是否仍在手写同类基础能力。
3. 页面复杂视觉是否已经进入 feature `SCSS`，并按 partials 拆分。
4. SCSS 是否真实使用了 BEM 和嵌套，而不是仅改后缀。
5. 共享交互是否已经抽到 `components/ui/` 或 `components/`。
6. 我是否错误地把 `sonner` 接入当成 `shadcn/ui` 组件库已经落地。
7. 表单是否使用 `react-hook-form + zod`。
8. 服务端状态是否使用 `react-query`。
9. 全局 toast 是否使用 `sonner`。
10. 新接入的 UI 原语是否补了测试环境所需的浏览器 API polyfill。

## 八、与全局规范的关系

1. 根目录 `AGENTS.md` 中的 `Frontend Guardrails` 属于全局执行硬约束。
2. 本文档是 `student-web` 的项目级细化规范；若与 `AGENTS.md` 冲突，以更新后的 `AGENTS.md` 为准。
3. 后续新增前端基础设施依赖时，必须同步更新本文档和 `AGENTS.md` 的对应约束。
