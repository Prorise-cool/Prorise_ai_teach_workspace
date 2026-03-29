"""Video feature scaffold."""

from app.features.video.schemas import (
    VideoBootstrapResponse,
    VideoTaskMetadataCreateRequest,
    VideoTaskMetadataPageResponse,
    VideoTaskMetadataPreviewResponse,
    VideoTaskMetadataSnapshot,
)
from app.features.video.service import VideoService

__all__ = [
    "VideoBootstrapResponse",
    "VideoTaskMetadataCreateRequest",
    "VideoTaskMetadataPageResponse",
    "VideoTaskMetadataPreviewResponse",
    "VideoTaskMetadataSnapshot",
    "VideoService"
]
