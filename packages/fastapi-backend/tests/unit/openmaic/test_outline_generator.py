"""Tests for outline_generator — SSE streaming smoke test with stub provider."""

from __future__ import annotations

import json

import pytest

from app.features.openmaic.generation.outline_generator import (
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
            "type": "quiz",
            "title": "知识检验",
            "description": "测试对微积分基本概念的理解",
            "keyPoints": ["导数计算", "极限"],
            "order": 2,
            "quizConfig": {"questionCount": 2, "difficulty": "medium", "questionTypes": ["single"]},
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
    assert outlines[1]["type"] == "quiz"


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
async def test_generate_scene_outlines_handles_malformed():
    """Malformed JSON → fallback outline returned."""
    provider = _make_stub_with_response("This is not JSON at all!")
    result = await generate_scene_outlines("test", [provider])
    # Should get fallback outline (at least one scene)
    assert len(result["outlines"]) >= 1


@pytest.mark.asyncio
async def test_stream_scene_outlines_yields_at_least_one_chunk():
    provider = _make_stub_with_response(_VALID_OUTLINE_JSON)
    chunks = []
    async for chunk in stream_scene_outlines("教我Python", [provider]):
        chunks.append(chunk)
    assert len(chunks) >= 1
    assert any(len(c) > 0 for c in chunks)
