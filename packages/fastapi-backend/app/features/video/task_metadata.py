"""兼容层：保留旧路径，实际实现已迁移到 `app.shared.task_metadata`。"""

from app.shared.task_metadata import (
    TASK_METADATA_RUOYI_MAPPER,
    TASK_TABLE_BY_TYPE,
    TaskMetadataCreateRequest,
    TaskMetadataPageResponse,
    TaskMetadataPreviewResponse,
    TaskMetadataRepository,
    TaskMetadataSnapshot,
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
    "TaskType",
    "snapshot_from_ruoyi_row",
]
