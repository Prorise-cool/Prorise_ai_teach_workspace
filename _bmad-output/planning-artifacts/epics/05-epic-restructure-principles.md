## Epic Restructure Principles
### P-01: 底座能力优先拆出
原拆法中，视频 Epic 吞掉了统一任务模型、SSE、Provider 抽象等基础设施。  
本版明确将这些能力独立成 `Epic 2`，避免视频域成为全系统的“隐藏底座 Epic”。  

### P-02: 长期数据承接单独成域
原拆法中，RuoYi 承接逻辑散落在多个 Epic 的 AC 中。  
本版明确将业务表、持久化回写、防腐层、后台审计边界独立为 `Epic 10`。  

### P-03: 输入创建与执行消费拆分
视频域不再是一个巨型 Epic。  
本版将其拆为：
- `Epic 3: 单题视频输入与任务创建`
- `Epic 4: 单题视频生成、结果消费与失败恢复`

### P-04: Companion 以 SessionArtifactGraph 为边界
Companion 不再被当成“随手插进去的侧栏功能”。  
它是一个依赖视频与课堂产物索引的共享消费层，故独立成 `Epic 6`。  

### P-05: Evidence 与 Learning 分层明确
Evidence / Retrieval 负责“资料依据”。  
Learning Coach 负责“接下来怎么学”。  
Learning Center 负责“长期结果回看”。  
三者必须拆开，而不是围绕“学习”一词混在一起。  

### P-06: 每个 Epic 必须有并行规则
每个 Epic 都必须明确：
- 哪个 Story 是先行契约 Story；
- 哪些前端 Story 可以在 mock 下先做；
- 哪些后端 Story 可独立完成；
- 哪些故事必须等依赖 Epic 退出后再开始。  

