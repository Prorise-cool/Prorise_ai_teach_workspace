"""视频 Context Adapter — 三级降级读取。

按 Redis 运行态 -> 本地 artifact-graph.json -> COS 远端文件优先级
获取当前时间点的上下文，构建 CompanionContext DTO。
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.features.companion.schemas import (
    CompanionContext,
    CompanionContextSource,
    SectionContext,
)
from app.features.video.pipeline.models import VideoArtifactGraph
from app.infra.redis_client import RuntimeStore

logger = logging.getLogger(__name__)

REDIS_CTX_KEY_PREFIX = "xm_video_ctx:"


class VideoContextAdapter:
    """视频上下文适配器，三级降级读取 artifact-graph。"""

    def __init__(
        self,
        *,
        runtime_store: RuntimeStore,
        asset_store: object,
        cos_client: object | None = None,
        metadata_service: object | None = None,
    ) -> None:
        self._runtime_store = runtime_store
        self._asset_store = asset_store
        self._cos_client = cos_client
        self._metadata_service = metadata_service

    async def get_context(
        self,
        task_id: str,
        seconds: int,
    ) -> CompanionContext:
        """获取指定时间点的上下文，三级降级。"""
        # Level 1: Redis 运行态
        graph = self._read_from_redis(task_id)
        source = CompanionContextSource.REDIS

        # Level 2: 本地文件
        if graph is None:
            graph = self._read_from_local(task_id)
            source = CompanionContextSource.LOCAL_FILE

        # Level 3: COS 远端
        if graph is None:
            graph = self._read_from_cos(task_id)
            source = CompanionContextSource.COS

        # 全部失败 — degraded（尝试从 task 元数据获取题目）
        if graph is None:
            topic = await _get_topic_from_metadata(task_id)
            return CompanionContext(task_id=task_id, topic_summary=topic)

        return self._build_context(task_id, graph, seconds, source)

    def _read_from_redis(self, task_id: str) -> VideoArtifactGraph | None:
        """从 Redis 运行态缓存读取 artifact-graph。"""
        try:
            key = f"{REDIS_CTX_KEY_PREFIX}{task_id}"
            raw = self._runtime_store.get_runtime_value(key)
            if raw is None:
                return None
            data = json.loads(raw) if isinstance(raw, str) else raw
            return VideoArtifactGraph.model_validate(data)
        except Exception:
            logger.debug("Redis read failed for task_id=%s", task_id, exc_info=True)
            return None

    def _read_from_local(self, task_id: str) -> VideoArtifactGraph | None:
        """从本地资产路径读取 artifact-graph.json。"""
        try:
            from app.features.video.service._helpers import build_artifact_graph_ref

            ref = build_artifact_graph_ref(self._asset_store, task_id)
            if not self._asset_store.exists(ref):
                return None
            data = self._asset_store.read_json(ref)
            return VideoArtifactGraph.model_validate(data)
        except Exception:
            logger.debug("Local read failed for task_id=%s", task_id, exc_info=True)
            return None

    def _read_from_cos(self, task_id: str) -> VideoArtifactGraph | None:
        """从 COS 远端下载 artifact-graph.json。"""
        if self._cos_client is None:
            return None
        try:
            key = f"video/{task_id}/artifact-graph.json"
            data = self._cos_client.download_json(key)
            if data is None:
                return None
            return VideoArtifactGraph.model_validate(data)
        except Exception:
            logger.debug("COS read failed for task_id=%s", task_id, exc_info=True)
            return None

    def _build_context(
        self,
        task_id: str,
        graph: VideoArtifactGraph,
        seconds: int,
        source: CompanionContextSource,
    ) -> CompanionContext:
        """从 artifact-graph 构建 CompanionContext。"""
        from app.features.video.service._helpers import (
            _narration_entry_map,
            _timeline_entry_map,
        )

        timeline_map = _timeline_entry_map(graph)
        narration_map = _narration_entry_map(graph)

        seen: dict[str, None] = {}
        for sid in list(timeline_map.keys()) + list(narration_map.keys()):
            if sid:
                seen[sid] = None
        all_section_ids = list(seen.keys())
        current_section = self._find_current_section(
            seconds, all_section_ids, timeline_map,
        )

        # 构建知识点、摘要、解题步骤
        knowledge_points: list[str] = []
        topic_summary = ""
        solution_steps: list[dict[str, object]] = []
        for artifact in graph.artifacts:
            atype = artifact.artifact_type.value if hasattr(artifact.artifact_type, "value") else str(artifact.artifact_type)
            if atype == "knowledge_points":
                knowledge_points = list(artifact.data.get("items", []))
            elif atype == "storyboard":
                topic_summary = str(artifact.data.get("topic_summary", ""))
            elif atype == "solution_steps":
                solution_steps = list(artifact.data.get("steps", []))

        adjacent = self._build_adjacent_sections(
            current_section, all_section_ids, timeline_map, narration_map,
        )

        current_ctx: SectionContext | None = None
        if current_section is not None:
            narr = narration_map.get(current_section, {})
            tl = timeline_map.get(current_section, {})
            current_ctx = SectionContext(
                section_id=current_section,
                title=str(tl.get("title", "")),
                narration_text=str(narr.get("text", "")),
                start_time=_coerce_int(tl.get("startTime")),
                end_time=_coerce_int(tl.get("endTime")),
            )

        return CompanionContext(
            task_id=task_id,
            current_section=current_ctx,
            adjacent_sections=adjacent,
            knowledge_points=knowledge_points,
            solution_steps=solution_steps,
            topic_summary=topic_summary,
            context_source_hit=source,
        )

    def _find_current_section(
        self,
        seconds: int,
        section_ids: list[str],
        timeline_map: dict[str, Any],
    ) -> str | None:
        """查找当前秒数对应的 section ID。"""
        for sid in section_ids:
            entry = timeline_map.get(sid, {})
            start = _coerce_int(entry.get("startTime"))
            end = _coerce_int(entry.get("endTime"))
            if start is not None and end is not None and start <= seconds < end:
                return sid
        return section_ids[0] if section_ids else None

    def _build_adjacent_sections(
        self,
        current_id: str | None,
        all_ids: list[str],
        timeline_map: dict[str, Any],
        narration_map: dict[str, Any],
    ) -> list[SectionContext]:
        """构建相邻 section 的摘要（前后各 1 段）。"""
        if not current_id or current_id not in all_ids:
            return []
        idx = all_ids.index(current_id)
        adjacent_ids: list[str] = []
        if idx > 0:
            adjacent_ids.append(all_ids[idx - 1])
        if idx < len(all_ids) - 1:
            adjacent_ids.append(all_ids[idx + 1])

        result: list[SectionContext] = []
        for aid in adjacent_ids:
            tl = timeline_map.get(aid, {})
            narr = narration_map.get(aid, {})
            result.append(SectionContext(
                section_id=aid,
                title=str(tl.get("title", "")),
                narration_text=str(narr.get("text", ""))[:100],
                start_time=_coerce_int(tl.get("startTime")),
                end_time=_coerce_int(tl.get("endTime")),
            ))
        return result


async def _get_topic_from_metadata(task_id: str) -> str:
    """从 task 元数据获取题目/主题文本（降级时使用）。"""
    try:
        from app.shared.task.metadata import TaskMetadataStore

        store = TaskMetadataStore()
        snapshot = store.get_task(task_id)
        if snapshot is not None:
            return getattr(snapshot, "summary", "") or ""
    except Exception:
        logger.debug("Metadata fallback failed for task_id=%s", task_id, exc_info=True)
    return ""


def _coerce_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return None
