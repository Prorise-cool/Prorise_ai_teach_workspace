from app.features.companion.long_term_records import (
    AnchorContext,
    AnchorKind,
    CompanionTurnCreateRequest,
    ContextType,
    KnowledgeChatCreateRequest,
    LongTermConversationRepository,
    PersistenceStatus,
    SourceReference,
    WhiteboardActionRecord,
)
from app.features.companion.service import CompanionService
from app.features.knowledge.service import KnowledgeService


def test_companion_turn_marks_partial_failure_and_keeps_replay_payload() -> None:
    repository = LongTermConversationRepository()
    companion_service = CompanionService(repository)

    request = CompanionTurnCreateRequest(
        user_id="student-001",
        session_id="session-video-001",
        context_type=ContextType.VIDEO,
        anchor=AnchorContext(
            context_type=ContextType.VIDEO,
            anchor_kind=AnchorKind.VIDEO_TIMESTAMP,
            anchor_ref="00:12:34",
            scope_summary="视频第 3 段",
            source_ids=["source-video-1"]
        ),
        question_text="这里为什么要这么做？",
        answer_summary="因为这一步用于固定符号定义。",
        source_summary="视频脚本与板书笔记",
        source_refs=[
            SourceReference(
                source_id="source-video-1",
                source_title="视频分镜 3",
                source_kind="video",
                source_anchor="00:12:34"
            )
        ],
        whiteboard_actions=[
            WhiteboardActionRecord(
                action_type="draw-box",
                payload={"x": 12, "y": 18, "width": 120, "height": 40},
                object_ref="wb-node-1",
                render_state="degraded"
            )
        ],
        whiteboard_degraded=True,
        reference_missing=True
    )

    snapshot = companion_service.persist_turn(request)
    replay = companion_service.replay_session("session-video-001")

    assert snapshot.persistence_status == PersistenceStatus.PARTIAL_FAILURE
    assert snapshot.table_name == "xm_companion_turn"
    assert snapshot.user_id == "student-001"
    assert snapshot.whiteboard_degraded is True
    assert snapshot.reference_missing is True
    assert replay.whiteboard_action_logs[0].table_name == "xm_whiteboard_action_log"
    assert replay.whiteboard_action_logs[0].user_id == "student-001"
    assert snapshot.whiteboard_actions[0].action_type == "draw-box"
    assert replay.companion_turns[0].answer_summary == "因为这一步用于固定符号定义。"
    assert replay.companion_turns[0].source_refs[0].source_title == "视频分镜 3"


def test_knowledge_chat_records_reference_missing_without_losing_scope() -> None:
    repository = LongTermConversationRepository()
    knowledge_service = KnowledgeService(repository)

    request = KnowledgeChatCreateRequest(
        user_id="student-002",
        session_id="session-document-001",
        context_type=ContextType.DOCUMENT,
        retrieval_scope=AnchorContext(
            context_type=ContextType.DOCUMENT,
            anchor_kind=AnchorKind.DOCUMENT_RANGE,
            anchor_ref="chapter-2:paragraph-4",
            scope_summary="教材第 2 章第 4 段",
            source_ids=["doc-1", "doc-2"]
        ),
        question_text="教材里对这个术语的定义是什么？",
        answer_summary="教材给出的定义强调边界条件与适用范围。",
        source_summary="仅命中章节标题，未命中原文段落",
        reference_missing=True
    )

    snapshot = knowledge_service.persist_chat_log(request)
    replay = repository.replay_session("session-document-001")

    assert snapshot.persistence_status == PersistenceStatus.REFERENCE_MISSING
    assert snapshot.table_name == "xm_knowledge_chat_log"
    assert snapshot.user_id == "student-002"
    assert snapshot.retrieval_scope.anchor_ref == "chapter-2:paragraph-4"
    assert replay.knowledge_chat_logs[0].source_summary == "仅命中章节标题，未命中原文段落"
    assert replay.storage_tables == [
        "xm_companion_turn",
        "xm_whiteboard_action_log",
        "xm_knowledge_chat_log"
    ]
