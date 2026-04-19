"""VideoService 发布管理内部辅助方法。

提供发布/取消发布流程中共享的辅助函数，包括 detail 状态写入、
快照持久化与缓存刷新、卡片构建与分页等。
"""
from __future__ import annotations

from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Any

from app.features.video.long_term.records import VideoPublicationSnapshot
from app.features.video.pipeline.constants import (
    VIDEO_ARTIFACT_GRAPH_TEMPLATE,
    VIDEO_RESULT_DETAIL_TEMPLATE,
)
from app.features.video.pipeline.models import (
    ArtifactType,
    PublishState,
    PublishedVideoCard,
    PublishedVideoCardPage,
    VideoArtifactGraph,
    VideoNarrationSegment,
    VideoPreviewSection,
    VideoResultDetail,
    VideoResultSection,
    VideoTaskPreview,
    VideoTimelineItem,
)
from app.features.video.pipeline.orchestration.runtime import (
    VideoRuntimeStateStore,
    build_video_runtime_key,
)
from app.infra.redis_client import RuntimeStore
from app.shared.task_metadata import TaskMetadataSnapshot


def build_result_detail_ref(asset_store: object, task_id: str) -> str:
    """构建稳定的结果详情资产引用。"""

    return asset_store.build_asset(
        VIDEO_RESULT_DETAIL_TEMPLATE.format(task_id=task_id)
    ).public_url


def build_artifact_graph_ref(asset_store: object, task_id: str) -> str:
    """构建稳定的产物图谱资产引用。"""

    return asset_store.build_asset(
        VIDEO_ARTIFACT_GRAPH_TEMPLATE.format(task_id=task_id)
    ).public_url


def load_result_detail(
    asset_store: object,
    task_id: str,
    *,
    detail_ref: str | None = None,
    runtime_store: RuntimeStore | None = None,
) -> tuple[VideoResultDetail | None, str | None]:
    """优先从详情资产，其次从运行态加载结果详情。"""

    candidates: list[str] = []
    if detail_ref:
        candidates.append(detail_ref)
    deterministic_ref = build_result_detail_ref(asset_store, task_id)
    if deterministic_ref not in candidates:
        candidates.append(deterministic_ref)

    for candidate in candidates:
        if asset_store.exists(candidate):
            return asset_store.read_result_detail(candidate), candidate

    if runtime_store is not None:
        runtime = VideoRuntimeStateStore(runtime_store, task_id)
        detail = runtime.load_model("result_detail", VideoResultDetail)
        if detail is not None:
            return detail, None

    return None, None


def persist_result_detail(
    asset_store: object,
    task_id: str,
    detail: VideoResultDetail,
    *,
    detail_ref: str | None = None,
) -> tuple[VideoResultDetail, str]:
    """把结果详情落到稳定资产路径，并返回更新后的 ref。"""

    target_ref = detail_ref or build_result_detail_ref(asset_store, task_id)
    detail_key = asset_store.ref_to_key(target_ref)
    asset = asset_store.write_json(detail_key, detail.model_dump(mode="json", by_alias=True))
    return detail, asset.public_url


def persist_runtime_result_detail(
    runtime_store: RuntimeStore | None,
    task_id: str,
    detail: VideoResultDetail,
) -> None:
    """同步更新运行态中的 result_detail，供结果页与公开页直接消费。"""

    if runtime_store is None:
        return
    VideoRuntimeStateStore(runtime_store, task_id).save_model("result_detail", detail)


def load_preview_detail(
    task_id: str,
    *,
    runtime_store: RuntimeStore | None = None,
) -> VideoTaskPreview | None:
    """从运行态加载等待页 preview。"""

    if runtime_store is None:
        return None
    return VideoRuntimeStateStore(runtime_store, task_id).load_preview()


def load_artifact_graph(
    asset_store: object,
    task_id: str,
    *,
    artifact_ref: str | None = None,
) -> VideoArtifactGraph | None:
    """从稳定资产路径加载产物图谱。"""

    candidates: list[str] = []
    if artifact_ref:
        candidates.append(artifact_ref)
    deterministic_ref = build_artifact_graph_ref(asset_store, task_id)
    if deterministic_ref not in candidates:
        candidates.append(deterministic_ref)

    for candidate in candidates:
        if not asset_store.exists(candidate):
            continue
        return VideoArtifactGraph.model_validate(asset_store.read_json(candidate))
    return None


def write_detail_state(
    asset_store: object,
    task_id: str,
    detail: VideoResultDetail,
    publish_state: PublishState,
) -> tuple[VideoResultDetail, str]:
    """用新的 publish_state 更新 detail 并写回 asset store，返回更新后的 detail。"""

    updated = detail.model_copy(update={"publish_state": publish_state})
    return persist_result_detail(asset_store, task_id, updated)


