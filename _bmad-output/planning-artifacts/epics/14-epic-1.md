## Epic 1: 用户接入、统一入口与启动配置
用户可以完成登录、理解双入口差异、进入正确的学习起点，并把老师风格作为会话启动配置带入后续流程。  
**FRs covered:** `FR-UM-001`、`FR-UM-002`、`FR-UM-004`、`FR-UI-R01`、`FR-UI-001`、`FR-UI-009`、`FR-CS-002`  
**NFRs covered:** `NFR-SE-002`、`NFR-UX-001`、`NFR-UX-003`  
**Primary Story Types:** `Contract Story`、`Frontend Story`、`Backend Story`

### Objective
本 Epic 负责“进入系统”的统一起点。  
它只解决：
- 怎么认证；
- 怎么进入正确入口；
- 怎么区分默认产品首页与营销落地页；
- 怎么在进入任务前设置最小启动参数。  

它不负责：
- 真实视频执行；
- 真实课堂执行；
- 个人资料 CRUD；
- 学习中心聚合。  

### Scope
- `/login` 页面  
- 登录 / 注册 / 登出  
- 当前用户信息获取  
- 受保护路由  
- 首页双入口  
- 独立营销落地页  
- 老师风格作为最小启动配置  
- 角色边界在入口层的可见性  

### Out of Scope
- `/profile` 与 `/settings`
- `/learning`
- 视频或课堂真实任务结果
- Companion、Evidence、Learning Coach 的任何执行逻辑  

### Dependencies
- 依赖 `Epic 0`。  
- 受保护访问的一致性依赖 RuoYi 在线态与 FastAPI 认证适配最小打通。  
- 不依赖视频或课堂业务引擎完成。  

### Entry Criteria
- Epic 0 已完成契约与 adapter 基线。  
- `/login` 与首页的 UI 状态说明已稳定。  

### Frontend Design Reference
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/01-首页与入口/01-landingPage.html`
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/01-首页与入口/02-home.html`
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/02-认证页/01-login.html`
- 参考共享状态：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/02-共享交互与通用状态/`
- 当前补充规则：现有成品图未单列 `403 / 权限不足` 页面，但前端仍必须实现清晰的权限不足态或安全回退，不得用 `404/500` 代替

### Exit Criteria
- 用户可通过统一认证页进入受保护页面；  
- 首页双入口清晰可见；  
- 风格选择可作为启动字段稳定透传；  
- 401 / 403 行为在前端、FastAPI、RuoYi 层面一致。  

### Parallel Delivery Rule
Story `1.1` 先冻结认证契约、`401/403` 语义与 mock 会话样例。  
之后认证页、首页与启动壳层可以不等待真实后端并行推进。  
Story `1.3` 完成后，所有受保护页面都可复用同一套认证判断逻辑。  

### Story List
- Story 1.1: 统一认证契约、会话 payload 与 mock 基线  
- Story 1.2: 独立认证页中的注册、登录与回跳  
- Story 1.3: 登出、401 处理与受保护访问一致性  
- Story 1.4: 首页双入口理解与非阻塞推荐提示  
- Story 1.5: 输入壳层中的老师风格最小选择配置  
- Story 1.6: 角色边界与入口级权限可见性  
- Story 1.7: 营销落地页与 home 首页分流

### Story 1.1: 统一认证契约、会话 payload 与 mock 基线
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 冻结统一认证契约、会话 payload 和 mock handler，  
So that 登录链路、受保护路由和首页入口可以并行开发而不互相等待。  

**Acceptance Criteria:**
**Given** Epic 1 开始实施  
**When** 认证契约被首次冻结  
**Then** 登录、注册、登出、当前用户信息、`401` / `403` 语义和回跳参数格式被文档化并对外公布  
**And** 前端可直接消费同一份类型定义与 mock handler，而不是自行猜测字段结构  

**Given** 前端在本地使用 mock 模式开发  
**When** 认证 adapter 从 mock 切换到真实接口  
**Then** 页面状态模型、表单提交流程和受保护路由判断逻辑不需要重写  
**And** mock payload 与真实 payload 的字段语义保持一致  

