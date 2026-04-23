"""全局异常处理器单测。

覆盖 HTTPException / ValueError / 未知 Exception 三条路径，
验证统一 ErrorResponseEnvelope 结构 + X-Request-ID 注入 + 日志落点。
"""
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.errors import register_exception_handlers
from app.core.middleware.request_context import (
    REQUEST_ID_HEADER,
    RequestContextMiddleware,
)


def _build_probe_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(RequestContextMiddleware)
    register_exception_handlers(app)

    @app.get("/probe/http-exception")
    async def _raise_http_exception() -> None:
        raise HTTPException(status_code=404, detail="resource missing")

    @app.get("/probe/http-exception-no-detail")
    async def _raise_http_exception_no_detail() -> None:
        raise HTTPException(status_code=401)

    @app.get("/probe/value-error")
    async def _raise_value_error() -> None:
        raise ValueError("bad input")

    @app.get("/probe/value-error-empty")
    async def _raise_value_error_empty() -> None:
        raise ValueError()

    @app.get("/probe/unknown")
    async def _raise_unknown() -> None:
        raise RuntimeError("boom")

    return app


def test_http_exception_returns_envelope() -> None:
    client = TestClient(_build_probe_app(), raise_server_exceptions=False)
    response = client.get("/probe/http-exception")

    assert response.status_code == 404
    assert response.headers[REQUEST_ID_HEADER]
    body = response.json()
    assert body["code"] == 404
    assert body["msg"] == "resource missing"
    assert body["data"]["error_code"] == "HTTP_404"
    assert body["data"]["retryable"] is False
    assert body["data"]["request_id"] == response.headers[REQUEST_ID_HEADER]


def test_http_exception_without_custom_detail_uses_starlette_default() -> None:
    client = TestClient(_build_probe_app(), raise_server_exceptions=False)
    response = client.get("/probe/http-exception-no-detail")

    assert response.status_code == 401
    body = response.json()
    assert body["data"]["error_code"] == "HTTP_401"
    assert body["msg"]


def test_value_error_returns_400_with_message() -> None:
    client = TestClient(_build_probe_app(), raise_server_exceptions=False)
    response = client.get("/probe/value-error")

    assert response.status_code == 400
    body = response.json()
    assert body["code"] == 400
    assert body["msg"] == "bad input"
    assert body["data"]["error_code"] == "COMMON_INVALID_VALUE"
    assert body["data"]["retryable"] is False


def test_value_error_without_message_uses_default() -> None:
    client = TestClient(_build_probe_app(), raise_server_exceptions=False)
    response = client.get("/probe/value-error-empty")

    assert response.status_code == 400
    body = response.json()
    assert body["msg"] == "请求参数非法"


def test_unknown_exception_returns_500_and_logs_exception(caplog) -> None:
    client = TestClient(_build_probe_app(), raise_server_exceptions=False)

    with caplog.at_level("ERROR"):
        response = client.get("/probe/unknown")

    assert response.status_code == 500
    body = response.json()
    assert body["code"] == 500
    assert body["data"]["error_code"] == "COMMON_INTERNAL_ERROR"
    assert body["data"]["retryable"] is True
    assert body["msg"] == "服务内部异常"

    logged = [
        record for record in caplog.records
        if record.name == "app.errors" and "Unhandled application exception" in record.getMessage()
    ]
    assert logged, "unknown exception should be logged via logger.exception"
    assert logged[-1].exc_info is not None
