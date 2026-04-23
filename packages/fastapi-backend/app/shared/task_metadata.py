"""Backward compatibility re-export. Import from app.shared.task.metadata instead."""
from app.shared.task.metadata import (
    TASK_METADATA_RUOYI_MAPPER,
    TASK_TABLE_BY_TYPE,
    TaskMetadataCreateRequest,
    TaskMetadataPageResponse,
    TaskMetadataPreviewResponse,
    TaskMetadataRepository,
    TaskMetadataSnapshot,
    TaskStatus,
    TaskType,
    snapshot_from_ruoyi_row,
)

__all__ = [
    "TASK_METADATA_RUOYI_MAPPER",
    "TASK_TABLE_BY_TYPE",
    "TaskMetadataCreateRequest",
    "TaskMetadataPageResponse",
    "TaskMetadataPreviewResponse",
    "TaskMetadataRepository",
    "TaskMetadataSnapshot",
    "TaskStatus",
    "TaskType",
    "snapshot_from_ruoyi_row",
]
