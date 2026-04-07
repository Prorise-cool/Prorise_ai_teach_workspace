"""演示任务实现，用于任务框架的集成测试和调度验证。"""

from app.shared.task_framework.base import BaseTask, TaskResult


class DemoTask(BaseTask):
    """演示任务，支持配置成功或失败模式以验证调度器行为。"""

    def __init__(self, context, *, should_fail: bool = False) -> None:
        """初始化演示任务。

        Args:
            context: 任务上下文。
            should_fail: 是否在 run() 中模拟失败。
        """
        super().__init__(context)
        self.should_fail = should_fail

    async def prepare(self) -> None:
        """记录准备日志。"""
        self.logger.info("Demo task prepared source_module=%s", self.context.source_module)

    async def run(self) -> TaskResult:
        """执行演示逻辑，should_fail 为 True 时抛出异常。"""
        self.logger.info("Demo task running")
        if self.should_fail:
            raise RuntimeError("demo task failed")
        return TaskResult.completed(
            message="Demo task 执行完成",
            context={"sourceModule": self.context.source_module}
        )

    async def finalize(self, result: TaskResult) -> TaskResult:
        """记录收尾日志并原样返回结果。"""
        self.logger.info("Demo task finalized status=%s", result.status.value)
        return result
