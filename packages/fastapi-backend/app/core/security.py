from dataclasses import dataclass

from fastapi import Header, Request

from app.core.logging import get_request_id


@dataclass(slots=True)
class AccessContext:
    user_id: str | None
    request_id: str | None


async def get_access_context(
    request: Request,
    x_user_id: str | None = Header(default=None)
) -> AccessContext:
    """Epic 0 阶段只保留访问上下文骨架。"""
    request_id = (
        getattr(request.state, "request_id", None)
        or request.headers.get("x-request-id")
        or get_request_id()
    )
    return AccessContext(user_id=x_user_id, request_id=request_id)
