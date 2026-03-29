## Story Definition Standard
### Story Type Classification
每个 Story 必须显式标记为以下类型之一：
- `Contract Story`
- `Frontend Story`
- `Backend Story`
- `Persistence Story`
- `Integration Story`
- `Infrastructure Story`

### Entry Criteria
任一 Story 开始开发前，至少满足：
- 所属 Epic 已定义清晰边界；
- Story 类型已明确；
- 所需依赖 Story 或 Epic 状态已说明；
- 输入输出字段已经有最小契约；
- 页面 Story 已有设计状态说明或状态图；
- 后端 Story 已有错误码与响应格式预期。

### Exit Criteria
任一 Story 结束时，必须满足：
- 契约 Story：schema、示例、mock、说明文档齐全；
- 前端 Story：mock 流程闭环、空态错态权限态可见；
- 后端 Story：接口可跑、测试通过、错误语义稳定；
- 持久化 Story：表结构或接口已落地、字段对齐、回写验证完成；
- 集成 Story：上下游边界验证完成；
- 基础设施 Story：可被至少一个业务 Story 复用。  

### Acceptance Criteria Writing Rule
AC 必须符合：
- 可观察；
- 可测试；
- 可对齐；
- 可独立验收；
- 不依赖“主观感觉”或“默认理解”。  

