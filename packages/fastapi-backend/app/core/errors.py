"""全局异常类与 FastAPI 异常处理器模块。

定义业务异常基类 ``AppError``、外部集成异常 ``IntegrationError``，
以及统一的 FastAPI 异常处理器函数（app_error_handler、
unhandled_exception_handler、request_validation_error_handler）。

所有异常响应遵循项目统一信封格式（``build_error_envelope``），
自动注入 request_id / task_id / error_code 追踪字段。
"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import (
    EMPTY_TRACE_VALUE,
    bind_trace_context,
    get_logger,
    get_request_id,
    get_task_id,
    reset_trace_context
)
from app.core.middleware.request_context import REQUEST_ID_HEADER
from app.schemas.common import build_error_envelope
from app.shared.task_framework.status import TaskErrorCode

logger = get_logger("app.errors")


class AppError(Exception):
    """业务异常基类。

    所有可预期的业务错误均应抛出 ``AppError`` 或其子类，
    由 ``app_error_handler`` 统一捕获并转换为标准 JSON 错误响应。

    Attributes:
        code: 错误码字符串（如 ``"COMMON_NOT_FOUND"``）。
        message: 面向用户的错误描述。
        status_code: HTTP 状态码。
        retryable: 是否建议客户端重试。
        task_id: 关联的任务 ID（可选）。
        details: 补充错误详情字典。
    """

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        *,
        retryable: bool = False,
        task_id: str | None = None,
        details: dict[str, object] | None = None
    ) -> None:
        """初始化业务异常。

        Args:
            code: 错误码字符串。
            message: 面向用户的错误描述。
            status_code: HTTP 状态码，默认 400。
            retryable: 是否建议客户端重试。
            task_id: 关联的任务 ID。
            details: 补充错误详情字典。
        """
        self.code = code
        self.message = message
        self.status_code = status_code
        self.retryable = retryable
        self.task_id = task_id
        self.details = details or {}
        super().__init__(message)


class IntegrationError(AppError):
    """外部服务集成异常。

    当调用 RuoYi、COS、Provider 等外部服务失败时抛出。
    自动在 ``details`` 中注入 ``service``、``resource``、``operation`` 三元组，
    便于追踪故障来源。

    Args:
        service: 外部服务名称（如 ``"ruoyi"``、``"cos"``）。
        resource: 操作的资源类型（如 ``"auth"``、``"video-task"``）。
        operation: 具体操作名称（如 ``"get_current_user"``）。
    """

    def __init__(
        self,
        *,
        service: str,
        resource: str,
        operation: str,
        code: str,
        message: str,
        status_code: int = 502,
        retryable: bool = False,
        task_id: str | None = None,
        details: dict[str, object] | None = None
    ) -> None:
        """初始化外部服务集成异常。

        Args:
            service: 外部服务名称。
            resource: 操作的资源类型。
            operation: 具体操作名称。
            code: 错误码字符串。
            message: 错误描述。
            status_code: HTTP 状态码，默认 502。
            retryable: 是否建议重试。
            task_id: 关联的任务 ID。
            details: 补充错误详情。
        """
        merged_details = {
            "service": service,
            "resource": resource,
            "operation": operation,
            **(details or {})
        }
        super().__init__(
            code=code,
            message=message,
            status_code=status_code,
            retryable=retryable,
            task_id=task_id,
            details=merged_details
        )


def _resolve_trace_details(request: Request, details: dict[str, object] | None = None) -> tuple[str | None, dict[str, object]]:
    resolved_details = dict(details or {})
    request_id = getattr(request.state, "request_id", None) or get_request_id()
    task_id = get_task_id()

    if request_id is not None:
        resolved_details.setdefault("request_id", request_id)
    if task_id is not None:
        resolved_details.setdefault("task_id", task_id)
    return request_id, resolved_details


def _trace_headers(request_id: str | None) -> dict[str, str]:
    if request_id is None:
        return {}
    return {REQUEST_ID_HEADER: request_id}


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """处理 ``AppError`` 及其子类，返回统一信封格式的 JSON 错误响应。"""
    request_id, details = _resolve_trace_details(request, exc.details)
    if exc.task_id is not None:
        details.setdefault("task_id", exc.task_id)
    tokens = bind_trace_context(
        request_id=request_id or EMPTY_TRACE_VALUE,
        task_id=details.get("task_id") if isinstance(details.get("task_id"), str) else None,
        error_code=exc.code
    )
    try:
        logger.error(
            "Handled application error path=%s status=%s",
            request.url.path,
            exc.status_code
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=build_error_envelope(
                code=exc.status_code,
                msg=exc.message,
                error_code=exc.code,
                retryable=exc.retryable,
                request_id=request_id,
                task_id=details.get("task_id") if isinstance(details.get("task_id"), str) else None,
                details=details
            ),
            headers=_trace_headers(request_id)
        )
    finally:
        reset_trace_context(tokens)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """兜底未捕获异常处理器，返回 500 + ``COMMON_INTERNAL_ERROR``。"""
    request_id, details = _resolve_trace_details(request)
    error_code = "COMMON_INTERNAL_ERROR"
    tokens = bind_trace_context(
        request_id=request_id or EMPTY_TRACE_VALUE,
        task_id=details.get("task_id") if isinstance(details.get("task_id"), str) else None,
        error_code=error_code
    )
    try:
        logger.exception(
            "Unhandled application exception path=%s",
            request.url.path,
            exc_info=exc
        )
        return JSONResponse(
            status_code=500,
            content=build_error_envelope(
                code=500,
                msg="服务内部异常",
                error_code=error_code,
                retryable=True,
                request_id=request_id,
                task_id=details.get("task_id") if isinstance(details.get("task_id"), str) else None,
                details=details
            ),
            headers=_trace_headers(request_id)
        )
    finally:
        reset_trace_context(tokens)


async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException
) -> JSONResponse:
    """处理 FastAPI/Starlette ``HTTPException``，返回统一信封格式。

    未显式抛出 ``AppError`` 但通过 ``raise HTTPException(...)`` 产生的错误
    由此处兜底，保持响应信封一致。``error_code`` 约定为 ``HTTP_<status>``。
    """
    request_id, details = _resolve_trace_details(request)
    error_code = f"HTTP_{exc.status_code}"
    tokens = bind_trace_context(
        request_id=request_id or EMPTY_TRACE_VALUE,
        task_id=details.get("task_id") if isinstance(details.get("task_id"), str) else None,
        error_code=error_code
    )
    try:
        logger.warning(
            "HTTPException path=%s status=%s",
            request.url.path,
            exc.status_code
        )
        message = exc.detail if isinstance(exc.detail, str) and exc.detail else "请求处理失败"
        headers = _trace_headers(request_id)
        if exc.headers:
            headers = {**exc.headers, **headers}
        return JSONResponse(
            status_code=exc.status_code,
            content=build_error_envelope(
                code=exc.status_code,
                msg=message,
                error_code=error_code,
                retryable=False,
                request_id=request_id,
                task_id=details.get("task_id") if isinstance(details.get("task_id"), str) else None,
                details=details
            ),
            headers=headers
        )
    finally:
        reset_trace_context(tokens)


async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """处理业务层抛出的 ``ValueError``，返回 400 + ``COMMON_INVALID_VALUE``。

    ``ValueError`` 常见于参数校验或枚举转换失败。相比 500 兜底，这里把它映射为
    400，避免把调用方错误当作服务端异常。
    """
    request_id, details = _resolve_trace_details(request)
    error_code = "COMMON_INVALID_VALUE"
    tokens = bind_trace_context(
        request_id=request_id or EMPTY_TRACE_VALUE,
        task_id=details.get("task_id") if isinstance(details.get("task_id"), str) else None,
        error_code=error_code
    )
    try:
        logger.warning(
            "ValueError path=%s message=%s",
            request.url.path,
            str(exc)
        )
        message = str(exc) or "请求参数非法"
        return JSONResponse(
            status_code=400,
            content=build_error_envelope(
                code=400,
                msg=message,
                error_code=error_code,
                retryable=False,
                request_id=request_id,
                task_id=details.get("task_id") if isinstance(details.get("task_id"), str) else None,
                details=details
            ),
            headers=_trace_headers(request_id)
        )
    finally:
        reset_trace_context(tokens)


async def request_validation_error_handler(
    request: Request,
    exc: RequestValidationError
) -> JSONResponse:
    """处理 Pydantic 请求校验异常，返回 422 + ``INVALID_INPUT``。"""
    request_id, details = _resolve_trace_details(
        request,
        {"validation_errors": exc.errors()},
    )
    error_code = TaskErrorCode.INVALID_INPUT.value
    tokens = bind_trace_context(
        request_id=request_id or EMPTY_TRACE_VALUE,
        task_id=details.get("task_id") if isinstance(details.get("task_id"), str) else None,
        error_code=error_code,
    )
    try:
        logger.warning("Request validation failed path=%s", request.url.path)
        return JSONResponse(
            status_code=422,
            content=build_error_envelope(
                code=422,
                msg="请求参数校验失败",
                error_code=error_code,
                retryable=False,
                request_id=request_id,
                task_id=details.get("task_id") if isinstance(details.get("task_id"), str) else None,
                details=details,
            ),
            headers=_trace_headers(request_id),
        )
    finally:
        reset_trace_context(tokens)


def register_exception_handlers(app: FastAPI) -> None:
    """将所有异常处理器注册到 FastAPI 应用实例。"""
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, request_validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(ValueError, value_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