**Given** 用户信息包含角色与基础展示字段  
**When** 前端读取当前用户 payload  
**Then** 至少能稳定获取用户 ID、昵称、头像、角色列表与权限判断所需基础字段  
**And** 后续页面不需要再通过“额外猜测字段”判断用户身份  

**Deliverables:**
- 认证接口 schema
- mock session 样例
- `401/403` 行为说明
- 回跳参数格式说明

### Story 1.2: 独立认证页中的注册、登录与回跳
**Story Type:** `Frontend Story`  
As a 访客，  
I want 在独立认证页中完成注册或登录并回到原上下文，  
So that 我可以顺畅进入小麦而不会在入口流程里丢失当前位置。  

**Acceptance Criteria:**
**Given** 访客进入 `/login`  
**When** 访客在同一页面切换登录态或注册态并提交有效信息  
**Then** 系统返回明确成功反馈并建立已认证会话  
**And** 成功后跳回原页面或原意图上下文，而不是跳去无关页面  

**Given** 表单输入无效、凭证错误或认证失败  
**When** 用户提交请求  
**Then** 页面展示明确的字段级或表单级错误提示  
**And** 用户可以在当前页直接修正并继续，不会陷入死路流程  

**Given** 用户使用键盘导航  
**When** 用户在登录页操作  
**Then** 表单、提交按钮、登录/注册切换与返回入口具备可见焦点与可用键盘操作  
**And** 不因动画或样式隐藏焦点状态  

**Deliverables:**
- `/login` 页面
- 登录 / 注册切换
- 提交态与错误态
- 成功回跳逻辑

### Story 1.3: 登出、401 处理与受保护访问一致性
**Story Type:** `Backend Story`  
As a 已登录用户，  
I want 前端、FastAPI 与 RuoYi 对认证态给出一致判断，  
So that 我访问受保护资源时不会遇到前后端状态不一致的异常体验。  

**Acceptance Criteria:**
**Given** 用户持有有效 Token 且 Redis 在线态存在对应记录  
**When** 用户访问受保护页面或受保护接口  
**Then** 前端、FastAPI 与 RuoYi 对该会话的判断结果一致  
**And** 用户不会在一个系统被放行、另一个系统被拒绝  

**Given** Token 失效、被撤销或用户主动登出  
**When** 用户再次访问受保护页面或接口  
**Then** 系统统一返回未授权结果并清理本地认证态  
**And** 前端会回到可恢复的未认证状态，而不是无限跳转或停留在坏态  

**Given** 用户访问一个权限不足但已登录的资源  
**When** 系统判定其角色不具备能力  
**Then** 返回 `403` 而不是伪装成 `401`  
**And** 前端能够区分“未登录”和“已登录但无权限”两种状态，并提供明确权限不足态或安全回退说明  

**Deliverables:**
- FastAPI 认证验证逻辑
- Redis 在线态校验
- 前端统一 401 / 403 处理
- 登出流程
- 权限不足态 / 安全回退说明

### Story 1.4: 首页双入口理解与非阻塞推荐提示
**Story Type:** `Frontend Story`  
As a 首次或回访用户，  
I want 首页清楚呈现“主题课堂”和“单题视频”两个入口并在可用时给出推荐，  
So that 我可以几乎不犹豫地开始正确的学习流程。  

**Acceptance Criteria:**
**Given** 用户打开首页  
**When** 页面加载完成  
**Then** 页面清晰展示两个主入口、差异说明和明确 CTA  
**And** 在 1024px 宽度下无需滚动即可看到两个入口的主标题、说明与按钮  

**Given** 推荐上下文可用或不可用  
**When** 首页渲染推荐提示区  
**Then** 推荐提示只起到辅助选择作用而不阻塞入口使用  
**And** 即使推荐逻辑失败，双入口主路径仍然完全可用  

**Given** 用户未登录但访问首页  
**When** 用户点击任一入口 CTA  
**Then** 系统引导其进入 `/login` 并保留原始目标意图  
**And** 登录成功后能恢复到相应输入页，而不是回到首页重新选择  

