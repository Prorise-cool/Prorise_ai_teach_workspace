"""LearningCoachService 单元测试（P0-6 Epic-8 覆盖）。

覆盖点：
- LLM provider 可用时 checkpoint / quiz / path 走 LLM 路径。
- Provider chain 为空或 LLM 抛错时降级到本地题库 / 模板。
- checkpoint/quiz 判分正确性。
- 持久化失败不再静默吞噬，persisted=False 返回给前端。
- extract_knowledge_points 降级到 topic_hint 分词。
- llm_generator 能处理 markdown 代码块包裹的 JSON。
"""
from __future__ import annotations

import json
from typing import Any, Iterable
from unittest.mock import AsyncMock

import pytest

from app.features.learning_coach import llm_generator
from app.features.learning_coach.schemas import (
    LearningCoachSource,
    LearningCoachSourceType,
)
from app.features.learning_coach.service import (
    GENERATION_SOURCE_FALLBACK,
    GENERATION_SOURCE_LLM,
    LearningCoachService,
)
from app.providers.protocols import ProviderResult, ProviderRuntimeConfig


# ---------------------------- 测试替身 ----------------------------


class _InMemoryRuntimeStore:
    """最小 runtime_store 替身，按 key 存取 dict。"""

    def __init__(self) -> None:
        self._values: dict[str, Any] = {}

    def set_runtime_value(
        self, key: str, value: Any, *, ttl_seconds: int | None = None
    ) -> None:
        self._values[key] = value

    def get_runtime_value(self, key: str) -> Any:
        return self._values.get(key)


class _StubLLMProvider:
    """按顺序返回预设文本的 LLM provider 替身。"""

    provider_id = "stub-llm"
    config = ProviderRuntimeConfig(provider_id="stub-llm")

    def __init__(self, responses: list[str]) -> None:
        self._responses = list(responses)

    async def generate(self, prompt: str) -> ProviderResult:
        if not self._responses:
            raise llm_generator.LLMGenerationError("stub: no more responses queued")
        return ProviderResult(provider=self.provider_id, content=self._responses.pop(0))


class _PersistenceStub:
    """LearningService 的最小替身，按需成功或抛错。"""

    def __init__(self, *, raise_on: set[str] | None = None) -> None:
        self.calls: list[Any] = []
        self._raise_on = raise_on or set()

    async def persist_results(
        self, request: Any, *, access_context: Any = None
    ) -> None:
        first = request.records[0] if request.records else None
        if first is None:
            result_type = ""
        else:
            rt = first.result_type
            result_type = rt.value if hasattr(rt, "value") else str(rt)
        self.calls.append((result_type, request))
        if result_type in self._raise_on:
            raise RuntimeError(f"persist failure for {result_type}")


# ---------------------------- fixtures ----------------------------


@pytest.fixture
def source() -> LearningCoachSource:
    return LearningCoachSource(
        source_type=LearningCoachSourceType.VIDEO,
        source_session_id="sess-001",
        source_task_id="task-001",
        topic_hint="链式法则、指数求导",
    )


def _llm_questions_payload(count: int = 3) -> str:
    questions = []
    for idx in range(1, count + 1):
        questions.append(
            {
                "question_id": f"q{idx}",
                "tag": f"tag-{idx}",
                "stem": f"LLM 生成题干 {idx}",
                "options": [
                    {"option_id": "A", "text": "选项 A"},
                    {"option_id": "B", "text": "选项 B"},
                    {"option_id": "C", "text": "选项 C"},
                    {"option_id": "D", "text": "选项 D"},
                ],
                "correct_option_id": "B",
                "explanation": f"解析 {idx}",
            }
        )
    return json.dumps({"questions": questions})


def _llm_path_payload() -> str:
    return json.dumps(
        {
            "path_title": "LLM 生成的 7 天路径",
            "path_summary": "由 LLM 给出的路径摘要。",
            "stages": [
                {
                    "title": "第一阶段",
                    "goal": "打基础",
                    "steps": [
                        {"title": "概念", "action": "回看例题", "estimatedMinutes": 30},
                        {"title": "训练", "action": "做 5 题", "estimatedMinutes": 40},
                    ],
                }
            ],
        }
    )


# ---------------------------- 测试用例 ----------------------------


@pytest.mark.asyncio
async def test_generate_checkpoint_uses_llm_when_provider_available(
    source: LearningCoachSource,
) -> None:
    provider = _StubLLMProvider(responses=[_llm_questions_payload(count=3)])
    service = LearningCoachService(
        runtime_store=_InMemoryRuntimeStore(),
        persistence_service=_PersistenceStub(),  # type: ignore[arg-type]
        provider_chain=[provider],
    )

    payload = await service.generate_checkpoint(source=source, question_count=3)

    assert payload.generation_source == GENERATION_SOURCE_LLM
    assert payload.question_total == 3
    assert len(payload.questions) == 3
    # LLM 返回的题干里应含关键词
    assert any("LLM 生成题干" in question.stem for question in payload.questions)


@pytest.mark.asyncio
async def test_generate_checkpoint_falls_back_when_chain_empty(
    source: LearningCoachSource,
) -> None:
    service = LearningCoachService(
        runtime_store=_InMemoryRuntimeStore(),
        persistence_service=_PersistenceStub(),  # type: ignore[arg-type]
        provider_chain=[],
    )

    payload = await service.generate_checkpoint(source=source, question_count=2)

    assert payload.generation_source == GENERATION_SOURCE_FALLBACK
    assert payload.question_total == 2