async def persist_snapshot_and_invalidate(
    video_service: object,
    snapshot: TaskMetadataSnapshot,
    *,
    updated_at: datetime,
    runtime_store: RuntimeStore | None = None,
    access_context: object | None = None,
    result_ref: str | None = None,
    detail_ref: str | None = None,
    source_artifact_ref: str | None = None,
) -> None:
    """重新持久化 snapshot 到 RuoYi 并刷新公开视频缓存。"""
    await video_service.persist_task(
        video_service.build_task_request(
            task_id=snapshot.task_id,
            user_id=snapshot.user_id,
            status=snapshot.status,
            summary=snapshot.summary,
            result_ref=result_ref if result_ref is not None else snapshot.result_ref,
            detail_ref=detail_ref if detail_ref is not None else snapshot.detail_ref,
            source_artifact_ref=(
                source_artifact_ref
                if source_artifact_ref is not None
                else snapshot.source_artifact_ref
            ),
            replay_hint=snapshot.replay_hint,
            created_at=snapshot.created_at,
            started_at=snapshot.started_at,
            completed_at=snapshot.completed_at,
            updated_at=updated_at,
        ),
        access_context=access_context,
    )
    invalidate_published_cache(runtime_store)


def build_published_card(
    detail: VideoResultDetail,
    *,
    publication: VideoPublicationSnapshot | None = None,
) -> PublishedVideoCard:
    published_at = published_at_from(publication, fallback=detail.publish_state.published_at)
    if detail.result is None or published_at is None:
        raise ValueError("published detail requires result and published_at")
    return PublishedVideoCard(
        result_id=detail.result.result_id,
        title=detail.result.title,
        summary=detail.result.summary,
        knowledge_points=detail.result.knowledge_points,
        cover_url=detail.result.cover_url,
        duration=detail.result.duration,
        published_at=published_at,
        author_name=detail.publish_state.author_name,
    )


def paginate_cards(
    cards: list[PublishedVideoCard],
    *,
    page: int,
    page_size: int,
) -> PublishedVideoCardPage:
    start = max(page - 1, 0) * page_size
    end = start + page_size
    return PublishedVideoCardPage(rows=cards[start:end], total=len(cards), page=page, page_size=page_size)


def invalidate_published_cache(runtime_store: RuntimeStore | None) -> None:
    if runtime_store is None:
        return
    runtime_store.delete_runtime_value(build_video_runtime_key("published", "index"))


def resolve_publish_state(
    current_state: PublishState,
    publication: VideoPublicationSnapshot | None,
    *,
    author_name: str | None = None,
) -> PublishState:
    if publication is None or not publication.is_public:
        return PublishState()
    return PublishState(
        published=True,
        published_at=published_at_from(publication, fallback=current_state.published_at),
        author_name=author_name or current_state.author_name,
    )


def published_at_from(
    publication: VideoPublicationSnapshot | None,
    *,
    fallback: str | None = None,
) -> str | None:
    if publication is None:
        return fallback
    published_at = publication.published_at or publication.updated_at or publication.created_at
    if published_at is None:
        return fallback
    normalized = published_at.astimezone(UTC) if published_at.tzinfo is not None else published_at
    return normalized.strftime("%Y-%m-%dT%H:%M:%SZ")


def hydrate_result_detail(
    task_id: str,
    detail: VideoResultDetail,
    *,
    asset_store: object,
    runtime_store: RuntimeStore | None = None,
    artifact_ref: str | None = None,
) -> VideoResultDetail:
    """把 preview/artifact graph 中的章节、时间轴、字幕补齐到结果详情。"""

    preview = load_preview_detail(task_id, runtime_store=runtime_store)
    graph = load_artifact_graph(asset_store, task_id, artifact_ref=artifact_ref)
    sections = build_result_sections(preview, graph)
    timeline = build_timeline_items(graph, sections)
    narration = build_narration_segments(graph, sections)
    return detail.model_copy(
        update={
            "sections": sections,
            "timeline": timeline,
            "narration": narration,
        }
    )


