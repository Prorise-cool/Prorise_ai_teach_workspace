import asyncio
from datetime import UTC, datetime

from app.core.errors import AppError, IntegrationError
from app.core.logging import get_logger
from app.core.security import AccessContext
from app.features.video.long_term_records import (
    VideoPublicationSnapshot,
    VideoPublicationSyncRequest,
    build_session_artifact_batch_request,
)
from app.features.video.long_term_service import VideoArtifactIndexService, VideoPublicationService
from app.features.video.pipeline.assets import LocalAssetStore
from app.features.video.pipeline.models import (
    PublishedVideoCard,
    PublishedVideoCardPage,
    PublishOperationResult,
    PublishState,
    VideoArtifactGraph,
    VideoResultDetail,
)
from app.features.video.pipeline.runtime import build_video_runtime_key
from app.features.video.schemas import VideoBootstrapResponse, VideoTaskMetadataCreateRequest
from app.infra.redis_client import RuntimeStore
from app.shared.task_framework.status import TaskStatus
from app.shared.task_metadata import TaskType
from app.shared.task_metadata_service import BaseTaskMetadataService

logger = get_logger("app.features.video.service")


class VideoService(BaseTaskMetadataService):
    _RESOURCE = "video-task"
    _LIST_ENDPOINT = "/video/task/list"
    _WRITE_ENDPOINT = "/video/task"
    _TASK_TYPE = TaskType.VIDEO

    def __init__(
        self,
        repository=None,
        client_factory=None,
        *,
        asset_store: LocalAssetStore | None = None,
        publication_service: VideoPublicationService | None = None,
        artifact_index_service: VideoArtifactIndexService | None = None,
    ) -> None:
        super().__init__(repository=repository, client_factory=client_factory)
        self._asset_store = asset_store or LocalAssetStore.from_settings()
        self._publication_service = publication_service or VideoPublicationService(client_factory=self._client_factory)
        self._artifact_index_service = artifact_index_service or VideoArtifactIndexService(
            client_factory=self._client_factory
        )

    async def bootstrap_status(self) -> VideoBootstrapResponse:
        return VideoBootstrapResponse()

    def build_task_request(
        self,
        *,
        task_id: str,
        user_id: str,
        status: TaskStatus,
        summary: str,
        result_ref: str | None = None,
        detail_ref: str | None = None,
        error_summary: str | None = None,
        source_session_id: str | None = None,
        source_artifact_ref: str | None = None,
        replay_hint: str | None = None,
        created_at: datetime | None = None,
        started_at: datetime | None = None,
        completed_at: datetime | None = None,
        failed_at: datetime | None = None,
        updated_at: datetime | None = None,
    ) -> VideoTaskMetadataCreateRequest:
        return VideoTaskMetadataCreateRequest(
            task_id=task_id,
            user_id=user_id,
            status=status,
            summary=summary,
            result_ref=result_ref,
            detail_ref=detail_ref,
            error_summary=error_summary,
            source_session_id=source_session_id,
            source_artifact_ref=source_artifact_ref,
            replay_hint=replay_hint,
            created_at=created_at,
            started_at=started_at,
            completed_at=completed_at,
            failed_at=failed_at,
            updated_at=updated_at,
        )

    async def get_result_detail(
        self,
        task_id: str,
        *,
        runtime_store: RuntimeStore | None = None,
    ) -> VideoResultDetail:
        snapshot = await self.get_task(task_id)
        if snapshot is None:
            raise AppError(
                code="COMMON_NOT_FOUND",
                message="视频任务不存在",
                status_code=404,
                task_id=task_id,
            )

        if snapshot.detail_ref and self._asset_store.exists(snapshot.detail_ref):
            detail = self._asset_store.read_result_detail(snapshot.detail_ref)
            try:
                publication = await self._publication_service.get_publication(task_id)
            except IntegrationError:
                logger.warning(
                    "Video publication overlay lookup failed; falling back to local publish state task_id=%s",
                    task_id,
                )
                return detail
            return detail.model_copy(
                update={"publish_state": self._resolve_publish_state(detail.publish_state, publication)}
            )

        if runtime_store is not None:
            state = runtime_store.get_task_state(task_id)
            if state is not None:
                status = str(state.get("status") or "processing")
                return VideoResultDetail(task_id=task_id, status="processing" if status == "pending" else status)

        return VideoResultDetail(task_id=task_id, status="processing")

    async def publish_task(
        self,
        task_id: str,
        *,
        access_context: AccessContext,
        runtime_store: RuntimeStore | None = None,
    ) -> PublishOperationResult:
        snapshot = await self.get_task(task_id)
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
            )
        )
        publish_state = self._resolve_publish_state(
            detail.publish_state,
            publication,
            author_name=access_context.username,
        )
        updated_detail = detail.model_copy(update={"publish_state": publish_state})
        detail_key = self._asset_store.ref_to_key(snapshot.detail_ref)
        self._asset_store.write_json(detail_key, updated_detail.model_dump(mode="json", by_alias=True))

        updated_at = publication.updated_at or datetime.now(UTC)
        await self.persist_task(
            self.build_task_request(
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
            )
        )
        self._invalidate_published_cache(runtime_store)
        return PublishOperationResult(
            task_id=task_id,
            published=publish_state.published,
            published_at=publish_state.published_at,
            card=self._build_published_card(updated_detail),
        )

    async def unpublish_task(
        self,
        task_id: str,
        *,
        access_context: AccessContext,
        runtime_store: RuntimeStore | None = None,
    ) -> PublishOperationResult:
        snapshot = await self.get_task(task_id)
        if snapshot is None:
            raise AppError(code="COMMON_NOT_FOUND", message="视频任务不存在", status_code=404, task_id=task_id)
        if snapshot.user_id != access_context.user_id:
            raise AppError(code="AUTH_PERMISSION_DENIED", message="仅任务创建者可取消公开", status_code=403, task_id=task_id)

        detail = None
        if snapshot.detail_ref is not None and self._asset_store.exists(snapshot.detail_ref):
            detail = self._asset_store.read_result_detail(snapshot.detail_ref)

        publication = await self._publication_service.get_publication(task_id)
        if publication is None:
            if detail is not None:
                updated_detail = detail.model_copy(update={"publish_state": PublishState()})
                detail_key = self._asset_store.ref_to_key(snapshot.detail_ref)
                self._asset_store.write_json(detail_key, updated_detail.model_dump(mode="json", by_alias=True))
            self._invalidate_published_cache(runtime_store)
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
            )
        )

        if detail is not None:
            updated_detail = detail.model_copy(update={"publish_state": PublishState()})
            detail_key = self._asset_store.ref_to_key(snapshot.detail_ref)
            self._asset_store.write_json(detail_key, updated_detail.model_dump(mode="json", by_alias=True))

        updated_at = datetime.now(UTC)
        await self.persist_task(
            self.build_task_request(
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
            )
        )
        self._invalidate_published_cache(runtime_store)
        return PublishOperationResult(task_id=task_id, published=False, published_at=None, card=None)

    async def list_published_tasks(
        self,
        *,
        page: int = 1,
        page_size: int = 12,
        runtime_store: RuntimeStore | None = None,
    ) -> PublishedVideoCardPage:
        if runtime_store is not None:
            cached = runtime_store.get_runtime_value(build_video_runtime_key("published", "index"))
            if isinstance(cached, list):
                cards = [PublishedVideoCard.model_validate(item) for item in cached]
                return self._paginate_cards(cards, page=page, page_size=page_size)

        cards: list[PublishedVideoCard] = []
        page_num = 1
        page_size_scan = 100
        total_seen = 0
        while True:
            publication_page = await self._publication_service.list_publications(page=page_num, page_size=page_size_scan)
            total_seen += len(publication_page.rows)
            snapshots = await asyncio.gather(
                *(self.get_task(item.task_ref_id) for item in publication_page.rows)
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
                    update={"publish_state": self._resolve_publish_state(detail.publish_state, publication)}
                )
                cards.append(self._build_published_card(detail, publication=publication))

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
        return self._paginate_cards(cards, page=page, page_size=page_size)

    async def sync_artifact_graph(
        self,
        graph: VideoArtifactGraph,
        *,
        artifact_ref: str,
    ):
        return await self._artifact_index_service.sync_artifact_batch(
            build_session_artifact_batch_request(
                graph,
                object_key=self._asset_store.ref_to_key(artifact_ref),
                payload_ref=artifact_ref,
            )
        )

    def _build_published_card(
        self,
        detail: VideoResultDetail,
        *,
        publication: VideoPublicationSnapshot | None = None,
    ) -> PublishedVideoCard:
        published_at = self._published_at_from(publication, fallback=detail.publish_state.published_at)
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

    @staticmethod
    def _paginate_cards(
        cards: list[PublishedVideoCard],
        *,
        page: int,
        page_size: int,
    ) -> PublishedVideoCardPage:
        start = max(page - 1, 0) * page_size
        end = start + page_size
        return PublishedVideoCardPage(rows=cards[start:end], total=len(cards), page=page, page_size=page_size)

    @staticmethod
    def _invalidate_published_cache(runtime_store: RuntimeStore | None) -> None:
        if runtime_store is None:
            return
        runtime_store.delete_runtime_value(build_video_runtime_key("published", "index"))

    def _resolve_publish_state(
        self,
        current_state: PublishState,
        publication: VideoPublicationSnapshot | None,
        *,
        author_name: str | None = None,
    ) -> PublishState:
        if publication is None or not publication.is_public:
            return PublishState()
        return PublishState(
            published=True,
            published_at=self._published_at_from(publication, fallback=current_state.published_at),
            author_name=author_name or current_state.author_name,
        )

    @staticmethod
    def _published_at_from(
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
