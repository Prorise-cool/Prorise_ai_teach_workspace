"""结构化日志与请求追踪模块。

基于 Python ``logging`` + ``contextvars`` 实现 request_id / task_id / error_code
三维追踪上下文，自动注入到所有日志记录中。

核心功能:
- ``configure_logging()``: 初始化日志格式和追踪 LogRecord 工厂。
- ``bind_trace_context()`` / ``reset_trace_context()``: 绑定/重置追踪上下文。
- ``get_request_id()`` / ``get_task_id()`` / ``get_error_code()``: 读取当前追踪值。
- ``generate_request_id()``: 生成 ``req_<timestamp>_<uuid>`` 格式的请求 ID。
"""
import logging
from contextvars import ContextVar, Token
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

EMPTY_TRACE_VALUE = "-"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
LOG_FORMAT = (
    "%(asctime)s [%(threadName)s] %(levelname)-5s %(name)s - %(message)s "
    "| request_id=%(request_id)s task_id=%(task_id)s error_code=%(error_code)s"
)

_request_id_context: ContextVar[str] = ContextVar("request_id", default=EMPTY_TRACE_VALUE)
_task_id_context: ContextVar[str] = ContextVar("task_id", default=EMPTY_TRACE_VALUE)
_error_code_context: ContextVar[str] = ContextVar("error_code", default=EMPTY_TRACE_VALUE)
_base_log_record_factory = logging.getLogRecordFactory()
_logging_configured = False
_trace_factory_installed = False
_trace_handler_name = "prorise-trace-handler"


@dataclass(slots=True)
class TraceContextTokens:
    """``bind_trace_context()`` 返回的 ContextVar 重置令牌集合。

    用于配合 ``reset_trace_context()`` 在 try/finally 中安全恢复上下文。
    """

    request_id: Token[str] | None = None
    task_id: Token[str] | None = None
    error_code: Token[str] | None = None


def _trace_log_record_factory(*args: object, **kwargs: object) -> logging.LogRecord:
    record = _base_log_record_factory(*args, **kwargs)
    record.request_id = _request_id_context.get()
    record.task_id = _task_id_context.get()
    record.error_code = _error_code_context.get()
    return record


def _ensure_trace_record_factory() -> None:
    global _trace_factory_installed

    if _trace_factory_installed:
        return

    logging.setLogRecordFactory(_trace_log_record_factory)
    _trace_factory_installed = True


def configure_logging() -> None:
    """配置全局日志格式与 trace 上下文注入。

    幂等：首次调用完成配置后，后续调用直接返回，
    避免多次调用（如 main.py + lifespan.py）导致 handler 重复添加。

    日志级别通过 ``FASTAPI_LOG_LEVEL`` 环境变量控制，默认 INFO。
    """
    global _logging_configured

    if _logging_configured:
        return

    _ensure_trace_record_factory()

    from app.core.config import get_settings
    settings = get_settings()
    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    trace_handler = next(
        (handler for handler in root_logger.handlers if handler.get_name() == _trace_handler_name),
        None
    )
    if trace_handler is None:
        trace_handler = logging.StreamHandler()
        trace_handler.set_name(_trace_handler_name)

    trace_handler.setLevel(level)
    trace_handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT))

    other_handlers = [handler for handler in root_logger.handlers if handler.get_name() != _trace_handler_name]
    root_logger.handlers = [trace_handler, *other_handlers]

    _logging_configured = True


def get_logger(name: str) -> logging.Logger:
    """获取指定名称的 Logger 实例（自动继承追踪字段注入）。"""
    return logging.getLogger(name)


def format_trace_timestamp(value: datetime | None = None) -> str:
    """格式化 UTC 时间为 ISO 8601 字符串（秒精度，Z 后缀）。"""
    current = value or datetime.now(UTC)
    return current.isoformat(timespec="seconds").replace("+00:00", "Z")


def generate_request_id() -> str:
    """生成请求追踪 ID，格式: ``req_<YYYYMMDDHHmmSS>_<8位uuid>``。"""
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    short_uuid = uuid4().hex[:8]
    return f"req_{timestamp}_{short_uuid}"


def bind_trace_context(
    *,
    request_id: str | None = None,
    task_id: str | None = None,
    error_code: str | None = None
) -> TraceContextTokens:
    """绑定追踪上下文到当前协程/线程。

    返回 ``TraceContextTokens``，需在 finally 块中传给 ``reset_trace_context()``
    以恢复上一层上下文。仅提供的非 None 字段会被设置。
    """
    tokens = TraceContextTokens()
    if request_id is not None:
        tokens.request_id = _request_id_context.set(request_id)
    if task_id is not None:
        tokens.task_id = _task_id_context.set(task_id)
    if error_code is not None:
        tokens.error_code = _error_code_context.set(error_code)
    return tokens


def reset_trace_context(tokens: TraceContextTokens) -> None:
    """使用 ``bind_trace_context()`` 返回的令牌恢复上一层追踪上下文。"""
    if tokens.error_code is not None:
        _error_code_context.reset(tokens.error_code)
    if tokens.task_id is not None:
        _task_id_context.reset(tokens.task_id)
    if tokens.request_id is not None:
        _request_id_context.reset(tokens.request_id)


def get_request_id() -> str | None:
    """获取当前追踪上下文中的 request_id，未设置时返回 None。"""
    request_id = _request_id_context.get()
    return None if request_id == EMPTY_TRACE_VALUE else request_id


def get_task_id() -> str | None:
    """获取当前追踪上下文中的 task_id，未设置时返回 None。"""
    task_id = _task_id_context.get()
    return None if task_id == EMPTY_TRACE_VALUE else task_id


def get_error_code() -> str | None:
    """获取当前追踪上下文中的 error_code，未设置时返回 None。"""
    error_code = _error_code_context.get()
    return None if error_code == EMPTY_TRACE_VALUE else error_code


_ensure_trace_record_factory()
