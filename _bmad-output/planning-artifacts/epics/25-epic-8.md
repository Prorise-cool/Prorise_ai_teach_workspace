## Epic 8: 学后巩固、测验与学习路径
用户可以在会话后完成 checkpoint、quiz、错题沉淀、推荐获取与学习路径规划。  
**FRs covered:** `FR-LA-001~005`  
**NFRs covered:** `NFR-UX-003`、`NFR-AR-005`  
**Primary Story Types:** `Contract Story`、`Frontend Story`、`Backend Story`、`Persistence Story`、`Integration Story`

### Objective
Epic 8 负责“会话后层”。  
它不进入视频 / 课堂主叙事，而是在会话结束后接手：
- checkpoint；
- quiz；
- wrongbook；
- recommendation；
- path。  

它回答的问题是：
- 我学会了吗？
- 哪些地方错了？
- 接下来该怎么学？  

### Scope
- Learning Coach 入口
- checkpoint
- quiz
- recommendation
- wrongbook
- path planning
- path save / adjust
- 会话后入口承接

### Out of Scope
- 会话内即时追问
- 资料依据面板
- 学习中心总聚合页
- 个人资料与设置

### Dependencies
- 依赖 `Epic 5` 的课堂结束信号；视频侧如需接入，也依赖视频结果后的后续动作入口。
- 依赖 `Epic 6` 的问答沉淀作为学习行为参考。
- 依赖 `Epic 7` 的资料能力作为部分增强来源。
- 依赖 `Epic 10` 的 quiz、path、wrongbook 等长期承接。  

### Entry Criteria
- 会话后路由与页面边界已冻结。  
- `checkpoint / quiz / path` 的最小交互状态说明已稳定。  

### Frontend Design Reference
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/10-Checkpoint 与 Quiz 页/01-entry.html`
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/10-Checkpoint 与 Quiz 页/02-checkpoint.html`
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/10-Checkpoint 与 Quiz 页/03-quiz.html`
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/11-学习路径页/01-path.html`
- 参考入口页面：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/05-视频结果页/02-video-result.html`
- 参考入口页面：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/08-课堂结果页/01-classroom.html`
- 当前补充规则：`Checkpoint / Quiz` 成品图已拆分为会话后入口、checkpoint、quiz 三个独立页面，正式实现必须分别对应独立路由与页面骨架；前端开发时必须以这 3 个成品页为直接视觉基准，不得回退成单页面状态机；视频 / 课堂结果页必须保留进入 Learning Coach 的明确 CTA

### Exit Criteria
- 用户可从会话结束后进入 Learning Coach；
- checkpoint 可快速完成并给出反馈；
- quiz 可生成、提交、判分、解析；
- wrongbook 与 recommendation 可沉淀；
- path 可生成、保存与再次打开。  

### Parallel Delivery Rule
Story `8.1` 是全部 Learning Coach 页面与后端能力的前置契约。  
Story `8.2` 可在会话后入口冻结后与页面并行。  
Story `8.3`、`8.4`、`8.5`、`8.6` 可分别推进，但需遵守同一结果结构与长期数据边界。  
Story `8.7` 必须在学习中心聚合前完成字段对齐。  

### Story List
- Story 8.1: 学后入口契约与 `checkpoint / quiz / path` schema 冻结  
- Story 8.2: 会话后入口与 Learning Coach 路由承接  
- Story 8.3: 轻量 checkpoint 生成与反馈  
- Story 8.4: 正式 quiz 生成、判题与解析  
- Story 8.5: 错题本与知识推荐  
- Story 8.6: 学习路径规划、保存与调整  
- Story 8.7: Learning Coach 长期数据回写  

### Story 8.1: 学后入口契约与 `checkpoint / quiz / path` schema 冻结
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 先冻结学后入口和 `checkpoint / quiz / path` 的契约，  
So that 视频 / 课堂结束后的后续页面可以并行开发。  

**Acceptance Criteria:**
**Given** Learning Coach 域进入实施  
**When** 学后入口契约被首次冻结  
**Then** 会话结束信号、checkpoint、quiz、推荐、path 的基础 payload 与状态语义被统一定义  
**And** 前端可以基于同一份 mock 数据直接推进页面和状态流开发  

