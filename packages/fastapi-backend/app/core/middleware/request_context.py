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
    candidate = (header_value or "").strip()
    if candidate and _REQUEST_ID_PATTERN.fullmatch(candidate):
        return candidate, "forwarded"
    return generate_request_id(), "generated"


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp) -> None:
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
