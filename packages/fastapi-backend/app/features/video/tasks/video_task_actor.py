"""Story 3.4: 视频任务 Dramatiq actor 定义。

通过 Story 2.2 task 基类完成任务注册，
使用 Story 2.3 Dramatiq + Redis broker 进行消息消费。
"""

from __future__ import annotations

from app.core.logging import get_logger
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext

logger = get_logger("app.features.video.task_actor")


class VideoTask(BaseTask):
    """视频任务执行器（Story 4.1 将实现完整流水线）。

    当前 Story 3.4 仅负责任务受理和分发；
    此 Task 类作为 Worker 消费入口的占位实现，
    后续由 Story 4.1 填充视频生成流水线逻辑。
    """

    async def prepare(self) -> None:
        """任务预备阶段。"""
        self.logger.info(
            "Video task prepare task_id=%s input_type=%s",
            self.context.task_id,
            self.context.metadata.get("inputType", "unknown"),
        )

    async def run(self) -> TaskResult:
        """任务执行主体。

        MVP 阶段直接返回 pending 占位，
        Story 4.1 将替换为真实的视频生成流水线。
        """
        self.logger.info(
            "Video task run (placeholder) task_id=%s",
            self.context.task_id,
        )
        # Story 4.1 将在此处实现：
        # 1. 理解阶段 (understanding)
        # 2. 分镜阶段 (storyboard)
        # 3. Manim 渲染
        # 4. TTS 语音合成
        # 5. 视频合成 (composition)
        return TaskResult.completed(
            message="视频任务执行完成（占位）",
            context={
                "inputType": self.context.metadata.get("inputType"),
                "sourceModule": self.context.source_module,
            },
        )

    async def finalize(self, result: TaskResult) -> TaskResult:
        """任务清理阶段。"""
        self.logger.info(
            "Video task finalize task_id=%s status=%s",
            self.context.task_id,
            result.status.value,
        )
        return result


def build_video_task(context: TaskContext) -> VideoTask:
    """VideoTask 工厂函数，用于 register_task 注册。"""
    return VideoTask(context)
