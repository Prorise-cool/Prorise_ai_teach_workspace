import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app


client = TestClient(create_app())
PROJECT_ROOT = Path(__file__).resolve().parents[1].parents[1]


def test_openapi_exposes_contract_routes_and_examples() -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200

    payload = response.json()
    snapshot_route = payload["paths"]["/api/v1/contracts/task-snapshot"]["get"]
    list_route = payload["paths"]["/api/v1/contracts/tasks"]["get"]

    assert snapshot_route["responses"]["200"]["content"]["application/json"]["example"]["data"]["status"] == "processing"
    assert snapshot_route["responses"]["409"]["content"]["application/json"]["example"]["data"]["error_code"] == "TASK_PROVIDER_TIMEOUT"
    assert list_route["responses"]["200"]["content"]["application/json"]["example"]["total"] == 2


def test_shared_contract_schema_assets_exist_and_match_response_shape() -> None:
    common_schema_path = PROJECT_ROOT / "contracts" / "_shared" / "common-response.schema.json"
    error_schema_path = PROJECT_ROOT / "contracts" / "_shared" / "error-response.schema.json"

    common_schema = json.loads(common_schema_path.read_text(encoding="utf-8"))
    error_schema = json.loads(error_schema_path.read_text(encoding="utf-8"))

    assert common_schema["required"] == ["code", "msg", "data"]
    assert common_schema["properties"]["data"]["type"] == "object"
    assert error_schema["required"] == ["code", "msg", "data"]
    assert error_schema["properties"]["data"]["properties"]["error_code"]["type"] == "string"
