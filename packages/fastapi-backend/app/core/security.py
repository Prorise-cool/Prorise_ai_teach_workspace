from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, Request, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.logging import get_request_id
from app.shared.ruoyi_client import RuoYiClient
from app.core.errors import IntegrationError

security_scheme = HTTPBearer(auto_error=False)

@dataclass(slots=True)
class AccessContext:
    user_id: str | None
    request_id: str | None


async def verify_auth_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme)
) -> dict:
    """
    依靠 RuoYi 的现有 /getInfo 接口进行 Token 与 Redis 在线态的验证。
    如果不通过，触发 401，保证与前端、RuoYi 判断一致。
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="未提供认证 Token")
    
    token = credentials.credentials
    try:
        async with RuoYiClient.from_settings() as client:
            client._client.headers["Authorization"] = f"Bearer {token}"
            response = await client.get_single(
                "/getInfo",
                resource="auth",
                operation="verify_token"
            )
            # 拿到用户信息代表验证通过
            return response.data
    except IntegrationError as exc:
        if exc.status_code == 401:
            raise HTTPException(status_code=401, detail="凭证无效或已登录过期")
        if exc.status_code == 403:
            raise HTTPException(status_code=403, detail="权限不足")
        raise HTTPException(status_code=502, detail="认证服务异常")


async def get_access_context(
    request: Request,
    x_user_id: str | None = Header(default=None)
) -> AccessContext:
    """Epic 0 阶段只保留访问上下文骨架。需要受保护的接口可直接引入 verify_auth_token 依赖。"""
    request_id = (
        getattr(request.state, "request_id", None)
        or request.headers.get("x-request-id")
        or get_request_id()
    )
    return AccessContext(user_id=x_user_id, request_id=request_id)
