## Epic 7: 资料依据、来源回看与证据深挖
用户可以上传资料、查看引用来源、追溯证据依据，并在来源抽屉 / 证据面板中继续深挖。  
**FRs covered:** `FR-UI-006`、`FR-KQ-001~006`、`FR-PV-004`  
**NFRs covered:** `NFR-PF-004`、`NFR-SE-004`、`NFR-AR-005`  
**Primary Story Types:** `Contract Story`、`Frontend Story`、`Backend Story`、`Persistence Story`、`Integration Story`

### Objective
Epic 7 负责“资料依据层”，回答的是：
- 资料里怎么说？
- 这句话的来源在哪里？
- 术语是什么意思？
- 能不能围绕我的材料继续深挖？  

它不是：
- 当前时刻解释层；
- 正式学习路径规划层；
- 学习中心聚合层。  

### Scope
- 来源抽屉 / 证据面板
- Evidence ask schema
- 文档上传
- 解析状态
- 范围切换
- 引用来源展示
- 术语解释
- EvidenceProvider 抽象
- 问答记录回写

### Out of Scope
- Companion 当前时刻问答主流程
- 正式 quiz
- 学习路径保存
- 学习中心总聚合页

### Dependencies
- 依赖 `Epic 2` 的任务框架与 Provider 抽象。
- 依赖 `Epic 6` 的边界约束，以避免 Companion 与 Evidence 语义混淆。
- 依赖 `Epic 10` 的问答记录长期承接。
- 可在 mock 模式下先推进，不必等待真实外部平台完全接通。  

### Entry Criteria
- 来源抽屉 / 面板的 UI 结构已冻结。  
- 文档上传与解析状态语义已初步确定。  
- Evidence 与 Companion 的边界已成文。  

### Exit Criteria
- 用户可在结果页 / 学习中心打开证据面板；
- 可上传资料并查看解析状态；
- 问答尽可能展示来源；
- 术语可在同一面板解释；
- 历史证据记录可被长期回看。  

### Parallel Delivery Rule
Story `7.1` 是 Evidence 域所有工作的共同前置。  
Story `7.2` 可在 mock citation 数据下先做。  
Story `7.3` 与 `7.4` 可并行推进，一个负责外部能力适配，一个负责任务化解析状态。  
Story `7.6` 要尽早与 `Epic 9` 的学习中心聚合字段对齐。  

### Story List
- Story 7.1: Evidence 契约、来源抽屉 schema 与 mock 数据基线  
- Story 7.2: 来源抽屉 / 证据面板前端  
- Story 7.3: EvidenceProvider 适配层与外部能力编排  
- Story 7.4: 文档上传、解析状态与范围切换  
- Story 7.5: 引用来源展示与术语解释  
- Story 7.6: 证据问答回写与学习中心回看  

### Story 7.1: Evidence 契约、来源抽屉 schema 与 mock 数据基线
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 先冻结证据问答契约、来源抽屉 payload 和 mock 数据，  
So that 结果页与学习中心中的证据面板可以不等待真实检索链先完成。  

**Acceptance Criteria:**
**Given** Evidence / Retrieval 域开始实施  
**When** 契约首次冻结  
**Then** 证据提问、来源引用、术语解释、文档上传状态、历史记录与错误 payload 被统一定义  
**And** 当前版本明确只支持来源抽屉 / 证据面板承载，而不新增学生端独立 `/knowledge` 页面  

**Given** 前端以 mock 模式开发证据面板  
**When** 页面请求 evidence adapter  
**Then** 可以稳定获得引用片段、来源摘要、解析状态和失败样例  
**And** 结果页与学习中心对 evidence 数据的渲染逻辑不依赖真实服务上线  

**Given** Evidence 与 Companion 同时存在于结果页  
**When** 团队查看两个域的 schema  
**Then** 能明确区分“当前时刻解释”与“资料依据问答”的字段语义  
**And** 不会在页面或接口层把二者混成一套问答协议  

**Deliverables:**
- evidence ask schema
- citation schema
- upload status schema
- mock evidence dataset

### Story 7.2: 来源抽屉 / 证据面板前端
**Story Type:** `Frontend Story`  
As a 想知道“资料里怎么说”的用户，  
I want 从结果页或学习中心打开来源抽屉 / 证据面板，  
So that 我可以在当前上下文内补充资料依据而不用跳转新页面。  

**Acceptance Criteria:**
**Given** 用户位于视频结果页、课堂结果页或学习中心  
**When** 用户点击“查看依据”或发起资料类提问  
**Then** 当前页面内打开来源抽屉 / 证据面板并发起检索  
**And** 不会跳转到新的学生端独立资料页面  

**Given** 面板打开  
**When** 页面渲染内容  
**Then** 至少包含来源范围、资料上传入口、问答区、引用片段区、术语动作区与历史切换区  
**And** 面板结构满足 UX 对非路由资料能力的要求  

