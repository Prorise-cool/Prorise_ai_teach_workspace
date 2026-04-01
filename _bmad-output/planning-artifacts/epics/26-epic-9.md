## Epic 9: 学习中心聚合、个人管理与长期回看
用户可以在学习中心聚合查看历史、收藏、测验结果与推荐内容，并管理个人资料与平台设置。  
**FRs covered:** `FR-UM-003`、`FR-UI-005`、`FR-UI-007`、`FR-UI-008`、`FR-LA-006`、`FR-LR-001~004`  
**NFRs covered:** `NFR-UX-005`、`NFR-UX-003`、`NFR-PF-001`  
**Primary Story Types:** `Contract Story`、`Frontend Story`、`Backend Story`、`Integration Story`

### Objective
Epic 9 负责长期沉淀的“前台消费层”。  
它聚合：
- 历史记录；
- 收藏；
- Companion 回看；
- Evidence 回看；
- checkpoint / quiz / wrongbook / recommendation / path 回看；
- 个人资料；
- 设置与 i18n 预留。  

它不负责：
- 长期数据如何落库；
- 后台审计如何实现；
- 具体 Learning Coach 生成逻辑。  

### Scope
- `/learning`
- `/history`
- `/favorites`
- `/profile`
- `/settings`
- 聚合卡片 schema
- 分页列表
- 详情打开入口
- 收藏 / 取消收藏 / 删除
- i18n 资源接入规则

### Out of Scope
- RuoYi 业务表本身的建表
- 后台 CRUD 页面
- Learning Coach 生成服务
- Evidence 外部能力适配

### Dependencies
- 依赖 `Epic 10` 的长期数据承接。
- 依赖 `Epic 6`、`Epic 7`、`Epic 8` 的结果字段稳定。
- 可在 mock 数据集下先开发页面，不阻塞于真实后端全部完成。  

### Entry Criteria
- 学习中心域页面边界冻结：`/learning` 聚合、`/history` 与 `/favorites` 为学习中心域、`/profile` 与 `/settings` 分离。  
- 聚合卡片结构、分页参数、时间格式、空态 / 错态说明稳定。  

