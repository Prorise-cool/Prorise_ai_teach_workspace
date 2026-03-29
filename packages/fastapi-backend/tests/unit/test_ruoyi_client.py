import asyncio
from collections.abc import Callable
from datetime import datetime

import httpx
import pytest

from app.core.errors import IntegrationError
from app.core.logging import bind_trace_context, reset_trace_context
from app.shared.ruoyi_client import RuoYiClient
from app.shared.ruoyi_mapper import RuoYiMapper


def _run(coro):
    return asyncio.run(coro)


def _build_client(
    handler: Callable[[httpx.Request], httpx.Response | None | object],
    *,
    retry_attempts: int = 1
) -> RuoYiClient:
    transport = httpx.MockTransport(handler)
    return RuoYiClient(
        base_url="http://ruoyi.local",
        transport=transport,
        timeout_seconds=0.01,
        retry_attempts=retry_attempts,
        retry_delay_seconds=0.0
    )


def test_ruoyi_client_unwraps_single_response_and_applies_mapper() -> None:
    mapper = RuoYiMapper(
        field_aliases={
            "task_id": "id",
            "status": "task_state",
            "updated_at": "update_time"
        },
        status_fields={"status": {"1": "processing"}},
        datetime_fields={"updated_at"}
    )

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v1/video/tasks/1001"
        return httpx.Response(
            200,
            json={
                "code": 200,
                "msg": "查询成功",
                "data": {
                    "id": "video_1001",
                    "task_state": "1",
                    "update_time": "2026-03-29 10:30:00"
                }
            }
        )

    client = _build_client(handler)

    result = _run(
        client.get_single(
            "/api/v1/video/tasks/1001",
            resource="video-task",
            operation="query",
            mapper=mapper
        )
    )

    assert result.code == 200
    assert result.msg == "查询成功"
    assert result.data == {
        "task_id": "video_1001",
        "status": "processing",
        "updated_at": datetime(2026, 3, 29, 10, 30, 0)
    }

    _run(client.aclose())


def test_ruoyi_client_unwraps_page_response_and_applies_mapper() -> None:
    mapper = RuoYiMapper(
        field_aliases={
            "task_id": "id",
            "status": "task_state",
            "updated_at": "update_time"
        },
        status_fields={"status": {"1": "processing", "2": "completed"}},
        datetime_fields={"updated_at"}
    )

    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "code": 200,
                "msg": "查询成功",
                "rows": [
                    {
                        "id": "video_1001",
                        "task_state": "1",
                        "update_time": "2026-03-29 10:30:00"
                    },
                    {
                        "id": "video_1002",
                        "task_state": "2",
                        "update_time": "2026-03-29 11:30:00"
                    }
                ],
                "total": 2
            }
        )

    client = _build_client(handler)

    result = _run(
        client.get_page(
            "/api/v1/video/tasks",
            params={"pageNum": 1, "pageSize": 10},
            resource="video-task",
            operation="page",
            mapper=mapper
        )
    )

    assert result.code == 200
    assert result.total == 2
    assert result.rows == [
        {
            "task_id": "video_1001",
            "status": "processing",
            "updated_at": datetime(2026, 3, 29, 10, 30, 0)
        },
        {
            "task_id": "video_1002",
            "status": "completed",
            "updated_at": datetime(2026, 3, 29, 11, 30, 0)
        }
    ]

    _run(client.aclose())


@pytest.mark.parametrize(
    ("status_code", "json_payload", "expected_error_code", "expected_retryable"),
    [
        (401, {"code": 401, "msg": "未授权"}, "RUOYI_UNAUTHORIZED", False),
        (403, {"code": 403, "msg": "无权限"}, "RUOYI_FORBIDDEN", False),
        (404, {"code": 404, "msg": "未找到"}, "RUOYI_NOT_FOUND", False),
        (409, {"code": 409, "msg": "冲突"}, "RUOYI_CONFLICT", False),
        (500, {"code": 500, "msg": "服务异常"}, "RUOYI_UPSTREAM_ERROR", True)
    ]
)
def test_ruoyi_client_maps_http_and_payload_errors(
    status_code: int,
    json_payload: dict[str, object],
    expected_error_code: str,
    expected_retryable: bool
) -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, json=json_payload)

    client = _build_client(handler, retry_attempts=0)

    with pytest.raises(IntegrationError) as exc_info:
        _run(
            client.get_single(
                "/api/v1/video/tasks/1001",
                resource="video-task",
                operation="query"
            )
        )

    error = exc_info.value
    assert error.code == expected_error_code
    assert error.retryable is expected_retryable
    assert error.details["resource"] == "video-task"
    assert error.details["operation"] == "query"
    assert error.details["upstream_status"] == status_code

    _run(client.aclose())


def test_ruoyi_client_maps_network_errors() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=httpx.Request("GET", "http://ruoyi.local"))

    client = _build_client(handler, retry_attempts=0)

    with pytest.raises(IntegrationError) as exc_info:
        _run(
            client.get_single(
                "/api/v1/video/tasks/1001",
                resource="video-task",
                operation="query"
            )
        )

    error = exc_info.value
    assert error.code == "RUOYI_NETWORK_ERROR"
    assert error.retryable is True
    assert error.details["resource"] == "video-task"
    assert error.details["operation"] == "query"

    _run(client.aclose())


def test_ruoyi_client_retries_timeout_then_succeeds(caplog) -> None:
    attempts = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        attempts["count"] += 1
        if attempts["count"] == 1:
            raise httpx.ReadTimeout("timed out", request=request)
        return httpx.Response(
            200,
            json={
                "code": 200,
                "msg": "查询成功",
                "data": {
                    "id": "video_1001",
                    "task_state": "1",
                    "update_time": "2026-03-29 10:30:00"
                }
            }
        )

    mapper = RuoYiMapper(
        field_aliases={
            "task_id": "id",
            "status": "task_state",
            "updated_at": "update_time"
        },
        status_fields={"status": {"1": "processing"}},
        datetime_fields={"updated_at"}
    )
    client = _build_client(handler, retry_attempts=1)
    tokens = bind_trace_context(request_id="req_test_ruoyi", task_id="task_test_ruoyi")

    try:
        with caplog.at_level("INFO"):
            result = _run(
                client.get_single(
                    "/api/v1/video/tasks/1001",
                    resource="video-task",
                    operation="query",
                    mapper=mapper
                )
            )
    finally:
        reset_trace_context(tokens)
        _run(client.aclose())

    assert attempts["count"] == 2
    assert result.data == {
        "task_id": "video_1001",
        "status": "processing",
        "updated_at": datetime(2026, 3, 29, 10, 30, 0)
    }

    retry_records = [
        record
        for record in caplog.records
        if record.name == "app.shared.ruoyi_client" and "retry" in record.getMessage()
    ]
    assert retry_records
    assert retry_records[-1].request_id == "req_test_ruoyi"
    assert retry_records[-1].task_id == "task_test_ruoyi"


def test_ruoyi_client_retries_5xx_before_raising() -> None:
    attempts = {"count": 0}

    def handler(_: httpx.Request) -> httpx.Response:
        attempts["count"] += 1
        return httpx.Response(500, json={"code": 500, "msg": "服务异常"})

    client = _build_client(handler, retry_attempts=1)

    with pytest.raises(IntegrationError) as exc_info:
        _run(
            client.get_single(
                "/api/v1/video/tasks/1001",
                resource="video-task",
                operation="query"
            )
        )

    error = exc_info.value
    assert attempts["count"] == 2
    assert error.code == "RUOYI_UPSTREAM_ERROR"
    assert error.retryable is True

    _run(client.aclose())
