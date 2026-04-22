"""LearningCoachService.preload_for_session 单元测试。

视频流水线完成时后台会调 preload_for_session：提前生成 quiz + checkpoint、
写 session → id 指针到 xm_learning_preloaded:*。用户点开 quiz 时命中缓存不再调 LLM。
"""
from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.features.learning_coach import llm_generator
from app.features.learning_coach.schemas import (
    LearningCoachSource,
    LearningCoachSourceType,
)
from app.features.learning_coach.service import (
    GENERATION_SOURCE_LLM,
    PRELOAD_SCHEDULE_LOCK_KEY,
    PRELOADED_CHECKPOINT_KEY,
    PRELOADED_QUIZ_KEY,
    LearningCoachService,
    _runtime_key,
)
from app.providers.protocols import ProviderResult, ProviderRuntimeConfig


class _InMemoryRuntimeStore:
    """最小 runtime_store 替身，记录 TTL 便于断言指针过期逻辑。"""

    def __init__(self) -> None:
        self._values: dict[str, Any] = {}
        self.ttls: dict[str, int | None] = {}

    def set_runtime_value(
        self, key: str, value: Any, *, ttl_seconds: int | None = None
    ) -> None:
        self._values[key] = value
        self.ttls[key] = ttl_seconds

    def get_runtime_value(self, key: str) -> Any:
        return self._values.get(key)

    def drop(self, key: str) -> None:
        self._values.pop(key, None)


class _StubLLMProvider:
    provider_id = "stub-llm"
    config = ProviderRuntimeConfig(provider_id="stub-llm")

    def __init__(self, responses: list[str]) -> None:
        self._responses = list(responses)
        self.call_count = 0

    async def generate(self, prompt: str) -> ProviderResult:
        self.call_count += 1
        if not self._responses:
            raise llm_generator.LLMGenerationError("stub: exhausted")
        return ProviderResult(provider=self.provider_id, content=self._responses.pop(0))


class _StubVisionProvider:
    """支持 vision 的 provider 替身：用于验证 image_ref 到 generate_vision 的传递。"""

    provider_id = "stub-vision"
    config = ProviderRuntimeConfig(provider_id="stub-vision")

    def __init__(self, responses: list[str]) -> None:
        self._responses = list(responses)
        self.text_calls: list[str] = []
        self.vision_calls: list[dict[str, str]] = []

    async def generate(self, prompt: str) -> ProviderResult:
        self.text_calls.append(prompt)
        if not self._responses:
            raise llm_generator.LLMGenerationError("stub: exhausted")
        return ProviderResult(provider=self.provider_id, content=self._responses.pop(0))

    async def generate_vision(
        self, prompt: str, *, image_base64: str, image_media_type: str = "image/jpeg"
    ) -> ProviderResult:
        self.vision_calls.append(
            {"prompt": prompt, "mime": image_media_type, "b64_len": str(len(image_base64))}
        )
        if not self._responses:
            raise llm_generator.LLMGenerationError("stub: exhausted")
        return ProviderResult(provider=self.provider_id, content=self._responses.pop(0))


