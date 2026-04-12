"""视频任务 Worker 占位实现。"""

from __future__ import annotations

from app.features.video.pipeline.orchestration.orchestrator import get_video_pipeline_service
from app.features.video.service import VideoService
from app.infra.redis_client import create_runtime_store
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext
class VideoTask(BaseTask):
    """视频任务执行体，承载视频流水线的 prepare 与 run。"""
    def __init__(
        self,
        context: TaskContext,
        *,
        runtime_store=None,
        metadata_service: VideoService | None = None,
    ) -> None:
        """初始化视频任务。"""
        super().__init__(context)
        self.runtime_store = runtime_store or create_runtime_store()
        self.metadata_service = metadata_service or VideoService()

    async def prepare(self) -> None:
        """任务执行前的准备阶段。"""
        self.logger.info(
            "Video task prepare task_id=%s input_type=%s",
            self.context.task_id,
            self.context.metadata.get("inputType"),
        )

    async def run(self) -> TaskResult:
        """运行视频流水线并返回任务结果。"""
        pipeline_service = get_video_pipeline_service(self.runtime_store, self.metadata_service)
        return await pipeline_service.run(self)


def build_video_task(context: TaskContext) -> VideoTask:
    """构建 VideoTask 实例的工厂函数。"""
    return VideoTask(context)
