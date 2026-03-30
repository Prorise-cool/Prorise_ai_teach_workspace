"""Unified task framework.

通过惰性导出避免包初始化时把整个调度栈提前拉起。
"""

from __future__ import annotations

from importlib import import_module

_EXPORTS: dict[str, tuple[str, str]] = {
    "BaseTask": ("app.shared.task_framework.base", "BaseTask"),
    "BrokerTaskEventPublisher": ("app.shared.task_framework.publisher", "BrokerTaskEventPublisher"),
    "DemoTask": ("app.shared.task_framework.demo_task", "DemoTask"),
    "InMemoryTaskEventPublisher": ("app.shared.task_framework.publisher", "InMemoryTaskEventPublisher"),
    "InMemoryTaskRuntimeRecorder": ("app.shared.task_framework.runtime", "InMemoryTaskRuntimeRecorder"),
    "TaskContext": ("app.shared.task_framework.context", "TaskContext"),
    "TaskDispatchEvent": ("app.shared.task_framework.publisher", "TaskDispatchEvent"),
    "TaskEventPublisher": ("app.shared.task_framework.publisher", "TaskEventPublisher"),
    "TaskLifecycleState": ("app.shared.task_framework.base", "TaskLifecycleState"),
    "TaskResult": ("app.shared.task_framework.base", "TaskResult"),
    "TaskRuntimeRecorder": ("app.shared.task_framework.runtime", "TaskRuntimeRecorder"),
    "TaskRuntimeSnapshot": ("app.shared.task_framework.runtime", "TaskRuntimeSnapshot"),
    "TaskScheduler": ("app.shared.task_framework.scheduler", "TaskScheduler"),
    "create_task_context": ("app.shared.task_framework.scheduler", "create_task_context"),
    "generate_task_id": ("app.shared.task_framework.scheduler", "generate_task_id"),
}

__all__ = [
    "BaseTask",
    "BrokerTaskEventPublisher",
    "DemoTask",
    "InMemoryTaskEventPublisher",
    "InMemoryTaskRuntimeRecorder",
    "TaskContext",
    "TaskDispatchEvent",
    "TaskEventPublisher",
    "TaskLifecycleState",
    "TaskResult",
    "TaskRuntimeRecorder",
    "TaskRuntimeSnapshot",
    "TaskScheduler",
    "create_task_context",
    "generate_task_id"
]


def __getattr__(name: str) -> object:
    try:
        module_name, attribute_name = _EXPORTS[name]
    except KeyError as exc:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}") from exc

    module = import_module(module_name)
    value = getattr(module, attribute_name)
    globals()[name] = value
    return value
