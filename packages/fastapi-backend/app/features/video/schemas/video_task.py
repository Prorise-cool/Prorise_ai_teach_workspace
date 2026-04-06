"""Story 3.4: 视频任务创建接口 Pydantic 模型。

定义 POST /api/v1/video/tasks 的请求体与响应体，
字段口径与 contracts/video/v1/ 契约及 Story 2.1 统一任务状态对齐。
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# 视频输入类型枚举
# ---------------------------------------------------------------------------

class VideoInputType(StrEnum):
    """视频任务支持的输入类型。"""

    TEXT = "text"
    IMAGE = "image"
    DOCUMENT = "document"


# ---------------------------------------------------------------------------
# 视频域错误码扩展（Story 2.1 TaskErrorCode + 视频域扩展）
# ---------------------------------------------------------------------------

class VideoErrorCode(StrEnum):
    """视频域业务错误码字典。"""

    VIDEO_INPUT_EMPTY = "VIDEO_INPUT_EMPTY"
    VIDEO_INPUT_TOO_LONG = "VIDEO_INPUT_TOO_LONG"
    VIDEO_UNSUPPORTED_INPUT_TYPE = "VIDEO_UNSUPPORTED_INPUT_TYPE"
    VIDEO_IDEMPOTENT_CONFLICT = "VIDEO_IDEMPOTENT_CONFLICT"
    VIDEO_DISPATCH_FAILED = "VIDEO_DISPATCH_FAILED"
    VIDEO_PERMISSION_DENIED = "VIDEO_PERMISSION_DENIED"


# ---------------------------------------------------------------------------
# 契约对齐的 camelCase 基类
# ---------------------------------------------------------------------------

def _to_camel_case(name: str) -> str:
    head, *tail = name.split("_")
    return head + "".join(segment.capitalize() for segment in tail)


class CamelCaseModel(BaseModel):
    """所有对外输出统一使用 camelCase 序列化。"""

    model_config = ConfigDict(
        alias_generator=_to_camel_case,
        populate_by_name=True,
        serialize_by_alias=True,
    )


# ---------------------------------------------------------------------------
# 创建请求体
# ---------------------------------------------------------------------------

class CreateVideoTaskRequest(CamelCaseModel):
    """POST /api/v1/video/tasks 请求体。

    字段与 contracts/video/v1/create-task-request.schema.json 对齐。
    """

    input_type: VideoInputType = Field(
        description="输入类型：text / image / document",
    )
    source_payload: str = Field(
        min_length=1,
        max_length=50000,
        description="原始输入内容（文本内容 / 图片 URL / 文档 URL）",
    )
    client_request_id: str | None = Field(
        default=None,
        min_length=1,
        max_length=128,
        description="客户端幂等键，同一 clientRequestId 重复提交返回已有 taskId",
    )
    user_profile: dict[str, Any] | None = Field(
        default=None,
        description="用户偏好配置（学习级别、语言等），透传给 Worker",
    )
    summary: str | None = Field(
        default=None,
        max_length=500,
        description="用户自定义的任务摘要说明",
    )

    @field_validator("source_payload")
    @classmethod
    def validate_source_payload_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("输入内容不能为空白")
        return value


# ---------------------------------------------------------------------------
# 创建响应体
# ---------------------------------------------------------------------------

class CreateVideoTaskResponse(CamelCaseModel):
    """202 Accepted 响应 payload。

    字段与 Story 2.1 统一任务状态 + AC 1 要求一致。
    """

    task_id: str = Field(description="系统生成的任务唯一标识 vtask_<ulid>")
    task_type: Literal["video"] = Field(default="video", description="任务类型")
    status: Literal["pending"] = Field(default="pending", description="初始状态")
    created_at: datetime = Field(description="任务创建时间 UTC ISO 8601")


# ---------------------------------------------------------------------------
# 幂等冲突响应体
# ---------------------------------------------------------------------------

class IdempotentConflictResponse(CamelCaseModel):
    """409 Conflict 响应 payload（幂等键重复提交）。"""

    task_id: str = Field(description="已存在的任务 ID")
    task_type: Literal["video"] = Field(default="video")
    status: str = Field(description="已存在任务的当前状态")
    created_at: datetime | None = Field(default=None, description="已存在任务的创建时间")


# ---------------------------------------------------------------------------
# 统一响应信封
# ---------------------------------------------------------------------------

class CreateVideoTaskResponseEnvelope(BaseModel):
    """统一 {code, msg, data} 信封 —— 202 创建成功。"""

    code: int = Field(default=202)
    msg: str = Field(default="任务创建成功")
    data: CreateVideoTaskResponse


class IdempotentConflictResponseEnvelope(BaseModel):
    """统一 {code, msg, data} 信封 —— 409 幂等冲突。"""

    code: int = Field(default=409)
    msg: str = Field(default="任务已存在")
    data: IdempotentConflictResponse
