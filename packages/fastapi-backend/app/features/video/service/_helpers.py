"""VideoService 发布管理内部辅助方法。

提供发布/取消发布流程中共享的辅助函数，包括 detail 状态写入、
快照持久化与缓存刷新、卡片构建与分页等。
"""
from __future__ import annotations

from datetime import UTC, datetime

from app.features.video.long_term_records import VideoPublicationSnapshot
from app.features.video.pipeline.models import (
    PublishState,
    PublishedVideoCard,
    PublishedVideoCardPage,
    VideoResultDetail,
)
from app.features.video.pipeline.runtime import build_video_runtime_key
from app.infra.redis_client import RuntimeStore
from app.shared.task_metadata import TaskMetadataSnapshot


def write_detail_state(
    asset_store: object,
    detail_ref: str,
    detail: VideoResultDetail,
    publish_state: PublishState,
) -> VideoResultDetail:
    """用新的 publish_state 更新 detail 并写回 asset store，返回更新后的 detail。"""
    updated = detail.model_copy(update={"publish_state": publish_state})
    detail_key = asset_store.ref_to_key(detail_ref)
    asset_store.write_json(detail_key, updated.model_dump(mode="json", by_alias=True))
    return updated


async def persist_snapshot_and_invalidate(
    video_service: object,
    snapshot: TaskMetadataSnapshot,
    *,
    updated_at: datetime,
    runtime_store: RuntimeStore | None = None,
    access_context: object | None = None,
) -> None:
    """重新持久化 snapshot 到 RuoYi 并刷新公开视频缓存。"""
    await video_service.persist_task(
        video_service.build_task_request(
            task_id=snapshot.task_id,
            user_id=snapshot.user_id,
            status=snapshot.status,
            summary=snapshot.summary,
            result_ref=snapshot.result_ref,
            detail_ref=snapshot.detail_ref,
            source_artifact_ref=snapshot.source_artifact_ref,
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