**Given** 页面运行在 mock 模式  
**When** 验收证据面板  
**Then** 至少能演示首次提问态、已有历史态、无引用态、上传解析中态、术语解释态、权限失败态与服务失败态  
**And** 页面不依赖真实检索链上线后才开始实现  

**Deliverables:**
- EvidenceDrawer / EvidencePanel
- 历史切换区
- 引用片段区
- 上传区
- 提问与深挖区

### Story 7.3: EvidenceProvider 适配层与外部能力编排
**Story Type:** `Backend Story`  
As a 后端团队，  
I want 通过 `EvidenceProvider` 抽象接入外部检索与资料能力，  
So that 业务层不被腾讯云 ADP 或其他具体平台绑定死。  

**Acceptance Criteria:**
**Given** 业务层需要进行证据问答或术语解释  
**When** 系统调用 Evidence 能力  
**Then** 通过统一 `EvidenceProvider` 接口完成调用  
**And** 业务代码不直接依赖具体平台返回结构  

**Given** 当前默认实现是 Tencent ADP  
**When** 团队替换或增加其他实现  
**Then** 只需新增 Provider 实现与装配  
**And** 上层 evidence service 与前端 schema 不需要大规模重写  

**Given** 外部平台返回结构与内部 schema 存在差异  
**When** 适配层进行映射  
**Then** 会转换为内部冻结的 evidence response 结构  
**And** 前端不需要感知外部平台 response 的杂质与不稳定字段  

**Deliverables:**
- `EvidenceProvider` protocol
- Tencent 默认实现
- 映射层
- 错误映射与限流处理

### Story 7.4: 文档上传、解析状态与范围切换
**Story Type:** `Integration Story`  
As a 有自带资料的用户，  
I want 上传教材或讲义并切换检索范围，  
So that 证据检索可以真正围绕我的课程资料展开。  

**Acceptance Criteria:**
**Given** 用户位于来源抽屉 / 证据面板  
**When** 用户上传教材、讲义或其他支持格式文档  
**Then** 面板展示上传中、解析中、成功或失败状态  
**And** 用户可以在同一面板完成重试，而不是跳到其他管理页面  

**Given** 文档解析是长耗时过程  
**When** 系统接收解析任务  
**Then** 文档解析遵循统一任务模型、状态流与错误码  
**And** 前端可通过状态流而不是盲等方式感知解析进度  

**Given** 用户拥有多个来源范围或解析后的资料  
**When** 用户切换当前检索范围  
**Then** 当前证据上下文刷新并反馈选中态  
**And** 新一轮问答明确绑定到所选范围，而不是隐式混用多个资料池  

**Deliverables:**
- 文档上传接口
- 解析任务创建
- 解析状态消费
- 范围切换逻辑

### Story 7.5: 引用来源展示与术语解释
**Story Type:** `Frontend Story`  
As a 需要理解依据的用户，  
I want 在答案里看到引用来源并进一步解释术语，  
So that 我可以确认答案依据并读懂专业表达。  

**Acceptance Criteria:**
**Given** 证据问答返回可引用的文档片段  
**When** 用户查看回答详情  
**Then** 页面展示来源片段、章节标记或原文跳转线索  
**And** 不用无来源的纯结论替代有依据的回答  

**Given** 回答中包含专业术语或难词  
**When** 用户点击术语解释动作  
**Then** 系统返回简明解释并保持在当前证据面板上下文内  
**And** 术语解释不会把用户带离当前问答链路  

**Given** 某次问答没有可靠引用来源  
**When** 页面渲染结果  
**Then** 页面会明确展示“暂无可展示引用”或等效状态  
**And** 不会伪造来源或把推测性内容包装成已引用结论  

**Deliverables:**
- citation UI
- 术语解释动作
- 无引用状态呈现
- 引用点击线索交互

### Story 7.6: 证据问答回写与学习中心回看
**Story Type:** `Persistence Story`  
As a 回访用户，  
I want 之前的证据问答被保存并可在学习中心再次打开，  
So that 我可以围绕同一资料持续学习而不用重复提问。  

**Acceptance Criteria:**
**Given** 一次有效证据问答完成  
**When** 系统执行持久化  
**Then** 至少保存问题、回答摘要、来源、范围、时间戳与必要状态  
**And** 记录进入长期业务数据而不是只停留在 Redis 运行态中  

**Given** 用户从学习中心或结果页回看历史证据记录  
**When** 页面加载该条记录  
**Then** 用户可以看到原问题、回答和来源摘要  
**And** 页面不需要再次发起新的检索才能展示已保存结果  

**Given** 某次问答关联了上传资料或范围设置  
**When** 记录被写回  
**Then** 历史记录中保留来源范围信息或等效标识  
**And** 用户在回看时不会失去“当时是基于哪份资料问的”这一关键信息  

**Deliverables:**
- `xm_knowledge_chat_log` 对应字段
- 回写逻辑
- 学习中心回看最小详情结构
- 历史范围字段映射

---

