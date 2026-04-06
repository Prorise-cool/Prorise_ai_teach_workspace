from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

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
        self.code = code
        self.message = message
        self.status_code = status_code
        self.retryable = retryable
        self.task_id = task_id
        self.details = details or {}
        super().__init__(message)


class IntegrationError(AppError):
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


async def request_validation_error_handler(
    request: Request,
    exc: RequestValidationError
) -> JSONResponse:
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
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, request_validation_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
