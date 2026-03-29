## Epic 10: RuoYi 持久化承接、业务表与防腐层
系统将视频、课堂、Companion、Evidence、Learning Coach 与学习中心所需的长期业务数据统一承接到 RuoYi 业务表 / MySQL / COS，并提供可查询、可回写、可审计边界。  
**FRs covered:** `FR-LR-005`，并间接支撑 `FR-CP-005`、`FR-KQ-006`、`FR-LA-005`、`FR-LA-006`  
**NFRs covered:** `NFR-AR-001`、`NFR-AR-002`、`NFR-CO-001`、`NFR-SE-002`  
**Primary Story Types:** `Contract Story`、`Backend Story`、`Persistence Story`、`Integration Story`

### Objective
Epic 10 是所有长期业务数据的宿主承接层。  
它回答的问题是：
- 什么数据必须进 RuoYi / MySQL？
- 什么数据只能放 Redis 运行态？
- FastAPI 如何通过防腐层与 RuoYi 交互？
- 后台查询与审计边界如何承接？  

它不是：
- 学生端页面；
- 运行时缓存层；
- 独立 ToB 产品域扩展。  

### Scope
- 小麦业务表设计
- RuoYi 业务模块边界
- FastAPI <-> RuoYi 防腐层
- 视频任务元数据回写
- 课堂会话摘要回写
- Companion 问答回写
- Evidence 问答回写
- quiz / path / wrongbook 承接
- 收藏与学习记录承接
- 审计 / 查询边界

### Out of Scope
- Redis 运行态缓存设计
- 前端聚合页实现
- 视频 / 课堂执行逻辑本身
- 外部 AI 平台实现

### Dependencies
- 依赖 `Epic 0` 的工程骨架与契约规范。  
- 被 `Epic 4 / 5 / 6 / 7 / 8 / 9` 依赖。  
- 可先于部分业务域实现基础表结构与防腐层。  

### Entry Criteria
- 长期数据边界已明确：哪些必须进 RuoYi / MySQL / COS。  
- 业务实体命名与最小字段集已讨论完成。  
- RuoYi 不改核心框架、只扩业务模块的原则已确认。  

### Exit Criteria
- 关键长期业务数据都有明确宿主；  
- FastAPI 与 RuoYi 间存在可用防腐层；  
- 业务表足以承接学习中心所需主要回看数据；  
- 后台查询与审计边界稳定；  
- Redis 不再被误用为长期业务存储。  

### Parallel Delivery Rule
Story `10.1` 与 `10.2` 是所有长期数据类 Story 的前置。  
Story `10.3` 可优先落地，以便 FastAPI 尽早接入回写。  
Story `10.4 ~ 10.7` 可与业务 Epic 并行推进，但字段变更必须通过契约变更流程。  
Story `10.8` 需在学习中心与后台查询联调前完成。  

### Story List
- Story 10.1: 长期业务数据边界、业务表清单与字段基线冻结  
- Story 10.2: RuoYi 小麦业务模块与权限承接规则  
- Story 10.3: FastAPI 与 RuoYi 防腐层客户端  
- Story 10.4: 视频与课堂任务元数据长期承接  
- Story 10.5: Companion 与 Evidence 问答长期承接  
- Story 10.6: Learning Coach 结果、错题与路径长期承接  
- Story 10.7: 学习记录、收藏与聚合查询承接  
- Story 10.8: 后台查询、导出与审计边界  

### Story 10.1: 长期业务数据边界、业务表清单与字段基线冻结
**Story Type:** `Contract Story`  
As a 架构与开发协作团队，  
I want 先冻结长期业务数据边界与业务表清单，  
So that 各业务域在回写和查询时不会再争论“这个数据到底该放 Redis 还是 RuoYi”。  

**Acceptance Criteria:**
**Given** 系统存在运行态数据与长期业务数据  
**When** 团队查看数据边界清单  
**Then** 能明确区分哪些数据进入 Redis、哪些进入 RuoYi/MySQL、哪些进入 COS  
**And** 不会把学习记录、收藏、任务元数据或问答历史继续错误存放在 Redis 中  

**Given** 各业务 Epic 需要长期回写  
**When** 团队查看业务表清单  
**Then** 至少能看到视频任务、课堂会话、Companion turn、artifact、whiteboard action、Evidence chat、quiz 结果、learning path、learning record、favorite 等表或等效实体  
**And** 上层业务不需要再各自新建临时表结构  

