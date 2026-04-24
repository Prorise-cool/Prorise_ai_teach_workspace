"""Phase 5: 互动 outline + widget HTML 生成单测。

守护点：
- outline.py 菜单级移除 quiz（zh 系统 prompt 里不再有 "quiz" 词）
- outline.py 保留 interactive 合法（不再禁令）
- interactive_outline.py 输出裸数组时 outline_generator 能 normalize
- widget_generator 按 widgetType 分派 5 份不同 prompt
- widget_generator 失败（非 HTML 返回）→ None（调用方回落）
- widget_generator 剥 markdown 围栏
"""
from __future__ import annotations

from typing import Any

import pytest

from app.features.classroom.generation.outline_generator import generate_scene_outlines
from app.features.classroom.generation.prompts.interactive_outline import (
    INTERACTIVE_OUTLINE_SYSTEM_PROMPT,
    build_interactive_outline_user_prompt,
)
from app.features.classroom.generation.prompts.outline import OUTLINE_SYSTEM_PROMPT
from app.features.classroom.generation.prompts.widget import resolve_widget_prompts
from app.features.classroom.generation.widget_generator import generate_widget_html
from app.features.classroom.llm_adapter import CLASSROOM_LLM_STAGE_CODES
from app.providers.protocols import ProviderResult


# ─── prompt 层 ────────────────────────────────────────────────────────────────

def test_outline_prompt_no_quiz_in_menu() -> None:
    """Quiz 从大纲菜单彻底移除（菜单级抹除）。"""
    assert "quiz" not in OUTLINE_SYSTEM_PROMPT.lower()


def test_outline_prompt_lists_interactive() -> None:
    """Interactive 应在合法场景类型列表里（打开了）。"""
    assert "interactive" in OUTLINE_SYSTEM_PROMPT.lower()
    # 必须带 widgetType / widgetOutline 的强制要求
    assert "widgetType" in OUTLINE_SYSTEM_PROMPT
    assert "widgetOutline" in OUTLINE_SYSTEM_PROMPT


def test_outline_prompt_no_forbidden_quiz_clause() -> None:
    """禁令式的"严禁 quiz"表述必须被删除（菜单级 vs 禁令级的区别）。"""
    assert "严禁" not in OUTLINE_SYSTEM_PROMPT
    assert "禁止生成" not in OUTLINE_SYSTEM_PROMPT


def test_interactive_outline_prompt_has_distribution_targets() -> None:
    """互动优先模式 system prompt 应含 widget 分布目标。"""
    assert "simulation" in INTERACTIVE_OUTLINE_SYSTEM_PROMPT
    assert "game" in INTERACTIVE_OUTLINE_SYSTEM_PROMPT
    assert "visualization3d" in INTERACTIVE_OUTLINE_SYSTEM_PROMPT


def test_interactive_outline_user_prompt_includes_constraints() -> None:
    prompt = build_interactive_outline_user_prompt(
        requirement="教抛体运动",
        scene_count=8,
        duration_minutes=20,
    )
    assert "抛体运动" in prompt
    assert "8 个场景" in prompt
    assert "20 分钟" in prompt
    # 硬性分布目标必须在 user prompt 里
    assert "70%" in prompt
    assert "simulation" in prompt


def test_widget_html_stage_registered() -> None:
    """llm_adapter 必须注册 widget_html stage，否则 resolve 时 ValueError。"""
    assert "widget_html" in CLASSROOM_LLM_STAGE_CODES


# ─── widget prompts 分派 ─────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "widget_type,marker",
    [
        ("simulation", "模拟"),
        ("diagram", "图示"),
        ("code", "代码"),
        ("game", "游戏"),
        ("visualization3d", "3D"),
    ],
)
def test_resolve_widget_prompts_returns_unique_system_per_type(
    widget_type: str, marker: str
) -> None:
    system, builder = resolve_widget_prompts(widget_type)
    assert callable(builder)
    assert len(system) > 100
    # 每个 widget 的 system prompt 都应该提到自己的类型（中文 marker）
    assert marker in system, f"{widget_type} system prompt 缺少 marker {marker!r}"


def test_resolve_widget_prompts_unknown_type_falls_back() -> None:
    """未知 widget_type 不应抛异常，应回退到 simulation。"""
    system_unknown, _ = resolve_widget_prompts("bogus_type_xyz")
    system_sim, _ = resolve_widget_prompts("simulation")
    assert system_unknown == system_sim


def test_all_widget_prompts_embed_postmessage_listener() -> None:
    """所有 widget prompt 必须包含 postMessage 监听器片段，保证教师动作协议一致。"""
    for widget_type in ["simulation", "diagram", "code", "game", "visualization3d"]:
        system, _ = resolve_widget_prompts(widget_type)
        assert "SET_WIDGET_STATE" in system, f"{widget_type} 缺少 postMessage 协议"
        assert "HIGHLIGHT_ELEMENT" in system, f"{widget_type} 缺少 HIGHLIGHT_ELEMENT"


# ─── outline_generator 兼容两种输出 shape ────────────────────────────────────

class _StubLLM:
    def __init__(self, response: str) -> None:
        self._response = response
        self.provider_id = "stub-model"

    async def generate(self, _prompt: str) -> ProviderResult:
        return ProviderResult(provider=self.provider_id, content=self._response, metadata={})


