"""视频任务 Worker 占位实现。"""
from __future__ import annotations

from app.features.video.pipeline.orchestration.orchestrator import get_video_pipeline_service
from app.features.video.pipeline.orchestration.runtime import VideoRuntimeStateStore
from app.features.video.runtime_auth import load_video_runtime_auth
from app.features.video.service import VideoService
from app.infra.redis_client import create_runtime_store
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import TaskErrorCode, TaskStatus
from app.shared.task.metadata import TaskMetadataCreateRequest


class VideoTaskCancelledError(RuntimeError):
    """视频任务在进入执行前已收到取消请求。"""

    def __init__(self, result: TaskResult) -> None:
        super().__init__(result.message)
        self.result = result
        self.error_code = result.error_code


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

    def _build_cancelled_result(self) -> TaskResult | None:
        """根据当前运行态构造取消结果。"""
        runtime = VideoRuntimeStateStore(self.runtime_store, self.context.task_id)
        if not runtime.is_cancel_requested():
            return None

        current_state = self.runtime_store.get_task_state(self.context.task_id) or {}
        raw_context = current_state.get("context")
        context = dict(raw_context) if isinstance(raw_context, dict) else {}
        context["cancelRequested"] = True

        cancel_request = runtime.load_cancel_request()
        message = "任务已取消" if cancel_request is not None else str(
            current_state.get("message") or "任务已取消"
        )
        return TaskResult(
            status=TaskStatus.CANCELLED,
            message=message,
            progress=int(current_state.get("progress") or 0),
            error_code=str(current_state.get("errorCode") or TaskErrorCode.CANCELLED),
            context=context,
        )

    async def prepare(self) -> None:
        """任务执行前的准备阶段。"""
        cancelled_result = self._build_cancelled_result()
        if cancelled_result is not None:
            raise VideoTaskCancelledError(cancelled_result)

        self.logger.info(
            "Video task prepare task_id=%s input_type=%s",
            self.context.task_id,
            self.context.metadata.get("inputType"),
        )

    async def run(self) -> TaskResult:
        """运行视频流水线并返回任务结果。"""
        cancelled_result = self._build_cancelled_result()
        if cancelled_result is not None:
            return cancelled_result

        pipeline_service = get_video_pipeline_service(self.runtime_store, self.metadata_service)
        return await pipeline_service.run(self)

    async def handle_error(self, exc: Exception) -> TaskResult:
        """将取消短路映射为 cancelled，而不是 failed。"""
        if isinstance(exc, VideoTaskCancelledError):
            return exc.result
        return await super().handle_error(exc)

    async def finalize(self, result: TaskResult) -> TaskResult:
        """任务完成后将终态 status 回写到 DB（RuoYi）。"""
        final_result = self._build_cancelled_result() or result
        try:
            status = final_result.status
            request_auth = load_video_runtime_auth(
                self.runtime_store, task_id=self.context.task_id,
            )
            request = TaskMetadataCreateRequest(
                task_id=self.context.task_id,
                user_id=self.context.user_id,
                status=status,
                summary=final_result.message or "",
                error_summary=(
                    final_result.error_code if status == TaskStatus.FAILED else None
                ),
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
        return final_result


def build_video_task(context: TaskContext) -> VideoTask:
    """构建 VideoTask 实例的工厂函数。"""
    return VideoTask(context)
