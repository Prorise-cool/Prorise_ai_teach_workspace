# 7.2 RuoYi 集成策略与边界

## 7.2.1 定位
[Decision] RuoYi 在小麦中的角色不是“旁路认证服务”，而是**业务管理与标准数据持久化平台**。

它负责：
- 用户、角色、菜单、权限
- 操作日志、登录日志
- 标准业务表
- 后台 CRUD 页面与接口
- 后台审计、导出、查询

FastAPI 负责：
- AI 能力编排
- 功能执行
- 长耗时任务处理
- 实时进度推送
- 与 RuoYi 之间的数据同步 / 回写

## 7.2.2 可由 RuoYi 承接的业务表
[Implementation Note] 以下业务建议直接通过 RuoYi 建表并生成 CRUD：
- `xm_video_task`
- `xm_classroom_session`
- `xm_learning_record`
- `xm_learning_favorite`
- `xm_quiz_result`
- `xm_agent_profile`（后续运营化时）

## 7.2.3 不进入 RuoYi 主表的运行时数据
以下数据不适合作为 RuoYi 主业务表直接实时承接：
- LLM 流式 token
- SSE 逐条过程事件
- Manim 渲染临时日志
- 临时上下文缓冲
- 短期健康探针状态

这些应保存在：
- Redis
- 日志文件
- 对象存储
- 监控系统

## 7.2.4 “不修改 RuoYi”的准确含义
[Rule] “不修改 RuoYi”指的是**不修改其核心框架与认证/权限基础机制**，并不意味着禁止在其业务层新增小麦业务表和 CRUD 模块。

允许做的事：
- 新增小麦业务表
- 使用代码生成器生成 CRUD
- 新增管理页面与接口
- 新增业务菜单与权限标识

不建议做的事：
- 改动 RuoYi 核心认证流程
- 改动基础 RBAC 框架实现
- 深度侵入框架底层代码
