"""Tests for scene_generator — each scene type."""

from __future__ import annotations

import json

import pytest

from app.features.classroom.generation.scene_generator import (
    generate_scene_content,
    generate_scene_actions,
)
from app.providers.protocols import ProviderResult


def _make_fixed_provider(response_text: str) -> object:
    class FixedProvider:
        provider_id = "stub-fixed"

        async def generate(self, _prompt: str) -> ProviderResult:
            return ProviderResult(
                provider="stub-fixed",
                content=response_text,
                metadata={},
            )

    return FixedProvider()


_SLIDE_OUTLINE = {
    "id": "scene_1",
    "type": "slide",
    "title": "Python基础",
    "description": "介绍Python编程基础",
    "keyPoints": ["变量", "循环", "函数"],
    "order": 1,
}

# NOTE: quiz / interactive 场景类型已在 Wave 1 移除（Task 8），相关用例随之删除。
_DISCUSSION_OUTLINE = {
    "id": "scene_disc",
    "type": "discussion",
    "title": "Python风格之争",
    "description": "围绕代码风格展开讨论",
    "keyPoints": ["缩进", "命名"],
    "order": 2,
}


@pytest.mark.asyncio
async def test_generate_slide_content_returns_elements():
    slide_response = json.dumps({
        "background": {"type": "solid", "color": "#ffffff"},
        "elements": [
            {"id": "t1", "type": "text", "left": 60, "top": 60, "width": 880, "height": 80,
             "content": "<p>Python基础</p>"},
        ],
    })
    provider = _make_fixed_provider(slide_response)
    content = await generate_scene_content(_SLIDE_OUTLINE, [provider], language_directive="用中文教学")
    assert "elements" in content
    assert isinstance(content["elements"], list)


@pytest.mark.asyncio
async def test_generate_discussion_content_returns_topic():
    """讨论类型场景内容只回传题面，不调用 LLM。"""
    provider = _make_fixed_provider("(should-not-be-called)")
    content = await generate_scene_content(_DISCUSSION_OUTLINE, [provider])
    assert content["topic"] == "Python风格之争"
    assert "缩进" in content["keyPoints"]


@pytest.mark.asyncio
async def test_generate_slide_fallback_on_invalid_response():
    """Malformed response → fallback slide with at least one element."""
    provider = _make_fixed_provider("not valid json at all")
    content = await generate_scene_content(_SLIDE_OUTLINE, [provider])
    assert "elements" in content


@pytest.mark.asyncio
async def test_generate_scene_actions_returns_list():
    actions_response = json.dumps([
        {"type": "action", "name": "spotlight", "params": {"elementId": "t1"}},
        {"type": "text", "content": "让我们来学习Python基础。"},
    ])
    provider = _make_fixed_provider(actions_response)
    slide_content = {
        "background": {"type": "solid", "color": "#fff"},
        "elements": [{"id": "t1", "type": "text"}],
    }
    actions = await generate_scene_actions(
        outline=_SLIDE_OUTLINE,
        content=slide_content,
        provider_chain=[provider],
        language_directive="用中文教学",
    )
    assert isinstance(actions, list)
    assert len(actions) >= 1


@pytest.mark.asyncio
async def test_generate_scene_actions_fallback_on_failure():
    """LLM failure → fallback actions returned."""
    from app.providers.protocols import ProviderError

    class FailingProvider:
        provider_id = "stub-fail"

        async def generate(self, _prompt: str) -> ProviderResult:
            raise ProviderError("simulated")

    actions = await generate_scene_actions(
        outline=_SLIDE_OUTLINE,
        content={},
        provider_chain=[FailingProvider()],
    )
    # Fallback returns at least one speech action
    assert len(actions) >= 1
    assert actions[0]["type"] == "speech"
