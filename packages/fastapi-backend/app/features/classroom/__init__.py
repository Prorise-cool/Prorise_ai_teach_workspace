"""Classroom feature scaffold."""

from app.features.classroom.schemas import (
    ClassroomBootstrapResponse,
    ClassroomTaskMetadataCreateRequest,
    ClassroomTaskMetadataPageResponse,
    ClassroomTaskMetadataPreviewResponse,
    ClassroomTaskMetadataSnapshot,
)
from app.features.classroom.service import ClassroomService

__all__ = [
    "ClassroomBootstrapResponse",
    "ClassroomTaskMetadataCreateRequest",
    "ClassroomTaskMetadataPageResponse",
    "ClassroomTaskMetadataPreviewResponse",
    "ClassroomTaskMetadataSnapshot",
    "ClassroomService"
]
