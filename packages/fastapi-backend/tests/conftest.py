"""全局测试 fixtures，提供认证依赖覆盖、mock RuoYiClient 构造等公共能力。"""

from __future__ import annotations

from typing import Callable

import httpx
from fastapi import FastAPI

from app.core.security import AccessContext, get_access_context
from app.shared.ruoyi_client import RuoYiClient


MOCK_ACCESS_CONTEXT = AccessContext(
    user_id="1",
    username="test_admin",
    roles=("superadmin",),
    permissions=("*:*:*",),
    token="test-token-for-unit-tests",
    client_id="test-client-id",
    request_id="test-req-id",
    online_ttl_seconds=86400,
)


def override_auth(app: FastAPI, ctx: AccessContext | None = None) -> None:
    """为 FastAPI app 覆盖 ``get_access_context`` 依赖，跳过真实认证。

    Args:
        app: FastAPI 应用实例。
        ctx: 自定义 AccessContext，默认使用 MOCK_ACCESS_CONTEXT。
    """
    effective = ctx or MOCK_ACCESS_CONTEXT
    app.dependency_overrides[get_access_context] = lambda: effective


def build_mock_client_factory(
    handler: Callable[[httpx.Request], httpx.Response],
) -> Callable[[], RuoYiClient]:
    """构造基于 ``httpx.MockTransport`` 的 RuoYiClient 工厂。

    Args:
        handler: httpx 请求处理函数。

    Returns:
        无参工厂函数，每次调用返回全新的 mock RuoYiClient。
    """
    def factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0,
        )

    return factory
