"""VideoService 结果查询方法。

提供 ``get_result_detail`` 等视频任务结果详情查询能力。
"""

from __future__ import annotations

from app.core.errors import AppError, IntegrationError
from app.core.logging import get_logger
from app.core.security import AccessContext
from app.features.video.pipeline.models import (
    VideoResultDetail,
    VideoTaskPreview,
    parse_video_result_id,
)
from app.features.video.pipeline.orchestration.runtime import (
    VideoRuntimeStateStore,
    build_preview_state,
)
from app.features.video.service._helpers import (
    hydrate_result_detail,
    load_result_detail,
    resolve_publish_state,
)
from app.infra.redis_client import RuntimeStore

logger = get_logger("app.features.video.service")


class ResultServiceMixin:
    """混入类：视频任务结果查询。"""

    # --- 由 VideoService 实例提供的属性（运行时绑定） ---
    _asset_store: object  # LocalAssetStore
    _publication_service: object  # VideoPublicationService

    @staticmethod
    def _build_processing_detail(task_id: str, status: str) -> VideoResultDetail:
        return VideoResultDetail(
            task_id=task_id,
            status="processing" if status == "pending" else status,
        )

    async def _overlay_publication_state(
        self: "ResultServiceMixin",
        task_id: str,
        detail: VideoResultDetail,
        *,
        access_context: AccessContext | None = None,
    ) -> VideoResultDetail:
        try:
            publication = await self._publication_service.get_publication(
                task_id,
                access_context=access_context,
            )
        except IntegrationError:
            logger.warning(
                "Video publication overlay lookup failed; falling back to stored publish state task_id=%s",
                task_id,
            )
            return detail
        return detail.model_copy(
            update={
                "publish_state": resolve_publish_state(
                    detail.publish_state, publication
                )
            }
        )

    async def get_result_detail(
        self: "ResultServiceMixin",
        task_id: str,
        *,
        runtime_store: RuntimeStore | None = None,
        access_context: AccessContext | None = None,
    ) -> VideoResultDetail:
        """获取视频任务的完整结果详情。

        优先从本地资产文件加载持久化详情并叠加远端发布状态；
        若无本地详情则降级从 Redis 运行态读取实时进度。

        Args:
            task_id: 任务唯一标识。
            runtime_store: 可选的 Redis 运行态存储实例。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。

        Raises:
            AppError: 404 -- 任务不存在。
        """
        snapshot = await self.get_task(task_id, access_context=access_context)
        if snapshot is None:
            raise AppError(
                code="COMMON_NOT_FOUND",
                message="视频任务不存在",
                status_code=404,
                task_id=task_id,
            )
        if access_context is not None and snapshot.user_id != access_context.user_id:
            raise AppError(
                code="AUTH_PERMISSION_DENIED",
                message="仅任务创建者可查看结果详情",
                status_code=403,
                task_id=task_id,
            )

        detail, _ = load_result_detail(
            self._asset_store,
            task_id,
            detail_ref=snapshot.detail_ref,
            runtime_store=runtime_store,
        )
        if detail is not None:
            detail = await self._overlay_publication_state(
                task_id,
                detail,
                access_context=access_context,
            )
            return hydrate_result_detail(
                task_id,
                detail,
                asset_store=self._asset_store,
                runtime_store=runtime_store,
                artifact_ref=snapshot.source_artifact_ref,
            )

        if runtime_store is not None:
            state = runtime_store.get_task_state(task_id)
            if state is not None:
                status = str(state.get("status") or "processing")
                return self._build_processing_detail(task_id, status)

        return self._build_processing_detail(task_id, "processing")

    async def get_public_result_detail(
        self: "ResultServiceMixin",
        result_id: str,
        *,
        runtime_store: RuntimeStore | None = None,
    ) -> VideoResultDetail:
        """匿名读取已公开的视频结果详情。"""

        task_id = parse_video_result_id(result_id)
        if task_id is None:
            raise AppError(
                code="COMMON_NOT_FOUND",
                message="公开视频不存在",
                status_code=404,
                details={"result_id": result_id},
            )

        detail, _ = load_result_detail(
            self._asset_store,
            task_id,
            runtime_store=runtime_store,
        )
        if (
            detail is None
            or detail.result is None
            or detail.result.result_id != result_id
            or not detail.publish_state.published
        ):
            raise AppError(
                code="COMMON_NOT_FOUND",
                message="公开视频不存在",
                status_code=404,
                details={"result_id": result_id},
            )

        return hydrate_result_detail(
            task_id,
            detail,
            asset_store=self._asset_store,
            runtime_store=runtime_store,
        )

    async def get_preview_detail(
        self: "ResultServiceMixin",
        task_id: str,
        *,
        runtime_store: RuntimeStore | None = None,
        access_context: AccessContext | None = None,
    ) -> VideoTaskPreview:
        """获取视频任务等待页渐进预览数据。"""
        snapshot = await self.get_task(task_id, access_context=access_context)
        if snapshot is None:
            raise AppError(
                code="COMMON_NOT_FOUND",
                message="视频任务不存在",
                status_code=404,
                task_id=task_id,
            )
        if access_context is not None and snapshot.user_id != access_context.user_id:
            raise AppError(
                code="AUTH_PERMISSION_DENIED",
                message="仅任务创建者可查看任务预览",
                status_code=403,
                task_id=task_id,
            )

        if runtime_store is not None:
            runtime = VideoRuntimeStateStore(runtime_store, task_id)
            preview = runtime.load_preview()
            if preview is not None:
                return preview
            state = runtime_store.get_task_state(task_id)
            if state is not None:
                raw_status = str(state.get("status") or "processing")
                preview_status = "processing" if raw_status == "pending" else raw_status
                return build_preview_state(
                    task_id=task_id,
                    status=preview_status,
                    preview_available=False,
                    summary=snapshot.summary,
                    knowledge_points=[],
                    sections=[],
                )

        return build_preview_state(
            task_id=task_id,
            status="processing",
            preview_available=False,
            summary=snapshot.summary,
            knowledge_points=[],
            sections=[],
        )
