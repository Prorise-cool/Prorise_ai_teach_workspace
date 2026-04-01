## Epic 6: 会话内伴学与当前时刻解释
用户可以围绕视频当前秒点或课堂当前步骤持续追问，并获得白板解释、连续上下文和清晰降级反馈。  
**FRs covered:** `FR-CP-001~006`  
**NFRs covered:** `NFR-UX-003`、`NFR-AR-004`  
**Primary Story Types:** `Contract Story`、`Frontend Story`、`Backend Story`、`Persistence Story`、`Integration Story`

### Objective
Epic 6 负责“会话内即时伴学”这一共享消费层。  
它不是视频引擎，也不是课堂引擎，更不是证据检索主入口。  
它的唯一职责是围绕**当前时刻**解释“现在这一步发生了什么、为什么这样、能不能换种说法”。  

它包括：
- `TimeAnchor` 统一建模；
- 视频 / 课堂上下文适配；
- 当前时刻提问与回答；
- 连续追问与上下文窗口；
- 白板动作协议与结构化降级；
- 问答长期回写；
- 视频页 / 课堂页共用同一套伴学协议。  

它不包括：
- 重新执行视频或课堂生成主链路；
- 充当完整资料库检索主入口；
- 把正式 quiz 插入会话中；
- 在会话内承担长期学习路径规划。  

### Scope
- `TimeAnchor` schema
- companion ask / answer schema
- video context adapter
- classroom context adapter
- whiteboard action schema
- 连续追问上下文窗口
- 降级策略
- 问答与白板动作回写
- 视频页 / 课堂页共用 Companion 组件

### Out of Scope
- Evidence / Retrieval 主检索
- Learning Coach 正式生成
- 视频 / 课堂引擎内部算法
- 学习中心聚合页

### Dependencies
- 强依赖 `Epic 4` 的视频侧 `SessionArtifactGraph`。
- 强依赖 `Epic 5` 的课堂侧 `SessionArtifactGraph`。
- 依赖 `Epic 2` 的统一任务 / 错误码 / Provider 语义。
- 依赖 `Epic 10` 的长期数据回写能力。
- 与 `Epic 7` 存在边界关系，但不依赖 `Epic 7` 完成后才可先做 mock 伴学。  

### Entry Criteria
- 视频与课堂侧 artifact schema 已稳定到可消费。  
- `TimeAnchor` 类型边界已讨论清晰。  
- Companion 侧栏最小 UI 结构已冻结。  

### Frontend Design Reference
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/05-视频结果页/02-video-result.html`
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/08-课堂结果页/01-classroom.html`
- 参考成品图：`docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/10-Checkpoint 与 Quiz 页/03-quiz.html`
- 当前补充规则：Companion 侧栏在不同页面可共用同一视觉系统，但视频页 / 课堂页 / quiz 页都必须按各自页面骨架独立落地，不得再以单文件多状态演示稿替代正式页面；`TimeAnchor` 绑定、白板降级、权限失败与服务暂不可用等状态仍必须按 Story `6.2` ~ `6.6` 完整实现

### Exit Criteria
- 视频页与课堂页都能挂载同一套 Companion 交互；
- 所有提问都绑定 `TimeAnchor`；
- 连续追问具备上下文继承；
- 白板解释成功或结构化降级；
- 问答记录已长期回写并可被学习中心消费。  

### Parallel Delivery Rule
Story `6.1` 是本 Epic 所有前后端工作的前置契约。  
Story `6.2` 可在 mock turns 下先做页面侧栏。  
Story `6.3 ~ 6.6` 可由后端并行推进，但都不得绕过 `SessionArtifactGraph` 直接依赖视频 / 课堂引擎内部对象。  
Story `6.7` 的持久化结构应尽早与 `Epic 10` 对齐，避免学习中心后期返工。  

### Story List
- Story 6.1: `TimeAnchor`、turn schema 与 mock Companion turns 基线  
- Story 6.2: 视频 / 课堂共享 Companion 侧栏壳层  
- Story 6.3: 视频与课堂的 Context Adapter  
- Story 6.4: 当前时刻提问与回答服务  
- Story 6.5: 连续追问与上下文窗口管理  
- Story 6.6: 白板动作协议与结构化降级  
- Story 6.7: 问答回写与视频 / 课堂双页复用闭环  

