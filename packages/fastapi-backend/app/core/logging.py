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
    global _logging_configured

    _ensure_trace_record_factory()

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    trace_handler = next(
        (handler for handler in root_logger.handlers if handler.get_name() == _trace_handler_name),
        None
    )
    if trace_handler is None:
        trace_handler = logging.StreamHandler()
        trace_handler.set_name(_trace_handler_name)

    trace_handler.setLevel(logging.INFO)
    trace_handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT))

    other_handlers = [handler for handler in root_logger.handlers if handler.get_name() != _trace_handler_name]
    root_logger.handlers = [trace_handler, *other_handlers]

    _logging_configured = True


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def format_trace_timestamp(value: datetime | None = None) -> str:
    current = value or datetime.now(UTC)
    return current.isoformat(timespec="seconds").replace("+00:00", "Z")


def generate_request_id() -> str:
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    short_uuid = uuid4().hex[:8]
    return f"req_{timestamp}_{short_uuid}"


def bind_trace_context(
    *,
    request_id: str | None = None,
    task_id: str | None = None,
    error_code: str | None = None
) -> TraceContextTokens:
    tokens = TraceContextTokens()
    if request_id is not None:
        tokens.request_id = _request_id_context.set(request_id)
    if task_id is not None:
        tokens.task_id = _task_id_context.set(task_id)
    if error_code is not None:
        tokens.error_code = _error_code_context.set(error_code)
    return tokens


def reset_trace_context(tokens: TraceContextTokens) -> None:
    if tokens.error_code is not None:
        _error_code_context.reset(tokens.error_code)
    if tokens.task_id is not None:
        _task_id_context.reset(tokens.task_id)
    if tokens.request_id is not None:
        _request_id_context.reset(tokens.request_id)


def get_request_id() -> str | None:
    request_id = _request_id_context.get()
    return None if request_id == EMPTY_TRACE_VALUE else request_id


def get_task_id() -> str | None:
    task_id = _task_id_context.get()
    return None if task_id == EMPTY_TRACE_VALUE else task_id


def get_error_code() -> str | None:
    error_code = _error_code_context.get()
    return None if error_code == EMPTY_TRACE_VALUE else error_code


_ensure_trace_record_factory()
