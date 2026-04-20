"""Story 6.4: Ask API 与 LLM 回答生成 — 单元测试。"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, PropertyMock, patch

import pytest

from app.features.companion.schemas import (
    AskRequest,
    CompanionContext,
    CompanionContextSource,
    SectionContext,
)
from app.features.companion.service import CompanionAskService
from app.shared.long_term.models import (
    AnchorContext,
    AnchorKind,
    ContextType,
    PersistenceStatus,
)


def _video_anchor(seconds: int = 65) -> AnchorContext:
    return AnchorContext(
        context_type=ContextType.VIDEO,
        anchor_kind=AnchorKind.VIDEO_TIMESTAMP,
        anchor_ref=f"task-abc@{seconds}",
    )


def _make_request(**overrides) -> AskRequest:
    defaults = {
        "session_id": "sess-001",
        "anchor": _video_anchor(),
        "question_text": "这一步是怎么推导的？",
    }
    defaults.update(overrides)
    return AskRequest(**defaults)


def _mock_provider_factory(answer: str = "这是基于上下文的回答。"):
    factory = MagicMock()
    result = MagicMock()
    result.content = answer
    failover = MagicMock()
    failover.generate = AsyncMock(return_value=result)
    factory.create_failover_service = MagicMock(return_value=failover)
    return factory


def _mock_runtime_config(llm: tuple | None = None):
    config = MagicMock()
    config.llm = llm or (MagicMock(),)
    config.context_ttl_seconds = 86400
    config.max_rounds = 10
    config.recent_rounds_to_keep = 3
    return config


class TestParseAnchor:
    """验证 anchor_ref 解析。"""

    def test_standard_format(self) -> None:
        tid, sec = CompanionAskService._parse_anchor("task-abc@65")
        assert tid == "task-abc"
        assert sec == 65

    def test_no_seconds(self) -> None:
        tid, sec = CompanionAskService._parse_anchor("task-abc")
        assert tid == "task-abc"
        assert sec == 0

    def test_invalid_seconds(self) -> None:
        tid, sec = CompanionAskService._parse_anchor("task-abc@invalid")
        assert tid == "task-abc"
        assert sec == 0


class TestAskFlow:
    """验证 Ask API 完整流程。"""

    @pytest.mark.asyncio
    async def test_successful_ask(self) -> None:
        mock_companion_service = MagicMock()
        mock_companion_service.persist_turn = AsyncMock()

        svc = CompanionAskService(
            companion_service_factory=lambda: mock_companion_service,
            provider_factory=_mock_provider_factory("函数代入法的核心步骤是替换变量。"),
        )
        svc._runtime_config = _mock_runtime_config()

        ctx = CompanionContext(
            task_id="task-abc",
            current_section=SectionContext(
                section_id="s1", title="函数代入",
                narration_text="代入过程说明",
            ),
            topic_summary="关于函数代入法",
            context_source_hit=CompanionContextSource.REDIS,
        )

        with patch.object(svc, "_get_context", return_value=ctx):
            resp = await svc.ask(_make_request())

        assert resp.turn_id
        assert "函数代入法的核心步骤是替换变量" in resp.answer_text
        assert resp.persistence_status == PersistenceStatus.COMPLETE_SUCCESS
        assert resp.context_source_hit == CompanionContextSource.REDIS
        mock_companion_service.persist_turn.assert_called_once()

    @pytest.mark.asyncio
    async def test_degraded_context(self) -> None:
        mock_companion_service = MagicMock()
        mock_companion_service.persist_turn = AsyncMock()

        svc = CompanionAskService(
            companion_service_factory=lambda: mock_companion_service,
            provider_factory=_mock_provider_factory("根据视频内容分析。"),
        )
        svc._runtime_config = _mock_runtime_config()

        ctx = CompanionContext(task_id="task-abc")
        with patch.object(svc, "_get_context", return_value=ctx):
            resp = await svc.ask(_make_request())

        assert resp.context_source_hit == CompanionContextSource.DEGRADED
        assert resp.answer_text

    @pytest.mark.asyncio
    async def test_llm_failure_returns_graceful_response(self) -> None:
        mock_companion_service = MagicMock()
        mock_companion_service.persist_turn = AsyncMock()

        svc = CompanionAskService(
            companion_service_factory=lambda: mock_companion_service,
            provider_factory=_mock_provider_factory(),
        )
        svc._runtime_config = _mock_runtime_config()

        ctx = CompanionContext(
            task_id="task-abc",
            topic_summary="测试",
            context_source_hit=CompanionContextSource.REDIS,
        )

        with patch.object(svc, "_get_context", return_value=ctx), \
             patch.object(svc, "_generate_answer", side_effect=RuntimeError("LLM down")):
            resp = await svc.ask(_make_request())

        assert resp.persistence_status == PersistenceStatus.OVERALL_FAILURE
        assert "暂时无法" in resp.answer_text

    @pytest.mark.asyncio
    async def test_persist_failure_does_not_block_response(self) -> None:
        mock_companion_service = MagicMock()
        mock_companion_service.persist_turn = AsyncMock(side_effect=RuntimeError("DB down"))

        svc = CompanionAskService(
            companion_service_factory=lambda: mock_companion_service,
            provider_factory=_mock_provider_factory("回答内容"),
        )
        svc._runtime_config = _mock_runtime_config()

        ctx = CompanionContext(
            task_id="task-abc",
            topic_summary="测试",
            context_source_hit=CompanionContextSource.REDIS,
        )

        with patch.object(svc, "_get_context", return_value=ctx):
            resp = await svc.ask(_make_request())

        assert resp.turn_id
