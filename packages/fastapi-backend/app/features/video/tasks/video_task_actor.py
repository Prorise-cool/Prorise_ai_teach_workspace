"""视频任务 Worker 占位实现。"""

from __future__ import annotations

from app.features.video.pipeline.services import get_video_pipeline_service
from app.features.video.service import VideoService
from app.infra.redis_client import create_runtime_store
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext
class VideoTask(BaseTask):
    def __init__(
        self,
        context: TaskContext,
        *,
        runtime_store=None,
        metadata_service: VideoService | None = None,
    ) -> None:
        super().__init__(context)
        self.runtime_store = runtime_store or create_runtime_store()
        self.metadata_service = metadata_service or VideoService()

    async def prepare(self) -> None:
        self.logger.info(
            "Video task prepare task_id=%s input_type=%s",
            self.context.task_id,
            self.context.metadata.get("inputType"),
        )

    async def run(self) -> TaskResult:
        pipeline_service = get_video_pipeline_service(self.runtime_store, self.metadata_service)
        return await pipeline_service.run(self)


def build_video_task(context: TaskContext) -> VideoTask:
    return VideoTask(context)
