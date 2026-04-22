"""Tests for scene_generator — each scene type."""

from __future__ import annotations

import json

import pytest

from app.features.openmaic.generation.scene_generator import (
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

_QUIZ_OUTLINE = {
    "id": "scene_2",
    "type": "quiz",
    "title": "知识检验",
    "description": "测试Python基础知识",
    "keyPoints": ["变量类型", "控制流"],
    "order": 2,
    "quizConfig": {"questionCount": 2, "difficulty": "easy", "questionTypes": ["single"]},
}

_INTERACTIVE_OUTLINE = {
    "id": "scene_3",
    "type": "interactive",
    "title": "排序算法可视化",
    "description": "通过动画理解冒泡排序",
    "keyPoints": ["比较", "交换", "递归"],
    "order": 3,
    "widgetType": "simulation",
    "widgetOutline": {"concept": "BubbleSort", "keyVariables": ["array", "step"]},
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
async def test_generate_quiz_content_returns_questions():
    quiz_response = json.dumps({
        "questions": [
            {
                "id": "q_1",
                "type": "single",
                "stem": "Python中用于定义变量的关键字是？",
                "options": [
                    {"id": "opt_a", "label": "A", "content": "var"},
                    {"id": "opt_b", "label": "B", "content": "let"},
                    {"id": "opt_c", "label": "C", "content": "无需关键字"},
                    {"id": "opt_d", "label": "D", "content": "def"},
                ],
                "correctAnswers": ["opt_c"],
                "explanation": "Python不需要关键字声明变量",
                "points": 1,
            }
        ]
    })
    provider = _make_fixed_provider(quiz_response)
    content = await generate_scene_content(_QUIZ_OUTLINE, [provider], language_directive="用中文教学")
    assert "questions" in content
    assert len(content["questions"]) == 1


@pytest.mark.asyncio
async def test_generate_interactive_content_returns_html():
    interactive_response = json.dumps({
        "html": "<!DOCTYPE html><html><body><h1>Sort Viz</h1></body></html>",
        "css": None,
        "js": None,
    })
    provider = _make_fixed_provider(interactive_response)
    content = await generate_scene_content(_INTERACTIVE_OUTLINE, [provider])
    assert "html" in content
    assert "<html" in content["html"].lower()


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
