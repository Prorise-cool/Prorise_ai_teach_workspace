from typing import Any, Literal

from pydantic import BaseModel, Field

from app.shared.task_framework.contracts import TaskContractPayload, TaskStatusValue

ContractVersion = Literal["1.0.0"]


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
    request_id: str | None = None
    task_id: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponseEnvelope(BaseModel):
    code: int
    msg: str
    data: ErrorPayload | None = None


class TaskSnapshotPayload(TaskContractPayload):
    stage: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)
    resume_from: str | None = None
    last_event_id: str | None = None


class TaskSnapshotResponseEnvelope(BaseModel):
    code: int = Field(default=200)
    msg: str = Field(default="查询成功")
    data: TaskSnapshotPayload


class SessionProbePayload(BaseModel):
    user_id: str = Field(alias="userId")
    username: str
    roles: list[str]
    permissions: list[str]
    online_ttl_seconds: int | None = Field(default=None, alias="onlineTtlSeconds")
    request_id: str | None = Field(default=None, alias="requestId")


class SessionProbeResponseEnvelope(BaseModel):
    code: int = Field(default=200)
    msg: str = Field(default="查询成功")
    data: SessionProbePayload


class PermissionProbePayload(SessionProbePayload):
    required_permission: str = Field(alias="requiredPermission")
    granted: bool = True


class PermissionProbeResponseEnvelope(BaseModel):
    code: int = Field(default=200)
    msg: str = Field(default="查询成功")
    data: PermissionProbePayload


def build_success_envelope(data: BaseModel, msg: str = "查询成功") -> dict[str, object]:
    return {
        "code": 200,
        "msg": msg,
        "data": data.model_dump(mode="json", by_alias=True)
    }


def build_error_envelope(
    *,
    code: int,
    msg: str,
    error_code: str,
    retryable: bool,
    request_id: str | None = None,
    task_id: str | None = None,
    details: dict[str, object] | None = None
) -> dict[str, object]:
    return {
        "code": code,
        "msg": msg,
        "data": {
            "error_code": error_code,
            "retryable": retryable,
            "request_id": request_id,
            "task_id": task_id,
            "details": details or {}
        }
    }
