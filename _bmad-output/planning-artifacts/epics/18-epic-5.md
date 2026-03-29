## Epic 5: 主题课堂学习闭环
用户可以输入主题生成课堂，在等待完成后稳定浏览课堂结果中的幻灯片、讨论、白板内容，并获得会话结束信号。  
**FRs covered:** `FR-UI-002`、`FR-CS-001`、`FR-CS-003~007`  
**NFRs covered:** `NFR-PF-003`、`NFR-PF-006`  
**Primary Story Types:** `Contract Story`、`Frontend Story`、`Backend Story`、`Persistence Story`

### Objective
Epic 5 是课堂主链路。  
它包括：
- 主题输入；
- 课堂任务创建；
- 课堂等待页；
- 幻灯片、讨论、白板结果；
- 会话结束信号；
- 课堂侧 artifact 回写。  

它不包括：
- 会话内即时追问；
- 证据深挖；
- 课后 quiz 执行。  

### Scope
- `/classroom/input`
- 课堂任务契约
- 课堂等待页
- classroom generation
- slides
- discussion
- whiteboard layout
- classroom result
- completion signal
- artifact 回写

### Out of Scope
- Companion 提问与白板解释协议
- Evidence 面板
- Learning Coach 页面与逻辑
- 学习中心聚合

### Dependencies
- 依赖 `Epic 1` 的统一入口与风格配置。  
- 依赖 `Epic 2` 的统一任务框架与 SSE。  
- 依赖 `Epic 10` 的课堂任务与 artifact 长期回写。  

### Entry Criteria
- 课堂结果页结构已稳定。  
- 幻灯片 / 讨论 / 白板的最小结果 schema 可冻结。  

### Exit Criteria
- 用户可创建课堂任务并进入等待页；  
- 用户可查看结构化课堂结果；  
- 白板具备基础可读性；  
- 会话结束信号可供 Learning Coach 消费；  
- 课堂侧 artifact 可供 Companion 消费。  

### Parallel Delivery Rule
Story `5.1` 是课堂域所有前后端工作的前置契约。  
Story `5.3` 与 `5.6` 可在 mock session 下先推进。  
Story `5.4`、`5.5`、`5.7`、`5.8` 可由后端与持久化层并行推进，但不得突破已冻结 schema。  

### Story List
- Story 5.1: 课堂任务契约、结果 schema 与 mock session 基线  
- Story 5.2: 主题输入与课堂任务创建  
- Story 5.3: 课堂等待页与统一进度复用  
- Story 5.4: 课堂生成服务与多 Agent 讨论结果  
- Story 5.5: 白板布局与基础可读性规则  
- Story 5.6: 课堂结果页中的幻灯片、讨论与白板浏览  
- Story 5.7: 会话结束信号与课后触发出口  
- Story 5.8: 课堂侧 SessionArtifactGraph 回写  

### Story 5.1: 课堂任务契约、结果 schema 与 mock session 基线
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 在课堂域先冻结任务契约、结果 schema 和 mock session 数据，  
So that 课堂输入、等待与结果浏览可以并行实现而不依赖真实生成链先完成。  

**Acceptance Criteria:**
**Given** 课堂域进入实施阶段  
**When** 课堂契约首次冻结  
**Then** 任务创建、详情、状态、事件流、结果页所需的 slides、discussion、whiteboard、completion signal 等 schema 被明确约定  
**And** 前后端共享同一套字段语义和样例数据  

**Given** 前端使用 mock 模式开发课堂页面  
**When** 页面消费 classroom adapter  
**Then** 可以稳定模拟输入成功、等待中、完成、失败与恢复态  
**And** 结果页不需要等待真实课堂生成引擎跑通后才开始实现  

**Given** 后续 Companion 与 Learning Coach 需要消费课堂结果  
**When** 团队查看课堂 result schema  
**Then** 能明确哪些字段属于课堂主展示、哪些字段属于 artifact 索引、哪些字段属于会话结束信号  
**And** 不会在后期因为“字段职责不清”重构整套结果结构  

**Deliverables:**
- classroom task schema
- classroom result schema
- completion signal schema
- mock classroom session

### Story 5.2: 主题输入与课堂任务创建
**Story Type:** `Frontend Story`  
As a 想系统学习某个主题的用户，  
I want 通过输入主题发起课堂生成任务，  
So that 我可以快速获得结构化讲解内容。  

