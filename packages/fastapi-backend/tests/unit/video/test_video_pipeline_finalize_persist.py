"""Story 6.7: 管道 finalize 持久化修复 — 单元测试。

验证 _run_finalize 正确调用 persist_result_detail、
构建 artifact-graph 并同步到 RuoYi 产物索引，
且持久化失败不阻塞管道完成。
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.features.video.pipeline.models import (
    ArtifactType,
    VideoArtifactGraph,
    VideoResultDetail,
    VideoResult,
    VideoStage,
)


def _make_detail(**overrides: Any) -> VideoResultDetail:
    defaults: dict[str, Any] = {
        "task_id": "test-task-001",
        "status": "completed",
        "result": VideoResult(
            task_id="test-task-001",
            video_url="http://localhost/video.webm",
            cover_url="http://localhost/cover.jpg",
            duration=60,
            summary="测试摘要",
            knowledge_points=["知识点1"],
            result_id="res-test-task-001",
            completed_at="2026-04-19T00:00:00Z",
            title="测试",
            provider_used={"llm": "test"},
            task_elapsed_seconds=100,
            render_summary={
                "totalSections": 2,
                "successfulSections": 2,
                "incompleteSections": 0,
                "requiredSuccesses": 1,
                "allSectionsRendered": True,
                "completionMode": "full",
                "stopReason": None,
                "successfulSectionIds": ["s1", "s2"],
            },
        ),
    }
    defaults.update(overrides)
    return VideoResultDetail(**defaults)


def _make_preview_state() -> Any:
    preview = MagicMock()
    preview.summary = "这是主题摘要"
    preview.knowledge_points = ["知识点A", "知识点B"]
    preview.sections = []
    return preview


def _make_agent_setup() -> Any:
    section1 = MagicMock()
    section1.id = "s1"
    section1.title = "第一段"
    section1.lecture_lines = ["这是第一段旁白"]
    section1.start_time = 0
    section1.end_time = 30

    section2 = MagicMock()
    section2.id = "s2"
    section2.title = "第二段"
    section2.lecture_lines = ["这是第二段旁白", "第二行"]
    section2.start_time = 30
    section2.end_time = 60

    agent = MagicMock()
    agent.sections = [section1, section2]
    agent.outline = None

    setup = MagicMock()
    setup.agent = agent
    setup.assembly = MagicMock()
    setup.assembly.provider_summary.return_value = "test-provider"
    return setup


class TestBuildArtifactGraph:
    """验证 _build_artifact_graph 正确构建产物图谱。"""

    def test_builds_timeline_from_sections(self) -> None:
        from app.features.video.pipeline.orchestration.orchestrator import (
            VideoPipelineService,
        )

        svc = VideoPipelineService.__new__(VideoPipelineService)
        setup = _make_agent_setup()
        graph = svc._build_artifact_graph(
            task_id="t1",
            preview_state=_make_preview_state(),
            setup=setup,
            render=MagicMock(),
        )
        assert isinstance(graph, VideoArtifactGraph)
        assert graph.session_id == "t1"

        timeline = next(
            (a for a in graph.artifacts if a.artifact_type == ArtifactType.TIMELINE), None,
        )
        assert timeline is not None
        assert len(timeline.data["scenes"]) == 2
        assert timeline.data["scenes"][0]["sceneId"] == "s1"

    def test_builds_narration_from_lecture_lines(self) -> None:
        from app.features.video.pipeline.orchestration.orchestrator import (
            VideoPipelineService,
        )

        svc = VideoPipelineService.__new__(VideoPipelineService)
        setup = _make_agent_setup()
        graph = svc._build_artifact_graph(
            task_id="t1",
            preview_state=_make_preview_state(),
            setup=setup,
            render=MagicMock(),
        )
        narration = next(
            (a for a in graph.artifacts if a.artifact_type == ArtifactType.NARRATION), None,
        )
        assert narration is not None
        assert narration.data["segments"][1]["text"] == "这是第二段旁白。第二行"

    def test_builds_knowledge_points(self) -> None:
        from app.features.video.pipeline.orchestration.orchestrator import (
            VideoPipelineService,
        )

        svc = VideoPipelineService.__new__(VideoPipelineService)
        graph = svc._build_artifact_graph(
            task_id="t1",
            preview_state=_make_preview_state(),
            setup=_make_agent_setup(),
            render=MagicMock(),
        )
        kp = next(
            (a for a in graph.artifacts if a.artifact_type == ArtifactType.KNOWLEDGE_POINTS), None,
        )
        assert kp is not None
        assert "知识点A" in kp.data["items"]

    def test_builds_topic_summary(self) -> None:
        from app.features.video.pipeline.orchestration.orchestrator import (
            VideoPipelineService,
        )

        svc = VideoPipelineService.__new__(VideoPipelineService)
        graph = svc._build_artifact_graph(
            task_id="t1",
            preview_state=_make_preview_state(),
            setup=_make_agent_setup(),
            render=MagicMock(),
        )
        sb = next(
            (a for a in graph.artifacts if a.artifact_type == ArtifactType.STORYBOARD), None,
        )
        assert sb is not None
        assert sb.data["topic_summary"] == "这是主题摘要"

    def test_empty_sections_produces_minimal_graph(self) -> None:
        from app.features.video.pipeline.orchestration.orchestrator import (
            VideoPipelineService,
        )

        svc = VideoPipelineService.__new__(VideoPipelineService)
        setup = _make_agent_setup()
        setup.agent.sections = []
        graph = svc._build_artifact_graph(
            task_id="t2",
            preview_state=_make_preview_state(),
            setup=setup,
            render=MagicMock(),
        )
        assert graph.session_id == "t2"
        timeline_types = {a.artifact_type for a in graph.artifacts}
        assert ArtifactType.TIMELINE not in timeline_types


class TestPersistPipelineArtifacts:
    """验证 _persist_pipeline_artifacts 的持久化行为。"""

    @pytest.mark.asyncio
    async def test_persist_writes_result_detail(self, tmp_path: Path) -> None:
        from app.features.video.pipeline.orchestration.orchestrator import (
            VideoPipelineService,
        )

        svc = VideoPipelineService.__new__(VideoPipelineService)

        # 准备 asset_store mock
        asset_store = MagicMock()
        asset_store.ref_to_key.return_value = "video/t1/result-detail.json"
        asset_store.write_json.return_value = MagicMock(public_url="http://localhost/video/t1/result-detail.json")

        runtime = MagicMock()
        detail = _make_detail()

        with patch(
            "app.features.video.service._helpers.persist_result_detail",
            return_value=(detail, "http://localhost/video/t1/result-detail.json"),
        ) as mock_persist, patch(
            "app.features.video.service._helpers.build_artifact_graph_ref",
            return_value="http://localhost/video/t1/artifact-graph.json",
        ):
            await svc._persist_pipeline_artifacts(
                asset_store=asset_store,
                task=MagicMock(),
                ctx=MagicMock(task_id="t1"),
                setup=_make_agent_setup(),
                render=MagicMock(),
                preview_state=_make_preview_state(),
                detail=detail,
                runtime=runtime,
            )
            mock_persist.assert_called_once()

    @pytest.mark.asyncio
    async def test_persist_failure_sets_flag(self) -> None:
        from app.features.video.pipeline.orchestration.orchestrator import (
            VideoPipelineService,
        )

        svc = VideoPipelineService.__new__(VideoPipelineService)

        asset_store = MagicMock()
        runtime = MagicMock()
        detail = _make_detail()

        with patch(
            "app.features.video.service._helpers.persist_result_detail",
            side_effect=OSError("disk full"),
        ), patch(
            "app.features.video.service._helpers.build_artifact_graph_ref",
            return_value="http://localhost/video/t1/artifact-graph.json",
        ):
            await svc._persist_pipeline_artifacts(
                asset_store=asset_store,
                task=MagicMock(),
                ctx=MagicMock(task_id="t1"),
                setup=_make_agent_setup(),
                render=MagicMock(),
                preview_state=_make_preview_state(),
                detail=detail,
                runtime=runtime,
            )
            # 检查 artifact_writeback_failed 被设为 True
            last_call_args = runtime.save_model.call_args_list
            assert any(
                "artifact_writeback_failed" in str(c)
                for c in last_call_args
            )

    @pytest.mark.asyncio
    async def test_sync_failure_sets_long_term_flag(self) -> None:
        from app.features.video.pipeline.orchestration.orchestrator import (
            VideoPipelineService,
        )

        svc = VideoPipelineService.__new__(VideoPipelineService)
        svc._metadata_service = MagicMock()
        svc._metadata_service.sync_artifact_graph = AsyncMock(
            side_effect=RuntimeError("RuoYi down"),
        )

        asset_store = MagicMock()
        asset_store.ref_to_key.return_value = "video/t1/artifact-graph.json"
        asset_store.write_json.return_value = MagicMock()

        runtime = MagicMock()
        detail = _make_detail()

        with patch(
            "app.features.video.service._helpers.persist_result_detail",
            return_value=(detail, "http://localhost/video/t1/result-detail.json"),
        ), patch(
            "app.features.video.service._helpers.build_artifact_graph_ref",
            return_value="http://localhost/video/t1/artifact-graph.json",
        ):
            await svc._persist_pipeline_artifacts(
                asset_store=asset_store,
                task=MagicMock(),
                ctx=MagicMock(task_id="t1"),
                setup=_make_agent_setup(),
                render=MagicMock(),
                preview_state=_make_preview_state(),
                detail=detail,
                runtime=runtime,
            )
            # 检查 long_term_writeback_failed 被设为 True
            last_calls = runtime.save_model.call_args_list
            assert any(
                "long_term_writeback_failed" in str(c)
                for c in last_calls
            )
