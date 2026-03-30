import asyncio

from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext


class LifecycleProbeTask(BaseTask):
    def __init__(self, context: TaskContext) -> None:
        super().__init__(context)
        self.calls: list[str] = []

    async def prepare(self) -> None:
        self.calls.append("prepare")

    async def run(self) -> TaskResult:
        self.calls.append("run")
        return TaskResult.completed("ok")

    async def handle_error(self, exc: Exception) -> TaskResult:
        self.calls.append("handle_error")
        return await super().handle_error(exc)

    async def finalize(self, result: TaskResult) -> TaskResult:
        self.calls.append("finalize")
        return result


def test_base_task_lifecycle_wrappers_are_idempotent() -> None:
    task = LifecycleProbeTask(
        TaskContext(task_id="task_001", task_type="demo", user_id="student-1")
    )

    asyncio.run(task._execute_prepare())
    asyncio.run(task._execute_prepare())

    first_error_result = asyncio.run(task._execute_handle_error(RuntimeError("boom")))
    second_error_result = asyncio.run(task._execute_handle_error(RuntimeError("ignored")))

    first_finalized = asyncio.run(task._execute_finalize(first_error_result))
    second_finalized = asyncio.run(task._execute_finalize(TaskResult.completed("ignored")))

    assert task.calls == ["prepare", "handle_error", "finalize"]
    assert first_error_result == second_error_result
    assert first_finalized == second_finalized
