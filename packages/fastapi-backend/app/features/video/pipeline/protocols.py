"""视频流水线与元数据服务之间的协议接口。

定义 orchestrator 所需的元数据持久化协议，
将流水线编排层与具体服务实现解耦。
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class VideoMetadataPersister(Protocol):
    """流水线编排器所需的元数据持久化协议。

    VideoService 通过结构化子类型自动满足此协议，
    无需显式继承。
    """

    async def sync_artifact_graph(
        self,
        graph: Any,
        *,
        artifact_ref: str,
        access_context: Any = None,
        request_auth: Any = None,
    ) -> Any:
        """同步制品图谱到持久化存储。"""
        ...

    def build_task_request(self, **kwargs: Any) -> Any:
        """构建任务持久化请求对象。"""
        ...

    async def persist_task(
        self,
        request: Any,
        *,
        access_context: Any = None,
        request_auth: Any = None,
    ) -> Any:
        """持久化任务元数据。"""
        ...
