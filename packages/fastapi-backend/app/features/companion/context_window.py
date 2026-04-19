"""连续追问 Redis 上下文窗口管理。

管理多轮追问的上下文继承、窗口裁剪与锚点切换。
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.infra.redis_client import RuntimeStore

logger = logging.getLogger(__name__)

CONTEXT_KEY_PREFIX = "xm_companion_ctx:"
CONTEXT_TTL_SECONDS = 86400  # 24 小时
MAX_ROUNDS = 10
RECENT_ROUNDS_TO_KEEP = 3


class ContextWindow:
    """Redis 上下文窗口管理。"""

    def __init__(self, runtime_store: RuntimeStore) -> None:
        self._store = runtime_store

    def _key(self, session_id: str) -> str:
        return f"{CONTEXT_KEY_PREFIX}{session_id}"

    def load(self, session_id: str) -> dict[str, Any] | None:
        """加载会话上下文窗口。"""
        try:
            raw = self._store.get_runtime_value(self._key(session_id))
            if raw is None:
                return None
            return json.loads(raw) if isinstance(raw, str) else raw
        except Exception:
            logger.debug("Failed to load context window session=%s", session_id, exc_info=True)
            return None

    def save(self, session_id: str, window: dict[str, Any]) -> None:
        """保存会话上下文窗口，带 TTL。"""
        try:
            key = self._key(session_id)
            self._store.set_runtime_value(key, json.dumps(window, ensure_ascii=False))
            self._store.set_ttl(key, CONTEXT_TTL_SECONDS)
        except Exception:
            logger.warning("Failed to save context window session=%s", session_id, exc_info=True)

    def append_turn(
        self,
        session_id: str,
        *,
        turn_id: str,
        question_text: str,
        answer_summary: str,
        anchor_ref: str,
    ) -> dict[str, Any]:
        """追加一轮对话到上下文窗口，自动裁剪。"""
        window = self.load(session_id) or {
            "session_id": session_id,
            "turns": [],
            "current_anchor_ref": anchor_ref,
        }

        # 更新锚点
        window["current_anchor_ref"] = anchor_ref

        # 追加轮次摘要
        window["turns"].append({
            "turn_id": turn_id,
            "question": question_text,
            "answer_summary": answer_summary[:200],
            "anchor_ref": anchor_ref,
        })

        # 裁剪：保留最近 N 轮 + 必要会话元信息
        if len(window["turns"]) > MAX_ROUNDS:
            window["turns"] = window["turns"][-RECENT_ROUNDS_TO_KEEP:]

        self.save(session_id, window)
        return window

    def build_prompt_context(self, session_id: str) -> list[dict[str, str]]:
        """为 LLM prompt 构建历史上下文摘要。"""
        window = self.load(session_id)
        if window is None or not window.get("turns"):
            return []
        return [
            {
                "role": "user" if i % 2 == 0 else "assistant",
                "content": turn["answer_summary"] if i % 2 == 1 else turn["question"],
            }
            for i, turn in enumerate(window["turns"])
        ]

    def update_anchor(self, session_id: str, new_anchor_ref: str) -> None:
        """切换锚点但保留对话历史。"""
        window = self.load(session_id)
        if window is None:
            return
        window["current_anchor_ref"] = new_anchor_ref
        self.save(session_id, window)