def _questions_payload(count: int) -> str:
    questions = []
    for idx in range(1, count + 1):
        questions.append(
            {
                "question_id": f"q{idx}",
                "tag": f"tag-{idx}",
                "stem": f"预生成题干 {idx}",
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


@pytest.fixture
def source() -> LearningCoachSource:
    return LearningCoachSource(
        source_type=LearningCoachSourceType.VIDEO,
        source_session_id="video-task-abc",
        source_task_id="video-task-abc",
        topic_hint="链式法则",
    )


@pytest.mark.asyncio
async def test_preload_for_session_stores_pointer(source: LearningCoachSource) -> None:
    store = _InMemoryRuntimeStore()
    provider = _StubLLMProvider(
        responses=[_questions_payload(10), _questions_payload(3)]
    )
    persistence = AsyncMock()
    service = LearningCoachService(
        runtime_store=store,
        persistence_service=persistence,
        provider_chain=[provider],
    )

    ids = await service.preload_for_session(source)

    quiz_pointer = store.get_runtime_value(
        PRELOADED_QUIZ_KEY.format(session_id=source.source_session_id)
    )
    checkpoint_pointer = store.get_runtime_value(
        PRELOADED_CHECKPOINT_KEY.format(session_id=source.source_session_id)
    )
    assert isinstance(quiz_pointer, dict)
    assert quiz_pointer["id"] == ids["quiz_id"]
    assert "generated_at" in quiz_pointer
    assert isinstance(checkpoint_pointer, dict)
    assert checkpoint_pointer["id"] == ids["checkpoint_id"]
    # 指针 TTL 必须 > quiz 运行态 TTL（2h），让用户有时间慢慢点开。
    assert (store.ttls[PRELOADED_QUIZ_KEY.format(session_id=source.source_session_id)] or 0) > 2 * 60 * 60
    # 原始 state 也应写进去（generate_quiz/generate_checkpoint 的副作用）。
    assert store.get_runtime_value(_runtime_key("quiz", ids["quiz_id"])) is not None
    assert store.get_runtime_value(_runtime_key("checkpoint", ids["checkpoint_id"])) is not None


@pytest.mark.asyncio
async def test_generate_quiz_hits_cache_when_preloaded(
    source: LearningCoachSource,
) -> None:
    store = _InMemoryRuntimeStore()
    provider = _StubLLMProvider(
        responses=[_questions_payload(10), _questions_payload(3)]
    )
    service = LearningCoachService(
        runtime_store=store,
        persistence_service=AsyncMock(),
        provider_chain=[provider],
    )
    ids = await service.preload_for_session(source)
    preload_calls = provider.call_count
    assert preload_calls == 2  # quiz + checkpoint 各一次 LLM

    # 再次请求 quiz，不该再动 LLM。
    payload = await service.generate_quiz(source=source, question_count=10)

    assert payload.quiz_id == ids["quiz_id"]
    assert provider.call_count == preload_calls  # 零新增 LLM 调用
    assert payload.generation_source == GENERATION_SOURCE_LLM
    assert len(payload.questions) == 10
    assert payload.questions[0].stem.startswith("预生成题干")


@pytest.mark.asyncio
async def test_generate_quiz_falls_back_when_preload_expired(
    source: LearningCoachSource,
) -> None:
    store = _InMemoryRuntimeStore()
    # 预生成两次 LLM，命中路径再生成一次 LLM（cache miss 后走正常路径）
    provider = _StubLLMProvider(
        responses=[_questions_payload(10), _questions_payload(3), _questions_payload(5)]
    )
    service = LearningCoachService(
        runtime_store=store,
        persistence_service=AsyncMock(),
        provider_chain=[provider],
    )
    ids = await service.preload_for_session(source)
    # 模拟原始 state 过期（例如 quiz TTL 2h < 指针 TTL 6h，用户隔夜回来）
    store.drop(_runtime_key("quiz", ids["quiz_id"]))

    payload = await service.generate_quiz(source=source, question_count=5)

    # 新生成的 quiz_id 必须不同，走了 LLM 路径
    assert payload.quiz_id != ids["quiz_id"]
    assert provider.call_count == 3  # 2 preload + 1 fallback generate
    assert len(payload.questions) == 5


# ------------------- build_entry → preload 触发 -------------------


class _StubActor:
    """Dramatiq actor 替身：记录 send 调用参数。"""

    def __init__(self) -> None:
        self.sent: list[tuple[Any, ...]] = []

    def send(self, *args: Any) -> None:
        self.sent.append(args)


@pytest.mark.asyncio
async def test_build_entry_schedules_preload_when_missing(
    monkeypatch: pytest.MonkeyPatch, source: LearningCoachSource
) -> None:
    store = _InMemoryRuntimeStore()
    service = LearningCoachService(
        runtime_store=store,
        persistence_service=AsyncMock(),
        provider_chain=[],
    )
    actor = _StubActor()
    # 注入 app.worker.preload_learning_coach_actor：service 内部延迟 import。
    import app.worker as worker_module

    monkeypatch.setattr(worker_module, "preload_learning_coach_actor", actor, raising=False)

    await service.build_entry(source)

    assert len(actor.sent) == 1
    sent = actor.sent[0]
    assert sent[0] == source.source_session_id
    assert sent[1] == (source.topic_hint or "")
    # access_token / client_id 一律传 None：actor 内部 resolver 有 settings 链回退。
    assert sent[2] is None
    assert sent[3] is None
    # 锁已写入，防止下一次调用重复 send
    lock_key = PRELOAD_SCHEDULE_LOCK_KEY.format(session_id=source.source_session_id)
    assert store.get_runtime_value(lock_key) is not None


@pytest.mark.asyncio
async def test_build_entry_skips_preload_when_already_cached(
    monkeypatch: pytest.MonkeyPatch, source: LearningCoachSource
) -> None:
    store = _InMemoryRuntimeStore()
    # 视频完成钩子已经预生成过：quiz 指针已存在。
    store.set_runtime_value(
        PRELOADED_QUIZ_KEY.format(session_id=source.source_session_id),
        {"id": "quiz_existing", "generated_at": "2026-04-22T00:00:00+00:00"},
        ttl_seconds=6 * 60 * 60,
    )
    service = LearningCoachService(
        runtime_store=store,
        persistence_service=AsyncMock(),
        provider_chain=[],
    )
    actor = _StubActor()
    import app.worker as worker_module

    monkeypatch.setattr(worker_module, "preload_learning_coach_actor", actor, raising=False)

    await service.build_entry(source)

    assert actor.sent == []  # 已缓存：不再 send
    lock_key = PRELOAD_SCHEDULE_LOCK_KEY.format(session_id=source.source_session_id)
    assert store.get_runtime_value(lock_key) is None  # 锁也不应写入


@pytest.mark.asyncio
async def test_build_entry_skips_preload_when_lock_held(
    monkeypatch: pytest.MonkeyPatch, source: LearningCoachSource
) -> None:
    store = _InMemoryRuntimeStore()
    # 上一次调用刚写过锁
    store.set_runtime_value(
        PRELOAD_SCHEDULE_LOCK_KEY.format(session_id=source.source_session_id),
        {"scheduled_at": "2026-04-22T00:00:00+00:00"},
        ttl_seconds=30,
    )
    service = LearningCoachService(
        runtime_store=store,
        persistence_service=AsyncMock(),
        provider_chain=[],
    )
    actor = _StubActor()
    import app.worker as worker_module

    monkeypatch.setattr(worker_module, "preload_learning_coach_actor", actor, raising=False)

    await service.build_entry(source)

    assert actor.sent == []  # 锁存在：跳过


@pytest.mark.asyncio
async def test_quiz_generation_uses_vision_when_image_ref_and_vision_provider(
    tmp_path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Source 带 image_ref + provider 支持 vision 时，quiz 走 generate_vision 并注入图片。"""
    from app.features.learning_coach.schemas import LearningCoachSourceSolutionStep

    monkeypatch.setattr(
        "app.core.config.get_settings",
        lambda: type("S", (), {"video_image_storage_root": str(tmp_path)})(),
    )
    img_rel_dir = tmp_path / "20260422"
    img_rel_dir.mkdir(parents=True)
    img_path = img_rel_dir / "quiz-test.png"
    img_path.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 32)

    source = LearningCoachSource(
        source_type=LearningCoachSourceType.VIDEO,
        source_session_id="vtask-vision",
        source_task_id="vtask-vision",
        topic_hint="几何证明",
        topic_summary="题目讲的是正方形 ABCD …",
        knowledge_points=["全等三角形", "45° 角"],
        solution_steps=[
            LearningCoachSourceSolutionStep(
                title="抽出等角", explanation="由正方形得 ∠ABP = 90°"
            ),
        ],
        image_ref="local://20260422/quiz-test.png",
    )
    provider = _StubVisionProvider(
        responses=[_questions_payload(5), _questions_payload(3)]
    )
    service = LearningCoachService(
        runtime_store=_InMemoryRuntimeStore(),
        persistence_service=AsyncMock(),
        provider_chain=[provider],
    )

    payload = await service.generate_quiz(
        source=source, question_count=5, reuse_preloaded=False
    )

    assert payload.generation_source == GENERATION_SOURCE_LLM
    # 走了 vision 路径，不是纯文本 generate
    assert len(provider.vision_calls) == 1, "预期调用 generate_vision 一次"
    assert provider.text_calls == []
    call = provider.vision_calls[0]
    # prompt 中包含所有 understanding 结构化要点
    assert "题目完整讲解" in call["prompt"]
    assert "全等三角形" in call["prompt"]
    assert "抽出等角" in call["prompt"]
    assert "原题图片" in call["prompt"]
    # image base64 非空且 mime 正确
    assert call["mime"] == "image/png"
    assert int(call["b64_len"]) > 0


@pytest.mark.asyncio
async def test_quiz_generation_falls_back_to_text_when_image_missing_on_disk(
    tmp_path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """image_ref 指向不存在的文件时，不阻塞 quiz：优雅降级到纯文本 generate。"""
    monkeypatch.setattr(
        "app.core.config.get_settings",
        lambda: type("S", (), {"video_image_storage_root": str(tmp_path)})(),
    )
    source = LearningCoachSource(
        source_type=LearningCoachSourceType.VIDEO,
        source_session_id="vtask-missing",
        image_ref="local://missing/nope.png",
        topic_summary="摘要",
    )
    provider = _StubVisionProvider(
        responses=[_questions_payload(3), _questions_payload(2)]
    )
    service = LearningCoachService(
        runtime_store=_InMemoryRuntimeStore(),
        persistence_service=AsyncMock(),
        provider_chain=[provider],
    )
    payload = await service.generate_quiz(
        source=source, question_count=3, reuse_preloaded=False
    )
    assert payload.generation_source == GENERATION_SOURCE_LLM
    # 图读不到 → 走 text generate，不走 vision
    assert provider.vision_calls == []
    assert len(provider.text_calls) == 1
