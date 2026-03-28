## Epic 2: 统一任务框架、SSE 与 Provider 基础设施
为视频、课堂、文档解析与 Learning Coach 建立统一任务模型、统一错误码、统一 SSE 事件流、恢复语义与 Provider 抽象层。  
**FRs covered:** `FR-TF-001~003`、`FR-SE-001~003`、`FR-PV-001~003`  
**NFRs covered:** `NFR-AR-003`、`NFR-AR-005`、`NFR-AR-006`、`NFR-SE-001`  
**Primary Story Types:** `Contract Story`、`Infrastructure Story`、`Backend Story`

### Objective
Epic 2 是所有长耗时能力的运行时底座。  
它负责：
- 统一任务模型；
- 统一状态机；
- 统一错误码；
- 统一 SSE 事件流；
- 统一恢复语义；
- 统一 Provider 工厂、健康检查与 Failover。  

它不负责：
- 具体视频分镜逻辑；
- 具体课堂内容生成；
- 具体证据检索问答；
- 具体 quiz 内容生成。  

### Scope
- `TaskStatus`
- `TaskContext`
- `TaskResult`
- `TaskProgressEvent`
- `BaseTask`
- `TaskScheduler`
- SSE broker
- SSE 恢复与降级
- Provider Protocol
- ProviderFactory
- 健康检查与 Redis 缓存
- Dramatiq + Redis broker
- Redis 运行态 key 与 TTL 规范落地

### Out of Scope
- 视频业务 stage 实现
- 课堂业务 stage 实现
- 文档解析能力本身
- 具体 LLM prompt
- 具体 TTS vendor 集成细节的业务语义层封装

### Dependencies
- 依赖 `Epic 0`。  
- 后续 `Epic 3 / 4 / 5 / 6 / 7 / 8` 均依赖本 Epic。  

### Entry Criteria
- Epic 0 已完成契约资产目录与 schema 输出基线。  
- 统一任务状态与错误码命名空间已可讨论并冻结。  

### Exit Criteria
- 所有长任务可共享统一状态枚举；  
- SSE 事件结构稳定；  
- 断线恢复与 `/status` 降级语义稳定；  
- ProviderFactory、健康缓存、Failover 规则存在；  
- Redis 运行态 key 已有 TTL 与规范命名。  

### Parallel Delivery Rule
Story `2.1` 与 `2.5` 是所有任务型业务 Epic 的前置契约。  
Story `2.7` 与 `2.8` 是所有需要外部能力切换的业务 Epic 的前置能力。  
前端可在 `2.1 + 2.5 + 2.6` 完成后开始构建统一等待壳层与状态机。  
后端可在 `2.2 + 2.3 + 2.4 + 2.7 + 2.8` 完成后接入任意新 Task。  

### Story List
- Story 2.1: 统一任务状态枚举、错误码与结果 schema 冻结  
- Story 2.2: Task 基类、TaskContext 与调度骨架  
- Story 2.3: Dramatiq + Redis broker 基础接入  
- Story 2.4: Redis 运行态 Key、TTL 与事件缓存落地  
- Story 2.5: SSE 事件类型、payload 与 broker 契约冻结  
- Story 2.6: SSE 断线恢复与 `/status` 查询降级  
- Story 2.7: Provider Protocol、工厂与优先级注册骨架  
- Story 2.8: Provider 健康检查、Failover 与缓存策略  

### Story 2.1: 统一任务状态枚举、错误码与结果 schema 冻结
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 冻结统一任务状态、错误码与结果结构，  
So that 视频、课堂、文档解析与 Learning Coach 都能围绕同一运行时语义并行开发。  

**Acceptance Criteria:**
**Given** 系统存在多个长任务能力域  
**When** 团队查看统一任务契约  
**Then** 能看到固定状态枚举 `pending`、`processing`、`completed`、`failed`、`cancelled`  
**And** 前后端不得在业务域中重新发明不兼容的状态名  

**Given** 某个任务执行失败  
**When** 后端返回错误信息  
**Then** 任务结果中使用统一错误码而不是自由文本  
**And** 前端可以基于错误码稳定映射文案、重试动作与排障提示  

**Given** 某个任务被创建、处理中、完成或失败  
**When** 前端读取任务详情、状态或 SSE 事件  
**Then** 至少可以稳定获得 `taskId`、`taskType`、`status`、`progress`、`message`、`timestamp` 与必要的 `errorCode`  
**And** 页面不需要因为不同业务域字段不一致而维护多套状态机  