### Story 6.1: `TimeAnchor`、turn schema 与 mock Companion turns 基线
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 先冻结 `TimeAnchor`、提问请求与回答结构，  
So that 视频页和课堂页可以围绕同一 Companion 契约并行建设。  

**Acceptance Criteria:**
**Given** Companion 域开始实施  
**When** 契约首次冻结  
**Then** 视频秒点、课堂步骤、slide、白板段落、讨论片段等锚点类型被统一建模为 `TimeAnchor`  
**And** 每种锚点至少包含 `anchorType`、`anchorId`、`displayLabel` 与所属会话标识  

**Given** 前端在本地以 mock 方式开发 Companion  
**When** 页面请求 companion adapter  
**Then** 可以获得稳定的 mock turns、mock anchor、mock whiteboard actions 和失败降级数据  
**And** 页面逻辑不需要等待真实 Companion 服务跑通  

**Given** 一次提问请求被发起  
**When** 团队查看 request / response schema  
**Then** 能明确知道问题文本、当前锚点、会话类型、上下文摘要、回答文本、追问建议、白板动作与来源字段的位置  
**And** 前端不需要通过解析自然语言猜测后端是否返回了锚点相关解释  

**Deliverables:**
- `TimeAnchor` schema
- turn request / response schema
- whiteboard action schema（最小版本）
- mock Companion turns 数据集

### Story 6.2: 视频 / 课堂共享 Companion 侧栏壳层
**Story Type:** `Frontend Story`  
As a 正在学习的用户，  
I want 在视频页和课堂页都看到结构一致的 Companion 侧栏，  
So that 我在不同会话页里都能以同样方式提问、看回答和看白板解释。  

**Acceptance Criteria:**
**Given** 用户进入视频结果页或课堂结果页  
**When** Companion 侧栏渲染  
**Then** 侧栏至少包含当前锚点、提问框、问答流、白板解释区与失败 / 不可用提示区  
**And** 视频页与课堂页共享同一套核心 UI 结构，而不是两套完全不同组件  

**Given** 页面运行在 mock 模式  
**When** 设计与前端验收侧栏交互  
**Then** 至少能演示空态、首轮提问成功态、连续追问态、白板成功态、白板降级态、权限失败态与服务暂不可用态  
**And** 不依赖真实 Companion 服务完成后才开始实现页面与状态管理  

**Given** 用户当前正在播放视频或浏览课堂  
**When** 用户发起 Companion 提问  
**Then** Companion 不会强制打断主内容区或替换主叙事  
**And** 用户在提问后仍能继续播放视频或浏览课堂主内容  

**Deliverables:**
- CompanionPanel 组件
- 锚点显示组件
- 问答流组件
- 白板解释区组件
- 错误 / 降级态组件

### Story 6.3: 视频与课堂的 Context Adapter
**Story Type:** `Backend Story`  
As a 后端团队，  
I want 通过上下文适配器统一获取视频与课堂当前锚点的上下文，  
So that Companion 不直接耦合到两个内容引擎的内部结构。  

**Acceptance Criteria:**
**Given** 当前会话来自视频页或课堂页  
**When** Companion 服务请求当前上下文  
**Then** 通过 `video_adapter` 或 `classroom_adapter` 从 `SessionArtifactGraph` 与必要运行态窗口中获取上下文  
**And** Companion 服务本身不直接调用视频或课堂引擎内部私有对象  

**Given** 视频与课堂的 artifact 结构不同  
**When** Context Adapter 产出统一上下文  
**Then** 至少返回当前锚点摘要、相邻片段摘要、主内容文本或步骤信息  
**And** 上游 Companion 服务可用统一字段处理，而不是分支判断两个完全不同结构  

**Given** 某个会话 artifact 缺失或锚点无效  
**When** Context Adapter 无法构建完整上下文  
**Then** 返回可解释的缺失状态或降级上下文  
**And** 不直接抛出未处理异常导致整轮伴学失败  

**Deliverables:**
- `video_adapter.py`
- `classroom_adapter.py`
- 统一上下文 DTO
- 缺失 / 无效锚点错误映射

### Story 6.4: 当前时刻提问与回答服务
**Story Type:** `Backend Story`  
As a 正在学习的用户，  
I want 围绕视频当前秒点或课堂当前步骤直接发问，  
So that 我得到的是“现在这一段”的解释，而不是脱离上下文的泛化回答。  

**Acceptance Criteria:**
**Given** 用户在视频结果页或课堂结果页停留在某个具体锚点  
**When** 用户发起提问  
**Then** 系统优先基于当前 `TimeAnchor` 与会话产物图生成回答  
**And** 用户不需要手动重复描述自己处在视频哪一秒或课堂哪一页  

