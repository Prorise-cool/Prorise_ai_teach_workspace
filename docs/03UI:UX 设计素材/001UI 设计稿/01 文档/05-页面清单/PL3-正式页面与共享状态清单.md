# PL3-正式页面与共享状态清单

**文档版本：** v1.0  
**生成日期：** 2026-03-27  
**适用范围：** PL3（正式路由页面、非路由交互、通用反馈状态、线框/成品图覆盖与缺口）

## 1. 文档目的

本文件用于把“小麦”在当前阶段需要交付的：
- 正式路由页面（Route Inventory）
- 非路由交互（Non-Route Interactions）
- 通用反馈状态（Global Feedback States）
- P0 / P1 / P2 优先级分层
- 已有线框图 / 成品图覆盖情况与缺口

统一整理为一份可执行清单，满足：
- 页面无孤岛：每个正式路由页面都能指出至少一个入口或回流来源（若不确定则标“待确认点”）。
- 缺失页面显式标红：对“应有但缺失线框/缺失规格/缺失成品图”的页面，明确标红并列入缺口。
- 现有线框与页面清单可一一映射：每个正式路由页面都能映射到现有 `03-线框图` 中的主线框文件；若无法映射则标红为缺口。

### 1.1 事实源与引用边界（强约束）

唯一业务事实源（仅用于事实判断）：
- `_bmad-output/planning-artifacts/archive/prd.md`
- `_bmad-output/planning-artifacts/archive/ux-design-specification.md`
- `_bmad-output/planning-artifacts/archive/architecture.md`
- `_bmad-output/planning-artifacts/archive/epics.md`

仅用于结构对齐与衔接（不作为事实源）：
- `IN0-设计输入包冻结版.md`
- `IA1-*` 信息架构文档
- `UF2-*` 用户流文档
- `03-线框图/*`、`04-成品图/*`（本轮冻结目录，仅做覆盖映射与缺口盘点）

## 2. 正式页面总表（Route Inventory）

说明：
- “规格覆盖”指是否存在可直接指导页面实现的“页面级规格”。目前以 `ux-design-specification.md` 的页面级章节为主；若仅在 PRD/史诗中出现“页面能力描述”但缺少页面级交互/布局细化，则视为“规格待补”。
- “线框覆盖”要求能映射到 `03-线框图` 的主线框文件；映射不到即为缺口。
- “成品图覆盖”以 `04-成品图` 当前实际文件为准；若未发现对应成品图，标为缺口或待确认。

