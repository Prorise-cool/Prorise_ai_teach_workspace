## Epic 0: 工程底座与并行开发轨道
为全项目建立 Monorepo 基础目录、契约资产规范、mock 运行机制、adapter 隔离、日志追踪与基础交付门禁。  
**FRs covered:** 间接支撑全域  
**NFRs covered:** `NFR-AR-001`、`NFR-AR-006`、`NFR-AR-007`、`NFR-SE-001`、`NFR-SE-004`  
**Primary Story Types:** `Infrastructure Story`、`Contract Story`

### Objective
Epic 0 的目标不是提供用户可见功能，而是提供所有业务 Epic 的“开发轨道”。  
没有 Epic 0，后续所有“并行”都只是人脑中的并行，而不是工程上的并行。  

### Scope
- Monorepo 基础目录冻结  
- 契约资产目录与命名规范  
- mock 资产目录与状态样例规范  
- 前端 adapter 基线  
- 后端 schema / OpenAPI 输出基线  
- request_id / task_id 追踪骨架  
- 交付门禁与 Story 完成定义  

### Out of Scope
- 具体业务接口  
- 具体页面实现  
- 具体业务表与数据回写  
- 具体视频 / 课堂 / Companion 逻辑  

### Dependencies
- 无前置依赖。  
- 所有其他 Epic 依赖 Epic 0。  

### Entry Criteria
- 架构文档已冻结到当前版本。  
- Monorepo 路径已确认。  
- 技术选型已无重大争议。  

### Exit Criteria
- 前端能够运行 mock 模式；  
- 后端能够产出最小 schema；  
- 契约资产存放规范已形成并被后续 Epic 复用；  
- 日志追踪骨架存在；  
- Story 完成定义已明确。  

### Parallel Delivery Rule
Story `0.2` 与 `0.3` 是其他业务 Epic 的并行前置。  
任一页面 Story 若没有 adapter 基线，不得进入正式开发。  
任一接口 Story 若没有契约资产规范，不得宣称“契约已冻结”。  

### Story List
- Story 0.1: Monorepo 基础目录与工程骨架冻结  
- Story 0.2: 契约资产目录、命名规则与版本规则冻结  
- Story 0.3: 前端 adapter、mock handler 与环境切换基线  
- Story 0.4: 后端 schema、OpenAPI、示例 payload 输出基线  
- Story 0.5: request_id / task_id / 日志追踪骨架  
- Story 0.6: Story 交付门禁与并行开发 DoR / DoD 冻结  

### Story 0.1: Monorepo 基础目录与工程骨架冻结
**Story Type:** `Infrastructure Story`  
As a 前后端协作团队，  
I want 冻结 Monorepo 的基础目录和最小工程骨架，  
So that 后续每个 Epic 都能在统一结构中落位而不会边做边改根目录组织。  

**Acceptance Criteria:**
**Given** Epic 0 启动  
**When** 团队创建代码仓目录结构  
**Then** `packages/student-web`、`packages/fastapi-backend`、`packages/RuoYi-Vue-Plus-5.X/ruoyi-xiaomai`、`docs` 等基础路径与架构文档保持一致  
**And** 后续 Epic 不需要再为了根目录结构返工移动大批文件  

**Given** 开发者首次拉取项目  
**When** 按 README 执行最小启动流程  
**Then** 前端、FastAPI 与 RuoYi 至少能以空壳模式启动  
**And** 开发者不会因为根目录或启动脚本缺失而无法进入业务开发  

**Deliverables:**
- 根目录结构说明  
- 各 package 最小启动说明  
- `.env.example` 基线  
- README 中的启动步骤  

**Notes:**
- 该 Story 不要求业务功能可用。  
- 该 Story 要求“结构稳定”，而不是“功能完整”。  

### Story 0.2: 契约资产目录、命名规则与版本规则冻结
**Story Type:** `Contract Story`  
As a 前后端协作团队，  
I want 为契约、mock、示例 payload、错误码与状态枚举建立统一存放和命名规范，  
So that 后续所有 Epic 的“契约冻结”都有可执行、可查找、可复用的落地点。  

**Acceptance Criteria:**
**Given** 一个新的业务域需要冻结契约  
**When** 团队查看契约资产目录  
**Then** 能明确知道接口 schema、示例 payload、错误码字典、状态枚举和 mock 样例应该存放在哪里  
**And** 不会出现契约信息散落在 issue、聊天记录、页面注释和个人笔记中的情况  

