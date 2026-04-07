"""视频流水线运行态读写与阶段上下文工具。"""

from __future__ import annotations

from typing import Any, TypeVar

from pydantic import BaseModel

from app.features.video.pipeline.models import VideoFailure, VideoResultDetail, VideoStage, build_stage_snapshot
from app.infra.redis_client import RuntimeStore
from app.shared.task_framework.key_builder import TASK_RUNTIME_TTL_SECONDS
from app.shared.task_framework.status import TaskErrorCode, is_retryable_error

ModelT = TypeVar("ModelT", bound=BaseModel)

VIDEO_RUNTIME_PREFIX = "xm_video_task"


def build_video_runtime_key(task_id: str, suffix: str) -> str:
    """构建视频运行态 Redis 缓存键。"""
    normalized_task_id = task_id.strip()
    normalized_suffix = suffix.strip().replace("/", ":")
    if not normalized_task_id or not normalized_suffix:
        raise ValueError("task_id 与 suffix 不能为空")
    return f"{VIDEO_RUNTIME_PREFIX}:{normalized_task_id}:{normalized_suffix}"


def build_published_cache_key(page: int, page_size: int) -> str:
    """构建已发布列表缓存键。"""
    return build_video_runtime_key("published", f"page:{page}:size:{page_size}")


def build_stage_context(
    stage: VideoStage | str,
    ratio: float,
    *,
    extra: dict[str, object] | None = None,
) -> dict[str, object]:
    """构建流水线阶段上下文 payload。"""
    snapshot = build_stage_snapshot(stage, ratio)
    payload = snapshot.model_dump(mode="json", by_alias=True)
    payload.update(extra or {})
    return payload


class VideoRuntimeStateStore:
    """视频任务运行态键值存储封装。"""
    def __init__(self, runtime_store: RuntimeStore, task_id: str) -> None:
        """初始化运行态存储。"""
        self.runtime_store = runtime_store
        self.task_id = task_id

    def save_value(self, suffix: str, value: object) -> None:
        """保存任意值到运行态。"""
        self.runtime_store.set_runtime_value(
            build_video_runtime_key(self.task_id, suffix),
            value,
            ttl_seconds=TASK_RUNTIME_TTL_SECONDS,
        )

    def load_value(self, suffix: str) -> object | None:
        """从运行态加载值。"""
        return self.runtime_store.get_runtime_value(build_video_runtime_key(self.task_id, suffix))

    def delete_value(self, suffix: str) -> None:
        """从运行态删除值。"""
        self.runtime_store.delete_runtime_value(build_video_runtime_key(self.task_id, suffix))

    def save_model(self, suffix: str, model: BaseModel) -> None:
        """将 Pydantic 模型序列化后保存到运行态。"""
        self.save_value(suffix, model.model_dump(mode="json", by_alias=True))

    def load_model(self, suffix: str, model_type: type[ModelT]) -> ModelT | None:
        """从运行态加载并反序列化为 Pydantic 模型。"""
        raw_value = self.load_value(suffix)
        if raw_value is None:
            return None
        return model_type.model_validate(raw_value)

    def append_fix_log(self, payload: dict[str, object]) -> list[dict[str, object]]:
        """追加一条修复日志。"""
        existing = self.load_value("fix_log")
        rows = list(existing) if isinstance(existing, list) else []
        rows.append(dict(payload))
        self.save_value("fix_log", rows)
        return rows

    def load_fix_logs(self) -> list[dict[str, object]]:
        """加载所有修复日志。"""
        existing = self.load_value("fix_log")
        return list(existing) if isinstance(existing, list) else []


def build_failure(
    *,
    task_id: str,
    stage: VideoStage,
    error_code: TaskErrorCode,
    message: str,
    failed_at: str,
) -> VideoFailure:
    """构建视频任务失败详情。"""
    return VideoFailure(
        task_id=task_id,
        error_code=error_code.value,
        error_message=message,
        failed_stage=stage,
        failed_at=failed_at,
        retryable=is_retryable_error(error_code),
    )


def merge_result_detail(
    current: VideoResultDetail | None,
    *,
    status: str,
    result: dict[str, object] | None = None,
    failure: dict[str, object] | None = None,
    publish_state: dict[str, object] | None = None,
    artifact_writeback_failed: bool | None = None,
    long_term_writeback_failed: bool | None = None,
) -> VideoResultDetail:
    """合并或创建 VideoResultDetail。"""
    payload: dict[str, Any] = (
        current.model_dump(mode="json", by_alias=True)
        if current is not None
        else {
            "taskId": "",
            "status": status,
            "publishState": {"published": False},
        }
    )
    payload["status"] = status
    if result is not None:
        payload["result"] = result
        payload["taskId"] = result.get("taskId", payload.get("taskId", ""))
    if failure is not None:
        payload["failure"] = failure
        payload["taskId"] = failure.get("taskId", payload.get("taskId", ""))
    if publish_state is not None:
        payload["publishState"] = publish_state
    if artifact_writeback_failed is not None:
        payload["artifactWritebackFailed"] = artifact_writeback_failed
    if long_term_writeback_failed is not None:
        payload["longTermWritebackFailed"] = long_term_writeback_failed
    return VideoResultDetail.model_validate(payload)
