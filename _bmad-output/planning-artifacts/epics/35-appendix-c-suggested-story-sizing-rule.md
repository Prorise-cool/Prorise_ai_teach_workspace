## Appendix C: Suggested Story Sizing Rule
为避免 Story 再次变成“名义上一个故事，实际上半个 Epic”，建议采用以下粒度约束：

### Size S: 0.5 - 1.5 天
适合：
- 契约冻结
- 单个页面静态壳层
- 单一错误码 / 状态枚举补齐
- 单个 adapter 封装
- 单张表结构冻结

### Size M: 1.5 - 3 天
适合：
- 一个等待页状态机
- 一个 Provider 适配实现
- 一个任务创建接口
- 一个结果页主组件
- 一个回写链路

### Size L: 3 - 5 天
适合：
- Manim 修复链
- 课堂生成服务
- quiz 生成与判题
- 聚合查询接口
- Evidence 上传 + 解析状态

### 禁止 XXL Story
若某 Story 同时包含以下任意 3 项以上，必须继续拆分：
- 前端页面
- 后端接口
- Worker / queue
- 持久化回写
- RuoYi 后台承接
- 外部 Provider 接入

---

