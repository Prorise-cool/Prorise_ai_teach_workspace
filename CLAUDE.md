# Workspace Agent Instructions

## Canonical Source
面对用户，你 100%需要使用中文作为回复，禁止使用其他语言！

- `_bmad-output/` 是本仓库唯一的事实来源。
- 产品、PRD、UX、架构、Epic、Story 与实现状态，统一以 `_bmad-output/` 为准。
- 所有导航文件仅作入口使用；若与 `_bmad-output/` 冲突，以 `_bmad-output/` 为准。
- 再阅读`_bmad-output`时必须按需阅读此次任务相关的索引获取上下文，详细定位到/Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/_bmad-output/INDEX.md文件中

项目结构请快速参考：
_bmad-output                                                       
├─ brainstorming                                                   
│  └─ brainstorming-session-2026-03-18-142300.md                   
├─ implementation-artifacts                                        
│  ├─ 0-1-monorepo-基础目录与工程骨架冻结.md                                  
│  ├─ 0-2-契约资产目录命名规则与版本规则冻结.md                                     
│  ├─ 0-3-前端-adapter-与-mock-handler-环境切换基线.md                      
│  ├─ 0-4-后端-schema-openapi-与示例-payload-输出基线.md                    
│  ├─ 0-5-request-id-task-id-与日志追踪骨架.md                            
│  ├─ 0-6-story-交付门禁与并行开发-dor-dod-冻结.md                            
│  ├─ 1-1-统一认证契约会话-payload-与-mock-基线.md                            
│  ├─ 1-2-独立认证页中的注册登录与回跳.md                                        
│  ├─ 1-3-登出401-处理与受保护访问一致性.md                                     
│  ├─ 1-4-首页课堂直达入口与顶栏导航分发.md                                       
│  ├─ 1-5-用户配置系统（个人简介与学习偏好）.md                                     
│  ├─ 1-6-角色边界与入口级权限可见性.md                                         
│  ├─ 1-7-营销落地页与-home-首页分流.md                                      
│  ├─ 10-1-长期业务数据边界业务表清单与字段基线冻结.md                                 
│  ├─ 10-2-ruoyi-小麦业务模块与权限承接规则.md                                  
│  ├─ 10-3-fastapi-与-ruoyi-防腐层客户端.md                               
│  ├─ 10-4-视频与课堂任务元数据长期承接.md                                       
│  ├─ 10-5-companion-与-evidence-问答长期承接.md                          
│  ├─ 10-6-learning-coach-结果错题与路径长期承接.md                           
│  ├─ 10-7-学习记录收藏与聚合查询承接.md                                        
│  ├─ 10-8-后台查询导出与审计边界.md                                          
│  ├─ 2-1-统一任务状态枚举错误码与结果-schema-冻结.md                              
│  ├─ 2-2-task-基类taskcontext-与调度骨架.md                              
│  ├─ 2-3-dramatiq-redis-broker-基础接入.md                            
│  ├─ 2-4-redis-运行态-keyttl-与事件缓存落地.md                              
│  ├─ 2-5-sse-事件类型payload-与-broker-契约冻结.md                         
│  ├─ 2-6-sse-断线恢复与-status-查询降级.md                                 
│  ├─ 2-7-provider-protocol工厂与优先级注册骨架.md                           
│  ├─ 2-8-provider-健康检查failover-与缓存策略.md                           
│  ├─ 3-6-视频输入页公开视频广场与复用入口.md                                      
│  ├─ 4-10-视频结果公开发布与输入页复用卡片.md                                     
│  ├─ 5-10-课堂结果导出与分享产物.md                                          
│  ├─ 5-9-课堂输入页联网搜索增强与证据范围配置.md                                    
│  ├─ 7-7-联网搜索-provider-与生成前证据增强.md                                
│  ├─ epic-0-retro-2026-04-04.md                                   
│  ├─ epic-10-retro-2026-04-04.md                                  
│  ├─ index.md                                                     
│  ├─ sprint-status.yaml                                           
│  └─ story-template-checklist.md                                  
├─ planning-artifacts                                              
│  ├─ architecture                                                 
│  │  ├─ 01-1-文档说明.md                                              
│  │  ├─ 02-2-项目背景与架构目标.md                                         
│  │  ├─ 03-3-核心术语与架构原则.md                                         
│  │  ├─ 04-4-系统边界与总体架构.md                                         
│  │  ├─ 05-5-运行机制与关键链路.md                                         
│  │  ├─ 06-6-数据分层与存储策略.md                                         
│  │  ├─ 07-7-职责边界与集成关系.md                                         
│  │  ├─ 08-8-模块划分与实现策略.md                                         
│  │  ├─ 09-9-外部平台集成策略.md                                          
│  │  ├─ 10-10-一致性规则与项目规范.md                                       
│  │  ├─ 11-11-技术选型与评估结论.md                                        
│  │  ├─ 12-12-架构决策记录摘要.md                                         
│  │  ├─ 13-13-未决事项与后续补充.md                                        
│  │  ├─ 14-14-项目结构与边界定义.md                                        
│  │  ├─ 15-15-架构验证与完整性检查.md                                       
│  │  └─ index.md                                                  
│  ├─ archive                                                      
│  │  ├─ architecture.md                                           
│  │  ├─ design-tokens.md                                          
│  │  ├─ epics.md                                                  
│  │  ├─ index.md                                                  
│  │  ├─ prd.md                                                    
│  │  └─ ux-design-specification.md                                
│  ├─ epics                                                        
│  │  ├─ 01-overview.md                                            
│  │  ├─ 02-document-usage-rule.md                                 
│  │  ├─ 03-design-goals-of-this-breakdown.md                      
│  │  ├─ 04-requirements-inventory.md                              
│  │  ├─ 05-epic-restructure-principles.md                         
│  │  ├─ 06-dependency-model.md                                    
│  │  ├─ 07-story-definition-standard.md                           
│  │  ├─ 08-fr-coverage-map.md                                     
│  │  ├─ 09-nfr-coverage-map.md                                    
│  │  ├─ 10-epic-list.md                                           
│  │  ├─ 11-delivery-waves.md                                      
│  │  ├─ 12-detailed-planning-format.md                            
│  │  ├─ 13-epic-0.md                                              
│  │  ├─ 14-epic-1-revised-story-1-5.md                            
│  │  ├─ 14-epic-1-story-1-5-replacement.md                        
│  │  ├─ 14-epic-1.md                                              
│  │  ├─ 15-epic-2.md                                              
│  │  ├─ 16-epic-3.md                                              
│  │  ├─ 17-epic-4.md                                              
│  │  ├─ 18-epic-5.md                                              
│  │  ├─ 19-midpoint-quality-check.md                              
│  │  ├─ 20-implementation-sequencing-advice-for-upper-half.md     
│  │  ├─ 21-definition-of-done-for-upper-half-epics.md             
│  │  ├─ 22-risks-addressed-by-this-upper-half-design.md           
│  │  ├─ 23-epic-6.md                                              
│  │  ├─ 24-epic-7.md                                              
│  │  ├─ 25-epic-8.md                                              
│  │  ├─ 26-epic-9.md                                              
│  │  ├─ 27-epic-10-ruoyi.md                                       
│  │  ├─ 28-cross-epic-integration-matrix.md                       
│  │  ├─ 29-milestone-plan.md                                      
│  │  ├─ 30-recommended-team-execution-model.md                    
│  │  ├─ 31-final-validation-checklist.md                          
│  │  ├─ 32-final-notes-for-story-writers.md                       
│  │  ├─ 33-appendix-a-epic-to-story-id-index.md                   
│  │  ├─ 34-appendix-b-recommended-bmad-ticket-split.md            
│  │  ├─ 35-appendix-c-suggested-story-sizing-rule.md              
│  │  ├─ 36-appendix-d-high-risk-stories-requiring-early-spike.md  
│  │  ├─ 37-appendix-e-release-gate-checklist.md                   
│  │  ├─ 38-appendix-f-mvp-cut-strategy.md                         
│  │  ├─ 39-appendix-g-final-quality-statement.md                  
│  │  ├─ 40-closing-recommendation.md                              
│  │  ├─ epic-1-implementation-baseline.md                         
│  │  ├─ epic-1-openmaic-alignment-baseline.md                     
│  │  └─ index.md                                                  
│  ├─ prd                                                          
│  │  ├─ 01-1-文档说明.md                                              
│  │  ├─ 02-2-产品概述.md                                              
│  │  ├─ 03-3-架构对齐摘要.md                                            
│  │  ├─ 04-4-用户与核心场景.md                                           
│  │  ├─ 05-5-版本范围.md                                              
│  │  ├─ 06-6-功能需求.md                                              
│  │  ├─ 07-7-非功能需求.md                                             
│  │  ├─ 08-8-数据与集成约束.md                                           
│  │  ├─ 09-9-成功标准.md                                              
│  │  ├─ 10-10-需求追踪矩阵rtm.md                                        
│  │  ├─ 11-11-测试与上线门禁.md                                          
│  │  ├─ 12-12-definition-of-ready-definition-of-done.md           
│  │  ├─ 13-13-版本计划.md                                             
│  │  ├─ 14-14-变更控制.md                                             
│  │  ├─ 15-15-术语简表.md                                             
│  │  ├─ 16-16-附录与旧-prd-的继承说明.md                                   
│  │  └─ index.md                                                  
│  ├─ research                                                     
│  │  ├─ domain-AI教学视频智能体-2026-03-20.md                            
│  │  └─ market-AI教学视频智能体-research-2026-03-20.md                   
│  ├─ ux-design-specification                                      
│  │  ├─ 01-executive-summary.md                                   
│  │  ├─ 02-core-user-experience.md                                
│  │  ├─ 03-desired-emotional-response.md                          
│  │  ├─ 04-ux-pattern-analysis-inspiration.md                     
│  │  ├─ 05-design-system-foundation.md                            
│  │  ├─ 06-2-core-user-experience.md                              
│  │  ├─ 07-visual-design-foundation.md                            
│  │  ├─ 08-7-page-level-design-specifications页面级设计规范.md           
│  │  ├─ 09-8-companion-layer-ux会话伴学层.md                           
│  │  ├─ 10-9-evidence-retrieval-ux证据面板层.md                        
│  │  ├─ 11-10-learning-coach-layer学习教练层.md                        
│  │  ├─ 12-11-frontend-backend-interaction-boundary前端与双后端交互边界.md  
│  │  ├─ 13-12-unified-waiting-experience统一等待体验设计.md               
│  │  ├─ 13-design-updates.md                                      
│  │  ├─ 14-13-user-profile-data-specification用户配置数据规范.md          
│  │  ├─ 15-14-future-considerations未来考虑.md                        
│  │  ├─ 16-附录-a-ui-线框图索引.md                                       
│  │  ├─ 17-附录-b-sse-事件类型完整列表.md                                   
│  │  ├─ 18-附录-c-错误码完整列表.md                                        
│  │  └─ index.md                                                  
│  ├─ index.md                                                     
│  └─ product-brief-小麦-2026-03-22.md                               
├─ research                                                        
│  ├─ openmaic-issue-pr-audit-2026-03-23.md                        
│  └─ technical-AI教学视频智能体-research-2026-03-21.md                   
├─ INDEX.md                                                        
└─ project-context.md                                              


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
- 页面或 feature 私有样式变量必须放在对应 feature 的局部样式文件中，例如 `src/features/<feature>/styles/*.scss`，并挂在 feature 根选择器作用域下。
- 新增样式前优先复用现有 `src/styles/tokens/*`、`theme.css` 中的 `--xm-*` 令牌和已存在组件；能抽成通用组件的，不要继续堆页面专属实现。
- 若已有令牌可表达颜色、字号、间距、圆角、阴影、层级、动效，则前端禁止重复硬编码同类视觉值。
- 架构文档已指定且 `package.json` 已引入的前端基础设施依赖，后续对应场景必须优先消费，不得长期保留手写替代实现。
- `Tailwind` 的主要职责是服务 `shadcn/ui` 共享组件封装、令牌消费与少量结构拼装；页面级复杂视觉默认由 feature `SCSS` 承接。
- `shadcn/ui` 是否落地，必须以 `components/ui/` 下可复用原语组件的真实封装与页面消费为准；`sonner` 只属于独立反馈依赖，不计入 `shadcn/ui` 组件库落地完成度。
- `SCSS` 必须真实用于 partials 分包、BEM 命名与嵌套组织；仅把 `.css` 改名为 `.scss` 但继续平铺选择器，视为未落地。
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
- 特性私有样式必须放在 `src/features/<feature>/styles/*.scss`，并**严格 scoped** 在 feature 根选择器下（e.g. `.home-page { --local-*: ... }`）。
- `src/styles/globals.css` 仅引入 Tailwind base、tokens 生成的 CSS Variables 和必要 reset。**禁止**组件/页面级样式。
- 所有自定义 CSS **必须**使用 `var(--xm-*)`，不得出现裸露的 `#hex`、`16px` 等。
- 页面或 feature 的复杂视觉默认用 `SCSS` 入口 + `partials/_*.scss` 组织，不再接受超长单文件样式持续膨胀。
- 页面级和 feature 级复杂样式必须采用 BEM block + SCSS 嵌套维护，不得继续把选择器平铺成长列表。
- 同一视觉职责只能有一个主表达层：共享组件变体走 Tailwind / CVA，页面复杂视觉走 feature `SCSS`，禁止长期混写。

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

