"""视频任务业务服务模块。

提供 ``VideoService``——视频功能域的核心服务类，承载视频任务元数据的
CRUD、结果详情查询、公开发布/取消发布、已发布列表聚合、产物索引同步等业务逻辑。

子模块:
- ``base_service``: 初始化与构建方法
- ``result_service``: 结果查询
- ``publication_service``: 发布管理
- ``artifact_service``: 产物同步
"""
from __future__ import annotations

from app.features.video.service.base_service import BaseServiceMixin
from app.features.video.service.publication_service import PublicationServiceMixin
from app.features.video.service.result_service import ResultServiceMixin
from app.features.video.service.artifact_service import ArtifactServiceMixin


class VideoService(BaseServiceMixin, ResultServiceMixin, PublicationServiceMixin, ArtifactServiceMixin):
    """视频任务业务服务。

    继承 ``BaseTaskMetadataService``，扩展视频特有的结果详情、公开发布、
    产物索引等业务能力。与 ``VideoPublicationService``、``VideoArtifactIndexService``、
    ``LocalAssetStore`` 协作完成完整的视频结果生命周期管理。
    """

    pass


__all__ = ["VideoService"]