**Given** 不同来源会话都可触发 Learning Coach  
**When** 团队查看入口参数  
**Then** 能明确区分来源会话类型、来源记录 ID、起始知识点或等效上下文  
**And** 后续页面不需要再去猜测本次学后流程是从视频还是课堂进入的  

**Given** 前端需要 mock 完整状态流  
**When** 页面构造本地演示数据  
**Then** 至少覆盖 checkpoint 快速完成、quiz 多状态、推荐返回、path 保存成功与失败等关键场景  
**And** 不把“等待真实 AI 能力上线”当作页面实现阻塞前提  

**Deliverables:**
- 学后入口 schema
- checkpoint schema
- quiz schema
- recommendation schema
- path schema
- mock datasets

### Story 8.2: 会话后入口与 Learning Coach 路由承接
**Story Type:** `Integration Story`  
As a 刚完成一段学习的用户，  
I want 从视频或课堂结束后顺畅进入 Learning Coach，  
So that 我可以在合适的时机继续做巩固而不是被强行打断主叙事。  

**Acceptance Criteria:**
**Given** 用户完成视频或课堂主内容  
**When** 页面展示后续动作  
**Then** 用户可通过明确 CTA 进入 checkpoint、quiz 或 path  
**And** 当前结果页仍然可以被保留与回看，而不是被 Learning Coach 强制覆盖  

**Given** 页面运行在 mock 模式  
**When** 用户点击继续学习  
**Then** 可以基于冻结的路由参数和 mock 数据进入相应流程  
**And** 不需要等待真实 quiz 或路径规划服务完全可用  

**Given** 当前高保真稿已将会话后入口、checkpoint 与 quiz 拆成独立成品页  
**When** 前端落地正式路由  
**Then** 仍需分别实现会话后入口、`/checkpoint/:sessionId` 与 `/quiz/:sessionId` 的独立进入、刷新恢复与回跳语义  
**And** 不得把 3 个页面再次压回一个不可区分的单页面状态机

**Given** 用户中途退出 Learning Coach  
**When** 用户返回原结果页或学习中心  
**Then** 当前会话来源关系仍然可追踪  
**And** 不会出现“进入学后流程后找不到原课堂 / 视频结果”的断链体验  

**Deliverables:**
- 路由承接逻辑
- 来源会话参数透传
- 返回原结果的链路
- 后续动作 CTA 规则

### Story 8.3: 轻量 checkpoint 生成与反馈
**Story Type:** `Backend Story`  
As a 刚完成一次会话的用户，  
I want 先做一个低打扰的 checkpoint，  
So that 我可以快速判断自己是否理解关键点。  

**Acceptance Criteria:**
**Given** 用户刚完成视频或课堂会话  
**When** 用户选择进入 checkpoint  
**Then** 系统返回 `1-3` 题轻量检查内容和快速反馈结构  
**And** 用户可以在短时间内完成，不被迫进入冗长作答流程  

**Given** 用户完成 checkpoint  
**When** 结果返回  
**Then** 页面展示明确的通过 / 需要补充提示与下一步动作  
**And** 用户可以选择结束本次流程或继续进入正式 quiz  

**Given** 系统无法生成理想 checkpoint  
**When** 服务降级  
**Then** 仍返回最小可行的轻量检查或明确失败提示  
**And** 不把 checkpoint 直接扩大成完整 quiz 流程来掩盖问题  

**Deliverables:**
- checkpoint generation
- checkpoint result schema
- 降级策略
- 继续进入 quiz 的衔接规则

### Story 8.4: 正式 quiz 生成、判题与解析
**Story Type:** `Backend Story`  
As a 想正式检验掌握程度的用户，  
I want 完成课后 quiz 并获得逐题解析，  
So that 我能明确知道自己哪里真正理解、哪里还没掌握。  