**Acceptance Criteria:**
**Given** 用户位于 `/classroom/input`  
**When** 用户输入主题并提交创建请求  
**Then** 系统创建课堂任务并返回可查询的任务 ID 和基础任务信息  
**And** 老师风格与当前会话配置一起稳定透传  

**Given** 主题输入为空、过短或不满足最小约束  
**When** 用户尝试发起课堂任务  
**Then** 页面返回明确、可恢复的输入校验提示  
**And** 用户可在当前页面完成修正并再次提交  

**Given** 视频输入页与课堂输入页需要保持一致心智  
**When** 用户在两个页面之间切换  
**Then** 能感知相似的输入结构与配置位置  
**And** 课堂页文案与说明明确偏向“主题学习”而不是“单题讲解”  

**Deliverables:**
- `/classroom/input` 页面
- 主题输入
- 风格透传
- 输入校验
- 创建跳转逻辑

### Story 5.3: 课堂等待页与统一进度复用
**Story Type:** `Frontend Story`  
As a 等待课堂生成的用户，  
I want 课堂等待页复用统一任务体验并支持恢复，  
So that 我能在熟悉的交互模式里理解课堂任务进度。  

**Acceptance Criteria:**
**Given** 课堂任务已创建且进入执行中  
**When** 用户打开 `/classroom/:id/generating`  
**Then** 页面复用统一进度组件展示阶段状态、阶段描述与恢复动作  
**And** 阶段文案聚焦课堂生成、幻灯片、讨论与白板，而不是视频术语  

**Given** 页面刷新、断线或事件流暂时不可用  
**When** 系统尝试恢复当前课堂任务  
**Then** 客户端通过快照或状态查询恢复当前阶段与文案  
**And** 用户不会因为一次刷新就丢失当前等待上下文  

**Given** 页面运行在 mock 模式  
**When** 前端演示课堂等待态  
**Then** 能覆盖处理中、失败、恢复、降级查询与完成跳转  
**And** 页面不依赖真实课堂生成引擎可用性才具备验收条件  

**Deliverables:**
- 课堂等待页
- 进度组件复用
- 恢复逻辑
- 状态查询降级 UI

### Story 5.4: 课堂生成服务与多 Agent 讨论结果
**Story Type:** `Backend Story`  
As a 想学习某个主题的用户，  
I want 系统基于主题生成结构化课堂与多角色讨论结果，  
So that 我能够获得比纯文本回答更完整的课堂体验。  

**Acceptance Criteria:**
**Given** 课堂任务已创建  
**When** 系统执行课堂生成流程  
**Then** 至少产出课堂摘要、幻灯片结构、多角色讨论片段与白板所需基础内容  
**And** 输出结果符合已冻结 schema，而不是随运行时自由漂移字段结构  

**Given** 课堂包含多 Agent 讨论  
**When** 系统组织讨论结果  
**Then** 每个讨论片段具备角色身份、内容顺序与最小可展示信息  
**And** 前端可以稳定渲染多角色讨论，不需要额外拼装语义  

**Given** 课堂生成失败  
**When** 系统结束本次执行  
**Then** 返回统一失败状态与错误码  
**And** 不会出现“任务已完成但结果结构严重缺失”的伪成功场景  

**Deliverables:**
- classroom service
- discussion generation
- slide generation
- 失败错误映射

### Story 5.5: 白板布局与基础可读性规则
**Story Type:** `Backend Story`  
As a 正在观看课堂的用户，  
I want 白板内容即使复杂也保持基本可读，  
So that 我不会因为公式、步骤和注释重叠而完全看不懂课堂结果。  

**Acceptance Criteria:**
**Given** 课堂结果中包含白板内容  
**When** 系统生成白板布局数据  
**Then** 白板结果至少包含分步结构、主内容区与基础布局信息  
**And** 前端不需要通过猜测坐标或自由布局才能勉强渲染结果  

**Given** 白板内容较长、对象较多或结构复杂  
**When** 布局规则生效  
**Then** 系统优先保证主要步骤可读与不严重重叠  
**And** 即使无法达到理想视觉效果，也要走降级布局而不是输出不可阅读的重叠内容  

