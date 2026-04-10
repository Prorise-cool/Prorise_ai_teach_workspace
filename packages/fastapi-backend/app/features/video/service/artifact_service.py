"""VideoService 产物同步方法。

提供 ``sync_artifact_graph`` 等视频产物索引同步能力。
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from app.core.logging import get_logger
from app.core.security import AccessContext
from app.features.video.long_term_records import build_session_artifact_batch_request
from app.features.video.pipeline.models import VideoArtifactGraph

if TYPE_CHECKING:
    from app.shared.ruoyi_auth import RuoYiRequestAuth

logger = get_logger("app.features.video.service")


class ArtifactServiceMixin:
    """混入类：视频产物索引同步。"""

    # --- 由 VideoService 实例提供的属性（运行时绑定） ---
    _asset_store: object  # LocalAssetStore
    _artifact_index_service: object  # VideoArtifactIndexService

    async def sync_artifact_graph(
        self: "ArtifactServiceMixin",
        graph: VideoArtifactGraph,
        *,
        artifact_ref: str,
        access_context: AccessContext | None = None,
        request_auth: "RuoYiRequestAuth | None" = None,
    ):
        """将视频产物图谱同步到远端产物索引服务。

        Args:
            graph: 视频产物图谱。
            artifact_ref: 产物引用标识。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
            request_auth: 可选的显式请求鉴权信息，适用于 worker 等非路由上下文。
        """
        return await self._artifact_index_service.sync_artifact_batch(
            build_session_artifact_batch_request(
                graph,
                object_key=self._asset_store.ref_to_key(artifact_ref),
                payload_ref=artifact_ref,
            ),
            access_context=access_context,
            request_auth=request_auth,
        )
