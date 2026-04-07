"""全局共享 schema 基类与通用信封模型。

本模块提供：
- ``to_camel_case`` —— snake_case → camelCase 转换函数（从 ``_camel`` 重新导出）。
- ``CamelCaseModel`` —— 统一的 camelCase 序列化基类（从 ``_camel`` 重新导出）。
- ``VideoCamelModel`` —— ``CamelCaseModel`` 的别名，保持视频域兼容性。
- 各类通用响应信封（Health / Bootstrap / Error / Task / Session / Permission）。
"""

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas._camel import CamelCaseModel, VideoCamelModel, to_camel_case  # noqa: F401
from app.shared.task_framework.contracts import TaskContractPayload, TaskStatusValue  # noqa: F401

ContractVersion = Literal["1.0.0"]


class ServiceHealthPayload(BaseModel):
    """服务健康检查响应数据。"""
    status: Literal["ok"] = "ok"


class ServiceHealthResponseEnvelope(BaseModel):
    """服务健康检查响应信封。"""
    code: int = Field(default=200)
    msg: str = Field(default="ok")
    data: ServiceHealthPayload


class RootBootstrapPayload(BaseModel):
    """系统启动基线响应数据。"""
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
    """系统启动基线响应信封。"""
    code: int = Field(default=200)
    msg: str = Field(default="查询成功")
    data: RootBootstrapPayload


class ErrorPayload(BaseModel):
    """错误详情数据。"""
    error_code: str
    retryable: bool = False
    request_id: str | None = None
    task_id: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponseEnvelope(BaseModel):
    """统一错误响应信封。"""
    code: int
    msg: str
    data: ErrorPayload | None = None


class TaskSnapshotPayload(TaskContractPayload):
    """任务状态快照数据。"""
    stage: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)
    resume_from: str | None = None
    last_event_id: str | None = None


class TaskSnapshotResponseEnvelope(BaseModel):
    """任务状态快照响应信封。"""
    code: int = Field(default=200)
    msg: str = Field(default="查询成功")
    data: TaskSnapshotPayload


class SessionProbePayload(BaseModel):
    """会话探测数据。"""
    user_id: str = Field(alias="userId")
    username: str
    roles: list[str]
    permissions: list[str]
    online_ttl_seconds: int | None = Field(default=None, alias="onlineTtlSeconds")
    request_id: str | None = Field(default=None, alias="requestId")


class SessionProbeResponseEnvelope(BaseModel):
    """会话探测响应信封。"""
    code: int = Field(default=200)
    msg: str = Field(default="查询成功")
    data: SessionProbePayload


class PermissionProbePayload(SessionProbePayload):
    """权限探测数据。"""
    required_permission: str = Field(alias="requiredPermission")
    granted: bool = True


class PermissionProbeResponseEnvelope(BaseModel):
    """权限探测响应信封。"""
    code: int = Field(default=200)
    msg: str = Field(default="查询成功")
    data: PermissionProbePayload


def build_success_envelope(data: BaseModel, msg: str = "查询成功") -> dict[str, object]:
    """构建统一成功响应信封。"""
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
    """构建统一错误响应信封。"""
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
