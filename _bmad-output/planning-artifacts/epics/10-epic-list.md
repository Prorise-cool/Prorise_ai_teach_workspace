## Epic List
### Epic 0: 工程底座与并行开发轨道
为全项目建立 Monorepo 基础目录、契约资产规范、mock 运行机制、adapter 隔离、日志追踪与基础交付门禁。  
**FRs covered:** 间接支撑全域  
**NFRs covered:** `NFR-AR-001`、`NFR-AR-006`、`NFR-AR-007`、`NFR-SE-001`、`NFR-SE-004`  
**Story types expected:** `Infrastructure Story`、`Contract Story`

### Epic 1: 用户接入、统一入口与启动配置
用户可以完成登录，以首页课堂直达入口进入默认学习起点，并通过顶栏导航进入其他有效入口，同时把用户配置带入后续流程，以便系统智能分配合适的 AI agents。  
**FRs covered:** `FR-UM-001`、`FR-UM-002`、`FR-UM-004`、`FR-UI-R01`、`FR-UI-001`、`FR-CS-002`  
**NFRs covered:** `NFR-SE-002`、`NFR-UX-001`、`NFR-UX-003`

### Epic 2: 统一任务框架、SSE 与 Provider 基础设施
为视频、课堂、文档解析与 Learning Coach 建立统一任务模型、统一错误码、统一 SSE 事件流、恢复语义与 Provider 抽象层。  
**FRs covered:** `FR-TF-001~003`、`FR-SE-001~003`、`FR-PV-001~003`  
**NFRs covered:** `NFR-AR-003`、`NFR-AR-005`、`NFR-AR-006`、`NFR-SE-001`

### Epic 3: 单题视频输入与任务创建
用户可以通过统一输入区提交文本或图片题目，完成任务创建并进入可恢复的等待态起点。  
**FRs covered:** `FR-UI-003`、`FR-VS-001`  
**NFRs covered:** `NFR-SE-003`、`NFR-UX-001`、`NFR-UX-003`

### Epic 4: 单题视频生成、结果消费与失败恢复
用户可以完成视频生成主链路、透明等待、结果播放、失败解释、TTS Failover 与视频侧 SessionArtifactGraph 回写。  
**FRs covered:** `FR-UI-004`、`FR-VS-002~009`、`FR-VP-001~003`  
**NFRs covered:** `NFR-PF-002`、`NFR-PF-005`、`NFR-SE-005`

### Epic 5: 主题课堂学习闭环
用户可以输入主题生成课堂，在等待完成后稳定浏览课堂结果中的幻灯片、讨论、白板内容，并获得会话结束信号。  
**FRs covered:** `FR-UI-002`、`FR-CS-001`、`FR-CS-003~007`  
**NFRs covered:** `NFR-PF-003`、`NFR-PF-006`

### Epic 6: 会话内伴学与当前时刻解释
用户可以围绕视频当前秒点或课堂当前步骤持续追问，并获得白板解释、连续上下文和清晰降级反馈。  
**FRs covered:** `FR-CP-001~006`  
**NFRs covered:** `NFR-UX-003`

### Epic 7: 资料依据、来源回看与证据深挖
用户可以上传资料、查看引用来源、追溯证据依据，并在来源抽屉 / 证据面板中继续深挖。  
**FRs covered:** `FR-UI-006`、`FR-KQ-001~006`、`FR-PV-004`  
**NFRs covered:** `NFR-PF-004`

### Epic 8: 学后巩固、测验与学习路径
用户可以在会话后完成 checkpoint、quiz、错题沉淀、推荐获取与学习路径规划。  
**FRs covered:** `FR-LA-001~005`  
**NFRs covered:** `NFR-UX-003`

### Epic 9: 学习中心聚合、个人管理与长期回看
用户可以在学习中心聚合查看历史、收藏、测验结果与推荐内容，并管理个人资料与平台设置。  
**FRs covered:** `FR-UM-003`、`FR-UI-005`、`FR-UI-007`、`FR-UI-008`、`FR-LA-006`、`FR-LR-001~004`  
**NFRs covered:** `NFR-UX-005`

### Epic 10: RuoYi 持久化承接、业务表与防腐层
系统将视频、课堂、Companion、Evidence、Learning Coach 与学习中心所需的长期业务数据统一承接到 RuoYi 业务表 / MySQL / COS，并提供可查询、可回写、可审计边界。  
**FRs covered:** `FR-LR-005`，并间接支撑 `FR-CP-005`、`FR-KQ-006`、`FR-LA-005`、`FR-LA-006`  
**NFRs covered:** `NFR-AR-001`、`NFR-AR-002`、`NFR-CO-001`

### 修订后的整块并行建议
为了适配多 Agent / 多 worktree 的真实执行，而不是口头并行，后续整块推进按下面顺序理解：

1. 推荐并行：`Epic 3 + Epic 5`
   - 原因：一个负责视频入口，一个负责课堂入口，页面主战场天然分开。
   - 前提：`Epic 1` 必须先真正收口到“登录、回跳、首页入口、用户配置”可稳定复用，而不是只看状态名。

2. 不建议整块并行：`Epic 4 + Epic 8`
   - 原因：二者都会碰视频 / 课堂结果页的后续动作入口，容易同时改同一批页面。
   - 更稳做法：先把 `Epic 4` 和课堂结束入口语义稳定，再启动 `Epic 8`。

3. 有条件并行：`Epic 6 + Epic 7`
   - 原因：二者都要嵌入结果页，但一个负责“当前时刻提问”，一个负责“资料依据抽屉”。
   - 前提：必须先冻结结果页挂载位和各自的入口位置，避免两边同时改同一个容器。

4. 不建议早并行：`Epic 9` 与 `Epic 6 / 7 / 8`
   - 原因：`Epic 9` 是前台聚合消费层，过早联调会持续吃上游变更。
   - 更稳做法：`Epic 9` 可以先用假数据做壳层，但真实接入放到 `Epic 6 / 7 / 8` 字段稳定之后。