**Suggested Core Contracts:**
- `TaskStatus`
- `TaskErrorCode`
- `TaskResult`
- `TaskProgressEvent`
- `TaskSnapshot`

**Deliverables:**
- 状态枚举表
- 错误码字典
- 统一任务结果 schema
- 示例成功 / 失败 payload

### Story 2.2: Task 基类、TaskContext 与调度骨架
**Story Type:** `Infrastructure Story`  
As a 后端团队，  
I want 提供统一的 Task 基类、上下文与调度骨架，  
So that 新的长任务不需要从零重写生命周期与状态推进逻辑。  

**Acceptance Criteria:**
**Given** 一个新的任务类型需要接入系统  
**When** 开发者基于统一任务骨架创建任务  
**Then** 任务可以复用初始化、状态推进、异常处理、完成收尾等生命周期钩子  
**And** 不需要为每个业务域单独发明任务生命周期管理方式  

**Given** 任务执行过程中需要访问用户、重试次数、request_id、task_id 等上下文  
**When** 任务运行  
**Then** 这些信息可通过统一 `TaskContext` 获得  
**And** 任务逻辑不需要跨模块拼装上下文字段  

**Given** 一个任务抛出未处理异常  
**When** 调度器接管异常  
**Then** 任务会被推进到 `failed` 而不是无状态挂起  
**And** 错误码、日志与运行态快照会同步写入统一通道  

**Deliverables:**
- `BaseTask`
- `TaskContext`
- `TaskScheduler`
- 生命周期钩子定义
- demo task

### Story 2.3: Dramatiq + Redis broker 基础接入
**Story Type:** `Infrastructure Story`  
As a 后端团队，  
I want 将 Dramatiq 与 Redis broker 作为统一队列底座接入，  
So that 视频、课堂与文档解析任务都能在一致的异步执行环境中运行。  

**Acceptance Criteria:**
**Given** 系统提交一个 demo task  
**When** FastAPI 将任务分发到 Worker  
**Then** Worker 能通过 Dramatiq + Redis broker 收到任务并开始执行  
**And** 开发者能够观察到任务被投递、消费与完成的最小执行链路  

**Given** Worker 进程短暂重启或任务执行失败  
**When** 系统查看任务运行状态  
**Then** 能区分“尚未执行”、“执行中”、“失败”或“已完成”  
**And** 不会因为缺乏队列层状态管理而把任务永久留在不确定状态  

**Given** 后续业务域新增新的任务类型  
**When** 新任务被注册  
**Then** 不需要重构底层 broker 或重新设计任务分发方式  
**And** 新旧任务可以在同一套异步执行基础设施上共存  

**Deliverables:**
- Dramatiq 接入配置
- Redis broker 配置
- Worker 启动脚本
- demo task dispatch / consume 示例

### Story 2.4: Redis 运行态 Key、TTL 与事件缓存落地
**Story Type:** `Infrastructure Story`  
As a 后端团队，  
I want 将 Redis 运行态 key 命名、TTL 与事件缓存规则真正落地，  
So that 任务恢复、SSE 补发与 Provider 健康缓存有统一的运行时存储边界。  

**Acceptance Criteria:**
**Given** 系统写入任一运行态 key  
**When** 开发者检查 Redis  
**Then** 运行态 key 命名符合统一规范，例如 `xm_task:{task_id}`、`xm_task_events:{task_id}`、`xm_provider_health:{provider}`  
**And** 所有运行态 key 均设置 TTL，不允许无过期时间长期滞留  

**Given** 某个任务在执行中不断输出事件  
**When** 事件被缓存到 Redis  
**Then** 系统可以按任务 ID 读取最近事件、快照或恢复所需的最小状态  
**And** 不会把 SSE 事件当作长期审计数据写入 Redis 永久保存  

**Given** 某条长期业务数据需要回看、查询或审计  
**When** 开发者设计存储位置  
**Then** 该数据不得仅存储在 Redis 中  
**And** Redis 只承担运行态、事件缓存与短期恢复，不承担长期业务数据宿主职责  

**Deliverables:**
- Redis key builder
- TTL policy
- 事件缓存写入 / 读取封装
- 运行态清理策略说明

### Story 2.5: SSE 事件类型、payload 与 broker 契约冻结
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 冻结统一 SSE 事件类型与 payload 结构，  
So that 所有等待页、结果页和任务型接口都能消费一致的实时语义。  

**Acceptance Criteria:**
**Given** 任一长任务需要通过 SSE 对前端推送状态  
**When** 团队查看 SSE 契约  
**Then** 至少能看到 `connected`、`progress`、`provider_switch`、`completed`、`failed`、`heartbeat`、`snapshot` 七类事件  
**And** 各事件 payload 所需字段语义被清晰定义  

