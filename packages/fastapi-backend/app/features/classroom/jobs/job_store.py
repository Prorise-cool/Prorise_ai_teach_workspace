"""课堂任务运行态读写工具。

Wave 1 重构：
- 旧名称 ``JobStore`` 改为 ``ClassroomRuntimeStateStore``，保留旧名作向后兼容别名。
- 缓存键前缀从 ``xm_openmaic_job_*`` 切换到 ``xm_classroom_task_*``。
- 任务持久化（``xm_classroom_session`` 表）由 ``ClassroomService.persist_task``
  负责，本类只管理 Redis 中的运行态（status / progress / 临时结果 / 错误）。
"""
from __future__ import annotations

import logging

from app.infra.redis_client import RuntimeStore

logger = logging.getLogger(__name__)

# Key templates — 全部以 xm_classroom_task_ 前缀（RuntimeStore 强制 xm_ 前缀约束）
_STATUS_KEY = "xm_classroom_task_{task_id}_status"
_PROGRESS_KEY = "xm_classroom_task_{task_id}_progress"
_RESULT_KEY = "xm_classroom_task_{task_id}_result"
_ERROR_KEY = "xm_classroom_task_{task_id}_error"
_MESSAGE_KEY = "xm_classroom_task_{task_id}_message"

_DEFAULT_TTL = 24 * 60 * 60  # 24 小时


class ClassroomRuntimeStateStore:
    """课堂任务运行态 Redis 读写器。

    所有方法均为同步（``RuntimeStore`` 是同步的），在 async 路由 handler
    中如需后台执行可包一层 ``asyncio.to_thread``。
    """

    def __init__(self, runtime_store: RuntimeStore) -> None:
        self._store = runtime_store

    def create(self, task_id: str) -> None:
        """初始化任务运行态为 pending。"""
        self._store.set_runtime_value(
            _STATUS_KEY.format(task_id=task_id), "pending", ttl_seconds=_DEFAULT_TTL
        )
        self._store.set_runtime_value(
            _PROGRESS_KEY.format(task_id=task_id), 0, ttl_seconds=_DEFAULT_TTL
        )

    def set_status(self, task_id: str, status: str, message: str | None = None) -> None:
        """更新任务状态及可选的展示消息。"""
        self._store.set_runtime_value(
            _STATUS_KEY.format(task_id=task_id), status, ttl_seconds=_DEFAULT_TTL
        )
        if message is not None:
            self._store.set_runtime_value(
                _MESSAGE_KEY.format(task_id=task_id), message, ttl_seconds=_DEFAULT_TTL
            )

    def set_progress(self, task_id: str, progress: int) -> None:
        """更新任务进度（0-100）。"""
        self._store.set_runtime_value(
            _PROGRESS_KEY.format(task_id=task_id),
            max(0, min(100, progress)),
            ttl_seconds=_DEFAULT_TTL,
        )

    def set_result(self, task_id: str, classroom: dict) -> None:
        """写入课堂结果并标记 ready / progress=100。"""
        self._store.set_runtime_value(
            _RESULT_KEY.format(task_id=task_id), classroom, ttl_seconds=_DEFAULT_TTL
        )
        self._store.set_runtime_value(
            _STATUS_KEY.format(task_id=task_id), "ready", ttl_seconds=_DEFAULT_TTL
        )
        self._store.set_runtime_value(
            _PROGRESS_KEY.format(task_id=task_id), 100, ttl_seconds=_DEFAULT_TTL
        )

    def set_error(self, task_id: str, error: str) -> None:
        """标记任务失败并记录错误信息。"""
        self._store.set_runtime_value(
            _ERROR_KEY.format(task_id=task_id), error, ttl_seconds=_DEFAULT_TTL
        )
        self._store.set_runtime_value(
            _STATUS_KEY.format(task_id=task_id), "failed", ttl_seconds=_DEFAULT_TTL
        )

    def get_status(self, task_id: str) -> dict:
        """读取任务运行态快照。"""
        status = self._store.get_runtime_value(_STATUS_KEY.format(task_id=task_id))
        if status is None:
            return {
                "status": "pending",
                "progress": 0,
                "classroom": None,
                "error": "Task not found",
                "message": None,
            }

        progress = self._store.get_runtime_value(_PROGRESS_KEY.format(task_id=task_id)) or 0
        message = self._store.get_runtime_value(_MESSAGE_KEY.format(task_id=task_id))

        classroom = None
        error = None

        if status == "ready":
            classroom = self._store.get_runtime_value(_RESULT_KEY.format(task_id=task_id))

        if status == "failed":
            error = self._store.get_runtime_value(_ERROR_KEY.format(task_id=task_id))

        return {
            "status": status,
            "progress": int(progress),
            "classroom": classroom,
            "error": error,
            "message": message,
        }

    def exists(self, task_id: str) -> bool:
        return self._store.get_runtime_value(_STATUS_KEY.format(task_id=task_id)) is not None


# 向后兼容别名（旧 OpenMAIC 代码的 ``JobStore`` 引用）
JobStore = ClassroomRuntimeStateStore