**Acceptance Criteria:**
**Given** 用户进入 quiz 流程  
**When** 系统生成题目  
**Then** 返回稳定题目结构、选项、正确答案承载字段与解析字段  
**And** MVP 题型以单选题为主，不混入尚未支持的复杂题型  

**Given** 用户提交答案  
**When** 判题完成  
**Then** 页面展示得分、单题对错、解析和总结信息  
**And** 本次结果被保存为长期业务数据供后续回看  

**Given** quiz 判题或解析阶段异常  
**When** 系统降级处理  
**Then** 返回明确失败或部分结果状态  
**And** 不会出现“得分已出但单题解析全部缺失且无说明”的伪成功结果  

**Deliverables:**
- quiz generation
- submit & judge
- explanation schema
- result summary

### Story 8.5: 错题本与知识推荐
**Story Type:** `Backend Story`  
As a 想继续提升的用户，  
I want 系统把错题和下一步推荐沉淀下来，  
So that 我可以立刻知道后续应该补哪里。  

**Acceptance Criteria:**
**Given** checkpoint 或 quiz 暴露薄弱点  
**When** 系统完成结果总结  
**Then** 生成错题条目和推荐摘要  
**And** 错题与推荐不会被混入无关的历史记录类型中  

**Given** 推荐结果与证据检索结果都存在  
**When** 用户在后续页面查看  
**Then** 推荐结果在语义上明确表示“接下来学什么”  
**And** 不会与“资料依据怎么说”的 Evidence 结果混淆  

**Given** 错题需要后续回看  
**When** 用户再次进入学习中心  
**Then** 可以找到错题入口和推荐入口  
**And** 两者具备稳定的结果标识和来源关系  

**Deliverables:**
- wrongbook entry schema
- recommendation schema
- 与 quiz / checkpoint 的关联逻辑
- 后续回看标识

### Story 8.6: 学习路径规划、保存与调整
**Story Type:** `Frontend Story`  
As a 想进行阶段性学习的用户，  
I want 根据目标和周期生成学习路径并保存，  
So that 我可以把单次学习扩展成连续计划。  

**Acceptance Criteria:**
**Given** 用户设置学习目标和周期  
**When** 发起路径规划请求  
**Then** 系统返回按阶段组织的学习计划  
**And** 计划至少包含阶段目标、行动项和下一步建议  

**Given** 用户保存、再次打开或调整已生成路径  
**When** 页面加载路径结果  
**Then** 用户可以继续查看、编辑或重新执行该路径  
**And** 已保存路径不会因为服务失败或页面刷新被静默覆盖  

**Given** 页面运行在 mock 模式  
**When** 验收 path 页面  
**Then** 至少覆盖目标选择、周期选择、计划生成成功、生成失败、保存成功、保存失败与再次打开态  
**And** 页面不依赖真实路径规划服务先跑通才可进入开发  

**Deliverables:**
- path 页面
- 目标 / 周期配置
- 保存 / 调整交互
- mock 路径状态流

### Story 8.7: Learning Coach 长期数据回写
**Story Type:** `Persistence Story`  
As a 回访用户与平台，  
I want Learning Coach 的关键结果被长期保存，  
So that 这些结果可以进入学习中心回看与运营审计边界。  

**Acceptance Criteria:**
**Given** checkpoint、quiz、wrongbook、recommendation 或 path 已生成  
**When** 系统执行持久化  
**Then** 关键结果进入 RuoYi 业务表 / MySQL 或等效长期存储  
**And** 不会只停留在运行态缓存中  

**Given** 学习中心需要聚合这些结果  
**When** 学习中心拉取长期数据  
**Then** 至少能读取结果类型、摘要、来源会话、时间、状态与打开详情所需标识  
**And** 不需要重新执行一次 Learning Coach 流程才能展示历史数据  

**Given** 某类结果仅部分成功  
**When** 进行回写  
**Then** 能区分“已生成但待完善”“已完成”“失败”等状态  
**And** 不会在学习中心中把半成品错误标记为完整结果  

**Deliverables:**
- `xm_quiz_result`
- `xm_learning_path`
- wrongbook / recommendation 对应长期字段
- 持久化映射说明

---
