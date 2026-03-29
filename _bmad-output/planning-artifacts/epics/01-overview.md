## Overview
本文档用于重构小麦项目的 Epic / Story 拆解。  
本版不再沿用“后端 Phase A 做完后，前端 Phase B 再接”的拆法，而是统一改为“用户价值域 Epic + 底座独立 + 契约先行 + mock 先行 + 双端并行”的实施模型。  
在本版结构中，所有“底座型能力”必须先从业务 Epic 中拆离，独立形成基础 Epic，包括统一任务框架、SSE、Provider 抽象、Redis 运行态、RuoYi 防腐层、长期数据承接与日志追踪。  
在本版结构中，后端 Story 的完成定义以稳定 API 契约、错误码、状态枚举、示例 payload、OpenAPI / schema、SSE 事件语义、恢复语义与接口测试为边界；前端 Story 的完成定义以 mock 数据、mock handler、页面状态闭环、adapter 隔离、空态/错态/权限态覆盖为边界。  
正式联调、合并与发布仍然受“高保真视觉稿、关键状态、交互说明、稳定接口契约”四项门禁约束，但这些门禁不再被写成前端等待后端落地的开发阻塞依赖。  
本稿的核心目标不是“把功能分组”，而是“把依赖拆开”，确保 1-2 人团队在 5 周周期下依然可以真实并行、稳定联调、低返工推进。  
本稿相较旧稿做出以下关键重构：
- 新增 `Epic 0`：工程底座与并行开发轨道。
- 新增 `Epic 2`：统一任务框架、SSE 与 Provider 基础设施。
- 新增 `Epic 10`：RuoYi 持久化承接、业务表与防腐层。
- 将原“单题视频学习闭环”拆为“输入创建”和“执行消费”两个相对独立的业务域。
- 将原“课堂学习闭环”保留为独立业务域，但显式依赖底座能力与持久化承接。
- 将 `Companion`、`Evidence / Retrieval`、`Learning Coach`、`Learning Center` 之间的依赖显式化，不再隐性耦合。
- 所有 Epic 增加 `Parallel Delivery Rule`、`Entry Criteria`、`Exit Criteria`、`Dependencies`、`Out of Scope`。
- 所有 Story 增加更严格的 AC，避免出现无法测试、无法联调、无法验收的描述性故事。

