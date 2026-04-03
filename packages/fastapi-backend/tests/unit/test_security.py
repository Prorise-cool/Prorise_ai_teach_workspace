import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core.security import verify_auth_token
from app.core.errors import IntegrationError
from app.shared.ruoyi_client import RuoYiSingleResponse


class DummyRuoYiClient:
    def __init__(self, token=None):
        self._client = type("MockClient", (), {"headers": {}})()
        self.history = []
        self.mock_response = None
        self.mock_error = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        pass

    async def get_single(self, *args, **kwargs):
        self.history.append((args, kwargs))
        if self.mock_error:
            raise self.mock_error
        return self.mock_response


@pytest.fixture
def mock_ruoyi_client(monkeypatch):
    client = DummyRuoYiClient()
    monkeypatch.setattr("app.core.security.RuoYiClient.from_settings", lambda: client)
    return client


@pytest.mark.anyio
async def test_verify_auth_token_missing_credentials():
    with pytest.raises(HTTPException) as exc:
        await verify_auth_token(credentials=None)
    assert exc.value.status_code == 401
    assert "未提供认证" in exc.value.detail


@pytest.mark.anyio
async def test_verify_auth_token_success(mock_ruoyi_client):
    mock_ruoyi_client.mock_response = RuoYiSingleResponse(
        code=200, msg="OK", data={"user": {"userId": "123"}}, raw={}
    )
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="valid-token")
    result = await verify_auth_token(credentials=creds)
    assert result == {"user": {"userId": "123"}}
    assert mock_ruoyi_client._client.headers["Authorization"] == "Bearer valid-token"


@pytest.mark.anyio
async def test_verify_auth_token_expired(mock_ruoyi_client):
    mock_ruoyi_client.mock_error = IntegrationError(
        service="ruoyi",
        resource="auth",
        operation="verify",
        code="ERR",
        message="err",
        status_code=401,
        retryable=False,
        details={}
    )
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid-token")
    with pytest.raises(HTTPException) as exc:
        await verify_auth_token(credentials=creds)
    assert exc.value.status_code == 401
    assert "凭证无效或已登录过期" in exc.value.detail


@pytest.mark.anyio
async def test_verify_auth_token_forbidden(mock_ruoyi_client):
    mock_ruoyi_client.mock_error = IntegrationError(
        service="ruoyi",
        resource="auth",
        operation="verify",
        code="ERR",
        message="err",
        status_code=403,
        retryable=False,
        details={}
    )
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="valid-token")
    with pytest.raises(HTTPException) as exc:
        await verify_auth_token(credentials=creds)
    assert exc.value.status_code == 403
    assert "权限不足" in exc.value.detail