@pytest.mark.asyncio
async def test_outline_generator_handles_bare_array_from_interactive_mode() -> None:
    """互动优先模式返回裸数组 [...]，outline_generator 应 normalize 成 dict。"""
    bare_array = (
        '[{"id":"scene_1","type":"slide","title":"引入",'
        '"description":"x","keyPoints":["a","b","c"],"order":1}]'
    )
    stub = _StubLLM(bare_array)
    result = await generate_scene_outlines(
        requirement="测试",
        provider_chain=(stub,),  # type: ignore[arg-type]
        interactive_mode=True,
    )
    assert "languageDirective" in result
    assert "outlines" in result
    assert len(result["outlines"]) == 1
    assert result["outlines"][0]["type"] == "slide"


@pytest.mark.asyncio
async def test_outline_generator_handles_wrapper_from_default_mode() -> None:
    wrapper = (
        '{"languageDirective":"请用中文教学。","outlines":['
        '{"id":"scene_1","type":"slide","title":"t",'
        '"description":"d","keyPoints":["a","b"],"order":1}'
        ']}'
    )
    stub = _StubLLM(wrapper)
    result = await generate_scene_outlines(
        requirement="测试",
        provider_chain=(stub,),  # type: ignore[arg-type]
        interactive_mode=False,
    )
    assert result["languageDirective"] == "请用中文教学。"
    assert result["outlines"][0]["id"] == "scene_1"


# ─── widget_generator 行为 ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_widget_generator_returns_html_for_simulation() -> None:
    html_body = "<!DOCTYPE html>\n<html><body>widget</body></html>"
    stub = _StubLLM(html_body)
    outline: dict[str, Any] = {
        "id": "scene_1",
        "type": "interactive",
        "title": "抛体",
        "description": "模拟抛体",
        "keyPoints": ["角度", "速度"],
        "widgetType": "simulation",
        "widgetOutline": {
            "concept": "projectile",
            "keyVariables": ["angle", "velocity"],
        },
    }
    result = await generate_widget_html(
        outline=outline,
        provider_chain=(stub,),  # type: ignore[arg-type]
    )
    assert result is not None
    assert result.lower().startswith("<!doctype html")


@pytest.mark.asyncio
async def test_widget_generator_strips_markdown_fence() -> None:
    """LLM 返回 ```html ... ``` 围栏时应剥掉。"""
    fenced = "```html\n<!DOCTYPE html>\n<html><body>x</body></html>\n```"
    stub = _StubLLM(fenced)
    outline = {
        "id": "s1",
        "type": "interactive",
        "title": "x",
        "widgetType": "game",
        "widgetOutline": {"gameType": "action", "challenge": "demo"},
    }
    result = await generate_widget_html(
        outline=outline,
        provider_chain=(stub,),  # type: ignore[arg-type]
    )
    assert result is not None
    assert result.lower().startswith("<!doctype html")
    assert "```" not in result


@pytest.mark.asyncio
async def test_widget_generator_returns_none_when_llm_returns_non_html() -> None:
    """非 HTML 返回（如 LLM 说 "抱歉我不能..."）必须返回 None 让上游回落。"""
    stub = _StubLLM("抱歉，我暂时无法生成这个互动内容")
    outline = {
        "id": "s1",
        "type": "interactive",
        "title": "x",
        "widgetType": "simulation",
        "widgetOutline": {},
    }
    result = await generate_widget_html(
        outline=outline,
        provider_chain=(stub,),  # type: ignore[arg-type]
    )
    assert result is None


@pytest.mark.asyncio
async def test_widget_generator_unknown_widget_type_still_generates() -> None:
    """未知 widget_type 不应让生成失败 —— 回退到 simulation prompt。"""
    html_body = "<!DOCTYPE html>\n<html></html>"
    stub = _StubLLM(html_body)
    outline = {
        "id": "s1",
        "type": "interactive",
        "title": "x",
        "widgetType": "unknown_type",
        "widgetOutline": {},
    }
    result = await generate_widget_html(
        outline=outline,
        provider_chain=(stub,),  # type: ignore[arg-type]
    )
    assert result is not None


# ─── InteractiveContent schema 扩展 ──────────────────────────────────────────

def test_interactive_content_accepts_widget_html_alias() -> None:
    """Schema 应同时接受 camelCase (widgetHtml) 和 snake_case (widget_html)。"""
    from app.features.classroom.schemas import InteractiveContent

    model_camel = InteractiveContent.model_validate({
        "widgetHtml": "<html></html>",
        "widgetType": "simulation",
        "widgetOutline": {"concept": "x"},
    })
    assert model_camel.widget_html == "<html></html>"
    assert model_camel.widget_type == "simulation"
    assert model_camel.widget_outline == {"concept": "x"}

    model_snake = InteractiveContent.model_validate({
        "widget_html": "<html></html>",
        "widget_type": "game",
        "widget_outline": {"gameType": "action"},
    })
    assert model_snake.widget_html == "<html></html>"
    assert model_snake.widget_type == "game"


def test_interactive_content_legacy_html_field_still_works() -> None:
    """历史数据的 html 字段不能因为 widgetHtml 的加入就反序列化失败。"""
    from app.features.classroom.schemas import InteractiveContent

    legacy = InteractiveContent.model_validate({"html": "<html>legacy</html>"})
    assert legacy.html == "<html>legacy</html>"
    assert legacy.widget_html is None
