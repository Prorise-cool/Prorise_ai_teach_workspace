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
- `Frontend Story` 已定位到对应的高保真成品图或共享状态设计资产，默认参考 `docs/03UI:UX 设计素材/001UI 设计稿/04-成品图/`；
- 若成品图未覆盖全部实际业务点，缺失点已在对应 Epic / Story 中补充成文，且不得因为设计稿缺口而删减业务实现；
- 后端 Story 已有错误码与响应格式预期。

### Exit Criteria
任一 Story 结束时，必须满足：
- 契约 Story：schema、示例、mock、说明文档齐全；
- 前端 Story：mock 流程闭环、空态错态权限态可见；
- 前端 Story：页面实现与对应成品图的布局、层级、关键状态和共享交互保持一致，设计缺口项按 Epic / Story 补充要求一并落地；
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
