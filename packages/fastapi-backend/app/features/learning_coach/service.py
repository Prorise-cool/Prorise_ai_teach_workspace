"""Learning Coach 运行态生成与判题服务。"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import logging
import random
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
from app.features.learning_coach.llm_generator import (
    LLMGenerationError,
    QuestionTuple,
    extract_knowledge_points_via_llm,
    generate_learning_path_via_llm,
    generate_question_bank_via_llm,
)
from app.features.learning_coach.schemas import (
    CheckpointGeneratePayload,
    CheckpointJudgeItem,
    CheckpointSubmitPayload,
    LearningCoachEntryPayload,
    LearningCoachOption,
    LearningCoachQuestion,
    LearningCoachSource,
    LearningCoachSourceType,
    LearningPathPlanPayload,
    LearningPathSavePayload,
    QuizGeneratePayload,
    QuizJudgeItem,
    QuizSubmitPayload,
)
from app.infra.redis_client import RuntimeStore
from app.providers.protocols import LLMProvider


logger = logging.getLogger(__name__)

DEFAULT_TTL_SECONDS = 2 * 60 * 60

GENERATION_SOURCE_LLM = "llm"
GENERATION_SOURCE_FALLBACK = "fallback"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_seed(*parts: str) -> int:
    raw = "|".join(parts).encode("utf-8")
    digest = hashlib.sha256(raw).digest()
    return int.from_bytes(digest[:8], byteorder="big", signed=False)


def _normalize_source_type(source_type: LearningCoachSourceType) -> LearningSourceType:
    return LearningSourceType(source_type.value)


@dataclass(frozen=True)
class _AnswerKeyItem:
    correct_option_id: str
    explanation: str


def _fallback_question_bank(topic_hint: str | None) -> list[QuestionTuple]:
    """本地硬编码降级题库。仅在 LLM 调用失败且无其他可用来源时使用。

    每题格式：(question_id, tag, stem, options[(id,text)], correct_option_id, explanation)
    """
    _ = topic_hint
    return [
        (
            "q1",
            "链式法则",
            "若 y = sin(x^2)，y' 的正确形式是？",
            [
                ("A", "cos(x^2)"),
                ("B", "2x · cos(x^2)"),
                ("C", "-2x · cos(x^2)"),
                ("D", "2 · cos(x^2)"),
            ],
            "B",
            "链式法则：外层 sin(u) 导数为 cos(u)，内层 u=x^2 导数为 2x，因此 y' = 2x·cos(x^2)。",
        ),
        (
            "q2",
            "复合函数",
            "若 y = (3x+1)^5，y' 的正确形式是？",
            [
                ("A", "5(3x+1)^4"),
                ("B", "15(3x+1)^4"),
                ("C", "5(3x+1)^5"),
                ("D", "3(3x+1)^4"),
            ],
            "B",
            "链式法则：y=(3x+1)^5，y'=5(3x+1)^4·(3)=15(3x+1)^4。",
        ),
        (
            "q3",
            "指数函数",
            "若 y = e^{2x}，y' 是？",
            [
                ("A", "2e^{2x}"),
                ("B", "e^{2x}"),
                ("C", "2e^x"),
                ("D", "e^x"),
            ],
            "A",
            "e^{kx} 的导数为 k e^{kx}，此处 k=2。",
        ),
        (
            "q4",
            "对数函数",
            "若 y = ln(x^2)，y' 的正确形式是？",
            [
                ("A", "1/x"),
                ("B", "2/x"),
                ("C", "1/(x^2)"),
                ("D", "2/(x^2)"),
            ],
            "B",
            "ln(x^2)=2ln|x|，导数为 2/x（x≠0）。",
        ),
        (
            "q5",
            "三角函数",
            "若 y = cos(3x)，y' 的正确形式是？",
            [
                ("A", "-3sin(3x)"),
                ("B", "3sin(3x)"),
                ("C", "-sin(3x)"),
                ("D", "sin(3x)"),
            ],
            "A",
            "cos(g(x)) 的导数为 -sin(g(x))·g'(x)，此处 g(x)=3x。",
        ),
    ]


def _fallback_path_payload(goal: str, cycle_days: int) -> tuple[str, str, list[dict[str, object]]]:
    """LLM 路径规划失败时的降级文案。"""
    days = max(1, int(cycle_days))
    title = f"{days} 天学习路径：{goal}"
    summary = "LLM 暂不可用，已使用基线模板：分阶段拆解目标并提供可执行的行动项与复盘建议。"
    stages: list[dict[str, object]] = [
        {
            "title": "第一阶段：打基础",
            "goal": "把核心概念与方法串起来，能在典型题上稳定输出。",
            "steps": [
                {"title": "概念回顾", "action": "回看 1 个例题并手写推导过程", "estimatedMinutes": 30},
                {"title": "基础训练", "action": "完成 10 道基础题并整理错因", "estimatedMinutes": 45},
            ],
        },
        {
            "title": "第二阶段：做变式",
            "goal": "覆盖常见变式与陷阱点，提升解题稳定性。",
            "steps": [
                {"title": "陷阱清单", "action": "总结 5 类常见错误并对照修正", "estimatedMinutes": 35},
                {"title": "小测巩固", "action": "做 1 套 5 题小测并复盘", "estimatedMinutes": 40},
            ],
        },
        {
            "title": "第三阶段：复盘强化",
            "goal": "用错题本做 targeted drill，确保薄弱点被补齐。",
            "steps": [
                {"title": "错题复盘", "action": "回看错题并重做 2 轮", "estimatedMinutes": 45},
                {"title": "最终自测", "action": "完成一次正式 quiz 并达到 90 分", "estimatedMinutes": 35},
            ],
        },
    ]
    return title, summary, stages


def _build_questions_from_bank(
    bank: list[QuestionTuple],
    *,
    source: LearningCoachSource,
    question_total: int,
    seed_namespace: str,
) -> tuple[list[LearningCoachQuestion], dict[str, _AnswerKeyItem]]:
    """从题库 bank 中按种子取样并装配为 Question 与 answer_key。

    LLM 返回的 bank 已经是目标数量，直接使用；降级 bank 可能不足，按种子循环补齐。
    """
    if not bank:
        raise AppError(code="LEARNING_BANK_EMPTY", message="题库为空", status_code=500)
    seed = _hash_seed(
        seed_namespace,
        source.source_type.value if hasattr(source.source_type, "value") else str(source.source_type),
        source.source_session_id,
        source.topic_hint or "",
    )
    rng = random.Random(seed)
    picked = bank.copy()
    if len(picked) >= question_total:
        rng.shuffle(picked)
        picked = picked[:question_total]
    else:
        # 仅降级路径会走到（LLM 已校验数量充足）
        rng.shuffle(picked)
        picked = (picked * ((question_total + len(picked) - 1) // len(picked)))[:question_total]

    questions: list[LearningCoachQuestion] = []
    answer_key: dict[str, _AnswerKeyItem] = {}
    # 为了避免降级路径里同一题 id 冲突，按序号重排 question_id
    for index, (original_id, tag, stem, options, correct_option_id, explanation) in enumerate(picked, start=1):
        question_id = original_id if index == 1 and original_id not in answer_key else f"q{index}"
        if question_id in answer_key:
            question_id = f"q{index}-{rng.randint(1000, 9999)}"
        questions.append(
            LearningCoachQuestion(
                question_id=question_id,
                tag=tag,
                stem=stem,
                options=[
                    LearningCoachOption(option_id=opt_id, label=opt_id, text=opt_text)
                    for opt_id, opt_text in options
                ],
            )
        )
        answer_key[question_id] = _AnswerKeyItem(
            correct_option_id=correct_option_id,
            explanation=explanation,
        )

    return questions, answer_key


def _score_summary(score: int) -> str:
    if score >= 90:
        return "掌握非常扎实：可以进入下一模块，并用错题本做一次快速复盘。"
    if score >= 75:
        return "整体掌握良好：关键方法已会用，建议针对薄弱点做 1-2 轮 targeted drill。"
    if score >= 60:
        return "基础已具备：但稳定性不足，建议回看解析与错题本，补齐易错点后再测一次。"
    return "需要加强：建议先回看核心概念与例题，再重新完成一次测验。"


def _require_state(payload: object | None, *, code: str) -> dict[str, object]:
    if not isinstance(payload, dict):
        raise AppError(code=code, message="学习运行态已过期或不可用", status_code=410)
    return payload


def _runtime_key(prefix: str, key: str) -> str:
    return f"xm_learning_{prefix}:{key}"


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
        return LearningCoachEntryPayload(
            source=source,
            knowledge_points=knowledge_points,
        )

    async def generate_checkpoint(
        self,
        *,
        source: LearningCoachSource,
        question_count: int,
    ) -> CheckpointGeneratePayload:
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
    ) -> QuizGeneratePayload:
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
        correct_total = 0
        wrong_questions: list[str] = []
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
            else:
                wrong_questions.append(question_id)
            items.append(
                QuizJudgeItem(
                    question_id=question_id,
                    selected_option_id=option_id,
                    correct_option_id=correct_option_id,
                    is_correct=is_correct,
                    explanation=explanation,
                )
            )

        question_total = question_total or max(len(items), 1)
        score = int(round(correct_total / question_total * 100))
        summary = _score_summary(score)

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
                    target_ref_id=source.topic_hint or "learning_next",
                    analysis_summary="推荐：先回看错题对应知识点，再完成一次 5 题小测巩固。",
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
