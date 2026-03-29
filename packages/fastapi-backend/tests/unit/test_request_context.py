import re

from fastapi.testclient import TestClient

from app.core.errors import AppError
from app.main import create_app

GENERATED_REQUEST_ID_PATTERN = re.compile(r"^req_\d{14}_[0-9a-f]{8}$")


def test_request_context_generates_request_id_and_logs_it(caplog) -> None:
    client = TestClient(create_app())

    with caplog.at_level("INFO"):
        response = client.get("/health")

    request_id = response.headers["X-Request-ID"]

    assert response.status_code == 200
    assert GENERATED_REQUEST_ID_PATTERN.fullmatch(request_id)

    completion_records = [
        record
        for record in caplog.records
        if record.name == "app.request_context" and "Request completed" in record.getMessage()
    ]
    assert completion_records
    assert completion_records[-1].request_id == request_id
    assert completion_records[-1].task_id == "-"
    assert completion_records[-1].error_code == "-"


def test_request_context_forwards_valid_upstream_request_id(caplog) -> None:
    client = TestClient(create_app())
    upstream_request_id = "gateway_request_1234"

    with caplog.at_level("INFO"):
        response = client.get("/health", headers={"X-Request-ID": upstream_request_id})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == upstream_request_id

    started_records = [
        record
        for record in caplog.records
        if record.name == "app.request_context" and "Request started" in record.getMessage()
    ]
    assert started_records
    assert started_records[-1].request_id == upstream_request_id
    assert "source=forwarded" in started_records[-1].getMessage()


def test_request_context_replaces_invalid_upstream_request_id() -> None:
    client = TestClient(create_app())

    response = client.get("/health", headers={"X-Request-ID": "bad id with spaces"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] != "bad id with spaces"
    assert GENERATED_REQUEST_ID_PATTERN.fullmatch(response.headers["X-Request-ID"])


def test_app_error_handler_includes_request_id_in_header_body_and_logs(caplog) -> None:
    app = create_app()

    @app.get("/__test/app-error")
    async def app_error_route() -> None:
        raise AppError(
            code="TASK_TRACE_DEMO",
            message="演示错误",
            status_code=409,
            details={"source": "test"}
        )

    client = TestClient(app)

    with caplog.at_level("INFO"):
        response = client.get("/__test/app-error")

    request_id = response.headers["X-Request-ID"]
    payload = response.json()

    assert response.status_code == 409
    assert payload["data"]["request_id"] == request_id
    assert payload["data"]["task_id"] is None
    assert payload["data"]["details"]["request_id"] == request_id
    assert payload["data"]["details"]["source"] == "test"

    error_records = [record for record in caplog.records if record.name == "app.errors"]
    assert error_records
    assert error_records[-1].request_id == request_id
    assert error_records[-1].error_code == "TASK_TRACE_DEMO"


def test_unhandled_exception_handler_includes_request_id_and_returns_traceable_500(caplog) -> None:
    app = create_app()

    @app.get("/__test/unhandled-error")
    async def unhandled_error_route() -> None:
        raise RuntimeError("unexpected failure")

    client = TestClient(app, raise_server_exceptions=False)

    with caplog.at_level("INFO"):
        response = client.get("/__test/unhandled-error")

    request_id = response.headers["X-Request-ID"]
    payload = response.json()

    assert response.status_code == 500
    assert payload["data"]["request_id"] == request_id
    assert payload["data"]["task_id"] is None
    assert payload["data"]["details"]["request_id"] == request_id
    assert payload["data"]["error_code"] == "COMMON_INTERNAL_ERROR"

    error_records = [record for record in caplog.records if record.name == "app.errors"]
    assert error_records
    assert error_records[-1].request_id == request_id
    assert error_records[-1].error_code == "COMMON_INTERNAL_ERROR"