| 页面 ID | 路由（建议） | 页面名（建议） | 模块 | 优先级 | 受保护 | 主要后端 | 入口/回流（无孤岛校验） | 线框覆盖（冻结资产映射） | 成品图覆盖 | 规格覆盖（事实源） | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R-001 | `/` | 首页与双入口 | 首页 | P0 | 否 | RuoYi（可选） | 产品入口；登出回退；未登录可访问 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/01-首页与入口/02-home.html` | <span style="color:#d00">缺失（除落地页外未发现）</span> | ✅ UX §7.2；PRD FR-UI-001；Epics UX-DR1~DR4 | 首页含“登录/注册”触发，点击后进入独立登录页。 |
| R-001A | `建议：/login` | 登录页 | 认证 | P0 | 否 | RuoYi | 从首页主动登录进入；从未登录拦截与 401 恢复回流进入 | <span style="color:#d00">缺失（当前仅有 auth-dialog 共享资产，不等于登录页线框）</span> | <span style="color:#d00">缺失</span> | <span style="color:#d00">规格待补</span>；当前以 UF2-首页与认证流程冻结 | 当前轮已冻结为独立路由页；注册建议作为同页状态切换承载。 |
| R-002 | `/video/input` | 视频题目输入页（问答入口） | 视频 | P0 | 是 | FastAPI | 从 `/` 的“我有问题”入口；或全局入口（待确认具体导航形态） | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/03-视频模块/01-input.html` | <span style="color:#d00">缺失</span> | ✅ UX §7.3；PRD FR-UI-003；Epics UX-DR5~DR8 | 输入页内含：打字/拍照/粘贴、OCR、老师风格面板展开（见 NR-004）。 |
| R-003 | `/video/:id/generating` | 视频生成进度页 | 视频 | P0 | 是 | FastAPI | 从 R-002 创建任务进入；断线重进（同任务） | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/03-视频模块/02-generating.html` | <span style="color:#d00">缺失</span> | ✅ UX §7.4 / §12；Epics UX-DR9~DR11 | 等待体验与课堂共用进度语义（见 NR-005 / GS- 系列）。轮询 `/status` 为 API 能力，不是页面路由。 |
| R-004 | `/video/:id` | 视频结果页（含播放） | 视频 | P0 | 是 | FastAPI + RuoYi | 从 R-003 完成后自动跳转；从历史/收藏/学习中心回看进入（部分入口待确认） | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/03-视频模块/03-video-result.html` | <span style="color:#d00">缺失</span> | ✅ UX §7.5；PRD FR-UI-004；Epics UX-DR12~DR14 | 分享（P1）为非路由交互（见 NR-007）。“继续追问”承载方式待与 `/knowledge` 关系对齐（见待确认点）。 |
| R-005 | `/classroom/input` | 课堂主题输入页（初学入口） | 课堂 | P0 | 是 | FastAPI | 从 `/` 的“我想学”入口；或全局入口（待确认具体导航形态） | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/02-课堂模块/01-input.html` | <span style="color:#d00">缺失</span> | <span style="color:#d00">规格待补（缺少 UX 页面级章节）</span>；PRD FR-UI-002；Epics UX-DR21 | 输入页的老师风格与会话配置需与视频输入一致（见 NR-004）。 |
| R-006 | `/classroom/:id/generating` | 课堂生成进度页 | 课堂 | P0 | 是 | FastAPI | 从 R-005 创建任务进入；断线重进（同任务） | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/02-课堂模块/02-generating.html` | <span style="color:#d00">缺失</span> | ✅ UX §7.4 / §12（等待体验共用）；Epics UX-DR9~DR11、UX-DR21 | 等待体验应共用统一进度组件（见 NR-005）。 |
| R-007 | `/classroom/:id` | 课堂结果页（含测验入口） | 课堂 | P0 | 是 | FastAPI + RuoYi | 从 R-006 完成后进入；从历史/学习中心回看进入（待确认） | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/02-课堂模块/03-classroom.html` | <span style="color:#d00">缺失</span> | <span style="color:#d00">规格待补（缺少 UX 页面级章节）</span>；PRD FR-UI-002 | 课堂内进入测验的跳转为 R-010（见 UF2-课堂）。 |
| R-008 | `/knowledge` | 知识问答页 | 知识问答 | P0（PRD）/P1（部分 IA/线框优先级） | 是 | FastAPI | 从全局入口或学习中心/结果页的“继续问 AI 老师”回流（待确认） | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/04-知识问答模块/01-knowledge.html` | <span style="color:#d00">缺失</span> | ✅ UX §8；PRD FR-UI-006；Epics UX-DR22 | 优先级分歧需评审冻结（见待确认点）。 |
| R-009 | `/learning` | `LearningCenter.tsx` 页面组件 | 学习结果聚合 | P0 | 是 | RuoYi（聚合） | 从首页 / 全局导航 / 结果页回流进入 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/08-学习中心模块/01-learning.html` | <span style="color:#d00">缺失</span> | <span style="color:#d00">缺失（页面级规格待补）</span>；PRD FR-UI-007 | 负责学习结果聚合；历史 / 收藏属于其结果管理视图。 |
| R-010 | `候选：/quiz/:sessionId` | 测验承载页（若独立路由化） | 测验 | P0 能力 / P1 页面 | 是 | FastAPI + RuoYi | 从课堂结果页 R-007 进入；从 LearningCenter / 历史视图回流（待确认） | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/05-课后小测模块/01-quiz-session.html` | <span style="color:#d00">缺失</span> | ✅ UX §9；Epics UX-DR23 | 能力闭环必须存在，但参数命名与是否独立页面未在 architecture 中冻结。 |
| R-011 | `候选：/path` | 学习路径承载页 | 学习路径 | P2 能力 / 路径待冻结 | 是 | FastAPI | 从 LearningCenter 或结果页进入（待确认）；或未来独立入口 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/06-学习路径模块/01-path.html` | <span style="color:#d00">缺失</span> | ✅ UX §10；Epics UX-DR24 | P2 后置能力，本文保留入口，不把它写死为正式路由。 |
| R-012 | `/profile` | `Profile.tsx` 页面组件 | 个人域 | P1 | 是 | RuoYi | 右上角头像入口；登录后可见 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/07-个人中心模块/01-profile.html` | <span style="color:#d00">缺失</span> | <span style="color:#d00">规格待补（UX 未给页面级章节）</span>；PRD FR-UI-005；Epics UX-DR25 | 只承接个人资料，不再承接历史 / 收藏聚合。 |
| R-013 | `/history` | 历史视图 | 学习结果聚合 | P1 | 是 | RuoYi | 从 `/learning` 进入；打开后可跳回 R-004 / R-007 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/07-个人中心模块/02-history.html` | <span style="color:#d00">缺失</span> | <span style="color:#d00">规格待补</span>（PRD 仅要求能力，不含页面级细化） | 业务归属已固定为学习结果聚合域；当前仍沿用既有文件目录。 |
| R-014 | `/favorites` | 收藏视图 | 学习结果聚合 | P2（线框）/P1（能力面） | 是 | RuoYi | 从 `/learning` 进入；收藏来源于 R-004 / R-007 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/07-个人中心模块/03-favorites.html` | <span style="color:#d00">缺失</span> | <span style="color:#d00">规格待补</span>；Epics UX-DR25 | 业务归属已固定为学习结果聚合域；当前仍沿用既有文件目录。 |
| R-015 | `/settings` | 设置视图 | 个人域 | P2（线框）/P1（能力面） | 是 | RuoYi | 从 `/profile` 进入 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/07-个人中心模块/04-settings.html` | <span style="color:#d00">缺失</span> | <span style="color:#d00">规格待补</span>；Epics UX-DR25 | 只承接平台设置、语言主题、账号安全与通知偏好。 |

### 2.1 非产品路由资产（设计交付，非事实源强制项）

说明：以下内容在现有交付物中存在“线框/成品图”，但是否属于产品对外正式路由，需产品评审确认后冻结。

| 资产 ID | 建议路由 | 名称 | 优先级 | 线框覆盖 | 成品图覆盖 | 备注 |
|---|---|---|---|---|---|---|
| A-001 | <span style="color:#d00">待确认</span>（例如 `/landing`） | 落地页（Landing Page） | 待确认 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/01-正式路由页面/01-首页与入口/01-landingPage.html` | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-落地页/index.html` | 当前 `04-成品图` 仅发现落地页；其它正式页面成品图未发现，见缺口。 |

## 3. 非路由交互清单（Non-Route Interactions）

说明：非路由交互不应新增额外主路由；当前轮已把登录冻结为独立路由页，因此本节不再把“主动登录入口”写成 Dialog 形态的主承载。

| 交互 ID | 交互名称 | 触发页面（Route） | 形态 | 优先级 | 线框覆盖（冻结资产映射） | 规格覆盖（事实源/对齐） | 备注 |
|---|---|---|---|---|---|---|---|
| NR-001 | 登录页内的登录 / 注册模式切换 | R-001A | Tab / Segment / Inline Form | P0 | <span style="color:#d00">缺失（当前仅有 auth-dialog 共享资产）</span> | 当前以 UF2-首页与认证流程冻结 | 登录已改为独立路由页；`auth-dialog` 只能视为历史共享资产参考，不能继续当作主承载。 |
| NR-002 | 资料初始化弹层（Profile Setup） | 首次登录后；或个人域进入前 | Dialog | P1 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/02-共享交互与通用状态/01-认证与资料初始化/04-profile-setup-dialog.html` | 对齐 UF/IA（非事实源） | 具体触发条件与字段范围需在页面规格补齐并冻结。 |
| NR-003 | 未登录拦截与统一登录流（returnTo） | 任一受保护路由 | Redirect + Login Flow | P0 | <span style="color:#d00">待确认（线框未单独表达登录页）</span> | ✅ `architecture.md` §10.3.1 / §10.3.3；UF2-首页与认证 §2/§3/§4 | 401 固定为“清除 Token + 跳转登录页”；登录成功后可按 `returnTo` 回到原目标。 |
| NR-004 | 老师风格选择器（会话配置） | R-002、R-005（输入页） | Panel（触发器展开） | P0 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/02-共享交互与通用状态/03-会话配置与风格面板/03-teacher-style-panel.html`（也在输入页内表达） | ✅ UX §13；Epics UX-DR7~DR8；PRD FR-UI-003/FR-CS-004 | 仅局部点缀色，不做页面级主题切换。 |
| NR-005 | 统一任务进度壳层（共享等待体验组件） | R-003、R-006（generating 页内部） | 页面内共享组件 | P0 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/02-共享交互与通用状态/02-任务等待与进度/02-task-progress-shell.html` | ✅ UX §12；Epics UX-DR9~DR11 | 不是独立路由（不应出现 `/progress-shell`）。 |
| NR-006 | 视频输入的多模态输入辅助（拍照/粘贴/上传/OCR 失败回退） | R-002 | Inline + 权限提示 | P0 | ✅（在 `03-视频模块/01-input.html` 内表达） | ✅ PRD FR-VS-001；Epics UX-DR5~DR6 | 权限提示具体文案与错误态需落到通用反馈状态（GS- 系列）。 |
| NR-007 | 分享动作（复制链接/海报/二维码等） | R-004 | Dialog / Drawer | P1 | <span style="color:#d00">待确认（线框未显式拆出）</span> | ✅ Epics UX-DR14 | 需在成品图与页面规格冻结后进入开发。 |
| NR-008 | 收藏/取消收藏 | R-004、R-007、R-013、R-014 | Inline + Toast | P1 | ✅（页面内表达） | PRD（能力存在）；对齐线框与 IA（非事实源） | 统一使用 GS-003（Toast）反馈。 |
| NR-009 | 删除确认（历史/收藏） | R-013、R-014 | Confirm Dialog | P1 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/02-共享交互与通用状态/04-通用反馈状态/confirm-dialog.html` | 对齐 UF2-知识问答与学习沉淀 §4.3（非事实源） | 需补齐不可逆操作提示与撤销策略（如有）。 |
| NR-010 | 知识问答引用来源展示（Citation） | R-008 | Popover / Drawer | P1 | ✅（在 `04-知识问答模块/01-knowledge.html` 内表达） | ✅ UX §8.3 | 引用来源的数据结构与 API 见 UX §8.4/§8.5。 |

## 4. 通用反馈状态清单（Global Feedback States）

说明：通用反馈状态为跨路由复用的“状态资产”，可全页或局部承载；其中 401/403 的统一语义需与认证策略一起冻结。

| 状态 ID | 状态类型 | 承载方式 | 适用范围 | 优先级 | 线框覆盖（冻结资产映射） | 事实源对齐 | 备注 |
|---|---|---|---|---|---|---|---|
| GS-001 | Loading（加载中） | 全页或局部骨架 | 全部路由 | P0 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/02-共享交互与通用状态/04-通用反馈状态/loading.html` | PRD NFR-PF（性能）/UX §12（等待） | 首页与结果页需要区分首屏加载与数据加载（待在页面规格细化）。 |
| GS-002 | Empty（空态） | 全页或局部 | 列表型页面（历史/收藏/学习中心等） | P2（线框）/P1（体验） | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/02-共享交互与通用状态/04-通用反馈状态/empty-state.html` | PRD FR-UI-007（学习中心聚合） | 学习中心缺失线框时，空态样式仍可复用该资产。 |
| GS-003 | Toast（轻量提示） | Toast | 全部路由 | P2（线框）/P0（语义） | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/02-共享交互与通用状态/04-通用反馈状态/toast.html` | UX §12.3（错误处理统一）；Epics UX-DR10 | 需要统一成功/警告/错误语义色与文案规范。 |
| GS-004 | Confirm Dialog（确认对话框） | Dialog | 删除/取消/不可逆操作 | P1 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/02-共享交互与通用状态/04-通用反馈状态/confirm-dialog.html` | 事实源未细化（需页面规格补齐） | 需明确：是否支持撤销（Undo）与二次确认策略。 |
| GS-005 | Error 404（资源不存在） | 全页错误页 | 未知路由/资源缺失 | P0（线框） | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/02-共享交互与通用状态/04-通用反馈状态/error-404.html` | PRD（可恢复与出口） | 当结果页资源缺失（例如视频被删）时可复用该样式，但需在页面内给回流入口。 |
| GS-006 | Error 500（服务异常） | 全页错误页 | 全部路由 | P1 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/02-共享交互与通用状态/04-通用反馈状态/error-500.html` | UX §12.3 | 需与“降级提示/Provider 切换”区分（见 NR-005）。 |
| GS-007 | Network Error（网络异常） | 全页或局部 | SSE/请求失败 | P1 | ✅ `docs/03UI:UX 设计素材/001UI 设计稿/03-线框图/02-共享交互与通用状态/04-通用反馈状态/error-network.html` | UX §12；UF2-视频 §4.2（非事实源） | 与断线恢复策略绑定，需明确重试上限与回退动作。 |
| GS-008 | 401（登录失效 / 未认证） | 登录页跳转 + 页面提示 | 受保护路由 | P0 | <span style="color:#d00">待确认（线框未提供登录页专用页）</span> | `architecture.md` §10.3.1 / §10.3.3；UF2-首页与认证 §5.3 | 固定语义：清除 Token，并跳转登录页；不再把 Auth Dialog 写成默认 401 承载。 |
| GS-009 | 403（无权限 / 登录失效） | Modal / 页面提示 | 受保护资源 | P1 | <span style="color:#d00">待确认（线框未提供专用页）</span> | `architecture.md` §10.3.1 / §10.3.3；UF2-首页与认证 §5.3 | 固定语义：进入统一提示通道，提供返回或重新认证出口。 |

## 5. 优先级分层（P0 / P1 / P2）

### 5.1 P0（必须，Route + 关键共享状态）

正式路由页面（P0）：
- `/`、`建议：/login`、`/video/input`、`/video/:id/generating`、`/video/:id`
- `/classroom/input`、`/classroom/:id/generating`、`/classroom/:id`
- `/knowledge`（PRD 为 P0，优先级分歧见待确认点）
- `/learning`

关键非路由交互与状态（P0）：
- 登录流与回跳（NR-003）
- 老师风格面板（NR-004）
- 统一任务进度壳层（NR-005）
- Loading（GS-001）、404（GS-005）

### 5.2 P1（应该，增强体验与个人域闭环）

正式路由页面（P1）：
- 测验承载页（候选：`/quiz/:sessionId`）
- `Profile.tsx` 页面组件与历史视图

关键非路由交互与状态（P1）：
- 资料初始化弹层（NR-002）
- 分享动作（NR-007，需补线框/规格）
- 删除确认（NR-009）、Confirm Dialog（GS-004）、Network Error（GS-007）

### 5.3 P2（可后置，扩展能力与完善）

正式路由页面（P2）：
- 学习路径承载页（候选：`/path`）
- 收藏视图、设置视图

关键通用状态（P2）：
- Empty（GS-002）、Toast（GS-003）

## 6. 覆盖情况与缺口（线框 / 成品图 / 规格）

### 6.1 线框覆盖情况（03-线框图）

可一一映射（✅）的正式路由页面：
- `/` → `03-线框图/01-正式路由页面/01-首页与入口/02-home.html`
- `建议：/login` → <span style="color:#d00">当前缺登录页线框；`auth-dialog` 不能等同替代</span>
- `/video/input` → `03-线框图/01-正式路由页面/03-视频模块/01-input.html`
- `/video/:id/generating` → `03-线框图/01-正式路由页面/03-视频模块/02-generating.html`
- `/video/:id` → `03-线框图/01-正式路由页面/03-视频模块/03-video-result.html`
- `/classroom/input` → `03-线框图/01-正式路由页面/02-课堂模块/01-input.html`
- `/classroom/:id/generating` → `03-线框图/01-正式路由页面/02-课堂模块/02-generating.html`
- `/classroom/:id` → `03-线框图/01-正式路由页面/02-课堂模块/03-classroom.html`
- `/knowledge` → `03-线框图/01-正式路由页面/04-知识问答模块/01-knowledge.html`
- 测验承载页（候选：`/quiz/:sessionId`）→ `03-线框图/01-正式路由页面/05-课后小测模块/01-quiz-session.html`
- 学习路径承载页（候选：`/path`）→ `03-线框图/01-正式路由页面/06-学习路径模块/01-path.html`
- `Profile.tsx` 页面组件（候选：`/profile`）→ `03-线框图/01-正式路由页面/07-个人中心模块/01-profile.html`
- 历史视图 → `03-线框图/01-正式路由页面/07-个人中心模块/02-history.html`（文件位置可映射，但业务归属应视为 LearningCenter）
- 收藏视图 → `03-线框图/01-正式路由页面/07-个人中心模块/03-favorites.html`（文件位置可映射，但业务归属应视为 LearningCenter）
- 设置视图 → `03-线框图/01-正式路由页面/07-个人中心模块/04-settings.html`
- `LearningCenter.tsx` 页面组件（候选：`/learning`）→ `03-线框图/01-正式路由页面/08-学习中心模块/01-learning.html`

当前需要继续补强的是“页面级规格”与“成品图”，不再存在正式路由主线框缺口。

### 6.2 成品图覆盖情况（04-成品图）

已确认存在成品图的页面：
- 落地页（A-001）：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-落地页/index.html`