@pytest.mark.asyncio
async def test_generate_checkpoint_falls_back_when_llm_raises(
    source: LearningCoachSource,
) -> None:
    failing_provider = _StubLLMProvider(responses=[])  # 下一次调用即抛错
    service = LearningCoachService(
        runtime_store=_InMemoryRuntimeStore(),
        persistence_service=_PersistenceStub(),  # type: ignore[arg-type]
        provider_chain=[failing_provider],
    )

    payload = await service.generate_checkpoint(source=source, question_count=3)

    # 全部 provider 都失败 → 降级到本地题库，生成 source 标记为 fallback
    assert payload.generation_source == GENERATION_SOURCE_FALLBACK
    assert payload.question_total == 3


@pytest.mark.asyncio
async def test_submit_checkpoint_judges_answers_correctly(
    source: LearningCoachSource,
) -> None:
    provider = _StubLLMProvider(responses=[_llm_questions_payload(count=2)])
    persistence = _PersistenceStub()
    service = LearningCoachService(
        runtime_store=_InMemoryRuntimeStore(),
        persistence_service=persistence,  # type: ignore[arg-type]
        provider_chain=[provider],
    )
    generated = await service.generate_checkpoint(source=source, question_count=2)

    # 全部答对
    submit_all_correct = await service.submit_checkpoint(
        checkpoint_id=generated.checkpoint_id,
        answers=[(question.question_id, "B") for question in generated.questions],
        user_id="user-001",
    )
    assert submit_all_correct.correct_total == 2
    assert submit_all_correct.passed is True
    assert submit_all_correct.persisted is True

    # 第二次生成独立 checkpoint 做"答错一题"
    provider_again = _StubLLMProvider(responses=[_llm_questions_payload(count=2)])
    service_again = LearningCoachService(
        runtime_store=_InMemoryRuntimeStore(),
        persistence_service=_PersistenceStub(),  # type: ignore[arg-type]
        provider_chain=[provider_again],
    )
    generated_again = await service_again.generate_checkpoint(
        source=source, question_count=2
    )

    submit_one_wrong = await service_again.submit_checkpoint(
        checkpoint_id=generated_again.checkpoint_id,
        answers=[
            (generated_again.questions[0].question_id, "B"),  # 对
            (generated_again.questions[1].question_id, "A"),  # 错
        ],
        user_id="user-001",
    )
    assert submit_one_wrong.correct_total == 1
    # 2 题错 1 → passed = correct >= max(1, total-1) = correct >= 1 → True
    assert submit_one_wrong.passed is True


@pytest.mark.asyncio
async def test_submit_checkpoint_returns_persisted_false_on_persistence_failure(
    source: LearningCoachSource,
    caplog: pytest.LogCaptureFixture,
) -> None:
    provider = _StubLLMProvider(responses=[_llm_questions_payload(count=2)])
    persistence = _PersistenceStub(raise_on={"checkpoint"})
    service = LearningCoachService(
        runtime_store=_InMemoryRuntimeStore(),
        persistence_service=persistence,  # type: ignore[arg-type]
        provider_chain=[provider],
    )
    generated = await service.generate_checkpoint(source=source, question_count=2)

    caplog.clear()
    submit = await service.submit_checkpoint(
        checkpoint_id=generated.checkpoint_id,
        answers=[(question.question_id, "B") for question in generated.questions],
        user_id="user-001",
    )

    assert submit.persisted is False
    # logger.exception 应当捕获到 checkpoint.persist_failed
    assert any(
        "learning_coach.checkpoint.persist_failed" in record.message
        for record in caplog.records
    )


@pytest.mark.asyncio
async def test_plan_path_uses_llm_when_provider_available(
    source: LearningCoachSource,
) -> None:
    provider = _StubLLMProvider(responses=[_llm_path_payload()])
    service = LearningCoachService(
        runtime_store=_InMemoryRuntimeStore(),
        persistence_service=_PersistenceStub(),  # type: ignore[arg-type]
        provider_chain=[provider],
    )

    payload = await service.plan_path(source=source, goal="掌握求导", cycle_days=7)

    assert payload.generation_source == GENERATION_SOURCE_LLM
    assert payload.path_title == "LLM 生成的 7 天路径"
    assert len(payload.stages) == 1
    assert payload.stages[0].steps[0].estimated_minutes == 30


@pytest.mark.asyncio
async def test_build_entry_falls_back_to_topic_split_without_provider(
    source: LearningCoachSource,
) -> None:
    service = LearningCoachService(
        runtime_store=_InMemoryRuntimeStore(),
        persistence_service=_PersistenceStub(),  # type: ignore[arg-type]
        provider_chain=[],
    )

    payload = await service.build_entry(source)

    # topic_hint = "链式法则、指数求导" 应被按"、"切分为 2 个知识点
    assert payload.knowledge_points == ["链式法则", "指数求导"]


def test_llm_generator_parses_markdown_fenced_json() -> None:
    raw = f"```json\n{_llm_questions_payload(count=2)}\n```"
    extracted = llm_generator._extract_json_text(raw)
    payload = json.loads(extracted)
    assert len(payload["questions"]) == 2


def test_llm_generator_parses_questions_rejects_short_result() -> None:
    payload = json.loads(_llm_questions_payload(count=2))
    with pytest.raises(llm_generator.LLMGenerationError):
        llm_generator._parse_questions(payload, expected_count=5)
