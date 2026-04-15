"""视频任务 Worker 占位实现。"""
from __future__ import annotations

from app.features.video.pipeline.orchestration.orchestrator import get_video_pipeline_service
from app.features.video.runtime_auth import load_video_runtime_auth
from app.features.video.service import VideoService
from app.infra.redis_client import create_runtime_store
from app.shared.ruoyi.auth import RuoYiRequestAuth
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import TaskStatus
from app.shared.task.metadata import TaskMetadataCreateRequest


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

    async def finalize(self, result: TaskResult) -> TaskResult:
        """任务完成后将终态 status 回写到 DB（RuoYi）。"""
        try:
            status = result.status  # TaskStatus (StrEnum): COMPLETED or FAILED
            request_auth = load_video_runtime_auth(
                self.runtime_store, task_id=self.context.task_id,
            )
            request = TaskMetadataCreateRequest(
                task_id=self.context.task_id,
                user_id=self.context.user_id,
                status=status,
                summary=result.message or "",
                error_summary=result.error_code if status == TaskStatus.FAILED else None,
            )
            await self.metadata_service.persist_task(
                request, request_auth=request_auth,
            )
            self.logger.info(
                "Task status persisted to DB task_id=%s status=%s",
                self.context.task_id, status.value,
            )
        except Exception:
            self.logger.warning(
                "Failed to persist task status to DB task_id=%s",
                self.context.task_id, exc_info=True,
            )
        return result


def build_video_task(context: TaskContext) -> VideoTask:
    """构建 VideoTask 实例的工厂函数。"""
    return VideoTask(context)