**Given** 某些白板片段不适合复杂空间布局  
**When** 系统选择降级表达  
**Then** 可以输出更简化的步骤式结构  
**And** 课堂主链路仍然可用，不因局部白板美观性不足而整体失败  

**Deliverables:**
- whiteboard layout schema
- 基础布局规则
- 降级布局策略
- 可读性检查规则

### Story 5.6: 课堂结果页中的幻灯片、讨论与白板浏览
**Story Type:** `Frontend Story`  
As a 正在学习主题内容的用户，  
I want 在课堂结果页稳定浏览幻灯片、讨论与白板内容，  
So that 我可以获得连续、可读的课堂体验。  

**Acceptance Criteria:**
**Given** 课堂生成已完成  
**When** 用户进入 `/classroom/:id`  
**Then** 页面展示结构化幻灯片、讨论片段和白板内容  
**And** 主内容区与侧边 Companion 区域的职责边界保持清晰  

**Given** 课堂包含多角色讨论或复杂白板内容  
**When** 页面渲染结果  
**Then** 至少可以稳定展示多角色讨论片段和主要白板步骤  
**And** 同一时刻白板主要内容不会发生严重重叠而破坏可读性  

**Given** 页面运行在 mock 模式  
**When** 设计验收课堂结果页  
**Then** 可以分别查看内容完整态、白板降级态、讨论为空态、加载失败态与权限失败态  
**And** 页面无需等待真实课堂生成引擎才开始验证布局与交互  

**Given** 页面存在后续动作入口  
**When** 用户完成课堂浏览  
**Then** `Companion` 与 `Learning Coach` 只作为侧栏或后续入口出现  
**And** 正式 quiz 不会插入课堂主内容流打断主叙事  

**Deliverables:**
- 课堂结果页
- slides viewer
- discussion viewer
- whiteboard viewer
- 后续动作入口

### Story 5.7: 会话结束信号与课后触发出口
**Story Type:** `Integration Story`  
As a 刚完成课堂学习的用户，  
I want 课堂结束时收到清晰的课后入口而不是被强制插入正式答题，  
So that 我可以保持主叙事完整并在合适时机进入后续巩固。  

**Acceptance Criteria:**
**Given** 课堂主叙事进入完成阶段  
**When** 系统输出结束信号  
**Then** 返回可被 Learning Coach 消费的结构化触发信息  
**And** 不会在课堂主内容中强制弹出正式 quiz 流程  

**Given** 用户希望继续巩固  
**When** 用户点击课后入口  
**Then** 页面跳转到后续 checkpoint / quiz / path 流程  
**And** 当前课堂结果页仍然可以被重新打开与回看  

**Given** Learning Coach 尚未真实接通  
**When** 页面仍处于 mock 或半联调阶段  
**Then** 课后入口依然可以基于冻结的跳转参数与 mock 数据工作  
**And** 课堂页不需要等待 Learning Coach 全部完成后才可验收  

**Deliverables:**
- completion signal
- 学后入口参数
- 结果页 CTA
- 与 Learning Coach 的边界说明

### Story 5.8: 课堂侧 SessionArtifactGraph 回写
**Story Type:** `Persistence Story`  
As a 后续需要 Companion 与 Learning Coach 消费课堂内容的系统，  
I want 在课堂完成时回写结构化 artifact 索引，  
So that 会话后能力不需要反向依赖课堂引擎内部实现。  

**Acceptance Criteria:**
**Given** 课堂生成成功  
**When** 系统进入回写阶段  
**Then** 至少回写 slide 结构、讨论步骤、白板步骤、章节摘要与学习信号  
**And** 这些数据进入长期业务存储，而不是只停留在运行时对象中  

**Given** Companion 需要围绕 slide、白板步骤或讨论片段发起解释  
**When** Companion 读取课堂 artifact  
**Then** 能获取统一、可索引、可定位的课堂上下文  
**And** 不需要直接依赖课堂生成服务内部对象或临时缓存  

**Given** Learning Coach 需要基于会话结束信号与知识点摘要生成后续内容  
**When** 其读取课堂长期数据  
**Then** 能通过 artifact 与结束信号获得最小可用上下文  
**And** 不需要重新解析整份课堂原始输出文本  

**Deliverables:**
- 课堂 artifact schema
- artifact 回写逻辑
- Learning signal 回写
- 消费说明

---

