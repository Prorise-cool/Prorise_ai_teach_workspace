"""伴学 / 知识检索长期记录的内存仓库与快照构建工具。

本模块提供：

- ``LongTermConversationRepository``：线程安全的内存仓库，用于
  Story 10.5 的本地开发与测试，可保存 / 查询伴学轮次、知识检索记录，
  并按会话维度聚合回放。
- ``shared_long_term_repository``：全局单例仓库实例。
- ``build_companion_turn_snapshot`` / ``build_knowledge_chat_snapshot``：
  从创建请求构建快照的工厂函数，可选注入 ID 与时间戳。
"""

from __future__ import annotations

from datetime import datetime
from threading import RLock

from app.shared.long_term.mapper import _new_id, _now
from app.shared.long_term.models import (
    AnchorContext,
    CompanionTurnCreateRequest,
    CompanionTurnSnapshot,
    KnowledgeChatCreateRequest,
    KnowledgeChatSnapshot,
    PersistenceStatus,
    SessionReplaySnapshot,
    WhiteboardActionRecord,
    WhiteboardActionSnapshot,
)


class LongTermConversationRepository:
    """用于 Story 10.5 的内存回写仓库，便于测试长期结构与恢复语义。

    所有写入与读取操作均通过 ``RLock`` 实现线程安全。
    """

    def __init__(self) -> None:
        self._lock = RLock()
        self._companion_turns: dict[str, CompanionTurnSnapshot] = {}
        self._whiteboard_action_logs: dict[str, WhiteboardActionSnapshot] = {}
        self._knowledge_chat_logs: dict[str, KnowledgeChatSnapshot] = {}

    def clear(self) -> None:
        """清空所有内存记录。"""
        with self._lock:
            self._companion_turns.clear()
            self._whiteboard_action_logs.clear()
            self._knowledge_chat_logs.clear()

    def save_companion_turn(
        self, request: CompanionTurnCreateRequest
    ) -> CompanionTurnSnapshot:
        """保存一条伴学对话轮次，返回持久化后的快照。"""
        with self._lock:
            turn_id = _new_id("turn")
            created_at = _now()
            whiteboard_actions = [
                WhiteboardActionSnapshot(
                    action_id=_new_id("wb"),
                    turn_id=turn_id,
                    session_id=request.session_id,
                    user_id=request.user_id,
                    created_at=created_at,
                    **action.model_dump(),
                )
                for action in request.whiteboard_actions
            ]
            snapshot = CompanionTurnSnapshot(
                turn_id=turn_id,
                session_id=request.session_id,
                user_id=request.user_id,
                context_type=request.context_type,
                anchor=request.anchor,
                question_text=request.question_text,
                answer_summary=request.answer_summary,
                source_summary=request.source_summary,
                source_refs=request.source_refs,
                whiteboard_actions=whiteboard_actions,
                whiteboard_degraded=request.whiteboard_degraded,
                reference_missing=request.reference_missing,
                overall_failed=request.overall_failed,
                persistence_status=request.persistence_status
                or PersistenceStatus.COMPLETE_SUCCESS,
                created_at=created_at,
            )
            self._companion_turns[turn_id] = snapshot
            for action in whiteboard_actions:
                self._whiteboard_action_logs[action.action_id] = action
            return snapshot

    def save_whiteboard_actions(
        self,
        actions: list[WhiteboardActionRecord],
        *,
        session_id: str,
        user_id: str,
        anchor_context: AnchorContext,
        turn_id: str | None = None,
        persistence_status: PersistenceStatus | None = None,
    ) -> tuple[list[WhiteboardActionSnapshot], PersistenceStatus]:
        """独立保存一批白板动作（Wave 1.5）。

        与 ``save_companion_turn`` 不同，本方法**不**要求成对提交问答轮次，
        适用于课堂生成 / 批量场景：只回写 ``wb_draw_*`` / ``wb_erase_*`` 等
        动作作为独立条目，便于后续重放 / 审计。

        语义：
        - ``turn_id`` 未提供时自动生成 ``wb_batch:<uuid>`` 风格的伪 turn id，
          便于把一批动作聚合到同一锚点；后续 Wave 2 Java 侧提供
          ``/internal/xiaomai/whiteboard-actions/batch`` 端点后，此处改走
          ``RuoYiClient`` 真实回写，不再创建伪 turn。
        - ``anchor_context`` 决定 ``context_type`` 字段，课堂场景传
          ``ContextType.CLASSROOM`` + ``AnchorKind.WHITEBOARD_STEP_ID``。
        - 返回 ``(snapshots, persistence_status)``：调用方据此决定是否把
          本次回写标为 ``WHITEBOARD_DEGRADED``。

        TODO(Wave 2): Java 侧新增独立 whiteboard-action batch 端点
        (``/internal/xiaomai/whiteboard-actions/batch``)；当前 Wave 1.5
        阶段只做内存快照 + 结构化日志，不触发 RuoYi 回写。
        """
        with self._lock:
            if not actions:
                return (
                    [],
                    persistence_status or PersistenceStatus.COMPLETE_SUCCESS,
                )
            effective_turn_id = turn_id or _new_id("wb_batch")
            created_at = _now()
            _ = anchor_context  # reserved for future RuoYi payload (Wave 2)
            snapshots = [
                WhiteboardActionSnapshot(
                    action_id=_new_id("wb"),
                    turn_id=effective_turn_id,
                    session_id=session_id,
                    user_id=user_id,
                    created_at=created_at,
                    **action.model_dump(),
                )
                for action in actions
            ]
            for snapshot in snapshots:
                self._whiteboard_action_logs[snapshot.action_id] = snapshot
            status = persistence_status or PersistenceStatus.COMPLETE_SUCCESS
            return snapshots, status

    def save_knowledge_chat(
        self, request: KnowledgeChatCreateRequest
    ) -> KnowledgeChatSnapshot:
        """保存一条知识检索对话记录，返回持久化后的快照。"""
        with self._lock:
            chat_log_id = _new_id("chat")
            created_at = _now()
            snapshot = KnowledgeChatSnapshot(
                chat_log_id=chat_log_id,
                session_id=request.session_id,
                user_id=request.user_id,
                context_type=request.context_type,
                retrieval_scope=request.retrieval_scope,
                question_text=request.question_text,
                answer_summary=request.answer_summary,
                source_summary=request.source_summary,
                source_refs=request.source_refs,
                reference_missing=request.reference_missing,
                overall_failed=request.overall_failed,
                persistence_status=request.persistence_status
                or PersistenceStatus.COMPLETE_SUCCESS,
                created_at=created_at,
            )
            self._knowledge_chat_logs[chat_log_id] = snapshot
            return snapshot

    def get_companion_turn(self, turn_id: str) -> CompanionTurnSnapshot | None:
        """按 turn_id 查询伴学对话轮次。"""
        with self._lock:
            return self._companion_turns.get(turn_id)

    def get_knowledge_chat(self, chat_log_id: str) -> KnowledgeChatSnapshot | None:
        """按 chat_log_id 查询知识检索对话记录。"""
        with self._lock:
            return self._knowledge_chat_logs.get(chat_log_id)

    def replay_session(self, session_id: str) -> SessionReplaySnapshot:
        """按 session_id 聚合回放所有对话与白板操作记录。"""
        with self._lock:
            companion_turns = sorted(
                (
                    turn
                    for turn in self._companion_turns.values()
                    if turn.session_id == session_id
                ),
                key=lambda turn: turn.created_at,
            )
            whiteboard_action_logs = sorted(
                (
                    action
                    for action in self._whiteboard_action_logs.values()
                    if action.session_id == session_id
                ),
                key=lambda action: action.created_at,
            )
            knowledge_chat_logs = sorted(
                (
                    chat
                    for chat in self._knowledge_chat_logs.values()
                    if chat.session_id == session_id
                ),
                key=lambda chat: chat.created_at,
            )
            return SessionReplaySnapshot(
                session_id=session_id,
                companion_turns=companion_turns,
                whiteboard_action_logs=whiteboard_action_logs,
                knowledge_chat_logs=knowledge_chat_logs,
            )


