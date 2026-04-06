"""视频任务 Worker 占位实现。"""

from __future__ import annotations

from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import TaskStatus


class VideoTask(BaseTask):
    async def prepare(self) -> None:
        self.logger.info(
            "Video task prepare task_id=%s input_type=%s",
            self.context.task_id,
            self.context.metadata.get("inputType"),
        )

    async def run(self) -> TaskResult:
        return TaskResult(
            status=TaskStatus.PROCESSING,
            message="视频任务已受理，等待后续流水线接管",
            progress=0,
            context={
                "inputType": self.context.metadata.get("inputType"),
                "sourceModule": self.context.source_module,
            },
        )


def build_video_task(context: TaskContext) -> VideoTask:
    return VideoTask(context)
