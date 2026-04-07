"""请求上下文中间件模块。

为每个 HTTP 请求分配或复用 ``X-Request-ID``，并将其绑定到日志追踪上下文，
确保整条请求链路的日志均携带统一的 request_id 追踪字段。
"""
import re

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.logging import (
    EMPTY_TRACE_VALUE,
    bind_trace_context,
    generate_request_id,
    get_logger,
    reset_trace_context
)

REQUEST_ID_HEADER = "X-Request-ID"
_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$")


def resolve_request_id(header_value: str | None) -> tuple[str, str]:
    """解析或生成请求 ID。

    若请求头中携带合法的 ``X-Request-ID`` 则复用（标记为 ``"forwarded"``），
    否则自动生成新 ID（标记为 ``"generated"``）。

    Returns:
        (request_id, source) 二元组。
    """
    candidate = (header_value or "").strip()
    if candidate and _REQUEST_ID_PATTERN.fullmatch(candidate):
        return candidate, "forwarded"
    return generate_request_id(), "generated"


class RequestContextMiddleware:
    """ASGI 中间件：为每个 HTTP 请求注入 request_id 追踪上下文。

    职责:
    1. 从 ``X-Request-ID`` 头解析或生成请求 ID。
    2. 将 request_id 写入 ``scope["state"]`` 供下游访问。
    3. 绑定日志追踪上下文（request_id / task_id / error_code）。
    4. 在响应头中回写 ``X-Request-ID``。
    5. 记录请求开始/完成日志（含 HTTP 方法、路径、状态码）。
    """

    def __init__(self, app: ASGIApp) -> None:
        """初始化中间件，包装下层 ASGI 应用。"""
        self.app = app
        self.logger = get_logger("app.request_context")

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id, source = resolve_request_id(Headers(scope=scope).get("x-request-id"))
        state = scope.setdefault("state", {})
        state["request_id"] = request_id
        state["request_id_source"] = source

        method = scope.get("method", "UNKNOWN")
        path = scope.get("path", "")
        status_code = 500
        tokens = bind_trace_context(
            request_id=request_id,
            task_id=EMPTY_TRACE_VALUE,
            error_code=EMPTY_TRACE_VALUE
        )
        self.logger.info("Request started %s %s source=%s", method, path, source)

        async def send_wrapper(message: Message) -> None:
            """拦截响应消息，注入 X-Request-ID 响应头并记录状态码。"""
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                MutableHeaders(scope=message)[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            self.logger.info("Request completed %s %s -> %s", method, path, status_code)
            reset_trace_context(tokens)