### Frontend Design Reference
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/12-学习中心页/01-learning.html`
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/14-历史记录页/01-history.html`
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/15-收藏页/01-favorites.html`
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/13-个人资料页/01-profile.html`
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/16-设置页/01-settings.html`
- 当前补充规则：学习中心、历史、收藏的成品图只展示样例卡片，不代表结果类型全集；正式实现仍需覆盖视频、课堂、Companion、Evidence、checkpoint、quiz、wrongbook、path、recommendation 等业务类型

### Exit Criteria
- 用户可在 `/learning` 聚合查看主要学习结果；
- `/history`、`/favorites` 可分页查看与管理；
- `/profile` 与 `/settings` 不混入学习结果；
- i18n 关键静态文案进入资源管理；
- 页面可在 mock / real 下保持一致状态机。  

### Parallel Delivery Rule
Story `9.1` 是学习中心与个人域页面的前置契约。  
Story `9.2`、`9.3`、`9.4` 可在 mock 数据集下并行推进。  
真实联调仅在 `Epic 10` 与对应业务域长期数据 schema 稳定后进行。  

### Story List
- Story 9.1: 学习中心聚合契约、分页结构与 mock 数据集  
- Story 9.2: 学习中心结果回看与入口整合  
- Story 9.3: 历史记录与收藏管理  
- Story 9.4: 个人资料与设置管理  
- Story 9.5: i18n 架构预留与关键静态文案资源化  

### Story 9.1: 学习中心聚合契约、分页结构与 mock 数据集
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 先冻结学习中心聚合 schema、分页结构与 mock 数据集，  
So that 聚合页、历史页、收藏页与结果回看都可以并行开发。  

**Acceptance Criteria:**
**Given** 学习中心域开始实施  
**When** 聚合契约首次冻结  
**Then** `/learning`、`/history`、`/favorites` 所需的分页字段、聚合卡片结构和结果摘要字段被统一定义  
**And** 前端可以直接消费 mock 数据集建设完整列表、空态、错态和权限态  

**Given** 学习中心需要聚合多种结果类型  
**When** 团队查看聚合卡片 schema  
**Then** 能明确区分视频、课堂、Companion、Evidence、checkpoint、quiz、wrongbook、path、recommendation 等结果类型  
**And** 每类结果至少具备统一的标题、摘要、时间、状态、来源与打开动作字段  

**Given** 前端在本地切换 mock 或真实 adapter  
**When** 学习中心页面读取列表与详情  
**Then** 页面状态管理和分页逻辑保持不变  
**And** 无需为不同后端实现额外维护第二套展示逻辑  

**Deliverables:**
- 聚合卡片 schema
- 分页 schema
- mock learning center dataset
- 结果类型枚举

### Story 9.2: 学习中心结果回看与入口整合
**Story Type:** `Frontend Story`  
As a 回访用户，  
I want 在学习中心统一查看视频、课堂、Companion、证据问答、checkpoint、quiz 和推荐结果，  
So that 我能把所有学习结果作为一个连续旅程来回看。  

**Acceptance Criteria:**
**Given** 用户进入 `/learning`  
**When** 页面加载完成  
**Then** 页面按聚合维度展示至少当前聚焦 / 继续学习、我的收藏、错题本、依据溯源、学习路径、小测结果与推荐入口  
**And** 用户能够从同一聚合页重新打开对应结果详情，或继续进入 `/history`、`/favorites`、错题专项与路径查看等后续动作  

**Given** 某类结果为空、查询失败或权限不足  
**When** 学习中心渲染该模块  
**Then** 页面展示明确的空态、错态或权限提示  
**And** 其他模块仍保持可用而不会被整体拖垮  

**Given** 页面运行在 mock 模式  
**When** 验收聚合页  
**Then** 至少能覆盖多类型混合列表、单类型为空、某模块失败、全部为空和权限失败五类场景  
**And** 页面不需要等待所有真实结果源联通后才开始开发  

**Deliverables:**
- `/learning` 页面
- 聚合模块渲染
- 详情打开入口
- 继续学习入口
- 错题 / 依据溯源 / 路径 / 推荐模块

### Story 9.3: 历史记录与收藏管理
**Story Type:** `Frontend Story`  
As a 已登录用户，  
I want 查看、收藏、取消收藏和删除我的学习记录，  
So that 我可以主动整理自己的学习成果。  

**Acceptance Criteria:**
**Given** 用户已产生课堂、视频、Companion 或 Learning Coach 结果  
**When** 用户进入 `/history` 或 `/favorites`  
**Then** 页面分页展示对应数据并支持跳转到原结果  
**And** 分页结构、时间格式和返回语义与统一约定保持一致  

**Given** 用户执行收藏、取消收藏或删除记录  
**When** 操作成功或失败  
**Then** 页面立即反馈当前状态变化或错误原因  
**And** 删除、收藏等长期数据变更进入 RuoYi 业务承接边界而不是只停留在运行态缓存中  

**Given** 页面运行在 mock 模式  
**When** 演示记录管理  
**Then** 至少覆盖收藏成功、取消收藏成功、删除成功、删除失败、分页加载更多与无数据场景  
**And** 页面状态机不依赖真实后端联调才可完成  

**Deliverables:**
- `/history` 页面
- `/favorites` 页面
- 收藏 / 取消收藏动作
- 删除动作
- 分页加载逻辑

### Story 9.4: 个人资料与设置管理
**Story Type:** `Frontend Story`  
As a 已登录用户，  
I want 在个人中心管理个人资料与平台偏好，  
So that 我可以维护自己的身份信息和使用习惯，而不把学习结果混进个人页。  

**Acceptance Criteria:**
**Given** 用户进入 `/profile` 或 `/settings`  
**When** 页面加载完成  
**Then** `/profile` 只承接资料查看与修改，`/settings` 承接账号安全入口与平台设置 / 账号偏好  
**And** 学习历史、收藏与学习结果不再回流到个人中心主页  

**Given** 用户修改昵称、头像、学校等基础资料  
**When** 提交修改  
**Then** 页面返回明确成功或失败反馈  
**And** 不会将资料修改与学习中心聚合逻辑混杂在一个页面中处理  

**Given** 用户进入 `/settings`  
**When** 页面查看平台设置与账号偏好  
**Then** 页面至少提供密码修改入口、主题模式、界面语言、通知偏好与退出登录动作  
**And** 这些设置项与 `/profile` 的资料编辑保持职责分离，不混入学习结果聚合内容  

**Given** 页面运行在 mock 模式  
**When** 验收个人域页面  
**Then** 至少能覆盖资料加载成功、保存成功、保存失败、设置切换成功、退出登录反馈与权限失败场景  
**And** 页面不依赖真实个人资料服务先跑通才开始建设  

**Deliverables:**
- `/profile` 页面
- `/settings` 页面
- 资料编辑表单
- 账号安全入口
- 平台偏好项
- 主题 / 语言 / 通知 / 退出登录项
- 保存反馈

### Story 9.5: i18n 架构预留与关键静态文案资源化
**Story Type:** `Integration Story`  
As a 前端团队，  
I want 为未来中英双语切换预留架构能力，  
So that MVP 虽默认中文，但不会因后期国际化而大规模返工。  

**Acceptance Criteria:**
**Given** 前端为未来多语言做架构预留  
**When** 页面定义关键静态文案  
**Then** 所有关键静态文本进入 i18n 资源管理而不是硬编码在组件内部  
**And** MVP 默认中文体验保持不变  

**Given** 当前阶段暂不要求完整双语上线  
**When** 前端接入 i18n 框架  
**Then** 页面结构、组件 props 与状态文案组织方式已适配未来扩展  
**And** 不要求本阶段完成所有动态内容翻译  

**Given** 学习中心、个人资料、设置等页面逐步接入资源化文案  
**When** 团队检查页面代码  
**Then** 关键导航、标题、CTA、状态文案具备资源键而非散落硬编码  
**And** 后续补充英文资源时不需要大面积改动组件结构  

**Deliverables:**
- i18n 接入基线
- 关键文案资源化
- 资源键命名规范
- MVP 默认中文策略说明

---
