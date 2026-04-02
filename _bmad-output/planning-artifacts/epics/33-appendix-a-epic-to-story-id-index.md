## Appendix A: Epic to Story ID Index
### Epic 0
- 0.1 Monorepo 基础目录与工程骨架冻结
- 0.2 契约资产目录、命名规则与版本规则冻结
- 0.3 前端 adapter、mock handler 与环境切换基线
- 0.4 后端 schema、OpenAPI、示例 payload 输出基线
- 0.5 request_id / task_id / 日志追踪骨架
- 0.6 Story 交付门禁与并行开发 DoR / DoD 冻结

### Epic 1
- 1.1 统一认证契约、会话 payload 与 mock 基线
- 1.2 独立认证页中的注册、登录与回跳
- 1.3 登出、401 处理与受保护访问一致性
- 1.4 首页课堂直达入口与顶栏导航分发
- 1.5 输入壳层中的老师风格最小选择配置
- 1.6 角色边界与入口级权限可见性
- 1.7 营销落地页与 home 首页分流

### Epic 2
- 2.1 统一任务状态枚举、错误码与结果 schema 冻结
- 2.2 Task 基类、TaskContext 与调度骨架
- 2.3 Dramatiq + Redis broker 基础接入
- 2.4 Redis 运行态 Key、TTL 与事件缓存落地
- 2.5 SSE 事件类型、payload 与 broker 契约冻结
- 2.6 SSE 断线恢复与 `/status` 查询降级
- 2.7 Provider Protocol、工厂与优先级注册骨架
- 2.8 Provider 健康检查、Failover 与缓存策略

### Epic 3
- 3.1 视频任务创建契约与 mock task 基线
- 3.2 视频输入页壳层与多模态输入交互
- 3.3 图片 / OCR 前置预处理接口
- 3.4 视频任务创建接口与初始化运行态
- 3.5 创建后跳转等待页与任务上下文承接
- 3.6 视频输入页公开视频广场与复用入口

### Epic 4
- 4.1 视频流水线阶段、进度区间与结果契约冻结
- 4.2 题目理解与分镜生成服务
- 4.3 Manim 代码生成与自动修复链
- 4.4 Manim 沙箱执行与资源限制
- 4.5 TTS 合成与 Provider Failover 落地
- 4.6 FFmpeg 合成、COS 上传与完成结果回写
- 4.7 视频等待页前端状态机、恢复与降级
- 4.8 视频结果页、播放器与结果操作
- 4.9 视频侧 SessionArtifactGraph 回写
- 4.10 视频结果公开发布与输入页复用卡片

### Epic 5
- 5.1 课堂任务契约、结果 schema 与 mock session 基线
- 5.2 主题输入与课堂任务创建
- 5.3 课堂等待页与统一进度复用
- 5.4 课堂生成服务与多 Agent 讨论结果
- 5.5 白板布局与基础可读性规则
- 5.6 课堂结果页中的幻灯片、讨论与白板浏览
- 5.7 会话结束信号与课后触发出口
- 5.8 课堂侧 SessionArtifactGraph 回写
- 5.9 课堂输入页联网搜索增强与证据范围配置
- 5.10 课堂结果导出与分享产物

### Epic 6
- 6.1 `TimeAnchor`、turn schema 与 mock Companion turns 基线
- 6.2 视频 / 课堂共享 Companion 侧栏壳层
- 6.3 视频与课堂的 Context Adapter
- 6.4 当前时刻提问与回答服务
- 6.5 连续追问与上下文窗口管理
- 6.6 白板动作协议与结构化降级
- 6.7 问答回写与视频 / 课堂双页复用闭环

### Epic 7
- 7.1 Evidence 契约、来源抽屉 schema 与 mock 数据基线
- 7.2 来源抽屉 / 证据面板前端
- 7.3 EvidenceProvider 适配层与外部能力编排
- 7.4 文档上传、解析状态与范围切换
- 7.5 引用来源展示与术语解释
- 7.6 证据问答回写与学习中心回看
- 7.7 联网搜索 Provider 与生成前证据增强

### Epic 8
- 8.1 学后入口契约与 `checkpoint / quiz / path` schema 冻结
- 8.2 会话后入口与 Learning Coach 路由承接
- 8.3 轻量 checkpoint 生成与反馈
- 8.4 正式 quiz 生成、判题与解析
- 8.5 错题本与知识推荐
- 8.6 学习路径规划、保存与调整
- 8.7 Learning Coach 长期数据回写

### Epic 9
- 9.1 学习中心聚合契约、分页结构与 mock 数据集
- 9.2 学习中心结果回看与入口整合
- 9.3 历史记录与收藏管理
- 9.4 个人资料与设置管理
- 9.5 i18n 架构预留与关键静态文案资源化

### Epic 10
- 10.1 长期业务数据边界、业务表清单与字段基线冻结
- 10.2 RuoYi 小麦业务模块与权限承接规则
- 10.3 FastAPI 与 RuoYi 防腐层客户端
- 10.4 视频与课堂任务元数据长期承接
- 10.5 Companion 与 Evidence 问答长期承接
- 10.6 Learning Coach 结果、错题与路径长期承接
- 10.7 学习记录、收藏与聚合查询承接
- 10.8 后台查询、导出与审计边界

---
