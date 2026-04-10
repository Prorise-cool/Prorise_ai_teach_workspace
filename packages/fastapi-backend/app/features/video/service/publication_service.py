"""VideoService 发布管理方法。

提供 ``publish_task``、``unpublish_task``、``list_published_tasks``。
内部辅助方法委托至 ``_helpers`` 模块。
"""
from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from app.core.errors import AppError
from app.core.logging import get_logger
from app.core.security import AccessContext
from app.features.video.long_term_records import VideoPublicationSyncRequest
from app.features.video.pipeline.models import (
    PublishOperationResult,
    PublishState,
    PublishedVideoCard,
    PublishedVideoCardPage,
)
from app.features.video.pipeline.runtime import build_video_runtime_key
from app.features.video.service._helpers import (
    build_published_card,
    invalidate_published_cache,
    paginate_cards,
    persist_snapshot_and_invalidate,
    resolve_publish_state,
    write_detail_state,
)
from app.infra.redis_client import RuntimeStore
from app.shared.task_framework.status import TaskStatus

if TYPE_CHECKING:
    from app.shared.ruoyi_auth import RuoYiRequestAuth

logger = get_logger("app.features.video.service")


class PublicationServiceMixin:
    """混入类：视频任务发布管理。"""

    # --- 由 VideoService 实例提供的属性（运行时绑定） ---
    _asset_store: object  # LocalAssetStore
    _publication_service: object  # VideoPublicationService

    async def publish_task(
        self: "PublicationServiceMixin",
        task_id: str,
        *,
        access_context: AccessContext,
        runtime_store: RuntimeStore | None = None,
    ) -> PublishOperationResult:
        """将已完成的视频任务公开发布。

        校验任务归属和完成状态后，同步发布记录到远端，更新本地详情文件的
        publish_state，并刷新已发布列表缓存。

        Raises:
            AppError: 404/403/400 -- 任务不存在/非创建者/未完成。
        """
        snapshot = await self.get_task(task_id, access_context=access_context)
        if snapshot is None:
            raise AppError(code="COMMON_NOT_FOUND", message="视频任务不存在", status_code=404, task_id=task_id)
        if snapshot.user_id != access_context.user_id:
            raise AppError(code="AUTH_PERMISSION_DENIED", message="仅任务创建者可公开结果", status_code=403, task_id=task_id)
        if snapshot.status != TaskStatus.COMPLETED or snapshot.detail_ref is None:
            raise AppError(code="TASK_INVALID_INPUT", message="仅已完成的视频任务可公开", status_code=400, task_id=task_id)

        detail = self._asset_store.read_result_detail(snapshot.detail_ref)
        if detail.result is None:
            raise AppError(code="TASK_INVALID_INPUT", message="结果详情缺失，暂不可公开", status_code=400, task_id=task_id)

        publication = await self._publication_service.sync_publication(
            VideoPublicationSyncRequest(
                user_id=snapshot.user_id,
                task_ref_id=snapshot.task_id,
                title=detail.result.title,
                description=detail.result.summary,
                cover_url=detail.result.cover_url,
                is_public=True,
            ),
            access_context=access_context,
        )
        publish_state = resolve_publish_state(
            detail.publish_state, publication, author_name=access_context.username,
        )
        updated_detail = write_detail_state(self._asset_store, snapshot.detail_ref, detail, publish_state)

        updated_at = publication.updated_at or datetime.now(UTC)
        await persist_snapshot_and_invalidate(
            self, snapshot, updated_at=updated_at, runtime_store=runtime_store, access_context=access_context,
        )
        return PublishOperationResult(
            task_id=task_id,
            published=publish_state.published,
            published_at=publish_state.published_at,
            card=build_published_card(updated_detail),
        )

    async def unpublish_task(
        self: "PublicationServiceMixin",
        task_id: str,
        *,
        access_context: AccessContext,
        runtime_store: RuntimeStore | None = None,
    ) -> PublishOperationResult:
        """取消已公开发布的视频任务。

        Raises:
            AppError: 404/403 -- 任务不存在/非创建者。
        """
        snapshot = await self.get_task(task_id, access_context=access_context)
        if snapshot is None:
            raise AppError(code="COMMON_NOT_FOUND", message="视频任务不存在", status_code=404, task_id=task_id)
        if snapshot.user_id != access_context.user_id:
            raise AppError(code="AUTH_PERMISSION_DENIED", message="仅任务创建者可取消公开", status_code=403, task_id=task_id)

        detail = None
        if snapshot.detail_ref is not None and self._asset_store.exists(snapshot.detail_ref):
            detail = self._asset_store.read_result_detail(snapshot.detail_ref)

        publication = await self._publication_service.get_publication(
            task_id, access_context=access_context,
        )
        if publication is None:
            if detail is not None:
                write_detail_state(self._asset_store, snapshot.detail_ref, detail, PublishState())
            invalidate_published_cache(runtime_store)
            return PublishOperationResult(task_id=task_id, published=False, published_at=None, card=None)

        await self._publication_service.sync_publication(
            VideoPublicationSyncRequest(
                user_id=snapshot.user_id,
                task_ref_id=snapshot.task_id,
                title=detail.result.title if detail and detail.result else publication.title,
                description=detail.result.summary if detail and detail.result else publication.description,
                cover_url=detail.result.cover_url if detail and detail.result else publication.cover_url,
                is_public=False,
                status=publication.status,
            ),
            access_context=access_context,
        )

        if detail is not None:
            write_detail_state(self._asset_store, snapshot.detail_ref, detail, PublishState())

        await persist_snapshot_and_invalidate(
            self, snapshot, updated_at=datetime.now(UTC), runtime_store=runtime_store, access_context=access_context,
        )
        return PublishOperationResult(task_id=task_id, published=False, published_at=None, card=None)

    async def list_published_tasks(
        self: "PublicationServiceMixin",
        *,
        page: int = 1,
        page_size: int = 12,
        runtime_store: RuntimeStore | None = None,
        access_context: AccessContext | None = None,
        request_auth: "RuoYiRequestAuth | None" = None,
    ) -> PublishedVideoCardPage:
        """分页查询所有已公开发布的视频卡片。

        优先从 Redis 缓存读取；缓存未命中时全量扫描远端发布记录，
        与本地产物交叉匹配后写入缓存。
        """
        self._resolve_authenticated_factory(access_context, request_auth=request_auth)

        if runtime_store is not None:
            cached = runtime_store.get_runtime_value(build_video_runtime_key("published", "index"))
            if isinstance(cached, list):
                cards = [PublishedVideoCard.model_validate(item) for item in cached]
                return paginate_cards(cards, page=page, page_size=page_size)

        cards: list[PublishedVideoCard] = []
        page_num = 1
        page_size_scan = 100
        total_seen = 0
        while True:
            publication_page = await self._publication_service.list_publications(
                page=page_num, page_size=page_size_scan,
                access_context=access_context, request_auth=request_auth,
            )
            total_seen += len(publication_page.rows)
            snapshots = await asyncio.gather(
                *(self.get_task(
                    item.task_ref_id, access_context=access_context, request_auth=request_auth,
                ) for item in publication_page.rows)
            )
            for publication, snapshot in zip(publication_page.rows, snapshots, strict=False):
                if snapshot is None or snapshot.detail_ref is None:
                    continue
                if not self._asset_store.exists(snapshot.detail_ref):
                    continue
                detail = self._asset_store.read_result_detail(snapshot.detail_ref)
                if detail.result is None:
                    continue
                detail = detail.model_copy(
                    update={"publish_state": resolve_publish_state(detail.publish_state, publication)}
                )
                cards.append(build_published_card(detail, publication=publication))

            if total_seen >= publication_page.total or not publication_page.rows:
                break
            page_num += 1

        cards.sort(key=lambda item: item.published_at, reverse=True)
        if runtime_store is not None:
            runtime_store.set_runtime_value(
                build_video_runtime_key("published", "index"),
                [card.model_dump(mode="json", by_alias=True) for card in cards],
                ttl_seconds=600,
            )
        return paginate_cards(cards, page=page, page_size=page_size)
