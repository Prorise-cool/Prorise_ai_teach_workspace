import asyncio
from datetime import datetime

import httpx
from fastapi import FastAPI, Request

from app.core.logging import bind_trace_context, reset_trace_context
from app.shared.ruoyi_client import RuoYiClient
from app.shared.ruoyi_mapper import RuoYiMapper


def _run(coro):
    return asyncio.run(coro)


def test_ruoyi_client_integrates_with_asgi_upstream_and_forwards_trace_headers() -> None:
    upstream = FastAPI()
    captured_headers: dict[str, str | None] = {}

    @upstream.get("/api/v1/learning/records")
    async def get_page(request: Request) -> dict[str, object]:
        captured_headers["x-request-id"] = request.headers.get("x-request-id")
        captured_headers["x-task-id"] = request.headers.get("x-task-id")
        return {
            "code": 200,
            "msg": "查询成功",
            "rows": [
                {
                    "id": "lr_001",
                    "record_status": "1",
                    "updated_time": "2026-03-29 10:30:00"
                }
            ],
            "total": 1
        }

    client = RuoYiClient(
        base_url="http://testserver",
        transport=httpx.ASGITransport(app=upstream),
        timeout_seconds=0.01,
        retry_attempts=0,
        retry_delay_seconds=0.0
    )
    mapper = RuoYiMapper(
        field_aliases={
            "record_id": "id",
            "status": "record_status",
            "updated_at": "updated_time"
        },
        status_fields={"status": {"1": "processing"}},
        datetime_fields={"updated_at"}
    )
    tokens = bind_trace_context(request_id="req_story_10_3", task_id="task_story_10_3")

    try:
        result = _run(
            client.get_page(
                "/api/v1/learning/records",
                params={"pageNum": 1, "pageSize": 10},
                resource="learning-record",
                operation="page",
                mapper=mapper
            )
        )
    finally:
        reset_trace_context(tokens)
        _run(client.aclose())

    assert captured_headers == {
        "x-request-id": "req_story_10_3",
        "x-task-id": "task_story_10_3"
    }
    assert result.total == 1
    assert result.rows == [
        {
            "record_id": "lr_001",
            "status": "processing",
            "updated_at": datetime(2026, 3, 29, 10, 30, 0)
        }
    ]
