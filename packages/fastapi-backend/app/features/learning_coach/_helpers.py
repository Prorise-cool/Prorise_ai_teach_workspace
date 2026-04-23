"""Learning Coach 服务的模块级辅助函数与值对象（Wave 1.5 拆分）。

从 ``learning_coach/service.py`` 抽出通用的时间戳 / 哈希 / 运行态键工具
与 ``_AnswerKeyItem`` 值对象，降低 service.py 主文件行数。

本模块仅包含无副作用的纯函数与 dataclass，不持有任何运行态。
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib

from app.core.errors import AppError
from app.features.learning.schemas import LearningSourceType
from app.features.learning_coach.schemas import (
    LearningCoachOption,
    LearningCoachQuestion,
    LearningCoachSourceType,
)


def _now() -> datetime:
    """UTC now，统一所有运行态时间戳。"""
    return datetime.now(timezone.utc)


def _hash_seed(*parts: str) -> int:
    """SHA-256 派生的 64-bit 种子，用于确定性选题 / 洗牌。"""
    raw = "|".join(parts).encode("utf-8")
    digest = hashlib.sha256(raw).digest()
    return int.from_bytes(digest[:8], byteorder="big", signed=False)


def _normalize_source_type(
    source_type: LearningCoachSourceType | str,
) -> LearningSourceType:
    """把 LearningCoachSourceType / str 归一为 LearningSourceType。

    LearningCoachSource 配置了 use_enum_values=True，model_validate 出来就是 str；
    来自路由直接构造时则是 enum，这里做兼容归一化。
    """
    raw_value = (
        source_type.value
        if isinstance(source_type, LearningCoachSourceType)
        else source_type
    )
    return LearningSourceType(raw_value)


@dataclass(frozen=True)
class _AnswerKeyItem:
    """Quiz / Checkpoint 运行态中保存的单题标准答案。

    stem / options 冗余进来便于 submit_quiz 把 items 完整序列化到
    ``xm_quiz_result.question_items_json`` 供历史回看（TASK-009）。
    """

    correct_option_id: str
    explanation: str
    tag: str | None = None
    stem: str | None = None
    options: tuple[tuple[str, str, str], ...] = ()  # (option_id, label, text)


def _score_summary(score: int) -> str:
    """按分数档位返回人类可读的总结文案。"""
    if score >= 90:
        return "掌握非常扎实：可以进入下一模块，并用错题本做一次快速复盘。"
    if score >= 75:
        return "整体掌握良好：关键方法已会用，建议针对薄弱点做 1-2 轮 targeted drill。"
    if score >= 60:
        return "基础已具备：但稳定性不足，建议回看解析与错题本，补齐易错点后再测一次。"
    return "需要加强：建议先回看核心概念与例题，再重新完成一次测验。"


def _require_state(payload: object | None, *, code: str) -> dict[str, object]:
    """从 runtime_store 读出的 state 必须是 dict，否则抛 410。"""
    if not isinstance(payload, dict):
        raise AppError(code=code, message="学习运行态已过期或不可用", status_code=410)
    return payload


def _runtime_key(prefix: str, key: str) -> str:
    """Learning Coach 系列运行态 Redis key 的统一前缀构造。"""
    return f"xm_learning_{prefix}:{key}"


def _reconstruct_questions(
    state: dict[str, object],
) -> list[LearningCoachQuestion] | None:
    """从 runtime_store 的 answer_key state 还原 questions 列表。

    generate_quiz/generate_checkpoint 持久化时把 stem + options 冗余进了 answer_key，
    所以无需再跑 LLM 就能回放一份等价的题目给前端。
    """
    raw_answer_key = state.get("answer_key")
    if not isinstance(raw_answer_key, dict) or not raw_answer_key:
        return None
    questions: list[LearningCoachQuestion] = []
    for qid, raw in raw_answer_key.items():
        if not isinstance(raw, dict):
            return None
        stem = str(raw.get("stem") or "")
        raw_options = raw.get("options") or []
        if not stem or not isinstance(raw_options, list) or not raw_options:
            return None
        options: list[LearningCoachOption] = []
        for option in raw_options:
            if not isinstance(option, dict):
                return None
            option_id = str(option.get("optionId") or "")
            label = str(option.get("label") or option_id)
            text = str(option.get("text") or "")
            if not option_id or not text:
                return None
            options.append(
                LearningCoachOption(option_id=option_id, label=label, text=text)
            )
        tag_raw = str(raw.get("tag") or "").strip()
        questions.append(
            LearningCoachQuestion(
                question_id=str(qid),
                tag=tag_raw or None,
                stem=stem,
                options=options,
            )
        )
    return questions or None
