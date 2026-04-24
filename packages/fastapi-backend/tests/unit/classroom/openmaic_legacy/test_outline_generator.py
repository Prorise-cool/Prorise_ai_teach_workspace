"""Tests for outline_generator — SSE streaming smoke test with stub provider."""

from __future__ import annotations

import json

import pytest

from app.features.classroom.generation.outline_generator import (
    generate_scene_outlines,
    stream_scene_outlines,
)
from app.providers.protocols import ProviderResult, ProviderRuntimeConfig
from app.providers.llm.stub_provider import StubLLMProvider


def _make_stub_with_response(response_text: str) -> object:
    """Create a provider that returns a specific response."""

    class FixedProvider:
        provider_id = "stub-fixed"

        async def generate(self, _prompt: str) -> ProviderResult:
            return ProviderResult(
                provider="stub-fixed",
                content=response_text,
                metadata={},
            )

    return FixedProvider()


_VALID_OUTLINE_JSON = json.dumps({
    "languageDirective": "请用中文进行教学，专业术语保留英文。",
    "outlines": [
        {
            "id": "scene_1",
            "type": "slide",
            "title": "微积分介绍",
            "description": "介绍微积分的基本概念",
            "keyPoints": ["导数定义", "积分概念", "基本定理"],
            "order": 1,
        },
        {
            "id": "scene_2",
            "type": "discussion",
            "title": "知识检验",
            "description": "测试对微积分基本概念的理解",
            "keyPoints": ["导数计算", "极限"],
            "order": 2,
        },
    ],
}, ensure_ascii=False)


@pytest.mark.asyncio
async def test_generate_scene_outlines_returns_structured():
    provider = _make_stub_with_response(_VALID_OUTLINE_JSON)
    result = await generate_scene_outlines("教我微积分基础", [provider])

    assert "outlines" in result
    assert "languageDirective" in result
    outlines = result["outlines"]
    assert len(outlines) == 2
    assert outlines[0]["type"] == "slide"
    assert outlines[1]["type"] == "discussion"


@pytest.mark.asyncio
async def test_generate_scene_outlines_handles_flat_array():
    """LLM returns flat array instead of object — should still work."""
    flat_json = json.dumps([
        {
            "id": "scene_1",
            "type": "slide",
            "title": "Test",
            "description": "Test scene",
            "keyPoints": ["point"],
            "order": 1,
        }
    ])
    provider = _make_stub_with_response(flat_json)
    result = await generate_scene_outlines("test topic", [provider])
    assert len(result["outlines"]) == 1


@pytest.mark.asyncio
async def test_generate_scene_outlines_raises_on_malformed():
    """大纲是整堂课骨架：malformed JSON 一律 fail-fast。

    Wave 2 移除占位大纲降级 —— 用户看到 1 个通用"XX 的介绍"场景比看到
    报错更困惑。由 job_runner 外层接住异常并把任务标为 failed 让前端
    展示真实错误、提示用户重试。
    """
    provider = _make_stub_with_response("This is not JSON at all!")
    with pytest.raises(RuntimeError, match="无法解析为 JSON"):
        await generate_scene_outlines("test", [provider])


@pytest.mark.asyncio
async def test_generate_scene_outlines_raises_on_unexpected_shape():
    """LLM 返回 JSON 但字段形状异常 → fail-fast。"""
    provider = _make_stub_with_response('{"unexpected": "payload"}')
    with pytest.raises(RuntimeError, match="响应形状异常"):
        await generate_scene_outlines("test", [provider])


@pytest.mark.asyncio
async def test_generate_scene_outlines_raises_on_empty_outlines():
    """LLM 返回了合法 JSON 但 outlines 数组为空 → fail-fast。"""
    provider = _make_stub_with_response('{"languageDirective": "zh", "outlines": []}')
    with pytest.raises(RuntimeError, match="空 outlines 数组"):
        await generate_scene_outlines("test", [provider])


@pytest.mark.asyncio
async def test_generate_scene_outlines_injects_hard_constraints_into_prompt():
    """Phase 1: scene_count / duration_minutes 必须以硬性约束文本注入 user prompt。"""

    captured: dict[str, str] = {}

    class CapturingProvider:
        provider_id = "stub-capture"

        async def generate(self, prompt: str) -> ProviderResult:
            captured["prompt"] = prompt
            return ProviderResult(
                provider="stub-capture",
                content=_VALID_OUTLINE_JSON,
                metadata={},
            )

    provider = CapturingProvider()
    await generate_scene_outlines(
        "教我微积分基础",
        [provider],
        scene_count=15,
        duration_minutes=30,
    )

    prompt = captured["prompt"]
    assert "恰好生成 15 个场景" in prompt
    assert "总时长约 30 分钟" in prompt


@pytest.mark.asyncio
async def test_generate_scene_outlines_omits_constraints_when_not_specified():
    """未提供 scene_count / duration_minutes 时不注入硬性约束段落。"""

    captured: dict[str, str] = {}

    class CapturingProvider:
        provider_id = "stub-capture"

        async def generate(self, prompt: str) -> ProviderResult:
            captured["prompt"] = prompt
            return ProviderResult(
                provider="stub-capture",
                content=_VALID_OUTLINE_JSON,
                metadata={},
            )

    await generate_scene_outlines("教我微积分基础", [CapturingProvider()])

    prompt = captured["prompt"]
    assert "硬性约束" not in prompt
    assert "恰好生成" not in prompt


@pytest.mark.asyncio
async def test_stream_scene_outlines_yields_at_least_one_chunk():
    provider = _make_stub_with_response(_VALID_OUTLINE_JSON)
    chunks = []
    async for chunk in stream_scene_outlines("教我Python", [provider]):
        chunks.append(chunk)
    assert len(chunks) >= 1
    assert any(len(c) > 0 for c in chunks)