**Given** 某条数据需要供学习中心回看或后台审计  
**When** 设计其持久化归属  
**Then** 该数据必须进入长期宿主  
**And** 不能以“后面再补表”为借口先长期滞留在运行态缓存中  

**Deliverables:**
- 业务表清单
- 字段基线
- Redis / MySQL / COS 边界清单
- 数据宿主说明

### Story 10.2: RuoYi 小麦业务模块与权限承接规则
**Story Type:** `Integration Story`  
As a 平台团队，  
I want 在 RuoYi 中为小麦业务建立独立业务模块与权限承接规则，  
So that 长期数据、查询与审计能够在既有框架内稳定落位。  

**Acceptance Criteria:**
**Given** 小麦需要接入 RuoYi 作为长期业务宿主  
**When** 团队设计 RuoYi 承接方案  
**Then** 小麦业务通过新增业务模块、业务表、CRUD 与菜单权限扩展，而不修改 RuoYi 核心认证与权限框架  
**And** 架构边界符合“RuoYi 核心稳定，业务模块可扩展”的原则  

**Given** 需要对视频、课堂、学习记录等长期数据进行权限管理  
**When** 配置菜单与按钮权限  
**Then** 小麦业务权限标识遵循统一 `模块:资源:操作` 规则  
**And** FastAPI 不自建第二套独立 RBAC 表结构  

**Given** 后台未来需要承接查询与审计  
**When** 业务模块结构冻结  
**Then** 能支持后续 CRUD、查询、导出等管理扩展  
**And** 当前阶段不把其扩展成新的独立 ToB 产品域  

**Deliverables:**
- `ruoyi-xiaomai` 模块边界
- 权限标识清单
- 菜单 / 按钮权限规则
- 业务模块目录规划

### Story 10.3: FastAPI 与 RuoYi 防腐层客户端
**Story Type:** `Backend Story`  
As a 后端团队，  
I want 通过防腐层而不是直接耦合 RuoYi 领域模型进行交互，  
So that FastAPI 维持功能服务层定位，不膨胀成第二个业务后台。  

**Acceptance Criteria:**
**Given** FastAPI 需要回写或查询长期业务数据  
**When** 它与 RuoYi 交互  
**Then** 通过统一的防腐层客户端、DTO 或适配对象完成  
**And** 不直接依赖 RuoYi 的领域模型、Mapper 或内部服务实现  

**Given** RuoYi 业务字段调整  
**When** 需要更新 FastAPI 侧  
**Then** 优先在防腐层映射中消化差异  
**And** 不把 RuoYi 领域结构变化直接扩散到所有 FastAPI feature 模块  

**Given** 某次回写失败  
**When** FastAPI 处理与 RuoYi 的交互错误  
**Then** 能返回明确的集成失败语义并记录日志  
**And** 不会让业务层收到大量未映射的框架级异常  

**Deliverables:**
- `shared/ruoyi_client.py`
- DTO / mapper 设计
- 回写 / 查询接口封装
- 集成错误映射

### Story 10.4: 视频与课堂任务元数据长期承接
**Story Type:** `Persistence Story`  
As a 平台与回访用户，  
I want 视频和课堂的任务元数据被长期保存，  
So that 结果页回看、学习中心聚合与后台查询有稳定数据来源。  

**Acceptance Criteria:**
**Given** 视频任务或课堂任务创建、执行、完成或失败  
**When** 系统回写元数据  
**Then** 至少保存任务 ID、用户归属、任务类型、状态、摘要、结果资源标识与时间信息  
**And** 这些数据进入长期业务表而不是只依赖 Redis 运行态  

**Given** 任务失败  
**When** 后台或学习中心查询任务  
**Then** 至少能识别失败状态、失败时间和最小错误摘要  
**And** 不会在长期记录中把失败任务隐身掉只留下成功结果  

**Given** 用户从学习中心再次打开视频或课堂结果  
**When** 页面查询该条记录  
**Then** 能通过长期元数据定位到正确的结果详情  
**And** 不需要重新扫描运行态缓存才能恢复结果页入口  

**Deliverables:**
- `xm_video_task`
- `xm_classroom_session`
- 元数据回写
- 查询所需最小字段

### Story 10.5: Companion 与 Evidence 问答长期承接
**Story Type:** `Persistence Story`  
As a 回访用户与平台，  
I want 会话伴学与资料依据问答被长期保存，  
So that 学习中心能够回看问答过程，后台也能进行审计与分析。  