**Given** 当前上下文信息不足  
**When** Companion 处理用户问题  
**Then** 系统仍返回与当前锚点相关的反馈、澄清提示或引导  
**And** 不直接用一个与当前会话无关的泛化答案敷衍用户  

**Given** 当前问题明显超出会话内上下文解释范围  
**When** Companion 生成结果  
**Then** 可以提示用户打开 Evidence 面板继续查资料依据  
**And** 不把资料型问题伪装成当前时刻解释能力的一部分  

**Deliverables:**
- Companion ask API
- 基于锚点的回答逻辑
- 提问范围校验
- 引导到 Evidence 的边界提示

### Story 6.5: 连续追问与上下文窗口管理
**Story Type:** `Backend Story`  
As a 想继续追问的用户，  
I want 进行连续追问并继承上一轮上下文，  
So that 我不需要每次都重复描述前文。  

**Acceptance Criteria:**
**Given** 用户已经完成至少一轮 Companion 对话  
**When** 用户发起“继续解释 / 举例 / 更通俗”等追问  
**Then** 系统继承上一轮上下文窗口和当前锚点  
**And** 用户无需重新输入完整背景  

**Given** 多轮追问持续进行  
**When** 上下文窗口接近约定边界  
**Then** 系统至少保留当前锚点、上一轮问题、上一轮回答摘要与必要会话元信息  
**And** 不会因为窗口截断导致回答与当前轮次脱节  

**Given** Companion 运行态窗口写入 Redis  
**When** 开发者检查存储边界  
**Then** 该窗口具有明确 TTL  
**And** 不会把短期运行态错误地当成长期业务存储保留在 Redis 中  

**Deliverables:**
- Companion 运行态窗口设计
- Redis 窗口存储
- 多轮追问继承逻辑
- 上下文裁剪规则

### Story 6.6: 白板动作协议与结构化降级
**Story Type:** `Backend Story`  
As a 正在理解难点的用户，  
I want 在回答旁看到白板解释，并在失败时得到结构化降级内容，  
So that 我即使遇到异常也能继续理解当前知识点。  

**Acceptance Criteria:**
**Given** 当前问题适合白板辅助解释  
**When** Companion 生成回答  
**Then** 响应中包含可渲染的白板动作或步骤化解释数据  
**And** 前端可以在同一侧栏内按统一协议展示白板结果  

**Given** 白板能力失败、信息不足或当前问题不适合图形化  
**When** 系统执行降级  
**Then** 返回结构化文本解释、分步骤说明或等效降级内容  
**And** Companion 主回答仍然可用，不因白板失败而整体中断  

**Given** 某次白板动作 schema 不合法或前端无法渲染  
**When** 前端消费白板响应  
**Then** 前端可安全退回到文本型降级展示  
**And** 不会让整条问答流因为白板局部失败而崩溃  

**Deliverables:**
- 白板动作协议
- renderer 最小协议说明
- 结构化降级格式
- 白板失败错误码或状态语义

### Story 6.7: 问答回写与视频 / 课堂双页复用闭环
**Story Type:** `Persistence Story`  
As a 回访用户，  
I want 我的 Companion 问答被长期保存且能在视频页和课堂页复用同一套体验，  
So that 我既能重看追问结果，又能在不同会话页获得一致交互。  

**Acceptance Criteria:**
**Given** 一轮 Companion 对话完成  
**When** 系统执行持久化  
**Then** 问答记录至少包含会话类型、锚点、提问、回答、来源、时间戳与必要状态  
**And** 这些数据进入长期业务表供学习中心回看  

**Given** 视频页与课堂页都接入 Companion  
**When** 前端消费同一套 Companion adapter  
**Then** 两个页面共享相同的请求 / 响应语义  
**And** 页面差异只体现在 anchor 类型与上下文来源，而不是两套不兼容接口  

**Given** 某轮问答仅白板部分失败  
**When** 记录被写回  
**Then** 历史记录中可以区分“主回答成功、白板降级”与“整轮问答失败”  
**And** 学习中心在回看时不需要二次推断本轮到底发生了什么  

**Deliverables:**
- `xm_companion_turn` 对应持久化字段
- `xm_whiteboard_action_log` 对应持久化字段
- 回写接口或防腐层调用
- 双页复用说明

---