### 4.1 已装依赖的强制消费边界
- 表单默认使用 `react-hook-form + zod`，禁止继续使用 `useState + 手写校验 + 手写错误显隐` 作为长期方案。
- 服务端状态默认使用 `@tanstack/react-query` 的 `useQuery / useMutation`，禁止继续维护同职责的手写请求状态机。
- 全局短反馈默认使用 `sonner`，禁止继续维护手写 toast 队列、移除计时器和宿主视口；但 `sonner` 不得被当成 `shadcn/ui` 落地证据，也不能冲抵 `components/ui` 原语层建设。
- 轮播默认使用 `embla-carousel-react`，禁止继续用 `translateX + resize listener + slidesPerView` 手写 carousel。
- 可复用交互默认使用 `shadcn/ui + Radix UI` 原语，禁止在页面内长期保留原生散件版 `Checkbox`、`Dialog`、`Popover`、抽屉和同类交互壳层。

### 5. Radix UI Primitives + @base-ui/react 样式最佳实践
- **Radix UI**：使用 `data-[state=open/closed/checked/disabled]` 属性选择器（官方推荐）。示例：`data-[state=open]:animate-in`、`[&[data-state=open]>svg]:rotate-180`。
- Radix 暴露的 CSS Variables（如 `--radix-accordion-content-height`、`--radix-select-trigger-width`）**必须**在动画/布局中使用。
- **@base-ui/react**：通过 `className` prop（支持函数形式 `(state) => ...`）或 data 属性（如 `[data-checked]`）应用 Tailwind 类。支持 `style` prop 但仅限动态 CSS var。
- 两者均为 **unstyled**，共享原语层样式通过 Tailwind + CVA + `cn()` 实现，页面级复杂容器与视觉效果通过 feature `SCSS` 承接。**禁止**覆盖 Radix 默认样式（使用 CSS layers 确保 Tailwind 优先）。

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