def build_result_sections(
    preview: VideoTaskPreview | None,
    graph: VideoArtifactGraph | None,
) -> list[VideoResultSection]:
    """把 preview sections 与 artifact graph 合成为结果页章节列表。"""

    preview_by_id: dict[str, VideoPreviewSection] = {}
    ordered_ids: list[str] = []
    if preview is not None:
        for section in preview.sections:
            preview_by_id[section.section_id] = section
            ordered_ids.append(section.section_id)

    timeline_entries = _timeline_entry_map(graph)
    narration_entries = _narration_entry_map(graph)
    for section_id in list(timeline_entries.keys()) + list(narration_entries.keys()):
        if section_id and section_id not in ordered_ids:
            ordered_ids.append(section_id)

    sections: list[VideoResultSection] = []
    for fallback_index, section_id in enumerate(ordered_ids):
        preview_section = preview_by_id.get(section_id)
        timeline_entry = timeline_entries.get(section_id, {})
        narration_entry = narration_entries.get(section_id, {})
        narration_text = _clean_text(narration_entry.get("text")) or " ".join(
            _section_lecture_lines(preview_section)
        ).strip()
        sections.append(
            VideoResultSection(
                section_id=section_id,
                section_index=(
                    preview_section.section_index
                    if preview_section is not None
                    else fallback_index
                ),
                title=(
                    preview_section.title
                    if preview_section is not None
                    else _clean_text(timeline_entry.get("title")) or section_id
                ),
                lecture_lines=_section_lecture_lines(preview_section, narration_text=narration_text),
                narration_text=narration_text,
                audio_url=preview_section.audio_url if preview_section is not None else None,
                clip_url=preview_section.clip_url if preview_section is not None else None,
                start_time=_coerce_int(
                    timeline_entry.get("startTime", narration_entry.get("startTime"))
                ),
                end_time=_coerce_int(
                    timeline_entry.get("endTime", narration_entry.get("endTime"))
                ),
            )
        )

    sections.sort(key=lambda item: (item.section_index, item.start_time or 0, item.section_id))
    return sections


def build_timeline_items(
    graph: VideoArtifactGraph | None,
    sections: list[VideoResultSection],
) -> list[VideoTimelineItem]:
    """生成结果页章节跳转时间轴。"""

    items: list[VideoTimelineItem] = []
    timeline_entries = _timeline_entry_map(graph)
    if timeline_entries:
        for section in sections:
            entry = timeline_entries.get(section.section_id)
            if not entry:
                continue
            start_time = _coerce_int(entry.get("startTime"))
            end_time = _coerce_int(entry.get("endTime"))
            if start_time is None or end_time is None:
                continue
            items.append(
                VideoTimelineItem(
                    section_id=section.section_id,
                    title=_clean_text(entry.get("title")) or section.title,
                    start_time=start_time,
                    end_time=end_time,
                )
            )
        if items:
            return items

    for section in sections:
        if section.start_time is None or section.end_time is None:
            continue
        items.append(
            VideoTimelineItem(
                section_id=section.section_id,
                title=section.title,
                start_time=section.start_time,
                end_time=section.end_time,
            )
        )
    return items


def build_narration_segments(
    graph: VideoArtifactGraph | None,
    sections: list[VideoResultSection],
) -> list[VideoNarrationSegment]:
    """生成结果页字幕/旁白片段。"""

    segments: list[VideoNarrationSegment] = []
    narration_entries = _narration_entry_map(graph)
    if narration_entries:
        for section in sections:
            entry = narration_entries.get(section.section_id)
            if not entry:
                continue
            text = _clean_text(entry.get("text")) or section.narration_text
            if not text:
                continue
            segments.append(
                VideoNarrationSegment(
                    section_id=section.section_id,
                    text=text,
                    start_time=_coerce_int(entry.get("startTime")),
                    end_time=_coerce_int(entry.get("endTime")),
                )
            )
        if segments:
            return segments

    for section in sections:
        if not section.narration_text:
            continue
        segments.append(
            VideoNarrationSegment(
                section_id=section.section_id,
                text=section.narration_text,
                start_time=section.start_time,
                end_time=section.end_time,
            )
        )
    return segments


def _timeline_entry_map(graph: VideoArtifactGraph | None) -> dict[str, Mapping[str, Any]]:
    payload = _artifact_payload(graph, ArtifactType.TIMELINE)
    scenes = payload.get("scenes", [])
    result: dict[str, Mapping[str, Any]] = {}
    for item in scenes:
        if not isinstance(item, Mapping):
            continue
        section_id = _clean_text(item.get("sceneId") or item.get("sectionId"))
        if not section_id:
            continue
        result[section_id] = item
    return result


def _narration_entry_map(graph: VideoArtifactGraph | None) -> dict[str, Mapping[str, Any]]:
    payload = _artifact_payload(graph, ArtifactType.NARRATION)
    segments = payload.get("segments", [])
    result: dict[str, Mapping[str, Any]] = {}
    for item in segments:
        if not isinstance(item, Mapping):
            continue
        section_id = _clean_text(item.get("sceneId") or item.get("sectionId"))
        if not section_id:
            continue
        result[section_id] = item
    return result


def _artifact_payload(
    graph: VideoArtifactGraph | None,
    artifact_type: ArtifactType,
) -> dict[str, Any]:
    if graph is None:
        return {}
    for artifact in graph.artifacts:
        if artifact.artifact_type is artifact_type:
            return artifact.data
    return {}


def _section_lecture_lines(
    preview_section: VideoPreviewSection | None,
    *,
    narration_text: str = "",
) -> list[str]:
    if preview_section is not None and preview_section.lecture_lines:
        return [_clean_text(line) for line in preview_section.lecture_lines if _clean_text(line)]
    if narration_text:
        return [narration_text]
    return []


def _coerce_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return None


def _clean_text(value: Any) -> str:
    return str(value or "").strip()
