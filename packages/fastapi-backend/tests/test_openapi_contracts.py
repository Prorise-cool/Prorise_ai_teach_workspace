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
    learning_preview_route = payload["paths"]["/api/v1/learning/persistence-preview"]["post"]
    learning_persist_route = payload["paths"]["/api/v1/learning/persistence"]["post"]

    assert snapshot_route["responses"]["200"]["content"]["application/json"]["example"]["data"]["status"] == "processing"
    assert snapshot_route["responses"]["409"]["content"]["application/json"]["example"]["data"]["error_code"] == "TASK_PROVIDER_TIMEOUT"
    assert snapshot_route["responses"]["409"]["content"]["application/json"]["example"]["data"]["request_id"] == "req_20260329_conflict"
    assert snapshot_route["responses"]["409"]["content"]["application/json"]["example"]["data"]["task_id"] == "video_20260329161500_ab12cd34"
    assert list_route["responses"]["200"]["content"]["application/json"]["example"]["total"] == 2
    assert learning_preview_route["requestBody"]["content"]["application/json"]["schema"]["$ref"] == "#/components/schemas/LearningPersistenceRequest"
    assert learning_preview_route["responses"]["200"]["content"]["application/json"]["schema"]["$ref"] == "#/components/schemas/LearningPersistenceResponse"
    assert learning_persist_route["requestBody"]["content"]["application/json"]["schema"]["$ref"] == "#/components/schemas/LearningPersistenceRequest"
    assert learning_persist_route["responses"]["200"]["content"]["application/json"]["schema"]["$ref"] == "#/components/schemas/LearningPersistenceResponse"


def test_shared_contract_schema_assets_exist_and_match_response_shape() -> None:
    common_schema_path = PROJECT_ROOT / "contracts" / "_shared" / "common-response.schema.json"
    error_schema_path = PROJECT_ROOT / "contracts" / "_shared" / "error-response.schema.json"

    common_schema = json.loads(common_schema_path.read_text(encoding="utf-8"))
    error_schema = json.loads(error_schema_path.read_text(encoding="utf-8"))

    assert common_schema["required"] == ["code", "msg", "data"]
    assert common_schema["properties"]["data"]["type"] == "object"
    assert error_schema["required"] == ["code", "msg", "data"]
    assert error_schema["properties"]["data"]["properties"]["error_code"]["type"] == "string"
    assert error_schema["properties"]["data"]["properties"]["request_id"]["type"] == ["string", "null"]
    assert error_schema["properties"]["data"]["properties"]["task_id"]["type"] == ["string", "null"]