**Deliverables:**
- 首页双入口模块
- 差异说明区
- 非阻塞推荐提示区
- CTA 跳转逻辑

### Story 1.5: 输入壳层中的老师风格最小选择配置
**Story Type:** `Frontend Story`  
As a 准备发起学习会话的用户，  
I want 在视频或课堂输入壳层中通过轻量下拉选择老师风格，  
So that 当前会话可以带着我期望的讲解风格启动。  

**Acceptance Criteria:**
**Given** 用户进入 `/video/input` 或 `/classroom/input`  
**When** 输入壳层渲染完成  
**Then** 老师风格以下拉方式出现在核心输入区域附近  
**And** 存在默认风格且不需要额外跳到独立配置页面  

**Given** 用户选择某个老师风格并发起任务  
**When** 系统创建请求或 mock 任务  
**Then** 所选风格作为 `AgentConfig` 或等效字段被稳定透传  
**And** 风格选择只影响会话内容行为与局部 teacher indicator，不触发页面级主题切换  

**Given** 页面在 mock 模式下运行  
**When** 用户切换不同风格  
**Then** 页面能够通过局部头像、标签或点缀色体现选择结果  
**And** 不会错误地把风格实现成全站 CSS 主题切换  

**Deliverables:**
- 风格选择器组件
- 默认风格逻辑
- 请求透传字段
- 局部展示效果

### Story 1.6: 角色边界与入口级权限可见性
**Story Type:** `Integration Story`  
As a 学生、教师或管理员，  
I want 在进入系统时看到符合自己角色边界的入口与导航，  
So that 我不会进入与自己无关或无权限的功能路径。  

**Acceptance Criteria:**
**Given** 当前用户拥有学生、教师或管理员角色  
**When** 首页与入口壳层渲染  
**Then** 页面可基于角色显示或隐藏与当前版本相关的入口提示  
**And** 不会向无权限角色暴露误导性的管理动作或不可进入的主路径  

**Given** 用户尝试访问超出自己角色边界的受保护页面  
**When** 路由守卫或后端权限判定生效  
**Then** 系统返回明确的拒绝结果或安全回退路径  
**And** 不会出现页面先渲染完整数据再因后端拒绝而闪退的坏体验  

**Given** 当前版本不扩展独立 ToB 产品域  
**When** 学生端首页与学习路径渲染  
**Then** 管理侧能力不会以学生端主导航形式暴露  
**And** 角色边界保持与 RuoYi 的权限体系一致，而非由前端自建第二套角色规则  

**Deliverables:**
- 角色基础能力映射表
- 入口级显隐策略
- 受保护页面角色限制规则
- 权限不足时的 UI 回退说明

---
### Story 1.7: 营销落地页与 home 首页分流
**Story Type:** `Frontend Story`  
As a 营销访客或试点线索，  
I want 通过独立营销落地页了解小麦价值并进入默认产品首页，  
So that 产品获客与实际使用入口可以同时清晰成立而不互相污染。  

**Acceptance Criteria:**
**Given** 访客通过活动投放、赛事展示或合作链接进入 `/landing`  
**When** 页面加载完成  
**Then** 页面可清晰展示品牌价值、双入口能力概览、老师风格亮点与试点 / 合作 CTA  
**And** 营销页的信息结构不替代 `/` 的默认产品首页职责  

**Given** 访客点击主要体验 CTA  
**When** 访客希望进入产品  
**Then** 系统将其带到 `/` 或 `/login` 并保持目标意图  
**And** 默认直接访问产品时仍进入 `/` 而不是营销页  

**Given** 营销页展示教师 / 院校 / 试点方案  
**When** 访客阅读并发起动作  
**Then** 这些模块以咨询、预约、申请等营销转化动作承接  
**And** 不要求当前学生端已经存在独立 ToB 工作台或自助开通流程  

**Deliverables:**
- `/landing` 页面
- `/` 与 `/landing` 路由分流规则
- 体验 CTA 与合作 CTA 衔接说明
- 营销页信息架构与状态说明