其余页面成品图覆盖：
- <span style="color:#d00">待确认/缺失</span>：当前 `04-成品图` 目录未发现除落地页外的其它成品图页面资产。

### 6.3 规格覆盖情况（事实源）

已具备页面级规格（可直接指导实现）的页面：
- `/`：UX §7.2 + PRD FR-UI-001
- `建议：/login`：<span style="color:#d00">当前缺 archive 级页面规格，需以后续登录页规格补齐</span>
- `/video/input`：UX §7.3 + PRD FR-UI-003
- `/video/:id/generating`、`/classroom/:id/generating`：UX §7.4 / §12（统一等待体验）
- `/video/:id`：UX §7.5 + PRD FR-UI-004
- `/knowledge`：UX §8 + PRD FR-UI-006
- 测验承载页（候选：`/quiz/:sessionId`）：UX §9
- 学习路径承载页（候选：`/path`）：UX §10

缺失页面级规格（需显式标红，后续应落入“12-高保真页面规格”补齐）：
- <span style="color:#d00">独立登录页（建议：`/login`）</span>
- <span style="color:#d00">`/classroom/input`（课堂输入页）</span>
- <span style="color:#d00">`/classroom/:id`（课堂结果页）</span>
- <span style="color:#d00">`/learning`（学习中心聚合页，页面级规格待补）</span>
- <span style="color:#d00">`/profile`、`/settings`（个人资料与平台设置页面）</span>
- <span style="color:#d00">`/history`、`/favorites`（学习中心结果管理视图）</span>

