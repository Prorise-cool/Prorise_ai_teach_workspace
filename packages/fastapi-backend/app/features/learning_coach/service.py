"""Learning Coach 运行态生成与判题服务。"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import random
import re
from typing import Any, Iterable

from app.core.errors import AppError
from app.features.learning.schemas import (
    LearningPersistenceRequest,
    LearningResultInput,
    LearningResultStatus,
    LearningResultType,
    LearningSourceType,
)
from app.features.learning.service import LearningService
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


DEFAULT_TTL_SECONDS = 2 * 60 * 60


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


def extract_json_payload(text: str) -> dict[str, Any]:
    """从 LLM 输出中提取 JSON 对象 payload。

    支持以下格式：
    - 纯 JSON：`{"foo": "bar"}`
    - fenced JSON：```json ... ```
    - 前后包裹说明：`xxx {"foo":"bar"} yyy`
    """
    if not isinstance(text, str):
        raise ValueError("LLM 输出必须是字符串")

    candidate = text.strip()
    if not candidate:
        raise ValueError("LLM 输出为空")

    lines = candidate.splitlines()
    if lines and lines[0].strip().startswith("```") and lines[-1].strip().startswith("```"):
        candidate = "\n".join(lines[1:-1]).strip()

    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError:
        start = candidate.find("{")
        end = candidate.rfind("}")
        if start < 0 or end < 0 or end <= start:
            raise ValueError("LLM 输出未包含可解析的 JSON") from None
        parsed = json.loads(candidate[start : end + 1])

    if not isinstance(parsed, dict):
        raise ValueError("LLM JSON 输出必须是对象")

    return parsed


def parse_llm_questions(
    text: str,
    *,
    question_total: int,
) -> tuple[list[LearningCoachQuestion], dict[str, _AnswerKeyItem]]:
    """将 LLM 输出解析为题目与答题卡。"""
    if question_total <= 0:
        raise ValueError("question_total 必须大于 0")

    payload = extract_json_payload(text)
    raw_questions = payload.get("questions")
    if not isinstance(raw_questions, list) or not raw_questions:
        raise ValueError("LLM 输出缺少 questions 列表")

    questions: list[LearningCoachQuestion] = []
    answer_key: dict[str, _AnswerKeyItem] = {}

    for index, raw in enumerate(raw_questions):
        if len(questions) >= question_total:
            break
        if not isinstance(raw, dict):
            continue

        question_id = raw.get("questionId") or raw.get("question_id") or f"q{index + 1}"
        question_id = str(question_id).strip()
        if not question_id:
            continue

        tag = raw.get("tag")
        tag_value = str(tag).strip() if isinstance(tag, str) and tag.strip() else None

        stem = raw.get("stem")
        stem_value = str(stem).strip() if isinstance(stem, str) and stem.strip() else ""
        if not stem_value:
            continue

        raw_options = raw.get("options")
        if not isinstance(raw_options, list) or not raw_options:
            continue
        options: list[LearningCoachOption] = []
        option_id_set: set[str] = set()
        for opt in raw_options:
            if not isinstance(opt, dict):
                continue
            opt_id = opt.get("optionId") or opt.get("option_id") or opt.get("id")
            opt_text = opt.get("text") or opt.get("label") or opt.get("content")
            if not isinstance(opt_id, str) or not opt_id.strip():
                continue
            if not isinstance(opt_text, str) or not opt_text.strip():
                continue
            normalized_id = opt_id.strip()
            if normalized_id in option_id_set:
                continue
            option_id_set.add(normalized_id)
            options.append(
                LearningCoachOption(
                    option_id=normalized_id,
                    label=normalized_id,
                    text=opt_text.strip(),
                )
            )

        if not options:
            continue

        correct_option_id = raw.get("correctOptionId") or raw.get("correct_option_id")
        correct_option_value = str(correct_option_id).strip() if correct_option_id else ""
        if not correct_option_value or correct_option_value not in option_id_set:
            continue

        explanation = raw.get("explanation")
        explanation_value = (
            str(explanation).strip()
            if isinstance(explanation, str) and explanation.strip()
            else "暂无解析"
        )

        questions.append(
            LearningCoachQuestion(
                question_id=question_id,
                tag=tag_value,
                stem=stem_value,
                options=options,
            )
        )
        answer_key[question_id] = _AnswerKeyItem(
            correct_option_id=correct_option_value,
            explanation=explanation_value,
        )

    if not questions:
        raise ValueError("LLM 输出未生成有效题目")

    return questions, answer_key


def _question_bank(topic_hint: str | None) -> list[tuple[str, str | None, str, list[tuple[str, str]], str, str]]:
    """返回题库：

    每题格式：
    (question_id, tag, stem, options[(id,text)], correct_option_id, explanation)
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


