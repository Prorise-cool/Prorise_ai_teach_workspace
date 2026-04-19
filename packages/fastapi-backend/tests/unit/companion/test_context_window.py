"""Story 6.5: 连续追问与 Redis 上下文窗口 — 单元测试。"""

from __future__ import annotations

import json
from unittest.mock import MagicMock

import pytest

from app.features.companion.context_window import (
    CONTEXT_KEY_PREFIX,
    CONTEXT_TTL_SECONDS,
    MAX_ROUNDS,
    RECENT_ROUNDS_TO_KEEP,
    ContextWindow,
)


def _make_store(data: dict | None = None) -> MagicMock:
    store = MagicMock()
    if data is not None:
        store.get_runtime_value.return_value = json.dumps(data)
    else:
        store.get_runtime_value.return_value = None
    return store


class TestContextWindow:
    """验证上下文窗口的 CRUD 与裁剪行为。"""

    def test_load_returns_none_when_empty(self) -> None:
        cw = ContextWindow(_make_store())
        assert cw.load("sess-001") is None

    def test_save_and_load_roundtrip(self) -> None:
        store = _make_store()
        cw = ContextWindow(store)
        window = {"session_id": "s1", "turns": [], "current_anchor_ref": "t@0"}
        cw.save("s1", window)
        store.set_runtime_value.assert_called_once()
        store.set_ttl.assert_called_once_with(
            f"{CONTEXT_KEY_PREFIX}s1", CONTEXT_TTL_SECONDS,
        )

    def test_append_first_turn(self) -> None:
        store = _make_store()
        cw = ContextWindow(store)
        result = cw.append_turn(
            "s1",
            turn_id="t1",
            question_text="问题1",
            answer_summary="回答1",
            anchor_ref="task@65",
        )
        assert len(result["turns"]) == 1
        assert result["turns"][0]["turn_id"] == "t1"
        assert result["current_anchor_ref"] == "task@65"

    def test_append_multiple_turns(self) -> None:
        existing = {
            "session_id": "s1",
            "turns": [{"turn_id": "t1", "question": "Q1", "answer_summary": "A1", "anchor_ref": "task@65"}],
            "current_anchor_ref": "task@65",
        }
        store = _make_store(existing)
        cw = ContextWindow(store)
        result = cw.append_turn(
            "s1",
            turn_id="t2",
            question_text="问题2",
            answer_summary="回答2",
            anchor_ref="task@65",
        )
        assert len(result["turns"]) == 2

    def test_window_truncation(self) -> None:
        turns = [
            {"turn_id": f"t{i}", "question": f"Q{i}", "answer_summary": f"A{i}", "anchor_ref": "task@0"}
            for i in range(MAX_ROUNDS + 5)
        ]
        existing = {"session_id": "s1", "turns": turns, "current_anchor_ref": "task@0"}
        store = _make_store(existing)
        cw = ContextWindow(store)
        result = cw.append_turn(
            "s1",
            turn_id="t_new",
            question_text="新问题",
            answer_summary="新回答",
            anchor_ref="task@0",
        )
        assert len(result["turns"]) == RECENT_ROUNDS_TO_KEEP

    def test_update_anchor_preserves_history(self) -> None:
        existing = {
            "session_id": "s1",
            "turns": [{"turn_id": "t1", "question": "Q1", "answer_summary": "A1", "anchor_ref": "task@0"}],
            "current_anchor_ref": "task@0",
        }
        store = _make_store(existing)
        cw = ContextWindow(store)
        cw.update_anchor("s1", "task@120")
        saved = json.loads(store.set_runtime_value.call_args[0][1])
        assert saved["current_anchor_ref"] == "task@120"
        assert len(saved["turns"]) == 1  # 历史保留


class TestPromptContext:
    """验证 LLM prompt 上下文构建。"""

    def test_empty_window_returns_empty(self) -> None:
        cw = ContextWindow(_make_store())
        assert cw.build_prompt_context("s1") == []

    def test_builds_alternating_roles(self) -> None:
        existing = {
            "session_id": "s1",
            "turns": [
                {"turn_id": "t1", "question": "Q1", "answer_summary": "A1", "anchor_ref": "task@0"},
                {"turn_id": "t2", "question": "Q2", "answer_summary": "A2", "anchor_ref": "task@0"},
            ],
            "current_anchor_ref": "task@0",
        }
        cw = ContextWindow(_make_store(existing))
        ctx = cw.build_prompt_context("s1")
        assert len(ctx) == 2
        assert ctx[0]["role"] == "user"
        assert ctx[0]["content"] == "Q1"
        assert ctx[1]["role"] == "assistant"
        assert ctx[1]["content"] == "A2"
