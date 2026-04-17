"""测试用 FastAPI app / client 构造 helper。"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.security import AccessContext
from app.main import create_app
from tests.conftest import override_auth


def create_authed_app(ctx: AccessContext | None = None):
    """创建默认已覆盖认证依赖的 FastAPI app。"""

    app = create_app()
    override_auth(app, ctx)
    return app


def create_authed_client(ctx: AccessContext | None = None) -> TestClient:
    """创建默认已覆盖认证依赖的测试客户端。"""

    return TestClient(create_authed_app(ctx))
