"""Learning Coach 运行态生成与判题服务。

Wave 1.5 重构：模块级 fallback 题库与辅助函数已抽到 ``_fallbacks.py`` /
``_helpers.py``；本文件只保留 ``LearningCoachService`` 及其直接依赖的
轻量函数（如 ``_ruoyi_to_quiz_history``）。
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime
import hashlib
import json
import logging
from typing import Iterable

from app.core.errors import AppError
from app.features.learning.schemas import (
    LearningPersistenceRequest,
    LearningResultInput,
    LearningResultStatus,
    LearningResultType,
    LearningSourceType,
)
from app.features.learning.service import LearningService
from app.features.learning_coach._fallbacks import (
    _build_questions_from_bank,
    _fallback_path_payload,
    _fallback_question_bank,
)
from app.features.learning_coach._helpers import (
    _normalize_source_type,
    _now,
    _reconstruct_questions,
    _require_state,
    _runtime_key,
    _score_summary,
)
from app.features.learning_coach.llm_generator import (
    LLMGenerationError,
    coach_ask_via_llm,
    extract_knowledge_points_via_llm,
    generate_learning_path_via_llm,
    generate_question_bank_via_llm,
    generate_recommendation_via_llm,
)
from app.features.learning_coach.schemas import (
    CheckpointGeneratePayload,
    CheckpointJudgeItem,
    CheckpointSubmitPayload,
    LearningCoachEntryPayload,
    LearningCoachOption,
    LearningCoachSource,
    LearningCoachSourceType,
    LearningPathPlanPayload,
    LearningPathSavePayload,
    QuizGeneratePayload,
    QuizHistoryItem,
    QuizHistoryPayload,
    QuizJudgeItem,
    QuizSubmitPayload,
)
from app.infra.redis_client import RuntimeStore
from app.providers.protocols import LLMProvider


logger = logging.getLogger(__name__)

DEFAULT_TTL_SECONDS = 2 * 60 * 60

GENERATION_SOURCE_LLM = "llm"
GENERATION_SOURCE_FALLBACK = "fallback"

# 预生成（由视频完成钩子触发）写入的 session → id 指针。
# 值形如 {"id": "quiz_xxx", "generated_at": "ISO-8601"}。
# TTL 设得比 quiz/checkpoint 运行态（2h）长一些，允许用户先放一阵再回来点开 quiz。
PRELOADED_QUIZ_KEY = "xm_learning_preloaded:quiz:{session_id}"
PRELOADED_CHECKPOINT_KEY = "xm_learning_preloaded:checkpoint:{session_id}"
PRELOADED_TTL = 6 * 60 * 60  # 6h

# build_entry 触发预生成时使用的短锁，防止同 session 在 30s 内重复向 dramatiq
# 推送 preload 消息（用户刷新几次 entry API 不应变成 N 条 LLM 调用）。
PRELOAD_SCHEDULE_LOCK_KEY = "xm_learning_preload_lock:{session_id}"
PRELOAD_SCHEDULE_LOCK_TTL_SECONDS = 30


class LearningCoachService:
    """Learning Coach 服务：生成与判题（运行态），并回写到 RuoYi（长期）。

    LLM Provider 通过 `provider_chain` 注入；若未配置则自动降级到本地硬编码题库。
    """

    def __init__(
        self,
        *,
        runtime_store: RuntimeStore,
        persistence_service: LearningService | None = None,
        provider_chain: Sequence[LLMProvider] | None = None,
    ) -> None:
        self._runtime_store = runtime_store
        self._persistence_service = persistence_service or LearningService()
        self._provider_chain: tuple[LLMProvider, ...] = tuple(provider_chain or ())

    def _try_load_preloaded(
        self,
        *,
        prefix: str,
        session_id: str,
    ) -> tuple[str, dict[str, object]] | None:
        """读 session 级别的预生成指针，返回 (id, 原始 state) 或 None。

        命中但指针指向的状态已过期时，返回 None（调用方会降级到 LLM 生成路径）。
        """
        pointer_key = (
            PRELOADED_QUIZ_KEY.format(session_id=session_id)
            if prefix == "quiz"
            else PRELOADED_CHECKPOINT_KEY.format(session_id=session_id)
        )
        pointer = self._runtime_store.get_runtime_value(pointer_key)
        if not isinstance(pointer, dict):
            return None
        cached_id = pointer.get("id")
        if not isinstance(cached_id, str) or not cached_id:
            return None
        state = self._runtime_store.get_runtime_value(_runtime_key(prefix, cached_id))
        if not isinstance(state, dict):
            logger.info(
                "learning_coach.%s.cache_expired",
                prefix,
                extra={"id": cached_id, "source_session_id": session_id},
            )
            return None
        return cached_id, state

    async def preload_for_session(
        self,
        source: LearningCoachSource,
        *,
        question_count_quiz: int = 10,
        question_count_checkpoint: int = 3,
    ) -> dict[str, str]:
        """为给定 source 提前生成 quiz + checkpoint，写 session→id 指针。

        返回 {"quiz_id": ..., "checkpoint_id": ...}。
        复用 generate_quiz / generate_checkpoint 的标准路径（它们内部会写
        xm_learning_quiz:{id} / xm_learning_checkpoint:{id} 原始 state），这里
        只在上面再记一个 session → id 的指针，让后续命中能在 O(1) 内找到。
        """
        # reuse_preloaded=False：预生成本身必须调 LLM 产新题，而不是读自己刚写的指针。
        quiz_payload = await self.generate_quiz(
            source=source,
            question_count=question_count_quiz,
            reuse_preloaded=False,
        )
        checkpoint_payload = await self.generate_checkpoint(
            source=source,
            question_count=question_count_checkpoint,
            reuse_preloaded=False,
        )
        generated_at = _now().isoformat()
        self._runtime_store.set_runtime_value(
            PRELOADED_QUIZ_KEY.format(session_id=source.source_session_id),
            {"id": quiz_payload.quiz_id, "generated_at": generated_at},
            ttl_seconds=PRELOADED_TTL,
        )
        self._runtime_store.set_runtime_value(
            PRELOADED_CHECKPOINT_KEY.format(session_id=source.source_session_id),
            {"id": checkpoint_payload.checkpoint_id, "generated_at": generated_at},
            ttl_seconds=PRELOADED_TTL,
        )
        logger.info(
            "learning_coach.preload.done",
            extra={
                "source_session_id": source.source_session_id,
                "quiz_id": quiz_payload.quiz_id,
                "checkpoint_id": checkpoint_payload.checkpoint_id,
            },
        )
        return {
            "quiz_id": quiz_payload.quiz_id,
            "checkpoint_id": checkpoint_payload.checkpoint_id,
        }

    async def _resolve_question_bank(
        self,
        *,
        source: LearningCoachSource,
        question_count: int,
        mode: str,
    ) -> tuple[list[QuestionTuple], str]:
        """优先走 LLM，失败降级到本地题库。返回 (bank, generation_source)。"""
        if self._provider_chain:
            try:
                bank = await generate_question_bank_via_llm(
                    source,
                    question_count,
                    mode=mode,
                    provider_chain=self._provider_chain,
                )
                return bank, GENERATION_SOURCE_LLM
            except LLMGenerationError as error:
                logger.warning(
                    "learning_coach.%s.llm_fallback",
                    mode,
                    extra={
                        "source_session_id": source.source_session_id,
                        "error": str(error),
                    },
                )
        else:
            logger.info("learning_coach.%s.no_provider_chain", mode)
        return _fallback_question_bank(source.topic_hint), GENERATION_SOURCE_FALLBACK

    async def _resolve_learning_path(
        self,
        *,
        source: LearningCoachSource,
        goal: str,
        cycle_days: int,
    ) -> tuple[str, str, list[dict[str, object]], str]:
        if self._provider_chain:
            try:
                title, summary, stages = await generate_learning_path_via_llm(
                    source,
                    goal,
                    cycle_days,
                    provider_chain=self._provider_chain,
                )
                return title, summary, stages, GENERATION_SOURCE_LLM
            except LLMGenerationError as error:
                logger.warning(
                    "learning_coach.path.llm_fallback",
                    extra={
                        "source_session_id": source.source_session_id,
                        "error": str(error),
                    },
                )
        title, summary, stages = _fallback_path_payload(goal, cycle_days)
        return title, summary, stages, GENERATION_SOURCE_FALLBACK

    async def _resolve_knowledge_points(
        self,
        source: LearningCoachSource,
    ) -> list[str]:
        """优先 LLM 提取，失败降级为 topic_hint 手动分词（仅保留非空片段）。"""
        if self._provider_chain:
            try:
                points = await extract_knowledge_points_via_llm(
                    source,
                    provider_chain=self._provider_chain,
                )
                if points:
                    return points
            except LLMGenerationError as error:
                logger.info(
                    "learning_coach.entry.llm_fallback",
                    extra={
                        "source_session_id": source.source_session_id,
                        "error": str(error),
                    },
                )
        topic = source.topic_hint or ""
        parts = [segment.strip() for segment in topic.replace("，", "、").replace(",", "、").split("、")]
        return [segment for segment in parts if segment][:6]

    async def build_entry(self, source: LearningCoachSource) -> LearningCoachEntryPayload:
        knowledge_points = await self._resolve_knowledge_points(source)
        # 视频完成钩子的预生成可能还没跑完（用户回看旧视频时根本没触发），
        # 在 coach entry 访问时再兜一次：能进入 entry 页的用户通常会在热身/quiz
        # 按钮上停留数秒 —— 足够 fire-and-forget 的 LLM 把题出完。
        self._schedule_preload_if_needed(source)
        return LearningCoachEntryPayload(
            source=source,
            knowledge_points=knowledge_points,
        )

    def _schedule_preload_if_needed(self, source: LearningCoachSource) -> None:
        """coach entry 访问时的 fire-and-forget 预生成调度。

        1. 已有 quiz 预生成指针 → 直接返回（避免覆盖刚生成好的题）。
        2. 用 SETNX 锁 `xm_learning_preload_lock:{sessionId}` 抢占 30s 窗口，
           失败即跳过 —— 用户连点刷新不会变成 N 次 LLM 调用。
        3. 延迟 import `app.worker.preload_learning_coach_actor`；未初始化仅 warn。
        4. 任意异常只 warn，不抛 —— build_entry 不能因预生成调度挂掉。

        access_token/client_id 一律传 None：actor 内部 resolver 有 token-less 的
        settings 链回退，比让用户等 LLM 好。
        """
        session_id = source.source_session_id
        try:
            preloaded_key = PRELOADED_QUIZ_KEY.format(session_id=session_id)
            if self._runtime_store.get_runtime_value(preloaded_key) is not None:
                return

            claim_fn = getattr(self._runtime_store, "claim_runtime_value", None)
            if callable(claim_fn):
                acquired = claim_fn(
                    PRELOAD_SCHEDULE_LOCK_KEY.format(session_id=session_id),
                    {"scheduled_at": _now().isoformat()},
                    ttl_seconds=PRELOAD_SCHEDULE_LOCK_TTL_SECONDS,
                )
                if not acquired:
                    return
            else:
                # 测试 stub 未实现 setnx：退化为"读-写"近似，仅用于单测路径。
                lock_key = PRELOAD_SCHEDULE_LOCK_KEY.format(session_id=session_id)
                if self._runtime_store.get_runtime_value(lock_key) is not None:
                    return
                self._runtime_store.set_runtime_value(
                    lock_key,
                    {"scheduled_at": _now().isoformat()},
                    ttl_seconds=PRELOAD_SCHEDULE_LOCK_TTL_SECONDS,
                )

            try:
                from app.worker import preload_learning_coach_actor
            except Exception:  # noqa: BLE001
                logger.warning(
                    "learning_coach.entry.preload_import_failed session_id=%s",
                    session_id,
                    exc_info=True,
                )
                return

            if preload_learning_coach_actor is None:
                logger.warning(
                    "learning_coach.entry.preload_actor_not_ready session_id=%s",
                    session_id,
                )
                return

            preload_learning_coach_actor.send(
                session_id,
                source.topic_hint or "",
                None,
                None,
            )
            logger.info(
                "learning_coach.entry.preload_scheduled session_id=%s",
                session_id,
            )
        except Exception:  # noqa: BLE001 — 调度失败不得阻塞 entry
            logger.warning(
                "learning_coach.entry.preload_schedule_failed session_id=%s",
                session_id,
                exc_info=True,
            )

    async def generate_checkpoint(
        self,
        *,
        source: LearningCoachSource,
        question_count: int,
        reuse_preloaded: bool = True,
    ) -> CheckpointGeneratePayload:
        if reuse_preloaded:
            cached = self._try_load_preloaded(
                prefix="checkpoint",
                session_id=source.source_session_id,
            )
            if cached is not None:
                cached_id, cached_state = cached
                questions = _reconstruct_questions(cached_state)
                if questions:
                    logger.info(
                        "learning_coach.checkpoint.cache_hit",
                        extra={
                            "checkpoint_id": cached_id,
                            "source_session_id": source.source_session_id,
                        },
                    )
                    return CheckpointGeneratePayload(
                        checkpoint_id=cached_id,
                        source=source,
                        question_total=int(cached_state.get("question_total") or len(questions)),
                        questions=questions,
                        expires_in_seconds=DEFAULT_TTL_SECONDS,
                        generation_source=str(
                            cached_state.get("generation_source") or GENERATION_SOURCE_LLM
                        ),
                    )
        checkpoint_id = f"chk_{hashlib.sha1((_now().isoformat() + source.source_session_id).encode('utf-8')).hexdigest()[:20]}"
        bank, generation_source = await self._resolve_question_bank(
            source=source,
            question_count=question_count,
            mode="checkpoint",
        )
        questions, answer_key = _build_questions_from_bank(
            bank,
            source=source,
            question_total=question_count,
            seed_namespace="checkpoint",
        )
        state = {
            "source": source.model_dump(mode="json", by_alias=True),
            "question_total": question_count,
            "generation_source": generation_source,
            "answer_key": {
                qid: {
                    "correctOptionId": item.correct_option_id,
                    "explanation": item.explanation,
                    "tag": item.tag or "",
                    "stem": item.stem or "",
                    "options": [
                        {"optionId": opt_id, "label": label, "text": text}
                        for opt_id, label, text in item.options
                    ],
                }
                for qid, item in answer_key.items()
            },
        }
        self._runtime_store.set_runtime_value(
            _runtime_key("checkpoint", checkpoint_id),
            state,
            ttl_seconds=DEFAULT_TTL_SECONDS,
        )
        return CheckpointGeneratePayload(
            checkpoint_id=checkpoint_id,
            source=source,
            question_total=question_count,
            questions=questions,
            expires_in_seconds=DEFAULT_TTL_SECONDS,
            generation_source=generation_source,
        )

    async def submit_checkpoint(
        self,
        *,
        checkpoint_id: str,
        answers: Iterable[tuple[str, str]],
        user_id: str,
        access_context=None,
    ) -> CheckpointSubmitPayload:
        raw_state = self._runtime_store.get_runtime_value(_runtime_key("checkpoint", checkpoint_id))
        state = _require_state(raw_state, code="LEARNING_CHECKPOINT_EXPIRED")
        raw_source = state.get("source")
        source = LearningCoachSource.model_validate(raw_source)
        question_total = int(state.get("question_total") or 0)
        raw_answer_key = state.get("answer_key")
        answer_key_state = _require_state(raw_answer_key, code="LEARNING_CHECKPOINT_EXPIRED")

        items: list[CheckpointJudgeItem] = []
        correct_total = 0
        seen_questions: set[str] = set()
        for question_id, option_id in answers:
            if question_id in seen_questions:
                continue
            seen_questions.add(question_id)
            key_item = answer_key_state.get(question_id)
            if not isinstance(key_item, dict):
                continue
            correct_option_id = str(key_item.get("correctOptionId") or "")
            explanation = str(key_item.get("explanation") or "暂无解析")
            is_correct = option_id == correct_option_id
            if is_correct:
                correct_total += 1
            items.append(
                CheckpointJudgeItem(
                    question_id=question_id,
                    selected_option_id=option_id,
                    correct_option_id=correct_option_id,
                    is_correct=is_correct,
                    explanation=explanation,
                )
            )

        question_total = question_total or max(len(items), 1)
        passed = correct_total >= max(1, question_total - 1)

        # 持久化（不阻塞主流程；失败则降级为 persisted=False 并记录完整异常）
        persisted = True
        try:
            await self._persistence_service.persist_results(
                LearningPersistenceRequest(
                    user_id=user_id,
                    records=[
                        LearningResultInput(
                            result_type=LearningResultType.CHECKPOINT,
                            source_type=_normalize_source_type(source.source_type),
                            source_session_id=source.source_session_id,
                            source_task_id=source.source_task_id,
                            source_result_id=checkpoint_id,
                            occurred_at=_now(),
                            updated_at=_now(),
                            question_total=question_total,
                            correct_total=correct_total,
                            score=int(round(correct_total / question_total * 100)),
                            analysis_summary="checkpoint 快速热身结果",
                            status=LearningResultStatus.COMPLETED
                            if passed
                            else LearningResultStatus.FAILED,
                            detail_ref=checkpoint_id,
                        )
                    ],
                ),
                access_context=access_context,
            )
        except Exception:
            persisted = False
            logger.exception(
                "learning_coach.checkpoint.persist_failed",
                extra={
                    "checkpoint_id": checkpoint_id,
                    "user_id": user_id,
                    "source_session_id": source.source_session_id,
                },
            )

        return CheckpointSubmitPayload(
            checkpoint_id=checkpoint_id,
            question_total=question_total,
            correct_total=correct_total,
            passed=passed,
            items=items,
            persisted=persisted,
        )

    async def generate_quiz(
        self,
        *,
        source: LearningCoachSource,
        question_count: int,
        reuse_preloaded: bool = True,
    ) -> QuizGeneratePayload:
        if reuse_preloaded:
            cached = self._try_load_preloaded(
                prefix="quiz",
                session_id=source.source_session_id,
            )
            if cached is not None:
                cached_id, cached_state = cached
                questions = _reconstruct_questions(cached_state)
                if questions:
                    logger.info(
                        "learning_coach.quiz.cache_hit",
                        extra={
                            "quiz_id": cached_id,
                            "source_session_id": source.source_session_id,
                        },
                    )
                    return QuizGeneratePayload(
                        quiz_id=cached_id,
                        source=source,
                        question_total=int(cached_state.get("question_total") or len(questions)),
                        questions=questions,
                        expires_in_seconds=DEFAULT_TTL_SECONDS,
                        generation_source=str(
                            cached_state.get("generation_source") or GENERATION_SOURCE_LLM
                        ),
                    )
        quiz_id = f"quiz_{hashlib.sha1((_now().isoformat() + source.source_session_id).encode('utf-8')).hexdigest()[:20]}"
        bank, generation_source = await self._resolve_question_bank(
            source=source,
            question_count=question_count,
            mode="quiz",
        )
        questions, answer_key = _build_questions_from_bank(
            bank,
            source=source,
            question_total=question_count,
            seed_namespace="quiz",
        )
        state = {
            "source": source.model_dump(mode="json", by_alias=True),
            "question_total": question_count,
            "generation_source": generation_source,
            "answer_key": {
                qid: {
                    "correctOptionId": item.correct_option_id,
                    "explanation": item.explanation,
                    "tag": item.tag or "",
                    "stem": item.stem or "",
                    "options": [
                        {"optionId": opt_id, "label": label, "text": text}
                        for opt_id, label, text in item.options
                    ],
                }
                for qid, item in answer_key.items()
            },
        }
        self._runtime_store.set_runtime_value(
            _runtime_key("quiz", quiz_id),
            state,
            ttl_seconds=DEFAULT_TTL_SECONDS,
        )
        return QuizGeneratePayload(
            quiz_id=quiz_id,
            source=source,
            question_total=question_count,
            questions=questions,
            expires_in_seconds=DEFAULT_TTL_SECONDS,
            generation_source=generation_source,
        )

    async def submit_quiz(
        self,
        *,
        quiz_id: str,
        answers: Iterable[tuple[str, str]],
        user_id: str,
        access_context=None,
    ) -> QuizSubmitPayload:
        raw_state = self._runtime_store.get_runtime_value(_runtime_key("quiz", quiz_id))
        state = _require_state(raw_state, code="LEARNING_QUIZ_EXPIRED")
        raw_source = state.get("source")
        source = LearningCoachSource.model_validate(raw_source)
        question_total = int(state.get("question_total") or 0)
        raw_answer_key = state.get("answer_key")
        answer_key_state = _require_state(raw_answer_key, code="LEARNING_QUIZ_EXPIRED")

        items: list[QuizJudgeItem] = []
        # 完整题目明细（含 stem/options），用于落库到 xm_quiz_result.question_items_json 供历史回看。
        items_full: list[dict[str, object]] = []
        correct_total = 0
        wrong_questions: list[str] = []
        wrong_question_tags: list[str] = []
        seen_questions: set[str] = set()

        for question_id, option_id in answers:
            if question_id in seen_questions:
                continue
            seen_questions.add(question_id)
            key_item = answer_key_state.get(question_id)
            if not isinstance(key_item, dict):
                continue
            correct_option_id = str(key_item.get("correctOptionId") or "")
            explanation = str(key_item.get("explanation") or "暂无解析")
            tag = str(key_item.get("tag") or "").strip()
            stem = str(key_item.get("stem") or "")
            raw_options = key_item.get("options") or []
            option_entries: list[dict[str, str]] = []
            if isinstance(raw_options, list):
                for option in raw_options:
                    if not isinstance(option, dict):
                        continue
                    option_entries.append(
                        {
                            "optionId": str(option.get("optionId") or ""),
                            "label": str(option.get("label") or ""),
                            "text": str(option.get("text") or ""),
                        }
                    )
            is_correct = option_id == correct_option_id
            if is_correct:
                correct_total += 1
            else:
                wrong_questions.append(question_id)
                if tag:
                    wrong_question_tags.append(tag)
            items.append(
                QuizJudgeItem(
                    question_id=question_id,
                    selected_option_id=option_id,
                    correct_option_id=correct_option_id,
                    is_correct=is_correct,
                    explanation=explanation,
                )
            )
            items_full.append(
                {
                    "questionId": question_id,
                    "stem": stem,
                    "options": option_entries,
                    "selectedOptionId": option_id,
                    "correctOptionId": correct_option_id,
                    "isCorrect": is_correct,
                    "explanation": explanation,
                }
            )

        question_total = question_total or max(len(items), 1)
        score = int(round(correct_total / question_total * 100))
        summary = _score_summary(score)

        # 默认推荐（LLM 不可用或失败时使用）
        rec_summary = "推荐：先回看错题对应知识点，再完成一次 5 题小测巩固。"
        rec_target = source.topic_hint or "learning_next"
        if self._provider_chain:
            try:
                llm_summary, llm_target = await generate_recommendation_via_llm(
                    source,
                    wrong_question_tags,
                    source.topic_hint,
                    provider_chain=self._provider_chain,
                )
                rec_summary = llm_summary
                rec_target = llm_target
            except LLMGenerationError as error:
                logger.warning(
                    "learning_coach.quiz.recommendation_llm_fallback",
                    extra={
                        "quiz_id": quiz_id,
                        "source_session_id": source.source_session_id,
                        "error": str(error),
                    },
                )

        # 序列化完整题目明细供 RuoYi 侧落 xm_quiz_result.question_items_json。
        # ensure_ascii=False 保留中文；失败则降级为 None 不阻塞主流程。
        try:
            question_items_json = json.dumps(items_full, ensure_ascii=False) if items_full else None
        except (TypeError, ValueError):
            question_items_json = None
            logger.warning(
                "learning_coach.quiz.items_serialize_failed",
                extra={"quiz_id": quiz_id, "item_count": len(items_full)},
            )

        persisted = False
        try:
            records: list[LearningResultInput] = [
                LearningResultInput(
                    result_type=LearningResultType.QUIZ,
                    source_type=_normalize_source_type(source.source_type),
                    source_session_id=source.source_session_id,
                    source_task_id=source.source_task_id,
                    source_result_id=quiz_id,
                    occurred_at=_now(),
                    updated_at=_now(),
                    question_total=question_total,
                    correct_total=correct_total,
                    score=score,
                    analysis_summary=summary,
                    status=LearningResultStatus.COMPLETED,
                    detail_ref=quiz_id,
                    question_items_json=question_items_json,
                )
            ]

            # wrongbook：按错题写入（MVP：仅沉淀 questionId + 摘要字段）
            for wrong_id in wrong_questions[:10]:
                records.append(
                    LearningResultInput(
                        result_type=LearningResultType.WRONGBOOK,
                        source_type=LearningSourceType.QUIZ,
                        source_session_id=source.source_session_id,
                        source_task_id=source.source_task_id,
                        source_result_id=f"{quiz_id}:{wrong_id}",
                        occurred_at=_now(),
                        updated_at=_now(),
                        question_text=wrong_id,
                        wrong_answer_text="",
                        reference_answer_text="",
                        analysis_summary="错题已沉淀，待补齐题干与答案文本",
                        status=LearningResultStatus.COMPLETED,
                        detail_ref=f"{quiz_id}:{wrong_id}",
                    )
                )

            # recommendation：单条推荐摘要
            records.append(
                LearningResultInput(
                    result_type=LearningResultType.RECOMMENDATION,
                    source_type=LearningSourceType.LEARNING,
                    source_session_id=source.source_session_id,
                    source_task_id=source.source_task_id,
                    source_result_id=f"{quiz_id}:rec",
                    occurred_at=_now(),
                    updated_at=_now(),
                    target_type="knowledge_point",
                    target_ref_id=rec_target,
                    analysis_summary=rec_summary,
                    status=LearningResultStatus.COMPLETED,
                    detail_ref=f"{quiz_id}:rec",
                )
            )

            await self._persistence_service.persist_results(
                LearningPersistenceRequest(user_id=user_id, records=records),
                access_context=access_context,
            )
            persisted = True
        except Exception:
            persisted = False
            logger.exception(
                "learning_coach.quiz.persist_failed",
                extra={
                    "quiz_id": quiz_id,
                    "user_id": user_id,
                    "source_session_id": source.source_session_id,
                    "wrong_question_count": len(wrong_questions),
                },
            )

        return QuizSubmitPayload(
            quiz_id=quiz_id,
            question_total=question_total,
            correct_total=correct_total,
            score=score,
            summary=summary,
            items=items,
            persisted=persisted,
        )

    async def plan_path(
        self,
        *,
        source: LearningCoachSource,
        goal: str,
        cycle_days: int,
    ) -> LearningPathPlanPayload:
        path_id = f"path_{hashlib.sha1((_now().isoformat() + goal).encode('utf-8')).hexdigest()[:20]}"
        title, summary, stages, generation_source = await self._resolve_learning_path(
            source=source,
            goal=goal,
            cycle_days=cycle_days,
        )

        return LearningPathPlanPayload(
            path_id=path_id,
            source=source,
            path_title=title,
            path_summary=summary,
            version_no=1,
            stages=stages,  # type: ignore[arg-type]
            generation_source=generation_source,
        )

    async def save_path(
        self,
        *,
        path: LearningPathPlanPayload,
        user_id: str,
        access_context=None,
    ) -> LearningPathSavePayload:
        persisted = False
        persisted_at = None
        try:
            await self._persistence_service.persist_results(
                LearningPersistenceRequest(
                    user_id=user_id,
                    records=[
                        LearningResultInput(
                            result_type=LearningResultType.PATH,
                            source_type=_normalize_source_type(path.source.source_type),
                            source_session_id=path.source.source_session_id,
                            source_task_id=path.source.source_task_id,
                            source_result_id=path.path_id,
                            occurred_at=_now(),
                            updated_at=_now(),
                            path_title=path.path_title,
                            step_count=sum(len(stage.steps) for stage in path.stages),
                            analysis_summary=path.path_summary,
                            status=LearningResultStatus.COMPLETED,
                            detail_ref=path.path_id,
                            version_no=path.version_no,
                        )
                    ],
                ),
                access_context=access_context,
            )
            persisted = True
            persisted_at = _now()
        except Exception:
            persisted = False
            logger.exception(
                "learning_coach.path.persist_failed",
                extra={
                    "path_id": path.path_id,
                    "user_id": user_id,
                    "source_session_id": path.source.source_session_id,
                    "version_no": path.version_no,
                },
            )

        return LearningPathSavePayload(
            path_id=path.path_id,
            version_no=path.version_no,
            persisted=persisted,
            persisted_at=persisted_at,
        )

    async def coach_ask(
        self,
        *,
        question_stem: str,
        question_options: list[str],
        user_message: str,
        history: list[dict[str, str]],
    ) -> tuple[str, str]:
        """quiz 侧栏 AI 辅导对话：基于当前题目 + 历史 + 用户消息生成自由文本回复。

        返回 (reply, generation_source)。provider_chain 缺失或 LLM 失败时返回
        固定兜底文案，且 generation_source='fallback' 让前端可选显示提示。
        """
        if self._provider_chain:
            try:
                reply = await coach_ask_via_llm(
                    question_stem=question_stem,
                    question_options=question_options,
                    user_message=user_message,
                    history=history,
                    provider_chain=self._provider_chain,
                )
                return reply, GENERATION_SOURCE_LLM
            except LLMGenerationError as error:
                logger.warning(
                    "learning_coach.coach_ask.llm_fallback",
                    extra={"error": str(error)},
                )
        return (
            "AI 辅导暂不可用。可以先自己试着拆解：题干给了哪些已知条件？目标要求什么？"
            "再对照每个选项检查是否满足这些条件。",
            GENERATION_SOURCE_FALLBACK,
        )

    async def fetch_quiz_history(
        self,
        *,
        quiz_id: str,
        user_id: str,
        access_context=None,
    ) -> QuizHistoryPayload:
        """只读拉取历史答卷；RuoYi 返回 None 时抛 404。"""
        raw = await self._persistence_service.fetch_quiz_history(
            quiz_id,
            user_id,
            access_context=access_context,
        )
        if raw is None:
            raise AppError(
                code="QUIZ_HISTORY_NOT_FOUND",
                message="历史答卷不存在或已过期",
                status_code=404,
            )
        return _ruoyi_to_quiz_history(quiz_id, raw)


def _ruoyi_to_quiz_history(quiz_id: str, raw: dict[str, object]) -> QuizHistoryPayload:
    """把 RuoYi xm_quiz_result 行（+ 关联题目）映射为 QuizHistoryPayload。

    兼容驼峰/下划线两种字段命名，最大化向 Java 侧妥协。
    """

    def _get(*keys: str, default=None):
        for key in keys:
            if key in raw and raw[key] is not None:
                return raw[key]
        return default

    raw_items = _get("items", default=None)
    if raw_items is None:
        # 兼容：RuoYi 若只返回 questionItemsJson 字符串（未在服务端解析），这里兜底反序列化。
        raw_json = _get("questionItemsJson", "question_items_json")
        if isinstance(raw_json, str) and raw_json:
            try:
                raw_items = json.loads(raw_json)
            except (TypeError, ValueError):
                raw_items = []
        else:
            raw_items = []
    if raw_items is None:
        raw_items = []
    items: list[QuizHistoryItem] = []
    if isinstance(raw_items, list):
        for entry in raw_items:
            if not isinstance(entry, dict):
                continue
            raw_options = entry.get("options") or []
            options: list[LearningCoachOption] = []
            if isinstance(raw_options, list):
                for option in raw_options:
                    if not isinstance(option, dict):
                        continue
                    option_id = str(option.get("optionId") or option.get("option_id") or option.get("label") or "")
                    label = str(option.get("label") or option_id or "")
                    text = str(option.get("text") or option.get("content") or "")
                    if not option_id or not label or not text:
                        continue
                    try:
                        options.append(LearningCoachOption(option_id=option_id, label=label, text=text))
                    except Exception:  # pragma: no cover - 防御脏数据
                        continue
            question_id = str(entry.get("questionId") or entry.get("question_id") or "")
            stem = str(entry.get("stem") or entry.get("questionText") or entry.get("question_text") or "")
            if not question_id or not stem:
                continue
            items.append(
                QuizHistoryItem(
                    question_id=question_id,
                    stem=stem,
                    options=options,
                    selected_option_id=(entry.get("selectedOptionId") or entry.get("selected_option_id")),
                    correct_option_id=(entry.get("correctOptionId") or entry.get("correct_option_id")),
                    is_correct=bool(entry.get("isCorrect") or entry.get("is_correct") or False),
                    explanation=(entry.get("explanation") or None),
                )
            )

    source_type_raw = _get("sourceType", "source_type")
    try:
        source_enum = (
            LearningCoachSourceType(source_type_raw)
            if isinstance(source_type_raw, str) and source_type_raw
            else None
        )
    except ValueError:
        source_enum = None

    occurred_at = _get("occurredAt", "occurred_at")
    if isinstance(occurred_at, str):
        try:
            occurred_at = datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))
        except ValueError:
            occurred_at = None
    elif not isinstance(occurred_at, datetime):
        occurred_at = None

    return QuizHistoryPayload(
        quiz_id=str(_get("quizId", "quiz_id", default=quiz_id)),
        source=source_enum,
        question_total=int(_get("questionTotal", "question_total", default=0) or 0),
        correct_total=int(_get("correctTotal", "correct_total", default=0) or 0),
        score=int(_get("score", default=0) or 0),
        summary=_get("summary", "analysisSummary", "analysis_summary"),
        items=items,
        occurred_at=occurred_at,
    )
