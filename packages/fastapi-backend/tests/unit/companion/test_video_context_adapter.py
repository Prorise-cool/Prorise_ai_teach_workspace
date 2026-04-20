"""Story 6.3: 视频 Context Adapter 三级降级 — 单元测试。"""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from app.features.companion.context_adapter.video_adapter import VideoContextAdapter
from app.features.companion.schemas import CompanionContextSource
from app.features.video.pipeline.models import (
    ArtifactPayload,
    ArtifactType,
    VideoArtifactGraph,
)


def _sample_graph() -> VideoArtifactGraph:
    return VideoArtifactGraph(
        session_id="task-001",
        artifacts=[
            ArtifactPayload(
                artifact_type=ArtifactType.TIMELINE,
                data={
                    "scenes": [
                        {"sceneId": "s1", "title": "第一段", "startTime": 0, "endTime": 30},
                        {"sceneId": "s2", "title": "第二段", "startTime": 30, "endTime": 60},
                        {"sceneId": "s3", "title": "第三段", "startTime": 60, "endTime": 90},
                    ],
                },
            ),
            ArtifactPayload(
                artifact_type=ArtifactType.NARRATION,
                data={
                    "segments": [
                        {"sceneId": "s1", "text": "第一段旁白"},
                        {"sceneId": "s2", "text": "第二段旁白"},
                        {"sceneId": "s3", "text": "第三段旁白"},
                    ],
                },
            ),
            ArtifactPayload(
                artifact_type=ArtifactType.KNOWLEDGE_POINTS,
                data={"items": ["知识点A", "知识点B"]},
            ),
            ArtifactPayload(
                artifact_type=ArtifactType.SOLUTION_STEPS,
                data={"steps": [{"title": "步骤1", "explanation": "说明1"}]},
            ),
            ArtifactPayload(
                artifact_type=ArtifactType.STORYBOARD,
                data={"topic_summary": "这是主题摘要"},
            ),
        ],
    )


def _make_adapter(
    *,
    redis_data: dict | None = None,
    local_exists: bool = False,
    local_data: dict | None = None,
    cos_data: dict | None = None,
) -> VideoContextAdapter:
    runtime_store = MagicMock()
    if redis_data is not None:
        runtime_store.get_runtime_value.return_value = json.dumps(redis_data)
    else:
        runtime_store.get_runtime_value.return_value = None

    asset_store = MagicMock()
    asset_store.exists.return_value = local_exists
    if local_data is not None:
        asset_store.read_json.return_value = local_data
    graph_data = _sample_graph().model_dump(mode="json")
    asset_store.read_json.return_value = graph_data if local_exists else {}

    cos_client = MagicMock()
    if cos_data is not None:
        cos_client.download_json.return_value = cos_data
    else:
        cos_client.download_json.return_value = None

    return VideoContextAdapter(
        runtime_store=runtime_store,
        asset_store=asset_store,
        cos_client=cos_client,
    )


class TestThreeTierFallback:
    """验证三级降级读取行为。"""

    @pytest.mark.asyncio
    async def test_redis_hit_skips_local_and_cos(self) -> None:
        graph = _sample_graph()
        adapter = _make_adapter(redis_data=graph.model_dump(mode="json"))
        ctx = await adapter.get_context("task-001", seconds=15)

        assert ctx.context_source_hit == CompanionContextSource.REDIS
        assert ctx.current_section is not None
        assert ctx.current_section.section_id == "s1"
        adapter._cos_client.download_json.assert_not_called()

    @pytest.mark.asyncio
    async def test_local_hit_when_redis_miss(self) -> None:
        adapter = _make_adapter(local_exists=True, local_data=_sample_graph().model_dump(mode="json"))
        with patch(
            "app.features.companion.context_adapter.video_adapter.VideoContextAdapter._read_from_redis",
            return_value=None,
        ):
            ctx = await adapter.get_context("task-001", seconds=15)

        assert ctx.context_source_hit == CompanionContextSource.LOCAL_FILE

    @pytest.mark.asyncio
    async def test_cos_hit_when_redis_and_local_miss(self) -> None:
        adapter = _make_adapter(cos_data=_sample_graph().model_dump(mode="json"))
        with patch(
            "app.features.companion.context_adapter.video_adapter.VideoContextAdapter._read_from_redis",
            return_value=None,
        ), patch(
            "app.features.companion.context_adapter.video_adapter.VideoContextAdapter._read_from_local",
            return_value=None,
        ):
            ctx = await adapter.get_context("task-001", seconds=15)

        assert ctx.context_source_hit == CompanionContextSource.COS

    @pytest.mark.asyncio
    async def test_degraded_when_all_miss(self) -> None:
        adapter = _make_adapter()
        ctx = await adapter.get_context("task-001", seconds=15)

        assert ctx.context_source_hit == CompanionContextSource.DEGRADED
        assert ctx.current_section is None
        assert ctx.task_id == "task-001"


class TestContextBuilding:
    """验证 CompanionContext 构建正确性。"""

    @pytest.mark.asyncio
    async def test_finds_correct_section_by_time(self) -> None:
        graph = _sample_graph()
        adapter = _make_adapter(redis_data=graph.model_dump(mode="json"))
        ctx = await adapter.get_context("task-001", seconds=45)

        assert ctx.current_section is not None
        assert ctx.current_section.section_id == "s2"
        assert ctx.current_section.title == "第二段"

    @pytest.mark.asyncio
    async def test_builds_adjacent_sections(self) -> None:
        graph = _sample_graph()
        adapter = _make_adapter(redis_data=graph.model_dump(mode="json"))
        ctx = await adapter.get_context("task-001", seconds=45)

        assert len(ctx.adjacent_sections) == 2
        ids = [s.section_id for s in ctx.adjacent_sections]
        assert "s1" in ids
        assert "s3" in ids

    @pytest.mark.asyncio
    async def test_extracts_knowledge_points(self) -> None:
        graph = _sample_graph()
        adapter = _make_adapter(redis_data=graph.model_dump(mode="json"))
        ctx = await adapter.get_context("task-001", seconds=10)

        assert "知识点A" in ctx.knowledge_points
        assert "知识点B" in ctx.knowledge_points

    @pytest.mark.asyncio
    async def test_extracts_topic_summary(self) -> None:
        graph = _sample_graph()
        adapter = _make_adapter(redis_data=graph.model_dump(mode="json"))
        ctx = await adapter.get_context("task-001", seconds=10)

        assert ctx.topic_summary == "这是主题摘要"

    @pytest.mark.asyncio
    async def test_extracts_solution_steps(self) -> None:
        graph = _sample_graph()
        adapter = _make_adapter(redis_data=graph.model_dump(mode="json"))
        ctx = await adapter.get_context("task-001", seconds=10)

        assert len(ctx.solution_steps) == 1
        assert ctx.solution_steps[0]["title"] == "步骤1"