**Acceptance Criteria:**
**Given** 一轮 Companion 或 Evidence 问答结束  
**When** 系统执行回写  
**Then** 至少保存问题、回答摘要、来源、锚点或范围、时间戳与状态  
**And** 这些记录可用于学习中心回看与后台查询  

**Given** 某条问答带有白板动作、来源引用或范围信息  
**When** 记录被持久化  
**Then** 相关附加信息以结构化字段或关联记录形式保存  
**And** 后续页面不需要重新执行问答才能恢复主要内容  

**Given** 某轮问答部分失败  
**When** 记录进入长期存储  
**Then** 能区分主回答成功、白板降级、引用缺失或整体失败等状态  
**And** 后续回看页面不会误判本轮为“完整成功”  

**Deliverables:**
- `xm_companion_turn`
- `xm_whiteboard_action_log`
- `xm_knowledge_chat_log`
- 关联字段与查询字段

### Story 10.6: Learning Coach 结果、错题与路径长期承接
**Story Type:** `Persistence Story`  
As a 学习中心与平台，  
I want checkpoint、quiz、wrongbook、recommendation 与 path 结果被长期承接，  
So that 学后巩固结果能够持续沉淀而不是一次性消费。  

**Acceptance Criteria:**
**Given** 用户完成 checkpoint 或 quiz  
**When** 系统执行持久化  
**Then** 结果、得分、解析摘要、来源会话与时间信息进入长期业务表  
**And** 学习中心能够稳定查询这些结果  

**Given** 错题、推荐或学习路径被生成  
**When** 记录被写回  
**Then** 它们拥有清晰的结果类型、来源、状态与打开详情所需字段  
**And** 不会混入普通历史记录导致前端难以区分展示逻辑  

**Given** 用户后续调整学习路径  
**When** 路径再次保存  
**Then** 系统能保留版本或最后更新时间等必要信息  
**And** 不会因简单覆盖写入导致历史路径状态完全不可追溯  

**Deliverables:**
- `xm_quiz_result`
- `xm_learning_path`
- wrongbook / recommendation 承接字段
- 查询接口最小映射

### Story 10.7: 学习记录、收藏与聚合查询承接
**Story Type:** `Backend Story`  
As a 学习中心前端，  
I want 有稳定的长期数据查询入口承接历史、收藏与聚合结果，  
So that `/learning`、`/history` 与 `/favorites` 能以统一分页语义工作。  

**Acceptance Criteria:**
**Given** 学习中心需要聚合视频、课堂、Companion、Evidence 与 Learning Coach 结果  
**When** 前端发起查询  
**Then** 后端提供统一或可组合的分页查询结构  
**And** 返回格式与全局 `{code, msg, rows, total}` 约定保持一致  

**Given** 用户执行收藏、取消收藏或删除历史  
**When** 后端处理该类长期数据变更  
**Then** 变更被写入长期业务表  
**And** 学习中心刷新后能看到一致结果，而不是运行态和长期态不一致  

**Given** 页面按类型、时间或状态进行过滤  
**When** 后端返回聚合数据  
**Then** 至少支持最小可行的筛选与分页  
**And** 不要求前端自己在全量历史上做危险的本地拼装分页  

**Deliverables:**
- `xm_learning_record`
- `xm_learning_favorite`
- 聚合查询接口
- 删除 / 收藏变更接口

### Story 10.8: 后台查询、导出与审计边界
**Story Type:** `Integration Story`  
As a 平台运营人员或教师管理员，  
I want 关键学习数据能够被稳定查询与审计，  
So that 平台可以长期运营，同时又不把当前版本扩展成独立 ToB 产品。  

**Acceptance Criteria:**
**Given** 视频、课堂、Companion、Evidence、quiz、收藏等结果产生  
**When** 运营人员通过后台查询  
**Then** 可以按边界查看需要的学习记录、摘要和状态  
**And** 当前版本只承接管理、查询和审计边界，不额外扩展成新的独立 ToB 产品域  

**Given** 某类记录需要导出或审计  
**When** 后台调用查询能力  
**Then** 数据字段与状态语义足以支撑最小导出或审计  
**And** 不需要重新回到 Redis 运行态拼装历史信息  

**Given** 后台查询权限受 RuoYi RBAC 控制  
**When** 用户权限不足  
**Then** 后台按统一权限规则拒绝访问  
**And** 小麦不会在后台再自建一套平行权限系统与其冲突  

**Deliverables:**
- 后台查询边界说明
- 导出最小字段清单
- 审计场景字段清单
- 与 RBAC 的映射说明

---

