## Definition of Done for Upper Half Epics
### Epic 0 Done
- 工程骨架稳定
- adapter + mock 能跑
- schema / OpenAPI 能出
- request_id / task_id 能追踪
- Story 门禁已成文

### Epic 1 Done
- 用户可通过 `/login` 进入受保护页面
- 首页课堂直达入口、顶栏导航与回跳可用
- 风格配置可透传
- 401 / 403 处理一致

### Epic 2 Done
- 新任务可复用统一任务框架
- SSE 事件结构稳定
- 断线恢复和 `/status` 降级可用
- ProviderFactory 与 Failover 可用
- Redis 运行态 key 具备 TTL

### Epic 3 Done
- 用户可用文本 / 图片创建视频任务
- 任务创建后进入等待页
- mock / real 行为一致
- 输入错误可解释

### Epic 4 Done
- 视频主链路可跑通或明确失败
- 等待页能恢复与降级
- 结果页能稳定播放
- TTS Failover 可观测
- 视频 artifact 回写成功

### Epic 5 Done
- 用户可创建课堂任务并进入等待页
- 课堂结果页可展示 slides / discussion / whiteboard
- 结束信号可输出
- 课堂 artifact 可回写

---
