"""Story 6.1: Companion 契约与 mock 数据基线 — 单元测试。

验证 Ask API schema、CompanionContextSource 枚举、
CompanionContext DTO 和 mock 数据合规性。
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.features.companion.schemas import (
    AskRequest,
    AskResponse,
    CompanionContext,
    CompanionContextSource,
    SectionContext,
)
from app.shared.long_term.models import (
    AnchorContext,
    AnchorKind,
    ContextType,
    PersistenceStatus,
)


def _video_anchor(seconds: int = 65, task_id: str = "task-abc") -> AnchorContext:
    return AnchorContext(
        context_type=ContextType.VIDEO,
        anchor_kind=AnchorKind.VIDEO_TIMESTAMP,
        anchor_ref=f"{task_id}@{seconds}",
    )


class TestCompanionContextSource:
    """验证三级降级枚举。"""

    def test_all_sources_defined(self) -> None:
        assert CompanionContextSource.REDIS == "redis"
        assert CompanionContextSource.LOCAL_FILE == "local_file"
        assert CompanionContextSource.COS == "cos"
        assert CompanionContextSource.DEGRADED == "degraded"


class TestAskRequest:
    """验证 Ask API 请求模型。"""

    def test_minimal_request(self) -> None:
        req = AskRequest(
            session_id="sess-001",
            anchor=_video_anchor(),
            question_text="这一步是怎么推导的？",
        )
        assert req.session_id == "sess-001"
        assert req.parent_turn_id is None
        assert req.anchor.anchor_kind == AnchorKind.VIDEO_TIMESTAMP

    def test_follow_up_request(self) -> None:
        req = AskRequest(
            session_id="sess-001",
            anchor=_video_anchor(),
            question_text="继续解释",
            parent_turn_id="turn-001",
        )
        assert req.parent_turn_id == "turn-001"


class TestAskResponse:
    """验证 Ask API 响应模型。"""

    def test_success_response(self) -> None:
        resp = AskResponse(
            turn_id="turn-001",
            answer_text="解释文本",
            anchor=_video_anchor(),
            persistence_status=PersistenceStatus.COMPLETE_SUCCESS,
            context_source_hit=CompanionContextSource.REDIS,
        )
        assert resp.turn_id == "turn-001"
        assert resp.whiteboard_actions == []

    def test_degraded_response(self) -> None:
        resp = AskResponse(
            turn_id="turn-002",
            answer_text="暂时无法获取上下文",
            anchor=_video_anchor(),
            persistence_status=PersistenceStatus.OVERALL_FAILURE,
            context_source_hit=CompanionContextSource.DEGRADED,
        )
        assert resp.context_source_hit == CompanionContextSource.DEGRADED

    def test_whiteboard_degraded(self) -> None:
        resp = AskResponse(
            turn_id="turn-003",
            answer_text="分步说明",
            anchor=_video_anchor(),
            persistence_status=PersistenceStatus.WHITEBOARD_DEGRADED,
            context_source_hit=CompanionContextSource.COS,
        )
        assert resp.persistence_status == PersistenceStatus.WHITEBOARD_DEGRADED


class TestCompanionContext:
    """验证 CompanionContext DTO。"""

    def test_full_context(self) -> None:
        ctx = CompanionContext(
            task_id="t1",
            current_section=SectionContext(
                section_id="s1",
                title="第一段",
                narration_text="这是旁白",
                start_time=0,
                end_time=30,
            ),
            adjacent_sections=[
                SectionContext(section_id="s0", title="前一段"),
                SectionContext(section_id="s2", title="后一段"),
            ],
            knowledge_points=["知识点A"],
            solution_steps=[{"title": "步骤1", "explanation": "说明"}],
            topic_summary="主题摘要",
            context_source_hit=CompanionContextSource.REDIS,
        )
        assert ctx.current_section is not None
        assert ctx.current_section.section_id == "s1"
        assert len(ctx.adjacent_sections) == 2

    def test_degraded_context(self) -> None:
        ctx = CompanionContext(task_id="t1")
        assert ctx.current_section is None
        assert ctx.context_source_hit == CompanionContextSource.DEGRADED


class TestMockDataCompliance:
    """验证 mock 数据文件与 schema 合规。"""

    @pytest.fixture
    def mock_scenarios(self) -> list[dict]:
        mock_path = (
            Path(__file__).parent.parent.parent.parent.parent.parent
            / "mocks" / "companion" / "v1" / "fixtures" / "ask-scenarios.json"
        )
        return json.loads(mock_path.read_text(encoding="utf-8"))

    def test_all_5_scenarios_present(self, mock_scenarios: list[dict]) -> None:
        assert len(mock_scenarios) == 5
        scenario_names = {s["scenario"] for s in mock_scenarios}
        assert scenario_names == {
            "first_ask", "follow_up", "whiteboard_success",
            "whiteboard_degraded", "no_context_degraded",
        }

    def test_each_request_valid(self, mock_scenarios: list[dict]) -> None:
        for scenario in mock_scenarios:
            AskRequest.model_validate(scenario["request"])

    def test_each_response_valid(self, mock_scenarios: list[dict]) -> None:
        for scenario in mock_scenarios:
            AskResponse.model_validate(scenario["response"])