shared_long_term_repository = LongTermConversationRepository()
"""全局单例内存仓库实例。"""


def build_companion_turn_snapshot(
    request: CompanionTurnCreateRequest,
    *,
    turn_id: str | None = None,
    created_at: datetime | None = None,
) -> CompanionTurnSnapshot:
    """从创建请求构建伴学轮次快照。

    Args:
        request: 伴学对话轮次的创建请求。
        turn_id: 可选的轮次 ID；未提供时自动生成。
        created_at: 可选的创建时间；未提供时使用当前 UTC 时间。

    Returns:
        构建完成的 CompanionTurnSnapshot 实例。
    """
    normalized_created_at = created_at or _now()
    normalized_turn_id = turn_id or _new_id("turn")
    whiteboard_actions = [
        WhiteboardActionSnapshot(
            action_id=_new_id("wb"),
            turn_id=normalized_turn_id,
            session_id=request.session_id,
            user_id=request.user_id,
            created_at=normalized_created_at,
            **action.model_dump(),
        )
        for action in request.whiteboard_actions
    ]
    return CompanionTurnSnapshot(
        turn_id=normalized_turn_id,
        session_id=request.session_id,
        user_id=request.user_id,
        context_type=request.context_type,
        anchor=request.anchor,
        question_text=request.question_text,
        answer_summary=request.answer_summary,
        source_summary=request.source_summary,
        source_refs=request.source_refs,
        whiteboard_actions=whiteboard_actions,
        whiteboard_degraded=request.whiteboard_degraded,
        reference_missing=request.reference_missing,
        overall_failed=request.overall_failed,
        persistence_status=request.persistence_status
        or PersistenceStatus.COMPLETE_SUCCESS,
        created_at=normalized_created_at,
    )


def build_knowledge_chat_snapshot(
    request: KnowledgeChatCreateRequest,
    *,
    chat_log_id: str | None = None,
    created_at: datetime | None = None,
) -> KnowledgeChatSnapshot:
    """从创建请求构建知识检索对话快照。

    Args:
        request: 知识检索对话的创建请求。
        chat_log_id: 可选的日志 ID；未提供时自动生成。
        created_at: 可选的创建时间；未提供时使用当前 UTC 时间。

    Returns:
        构建完成的 KnowledgeChatSnapshot 实例。
    """
    normalized_created_at = created_at or _now()
    normalized_chat_log_id = chat_log_id or _new_id("chat")
    return KnowledgeChatSnapshot(
        chat_log_id=normalized_chat_log_id,
        session_id=request.session_id,
        user_id=request.user_id,
        context_type=request.context_type,
        retrieval_scope=request.retrieval_scope,
        question_text=request.question_text,
        answer_summary=request.answer_summary,
        source_summary=request.source_summary,
        source_refs=request.source_refs,
        reference_missing=request.reference_missing,
        overall_failed=request.overall_failed,
        persistence_status=request.persistence_status
        or PersistenceStatus.COMPLETE_SUCCESS,
        created_at=normalized_created_at,
    )
