"""Video feature scaffold.

包含视频功能域的路由、Schema、服务和 Dramatiq actor。
"""

from app.features.video.schemas import (
    VideoBootstrapResponse,
    VideoTaskMetadataCreateRequest,
    VideoTaskMetadataPageResponse,
    VideoTaskMetadataPreviewResponse,
    VideoTaskMetadataSnapshot,
)
from app.features.video.schemas.video_task import (
    CreateVideoTaskRequest,
    CreateVideoTaskResponse,
    CreateVideoTaskResponseEnvelope,
    IdempotentConflictResponse,
    VideoErrorCode,
    VideoInputType,
)
from app.features.video.service import VideoService

__all__ = [
    "CreateVideoTaskRequest",
    "CreateVideoTaskResponse",
    "CreateVideoTaskResponseEnvelope",
    "IdempotentConflictResponse",
    "VideoBootstrapResponse",
    "VideoErrorCode",
    "VideoInputType",
    "VideoService",
    "VideoTaskMetadataCreateRequest",
    "VideoTaskMetadataPageResponse",
    "VideoTaskMetadataPreviewResponse",
    "VideoTaskMetadataSnapshot",
]
