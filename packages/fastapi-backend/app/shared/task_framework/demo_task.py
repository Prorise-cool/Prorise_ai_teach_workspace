from app.shared.task_framework.base import BaseTask, TaskResult


class DemoTask(BaseTask):
    def __init__(self, context, *, should_fail: bool = False) -> None:
        super().__init__(context)
        self.should_fail = should_fail

    async def prepare(self) -> None:
        self.logger.info("Demo task prepared source_module=%s", self.context.source_module)

    async def run(self) -> TaskResult:
        self.logger.info("Demo task running")
        if self.should_fail:
            raise RuntimeError("demo task failed")
        return TaskResult.completed(
            message="Demo task 执行完成",
            context={"sourceModule": self.context.source_module}
        )

    async def finalize(self, result: TaskResult) -> TaskResult:
        self.logger.info("Demo task finalized status=%s", result.status.value)
        return result
