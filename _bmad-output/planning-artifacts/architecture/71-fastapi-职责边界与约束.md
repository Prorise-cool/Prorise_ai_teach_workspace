# 7.1 FastAPI 职责边界与约束

## 7.1.1 核心原则
[Rule] FastAPI 是**功能服务层**，不是**业务后台**。它的职责是执行功能、协调异步任务、调用外部能力，而不是承担业务数据定义和业务规则。

## 7.1.2 职责清单（允许做的事）
| 职责 | 说明 | 示例 |
|------|------|------|
| **功能执行** | 执行具体的 AI 功能逻辑 | Manim 渲染、TTS 合成、视频合成 |
| **任务协调** | 创建、推进、监控异步任务 | VideoTask、ClassroomTask 的状态机 |
| **外部能力调用** | 调用 LLM/TTS/腾讯云等外部服务 | 通过 Provider 抽象层调用 |
| **实时推送** | SSE 进度、状态变更通知 | 视频生成进度、课堂状态 |
| **运行时状态** | Redis 中的临时状态管理 | 任务进度、会话上下文 |
| **结果整理** | 整理外部服务返回的结果 | 格式化 LLM 输出、组装视频元数据 |

## 7.1.3 禁止清单（不允许做的事）
| 禁止项 | 理由 | 正确归属 |
|--------|------|----------|
| **定义业务实体** | 业务实体由 RuoYi 定义 | RuoYi MySQL 表 |
| **持久化业务数据** | 长期数据必须入 RuoYi | RuoYi 业务表 |
| **实现业务规则** | 如"连续错 3 题降级"等规则 | RuoYi 服务层 |
| **管理用户关系** | 用户-课程-权限关系 | RuoYi RBAC |
| **提供 CRUD 接口** | 标准 CRUD 由 RuoYi 提供 | RuoYi Controller |
| **存储审计日志** | 合规要求的审计记录 | RuoYi 操作日志 |

## 7.1.4 边界判断测试
当需要判断某个功能是否应该放在 FastAPI 时，问自己：

```text
Q1: 这个数据是否需要长期保存？（> 24h）
    → 是 → 放 RuoYi
Q2: 这个数据是否需要后台管理/查询？
    → 是 → 放 RuoYi
Q3: 这个数据是否需要导出/审计？
    → 是 → 放 RuoYi
Q4: 这个逻辑是否是"执行某个 AI 功能"？
    → 是 → 放 FastAPI
Q5: 这个逻辑是否是"协调异步任务"？
    → 是 → 放 FastAPI
Q6: 这个逻辑是否是"调用外部服务"？
    → 是 → 放 FastAPI（通过 Provider）
```

## 7.1.5 数据存储归属速查表
| 数据类型 | 存储位置 | TTL | 示例 |
|---------|---------|-----|------|
| 任务运行时状态 | Redis | 2h | `xm_task:{id}` |
| SSE 事件缓存 | Redis | 1h | `xm_task_events:{id}` |
| 会话上下文 | Redis | 会话期间 | `xm_classroom_runtime:{id}` |
| Provider 健康状态 | Redis | 60s | `xm_provider_health:{provider}` |
| 视频任务元数据 | RuoYi | 永久 | `xm_video_task` |
| 课堂会话摘要 | RuoYi | 永久 | `xm_classroom_session` |
| 学习记录 | RuoYi | 永久 | `xm_learning_record` |
| 测验结果 | RuoYi | 永久 | `xm_quiz_result` |
| 问答日志 | RuoYi | 永久 | `xm_knowledge_chat_log` |
