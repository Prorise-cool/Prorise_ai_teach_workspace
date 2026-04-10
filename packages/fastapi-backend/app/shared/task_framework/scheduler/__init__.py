"""任务调度器模块。

提供 ``TaskScheduler``（同步调度）、任务注册表、``TaskContext`` 序列化/反序列化
以及任务投递凭证 ``TaskDispatchReceipt`` 等核心调度基础设施。

子模块:
- ``registry``: ID 生成、上下文工厂、任务注册表与序列化
- ``dispatcher``: ``TaskScheduler`` 核心调度与异步投递
- ``runtime_manager``: 运行时事件发布与快照发射
- ``result_normalizer``: 结果归一化与错误处理
"""
from __future__ import annotations

from app.shared.task_framework.scheduler.dispatcher import TaskScheduler
from app.shared.task_framework.scheduler.registry import (
    TaskDispatchReceipt,
    build_task,
    create_task_context,
    deserialize_task_context,
    generate_task_id,
    register_task,
    serialize_task_context,
)

__all__ = [
    "TaskDispatchReceipt",
    "TaskScheduler",
    "build_task",
    "create_task_context",
    "deserialize_task_context",
    "generate_task_id",
    "register_task",
    "serialize_task_context",
]