**Given** 某个契约升级  
**When** 团队发布新版本 schema  
**Then** 契约变更具备版本标识、变更说明和影响范围说明  
**And** 前端不会因为后端字段暗改而在联调阶段被动发现破坏性变更  

**Deliverables:**
- `contracts/` 目录规则  
- `mocks/` 目录规则  
- 错误码定义规范  
- 状态枚举定义规范  
- schema 版本命名规范  

**Suggested Structure:**
```text
contracts/
  auth/
  task/
  video/
  classroom/
  companion/
  evidence/
  learning/
  center/
mocks/
  auth/
  video/
  classroom/
  companion/
  evidence/
  learning/
  center/
```

### Story 0.3: 前端 adapter、mock handler 与环境切换基线
**Story Type:** `Infrastructure Story`  
As a 前端团队，  
I want 建立统一的 adapter 与 mock handler 机制，  
So that 正式页面可以在真实后端缺席时仍然按契约推进到可验收状态。  

**Acceptance Criteria:**
**Given** 任一页面需要调用后端能力  
**When** 页面接入数据层  
**Then** 页面只依赖统一 adapter 接口而不直接依赖具体 HTTP 实现  
**And** 页面在 mock 与 real 两种模式下不需要重写组件状态逻辑  

**Given** 前端运行在 mock 模式  
**When** 页面访问列表、详情、任务状态或 SSE 事件流  
**Then** mock handler 能返回与真实契约一致的字段结构  
**And** 至少覆盖空态、加载态、处理中、完成态、失败态与权限失败态  

**Deliverables:**
- `services/api/client.ts`
- `services/api/adapters/*`
- mock 开关配置
- 假任务状态流样例
- 权限失败样例

**Notes:**
- mock 不是“写死的假 JSON”，而是“可驱动页面状态机的可编排样例”。  

### Story 0.4: 后端 schema、OpenAPI、示例 payload 输出基线
**Story Type:** `Infrastructure Story`  
As a 后端团队，  
I want 建立统一的 schema、OpenAPI 和示例 payload 输出机制，  
So that 前端可以从机器可读资产而非自然语言猜测接口结构。  

**Acceptance Criteria:**
**Given** 一个新的后端接口被声明为“契约冻结”  
**When** 前端或测试查看该接口  
**Then** 可以拿到机器可读 schema、示例 request、示例 response 与错误示例  
**And** 不需要通过口头说明推断字段含义  

**Given** 某个任务接口包含状态枚举或错误码  
**When** 接口文档生成  
**Then** 状态枚举、错误码与示例 payload 在文档中可见  
**And** 不允许只给一个成功示例而缺失失败示例  

**Deliverables:**
- OpenAPI 输出规范
- JSON schema 组织规则
- 示例 payload 模板
- 错误 payload 模板

### Story 0.5: request_id / task_id / 日志追踪骨架
**Story Type:** `Infrastructure Story`  
As a 运维与开发协作团队，  
I want 让 request_id、task_id 与统一日志字段从一开始就进入链路，  
So that 后续出现跨服务错误时可以进行最小可行排障。  

**Acceptance Criteria:**
**Given** 任一进入 FastAPI 的请求  
**When** 请求经过中间件  
**Then** 请求具备 request_id  
**And** 该 request_id 会进入日志上下文与响应头或等效调试信息中  

**Given** 任一长任务被创建  
**When** 任务进入异步执行流程  
**Then** task_id 会贯穿创建日志、执行日志、SSE 事件与异常日志  
**And** 排障时可以通过 task_id 串联一整条任务链路  

**Deliverables:**
- request_id middleware
- log context 规范
- task_id 日志贯穿方式
- 基础错误日志格式

### Story 0.6: Story 交付门禁与并行开发 DoR / DoD 冻结
**Story Type:** `Contract Story`  
As a 项目协作团队，  
I want 明确 Story 的进入条件和退出条件，  
So that 团队不会把“半成品页面”、“口头契约”或“不可联调接口”误判为已完成。  

**Acceptance Criteria:**
**Given** 一个 Story 被标记为 Ready  
**When** 团队检查其输入条件  
**Then** 能确认 Story 类型、依赖、最小契约、状态说明和验收口径已明确  
**And** 不会把需求模糊、字段未定、状态未列举的工作直接推给开发实现  

**Given** 一个 Story 被标记为 Done  
**When** 团队复核完成定义  
**Then** 能确认其交付物、AC、测试或状态闭环已经满足  
**And** 不会把“只写了页面壳”或“只写了接口路由”误判为完成  

**Deliverables:**
- Story DoR
- Story DoD
- 联调前门禁
- 合并前门禁
- 发布前门禁

---

