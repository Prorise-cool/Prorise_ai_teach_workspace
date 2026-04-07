"""伴学 / 知识检索长期记录的共享模型与 RuoYi 映射（re-export hub）。

本模块作为向后兼容的统一入口，将所有公有名称从以下子模块
re-export，确保现有 ``from app.shared.long_term_records import X``
导入语句无需修改：

- ``long_term_models``  — 枚举、值对象与 Pydantic 模型
- ``long_term_mapper``  — RuoYi 双向映射函数与内部辅助函数
- ``long_term_repository`` — 内存仓库、全局单例与快照构建函数
"""

from __future__ import annotations

# ── 模型层 re-export ──────────────────────────────────────────────────
from app.shared.long_term_models import (  # noqa: F401
    COMPANION_TURN_TABLE,
    KNOWLEDGE_CHAT_LOG_TABLE,
    WHITEBOARD_ACTION_LOG_TABLE,
    AnchorContext,
    AnchorKind,
    CompanionTurnCreateRequest,
    CompanionTurnSnapshot,
    ContextType,
    ConversationDomain,
    KnowledgeChatCreateRequest,
    KnowledgeChatSnapshot,
    PersistenceStatus,
    SessionReplaySnapshot,
    SourceReference,
    WhiteboardActionRecord,
    WhiteboardActionSnapshot,
)

# ── 映射层 re-export ──────────────────────────────────────────────────
from app.shared.long_term_mapper import (  # noqa: F401
    _dump_json,
    _format_ruoyi_datetime,
    _new_id,
    _now,
    _parse_source_refs,
    _parse_string_list,
    companion_turn_from_ruoyi_data,
    companion_turn_to_ruoyi_payload,
    knowledge_chat_from_ruoyi_data,
    knowledge_chat_to_ruoyi_payload,
    session_replay_from_ruoyi_data,
    whiteboard_action_from_ruoyi_row,
)

# ── 仓库层 re-export ──────────────────────────────────────────────────
from app.shared.long_term_repository import (  # noqa: F401
    LongTermConversationRepository,
    build_companion_turn_snapshot,
    build_knowledge_chat_snapshot,
    shared_long_term_repository,
)
