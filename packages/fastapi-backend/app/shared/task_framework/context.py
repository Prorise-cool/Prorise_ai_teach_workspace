"""任务上下文模块。

定义 ``TaskContext``——贯穿任务生命周期的不可变上下文容器，
携带 task_id、user_id、request_id 等追踪字段，供调度器、
任务实例和运行态存储在整个调用链中共享引用。
"""
from dataclasses import dataclass, field

from app.core.logging import format_trace_timestamp


@dataclass(slots=True)
class TaskContext:
    """任务上下文数据类。

    在任务创建时由 ``create_task_context()`` 生成，随后注入到
    ``BaseTask`` 实例中，贯穿 prepare → run → finalize 全生命周期。

    Attributes:
        task_id: 全局唯一任务标识符，格式为 ``<prefix>_<timestamp>_<short_uuid>``。
        task_type: 任务类型标识，例如 ``"video"``、``"classroom"``。
        user_id: 发起任务的用户 ID，匿名场景为 None。
        request_id: 关联的 HTTP 请求追踪 ID，用于日志串联。
        retry_count: 当前重试次数（0 表示首次执行）。
        source_module: 来源模块名称，默认 ``"shared"``。
        metadata: 可扩展的业务元数据字典。
        created_at: 上下文创建时间（UTC ISO 8601 格式字符串）。
    """

    task_id: str
    task_type: str
    user_id: str | None
    request_id: str | None = None
    retry_count: int = 0
    source_module: str = "shared"
    metadata: dict[str, object] = field(default_factory=dict)
    created_at: str = field(default_factory=format_trace_timestamp)
