"""LongTermConversationRepository.save_whiteboard_actions 单测（Wave 1.5）。

覆盖：
- 批量写入非空 actions → 返回 snapshots + 默认 COMPLETE_SUCCESS；
- 自动生成 turn_id（未显式传入时）；
- 显式 turn_id 被保留；
- 空 list 短路返回；
- 写入后可通过 replay_session 聚合找到。
"""

from __future__ import annotations

from app.shared.long_term.models import (
    AnchorContext,
    AnchorKind,
    ContextType,
    PersistenceStatus,
    WhiteboardActionRecord,
)
from app.shared.long_term.repository import LongTermConversationRepository


def _anchor(ref: str = "task-1:scene_0") -> AnchorContext:
    return AnchorContext(
        context_type=ContextType.CLASSROOM,
        anchor_kind=AnchorKind.WHITEBOARD_STEP_ID,
        anchor_ref=ref,
    )


def test_save_whiteboard_actions_persists_and_returns_snapshots() -> None:
    repo = LongTermConversationRepository()
    records = [
        WhiteboardActionRecord(action_type="wb_draw_rect", payload={"x": 0}),
        WhiteboardActionRecord(action_type="wb_draw_text", payload={"text": "hi"}),
    ]
    snapshots, status = repo.save_whiteboard_actions(
        records,
        session_id="task-1",
        user_id="user-a",
        anchor_context=_anchor(),
    )

    assert status is PersistenceStatus.COMPLETE_SUCCESS
    assert len(snapshots) == 2
    assert {s.action_type for s in snapshots} == {"wb_draw_rect", "wb_draw_text"}
    assert all(s.session_id == "task-1" for s in snapshots)
    assert all(s.user_id == "user-a" for s in snapshots)
    # 自动生成的 turn_id 应以 wb_batch 为前缀
    assert all(s.turn_id.startswith("wb_batch") for s in snapshots)


def test_save_whiteboard_actions_respects_explicit_turn_id() -> None:
    repo = LongTermConversationRepository()
    records = [WhiteboardActionRecord(action_type="wb_draw_arrow")]
    snapshots, _ = repo.save_whiteboard_actions(
        records,
        session_id="task-2",
        user_id="user-b",
        anchor_context=_anchor("task-2:scene_3"),
        turn_id="wb_batch:task-2:3",
    )

    assert len(snapshots) == 1
    assert snapshots[0].turn_id == "wb_batch:task-2:3"


def test_save_whiteboard_actions_short_circuits_on_empty_input() -> None:
    repo = LongTermConversationRepository()
    snapshots, status = repo.save_whiteboard_actions(
        [],
        session_id="task-3",
        user_id="user-c",
        anchor_context=_anchor(),
    )

    assert snapshots == []
    assert status is PersistenceStatus.COMPLETE_SUCCESS


def test_save_whiteboard_actions_visible_in_session_replay() -> None:
    repo = LongTermConversationRepository()
    records = [WhiteboardActionRecord(action_type="wb_draw_circle")]
    repo.save_whiteboard_actions(
        records,
        session_id="task-replay",
        user_id="user-r",
        anchor_context=_anchor("task-replay:scene_1"),
    )

    replay = repo.replay_session("task-replay")
    assert len(replay.whiteboard_action_logs) == 1
    assert replay.whiteboard_action_logs[0].action_type == "wb_draw_circle"


def test_save_whiteboard_actions_allows_persistence_status_override() -> None:
    repo = LongTermConversationRepository()
    records = [WhiteboardActionRecord(action_type="wb_draw_rect")]
    _, status = repo.save_whiteboard_actions(
        records,
        session_id="task-s",
        user_id="user-s",
        anchor_context=_anchor(),
        persistence_status=PersistenceStatus.WHITEBOARD_DEGRADED,
    )
    assert status is PersistenceStatus.WHITEBOARD_DEGRADED
