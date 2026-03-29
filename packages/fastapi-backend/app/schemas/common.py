from typing import Any, Literal

from pydantic import BaseModel, Field


ContractVersion = Literal["1.0.0"]
TaskStatusValue = Literal["pending", "processing", "completed", "failed", "cancelled"]


class ServiceHealthPayload(BaseModel):
    status: Literal["ok"] = "ok"


class ServiceHealthResponseEnvelope(BaseModel):
    code: int = Field(default=200)
    msg: str = Field(default="ok")
    data: ServiceHealthPayload


class RootBootstrapPayload(BaseModel):
    service: str
    environment: str
    status: Literal["bootstrapped"] = "bootstrapped"
    api_prefix: str
    runtime_store: str
    architecture: str
    contract_version: ContractVersion = "1.0.0"
    docs_url: str
    openapi_url: str


class RootBootstrapResponseEnvelope(BaseModel):
    code: int = Field(default=200)
    msg: str = Field(default="查询成功")
    data: RootBootstrapPayload


class ErrorPayload(BaseModel):
    error_code: str
    retryable: bool = False
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponseEnvelope(BaseModel):
    code: int
    msg: str
    data: ErrorPayload | None = None


class TaskSnapshotPayload(BaseModel):
    task_id: str
    task_type: str
    status: TaskStatusValue
    progress: int = Field(ge=0, le=100)
    message: str
    error_code: str | None = None
    updated_at: str = Field(
        description="UTC ISO 8601 时间，例如 2026-03-29T16:15:00Z"
    )


class TaskSnapshotResponseEnvelope(BaseModel):
    code: int = Field(default=200)
    msg: str = Field(default="查询成功")
    data: TaskSnapshotPayload


def build_success_envelope(data: BaseModel, msg: str = "查询成功") -> dict[str, object]:
    return {
        "code": 200,
        "msg": msg,
        "data": data.model_dump(mode="json")
    }


def build_error_envelope(
    *,
    code: int,
    msg: str,
    error_code: str,
    retryable: bool,
    details: dict[str, object] | None = None
) -> dict[str, object]:
    return {
        "code": code,
        "msg": msg,
        "data": {
            "error_code": error_code,
            "retryable": retryable,
            "details": details or {}
        }
    }

