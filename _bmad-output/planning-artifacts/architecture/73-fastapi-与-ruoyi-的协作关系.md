# 7.3 FastAPI 与 RuoYi 的协作关系
[Rule] FastAPI 与 RuoYi 之间通过**防腐层（Anti-Corruption Layer）** 交互，避免 FastAPI 直接依赖 RuoYi 的领域模型。

[Decision] 学习记录、收藏、会话摘要、视频任务元数据等需落在 RuoYi 业务表中。  
[Rule] 标准业务 CRUD 优先由 RuoYi 管理端 / 业务表承接；FastAPI 不重复建设完整 CRUD 面。  
[Rule] RuoYi 是小麦 ToB 业务表与管理能力的主宿主。  
[Rule] FastAPI 不应膨胀为第二个业务后台。  
