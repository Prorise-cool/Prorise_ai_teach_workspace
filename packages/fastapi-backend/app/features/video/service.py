from datetime import UTC, datetime

from app.core.errors import AppError
from app.core.security import AccessContext
from app.features.video.pipeline.assets import LocalAssetStore
from app.features.video.pipeline.models import (
    PublishedVideoCard,
    PublishedVideoCardPage,
    PublishOperationResult,
    PublishState,
    VideoResultDetail,
)
from app.features.video.pipeline.runtime import build_video_runtime_key
from app.features.video.schemas import VideoBootstrapResponse, VideoTaskMetadataCreateRequest
from app.infra.redis_client import RuntimeStore
from app.shared.task_framework.status import TaskStatus
from app.shared.task_metadata import TaskType
from app.shared.task_metadata_service import BaseTaskMetadataService


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
    ) -> None:
        super().__init__(repository=repository, client_factory=client_factory)
        self._asset_store = asset_store or LocalAssetStore.from_settings()

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
            return self._asset_store.read_result_detail(snapshot.detail_ref)

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

        publish_state = PublishState(
            published=True,
            published_at=datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            author_name=access_context.username,
        )
        updated_detail = detail.model_copy(update={"publish_state": publish_state})
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
        return PublishOperationResult(
            task_id=task_id,
            published=True,
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
        if snapshot.detail_ref is None or not self._asset_store.exists(snapshot.detail_ref):
            return PublishOperationResult(task_id=task_id, published=False, published_at=None, card=None)

        detail = self._asset_store.read_result_detail(snapshot.detail_ref)
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

        page_num = 1
        page_size_scan = 100
        cards: list[PublishedVideoCard] = []
        total_seen = 0
        while True:
            metadata_page = await self.list_tasks(
                status=TaskStatus.COMPLETED,
                page_num=page_num,
                page_size=page_size_scan,
            )
            total_seen += len(metadata_page.rows)
            for row in metadata_page.rows:
                if row.detail_ref is None:
                    continue
                if not self._asset_store.exists(row.detail_ref):
                    continue
                detail = self._asset_store.read_result_detail(row.detail_ref)
                if not detail.publish_state.published or detail.result is None:
                    continue
                cards.append(self._build_published_card(detail))

            if total_seen >= metadata_page.total or not metadata_page.rows:
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

    def _build_published_card(self, detail: VideoResultDetail) -> PublishedVideoCard:
        if detail.result is None or detail.publish_state.published_at is None:
            raise ValueError("published detail requires result and published_at")
        return PublishedVideoCard(
            result_id=detail.result.result_id,
            title=detail.result.title,
            summary=detail.result.summary,
            knowledge_points=detail.result.knowledge_points,
            cover_url=detail.result.cover_url,
            duration=detail.result.duration,
            published_at=detail.publish_state.published_at,
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
