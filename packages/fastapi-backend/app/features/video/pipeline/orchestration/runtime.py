"""视频流水线运行态读写与阶段上下文工具。"""

from __future__ import annotations

from typing import Any, TypeVar

from pydantic import BaseModel

from app.core.logging import format_trace_timestamp
from app.features.video.pipeline.models import (
    VideoFailure,
    VideoPreviewSection,
    VideoPreviewSectionStatus,
    VideoResultDetail,
    VideoStage,
    VideoTaskPreview,
    build_stage_snapshot,
)
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
        return self.runtime_store.get_runtime_value(
            build_video_runtime_key(self.task_id, suffix)
        )

    def delete_value(self, suffix: str) -> None:
        """从运行态删除值。"""
        self.runtime_store.delete_runtime_value(
            build_video_runtime_key(self.task_id, suffix)
        )

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

    def save_preview(self, preview: VideoTaskPreview) -> None:
        """保存渐进预览运行态。"""
        self.save_model("preview", preview)

    def load_preview(self) -> VideoTaskPreview | None:
        """读取渐进预览运行态。"""
        return self.load_model("preview", VideoTaskPreview)


def build_preview_state(
    *,
    task_id: str,
    summary: str,
    knowledge_points: list[str],
    sections: list[VideoPreviewSection],
    status: str = "processing",
    preview_available: bool = False,
    preview_version: int = 0,
) -> VideoTaskPreview:
    """构建视频等待页渐进预览状态。"""
    ready_sections = sum(1 for section in sections if section.status == VideoPreviewSectionStatus.READY)
    failed_sections = sum(1 for section in sections if section.status == VideoPreviewSectionStatus.FAILED)
    return VideoTaskPreview(
        task_id=task_id,
        status=status,
        preview_available=preview_available,
        preview_version=preview_version,
        summary=summary,
        knowledge_points=list(knowledge_points),
        total_sections=len(sections),
        ready_sections=ready_sections,
        failed_sections=failed_sections,
        sections=list(sections),
        updated_at=format_trace_timestamp(),
    )


def update_preview_section(
    preview: VideoTaskPreview,
    *,
    section_id: str,
    status: VideoPreviewSectionStatus,
    preview_available: bool | None = None,
    clip_url: str | None = None,
    audio_url: str | None = None,
    error_message: str | None = None,
    fix_attempt: int | None = None,
) -> VideoTaskPreview:
    """更新指定 section 的预览状态，并自动刷新聚合统计。"""
    updated_sections: list[VideoPreviewSection] = []
    for section in preview.sections:
        if section.section_id != section_id:
            updated_sections.append(section)
            continue

        updated_sections.append(
            section.model_copy(
                update={
                    "status": status,
                    "clip_url": clip_url if clip_url is not None else section.clip_url,
                    "audio_url": audio_url if audio_url is not None else section.audio_url,
                    "error_message": error_message,
                    "fix_attempt": fix_attempt,
                    "updated_at": format_trace_timestamp(),
                }
            )
        )

    return build_preview_state(
        task_id=preview.task_id,
        status=preview.status,
        preview_available=preview.preview_available if preview_available is None else preview_available,
        preview_version=preview.preview_version + 1,
        summary=preview.summary,
        knowledge_points=preview.knowledge_points,
        sections=updated_sections,
    )


def attach_preview_audio_urls(
    preview: VideoTaskPreview,
    *,
    audio_urls: dict[str, str],
    preview_available: bool = True,
) -> VideoTaskPreview:
    """为预览 sections 绑定旁白试听 URL。"""
    updated_sections = [
        section.model_copy(
            update={
                "audio_url": audio_urls.get(section.section_id, section.audio_url),
                "updated_at": format_trace_timestamp(),
            }
        )
        for section in preview.sections
    ]
    return build_preview_state(
        task_id=preview.task_id,
        status=preview.status,
        preview_available=preview_available,
        preview_version=preview.preview_version + 1,
        summary=preview.summary,
        knowledge_points=preview.knowledge_points,
        sections=updated_sections,
    )


def mark_preview_status(
    preview: VideoTaskPreview,
    *,
    status: str,
) -> VideoTaskPreview:
    """更新预览顶层状态并递增版本号。"""
    return build_preview_state(
        task_id=preview.task_id,
        status=status,
        preview_available=preview.preview_available,
        preview_version=preview.preview_version + 1,
        summary=preview.summary,
        knowledge_points=preview.knowledge_points,
        sections=preview.sections,
    )


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
