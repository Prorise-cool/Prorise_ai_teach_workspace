from dataclasses import dataclass

from fastapi import Header


@dataclass(slots=True)
class AccessContext:
    user_id: str | None
    request_id: str | None


async def get_access_context(
    x_user_id: str | None = Header(default=None),
    x_request_id: str | None = Header(default=None)
) -> AccessContext:
    """Epic 0 阶段只保留访问上下文骨架。"""
    return AccessContext(user_id=x_user_id, request_id=x_request_id)