## 7. 冲突 / 待确认点

> 本节只记录差异，不擅自改写事实源或冻结目录资产。

1. <span style="color:#d00">独立登录页的最终路径与注册承载方式</span>：当前轮已冻结“登录为独立路由页”，建议使用 `/login`；但事实源尚未写明是否需要独立 `/register` / `/forgot-password`。
2. <span style="color:#d00">`/knowledge` 与 `/quiz/:sessionId` 的优先级分歧</span>：PRD 把“知识问答页”列为 P0（FR-UI-006），但部分 IA/线框优先级中 `/knowledge` 标为 P1；需以 PRD 与里程碑为准冻结最终优先级，并同步到页面交付 Gate。
3. <span style="color:#d00">历史 / 收藏视图的呈现层级</span>：职责归属已经固定到学习中心，但它们最终采用一级路由、二级路由还是学习中心内 Tab，仍可在交互实现层继续优化。
3. <span style="color:#d00">LearningCenter / Profile 与其内部视图的边界冻结</span>：当前轮已冻结“学习中心负责结果聚合、个人中心只负责资料 / 设置”，但仍需评审历史 / 收藏 / 设置是内部视图、子路由还是独立路由。
4. 视频结果页的“继续追问”承载形态：是跳转到 `/knowledge`，还是结果页内侧边交互区形成局部对话（或二者并存）需冻结，以避免页面语义漂移与孤岛入口。
5. 成品图覆盖现状：目前只发现“落地页”成品图，其它正式页面成品图覆盖情况无法确认，需后续补齐或在 Gate 中明确不作为本阶段前置。