**Given** 前端在 mock 模式下模拟 SSE  
**When** 页面消费事件流  
**Then** 页面只需围绕统一 payload 字段进行状态判断  
**And** 不需要为视频、课堂、文档解析分别实现完全不同的 SSE 解析器  

**Given** 某个后端任务需要发出阶段切换  
**When** 事件写入 broker  
**Then** 事件字段至少包含事件类型、任务 ID、任务类型、状态、进度、消息与时间戳  
**And** 失败事件可附带统一错误码，Provider 切换事件可附带 `from`、`to` 与 `reason`  

**Deliverables:**
- SSE 事件 schema
- 事件 payload 示例
- 统一字段说明
- mock SSE 序列示例

### Story 2.6: SSE 断线恢复与 `/status` 查询降级
**Story Type:** `Backend Story`  
As a 等待长任务结果的用户，  
I want 在事件流中断时恢复状态或自动降级查询，  
So that 我不会因为刷新、网络波动或浏览器重连而丢失任务上下文。  

**Acceptance Criteria:**
**Given** 用户正在等待一个执行中的任务  
**When** SSE 连接被短暂中断  
**Then** 客户端可基于 `Last-Event-ID`、任务快照或 Redis 事件缓存恢复当前状态  
**And** 系统不会要求用户重新提交任务才能看到最新进度  

**Given** 事件流恢复失败或运行环境不适合持续连接  
**When** 前端尝试获取任务状态  
**Then** 系统自动降级到 `/status` 查询接口  
**And** 页面仍然可以展示当前阶段、状态和下一步动作，而不是完全失去进度感知  

**Given** 恢复逻辑工作正常  
**When** 用户刷新等待页  
**Then** 页面可以恢复到正确阶段而不是从 0% 开始伪装重跑  
**And** 系统不会依赖数据库回放全部历史过程来恢复实时状态  

**Deliverables:**
- SSE reconnect 逻辑
- snapshot 读取逻辑
- `/status` 接口
- 前端降级消费说明

### Story 2.7: Provider Protocol、工厂与优先级注册骨架
**Story Type:** `Infrastructure Story`  
As a 后端团队，  
I want 建立统一 Provider Protocol、工厂与优先级注册机制，  
So that LLM、TTS 与未来外部能力都能在不侵入业务逻辑的前提下切换与扩展。  

**Acceptance Criteria:**
**Given** 业务代码需要调用 LLM 或 TTS  
**When** 开发者接入 Provider  
**Then** 业务层通过统一 Protocol 与工厂获取能力实例  
**And** 不直接依赖某个厂商 SDK 或硬编码 vendor 判断  

**Given** 系统存在主 Provider 与备 Provider  
**When** 工厂装配能力列表  
**Then** 各 Provider 可配置优先级、超时、重试与健康状态来源  
**And** 后续业务域无需自行维护另一套主备逻辑  

**Given** 未来需要接入新模型或新语音服务  
**When** 新 Provider 实现 Protocol  
**Then** 可在不改动业务层调用代码的情况下注册到工厂  
**And** 原有业务流程保持不变，仅通过配置或装配变更完成接入  

**Deliverables:**
- `providers/protocols.py`
- `ProviderFactory`
- 优先级注册规则
- demo provider

### Story 2.8: Provider 健康检查、Failover 与缓存策略
**Story Type:** `Backend Story`  
As a 等待外部能力返回的用户，  
I want 当主 Provider 不可用时系统能够自动切换，  
So that 我不会因为单点外部故障就完全失去结果。  

**Acceptance Criteria:**
**Given** 主 Provider 健康、可用且响应正常  
**When** 业务层发起调用  
**Then** 请求优先走主 Provider  
**And** 业务层不需要感知具体切换细节  

**Given** 主 Provider 发生超时、限流、不可达或连续失败  
**When** 工厂判定主 Provider 不健康  
**Then** 系统自动切换到备 Provider  
**And** 前端可在 SSE 或结果数据中观察到 `provider_switch` 或等效切换语义  

**Given** 系统需要避免每次调用都重复探测健康状态  
**When** 健康信息写入 Redis  
**Then** 使用 `xm_provider_health:{provider}` 或等效 key 进行短 TTL 缓存  
**And** 健康信息不会被长期保留导致系统长期误判  

**Deliverables:**
- 健康检查逻辑
- Failover 逻辑
- Redis 健康缓存
- 切换事件示例

---