def _build_questions(
    *,
    source: LearningCoachSource,
    question_total: int,
    seed_namespace: str,
) -> tuple[list[LearningCoachQuestion], dict[str, _AnswerKeyItem]]:
    bank = _question_bank(source.topic_hint)
    seed = _hash_seed(seed_namespace, source.source_type.value, source.source_session_id, source.topic_hint or "")
    rng = random.Random(seed)
    picked = bank.copy()
    rng.shuffle(picked)
    if question_total <= len(picked):
        picked = picked[:question_total]
    else:
        # 超过题库时循环补齐（MVP 保证不阻塞）
        picked = (picked * ((question_total + len(picked) - 1) // len(picked)))[:question_total]

    questions: list[LearningCoachQuestion] = []
    answer_key: dict[str, _AnswerKeyItem] = {}
    for question_id, tag, stem, options, correct_option_id, explanation in picked:
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
    """Learning Coach 服务：生成与判题（运行态），并回写到 RuoYi（长期）。"""

    def __init__(
        self,
        *,
        runtime_store: RuntimeStore,
        persistence_service: LearningService | None = None,
        provider_factory=None,
    ) -> None:
        self._runtime_store = runtime_store
        self._persistence_service = persistence_service or LearningService()
        self._provider_factory = provider_factory
        self._runtime_config = None

    async def build_entry(self, source: LearningCoachSource) -> LearningCoachEntryPayload:
        return LearningCoachEntryPayload(
            source=source,
            knowledge_points=[item for item in (source.topic_hint or "").split("、") if item][:0],
        )

    async def _ensure_runtime_config(self, access_context=None):
        if self._runtime_config is not None:
            return self._runtime_config

        from app.core.config import get_settings
        from app.providers.factory import get_provider_factory
        from app.providers.runtime_config_service import ProviderRuntimeResolver

        factory = self._provider_factory or get_provider_factory()
        resolver = ProviderRuntimeResolver(
            settings=get_settings(),
            provider_factory=factory,
        )
        access_token = getattr(access_context, "token", None)
        client_id = getattr(access_context, "client_id", None)
        config = await resolver.resolve_learning_coach(
            access_token=access_token,
            client_id=client_id,
        )
        self._runtime_config = config
        return config

    async def _generate_llm(self, prompt: str, *, stage: str, access_context=None) -> str:
        from app.providers.factory import get_provider_factory

        config = await self._ensure_runtime_config(access_context=access_context)
        factory = self._provider_factory or get_provider_factory()
        failover = factory.create_failover_service(self._runtime_store)
        result = await failover.generate(config.llm_for(stage), prompt)
        return result.content

    @staticmethod
    def _build_question_prompt(
        *,
        source: LearningCoachSource,
        question_total: int,
        mode: str,
    ) -> str:
        topic_hint = (source.topic_hint or "").strip()
        topic_line = f"topicHint={topic_hint}" if topic_hint else "topicHint="
        return (
            "你是学习教练出题助手。\n"
            f"任务：为学生生成 {question_total} 道{mode} 单选题（每题 4 个选项 A-D）。\n"
            "要求：题干与选项中文、简洁；答案唯一；解析 1-2 句。\n"
            "输出：严格输出 JSON（不要 markdown，不要多余文字）。\n"
            "JSON schema:\n"
            "{\n"
            '  "questions": [\n'
            "    {\n"
            '      "questionId": "q1",\n'
            '      "tag": "知识点标签(可选)",\n'
            '      "stem": "题干",\n'
            '      "options": [{"optionId":"A","text":"..."},{"optionId":"B","text":"..."},{"optionId":"C","text":"..."},{"optionId":"D","text":"..."}],\n'
            '      "correctOptionId": "A|B|C|D",\n'
            '      "explanation": "解析"\n'
            "    }\n"
            "  ]\n"
            "}\n"
            "会话信息：\n"
            f"sourceType={source.source_type.value}\n"
            f"sourceSessionId={source.source_session_id}\n"
            f"{topic_line}\n"
        )

    async def _generate_questions(
        self,
        *,
        source: LearningCoachSource,
        question_total: int,
        seed_namespace: str,
        llm_stage: str,
        access_context=None,
    ) -> tuple[list[LearningCoachQuestion], dict[str, _AnswerKeyItem]]:
        try:
            prompt = self._build_question_prompt(
                source=source,
                question_total=question_total,
                mode=llm_stage,
            )
            content = await self._generate_llm(prompt, stage=llm_stage, access_context=access_context)
            return parse_llm_questions(content, question_total=question_total)
        except Exception:
            return _build_questions(
                source=source,
                question_total=question_total,
                seed_namespace=seed_namespace,
            )

    async def generate_checkpoint(
        self,
        *,
        source: LearningCoachSource,
        question_count: int,
        access_context=None,
    ) -> CheckpointGeneratePayload:
        checkpoint_id = f"chk_{hashlib.sha1((_now().isoformat() + source.source_session_id).encode('utf-8')).hexdigest()[:20]}"
        questions, answer_key = await self._generate_questions(
            source=source,
            question_total=question_count,
            seed_namespace="checkpoint",
            llm_stage="checkpoint",
            access_context=access_context,
        )
        state = {
            "source": source.model_dump(mode="json", by_alias=True),
            "question_total": question_count,
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

        # 持久化（不阻塞主流程，失败则降级为 persisted=false）
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
            # 仅做降级，不抛出
            pass

        return CheckpointSubmitPayload(
            checkpoint_id=checkpoint_id,
            question_total=question_total,
            correct_total=correct_total,
            passed=passed,
            items=items,
        )

    async def generate_quiz(
        self,
        *,
        source: LearningCoachSource,
        question_count: int,
        access_context=None,
    ) -> QuizGeneratePayload:
        quiz_id = f"quiz_{hashlib.sha1((_now().isoformat() + source.source_session_id).encode('utf-8')).hexdigest()[:20]}"
        questions, answer_key = await self._generate_questions(
            source=source,
            question_total=question_count,
            seed_namespace="quiz",
            llm_stage="quiz",
            access_context=access_context,
        )
        state = {
            "source": source.model_dump(mode="json", by_alias=True),
            "question_total": question_count,
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

        return QuizSubmitPayload(
            quiz_id=quiz_id,
            question_total=question_total,
            correct_total=correct_total,
            score=score,
            summary=summary,
            items=items,
            persisted=persisted,
        )

    @staticmethod
    def _build_path_prompt(*, source: LearningCoachSource, goal: str, cycle_days: int) -> str:
        topic_hint = (source.topic_hint or "").strip()
        topic_line = f"topicHint={topic_hint}" if topic_hint else "topicHint="
        return (
            "你是学习教练学习路径规划助手。\n"
            "任务：为学生生成可执行的学习路径计划。\n"
            "输出：严格输出 JSON（不要 markdown，不要多余文字）。\n"
            "JSON schema:\n"
            "{\n"
            '  "pathTitle": "标题",\n'
            '  "pathSummary": "摘要(<=2000字)",\n'
            '  "stages": [\n'
            "    {\n"
            '      "title": "阶段标题",\n'
            '      "goal": "阶段目标",\n'
            '      "steps": [\n'
            '        {"title":"步骤标题","action":"可执行动作","estimatedMinutes":30}\n'
            "      ]\n"
            "    }\n"
            "  ]\n"
            "}\n"
            "约束：stages 3-6 个；每个阶段 steps 2-5 条；estimatedMinutes 5-180。\n"
            "输入：\n"
            f"goal={goal}\n"
            f"cycleDays={cycle_days}\n"
            f"sourceType={source.source_type.value}\n"
            f"sourceSessionId={source.source_session_id}\n"
            f"{topic_line}\n"
        )

    @staticmethod
    def _parse_path_plan(text: str) -> tuple[str, str, list[dict[str, Any]]]:
        payload = extract_json_payload(text)

        title = payload.get("pathTitle") or payload.get("path_title") or payload.get("title")
        summary = payload.get("pathSummary") or payload.get("path_summary") or payload.get("summary")
        stages = payload.get("stages")
        if not isinstance(title, str) or not title.strip():
            raise ValueError("pathTitle 缺失")
        if not isinstance(summary, str) or not summary.strip():
            raise ValueError("pathSummary 缺失")
        if not isinstance(stages, list) or not stages:
            raise ValueError("stages 缺失")

        normalized_stages: list[dict[str, Any]] = []
        for raw_stage in stages[:20]:
            if not isinstance(raw_stage, dict):
                continue
            stage_title = raw_stage.get("title")
            stage_goal = raw_stage.get("goal")
            stage_steps = raw_stage.get("steps")
            if not isinstance(stage_title, str) or not stage_title.strip():
                continue
            if not isinstance(stage_goal, str) or not stage_goal.strip():
                continue
            if not isinstance(stage_steps, list) or not stage_steps:
                continue

            steps: list[dict[str, Any]] = []
            for raw_step in stage_steps[:30]:
                if not isinstance(raw_step, dict):
                    continue
                step_title = raw_step.get("title")
                step_action = raw_step.get("action")
                estimated = raw_step.get("estimatedMinutes") or raw_step.get("estimated_minutes")
                if not isinstance(step_title, str) or not step_title.strip():
                    continue
                if not isinstance(step_action, str) or not step_action.strip():
                    continue
                step_payload: dict[str, Any] = {
                    "title": step_title.strip(),
                    "action": step_action.strip(),
                }
                if isinstance(estimated, (int, float)):
                    step_payload["estimatedMinutes"] = int(estimated)
                steps.append(step_payload)

            if not steps:
                continue

            normalized_stages.append(
                {
                    "title": stage_title.strip(),
                    "goal": stage_goal.strip(),
                    "steps": steps,
                }
            )

        if not normalized_stages:
            raise ValueError("stages 为空")

        return title.strip(), summary.strip(), normalized_stages

    async def plan_path(
        self,
        *,
        source: LearningCoachSource,
        goal: str,
        cycle_days: int,
        access_context=None,
    ) -> LearningPathPlanPayload:
        path_id = f"path_{hashlib.sha1((_now().isoformat() + goal).encode('utf-8')).hexdigest()[:20]}"
        days = max(1, int(cycle_days))
        fallback_title = f"{days} 天学习路径：{goal}"
        fallback_summary = "分阶段拆解目标，并提供可执行的行动项与复盘建议。"
        fallback_stages = [
            {
                "title": "第一阶段：打基础",
                "goal": "把核心概念与方法串起来，能在典型题上稳定输出。",
                "steps": [
                    {"title": "概念回顾", "action": "回看 1 个例题并手写推导过程", "estimatedMinutes": 30},
                    {"title": "基础训练", "action": "完成 10 道基础题并整理错因", "estimatedMinutes": 45},
                ],
            },
        ]

        title = fallback_title
        summary = fallback_summary
        stages = fallback_stages

        try:
            prompt = self._build_path_prompt(source=source, goal=goal, cycle_days=days)
            content = await self._generate_llm(prompt, stage="path", access_context=access_context)
            title, summary, stages = self._parse_path_plan(content)
        except Exception:
            pass

        return LearningPathPlanPayload(
            path_id=path_id,
            source=source,
            path_title=title,
            path_summary=summary,
            version_no=1,
            stages=stages,  # type: ignore[arg-type]
        )

    async def get_path(
        self,
        *,
        path_id: str,
        user_id: str,
        access_context=None,
    ) -> LearningPathPlanPayload:
        """读取已保存的学习路径计划（用于刷新恢复与再次打开）。"""
        try:
            raw = await self._persistence_service.fetch_path_payload_json(
                user_id=user_id,
                source_result_id=path_id,
                access_context=access_context,
            )
            payload = json.loads(raw)
            return LearningPathPlanPayload.model_validate(payload)
        except AppError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise AppError(
                code="LEARNING_PATH_NOT_FOUND",
                message="学习路径不存在或不可用",
                status_code=404,
            ) from exc

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
            payload_json = json.dumps(
                path.model_dump(mode="json", by_alias=True),
                ensure_ascii=False,
            )
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
                            path_payload_json=payload_json,
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

        return LearningPathSavePayload(
            path_id=path.path_id,
            version_no=path.version_no,
            persisted=persisted,
            persisted_at=persisted_at,
        )
