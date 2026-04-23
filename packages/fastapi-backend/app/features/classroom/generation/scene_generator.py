"""Stage 2: 场景内容与动作生成。

Wave 1 重构：删除 ``quiz`` 与 ``interactive`` 分支（quiz 移交 learning_coach），
新增 ``discussion`` 类型。``slide`` 与 ``pbl`` 保留。
"""

from __future__ import annotations

import logging
import uuid
from typing import Sequence

from app.features.classroom.generation.action_parser import parse_actions_from_structured_output
from app.features.classroom.generation.json_repair import parse_json_response
from app.features.classroom.generation.prompts.scene_actions import (
    SCENE_ACTIONS_SYSTEM_PROMPT,
    build_scene_actions_user_prompt,
)
from app.features.classroom.generation.prompts.scene_slide import (
    SLIDE_CONTENT_SYSTEM_PROMPT,
    build_slide_content_user_prompt,
)
from app.features.classroom.llm_adapter import LLMCallParams, call_llm
from app.providers.protocols import LLMProvider

logger = logging.getLogger(__name__)


async def generate_scene_content(
    outline: dict,
    provider_chain: Sequence[LLMProvider],
    language_directive: str = "",
    course_context: str = "",
    agents: list[dict] | None = None,
) -> dict:
    """Generate content for a single scene based on its outline.

    Wave 1 仅支持 ``slide`` / ``pbl`` / ``discussion``；其他类型回退到 slide。
    """
    scene_type = outline.get("type", "slide")

    if scene_type == "slide":
        return await _generate_slide_content(outline, provider_chain, language_directive, course_context)
    elif scene_type == "pbl":
        return await _generate_pbl_content(outline, provider_chain, language_directive)
    elif scene_type == "discussion":
        return _generate_discussion_content(outline)
    else:
        logger.warning(
            "scene_generator: unsupported scene type %s, falling back to slide", scene_type,
        )
        return await _generate_slide_content(outline, provider_chain, language_directive, course_context)


async def generate_scene_actions(
    outline: dict,
    content: dict,
    provider_chain: Sequence[LLMProvider],
    language_directive: str = "",
    agents: list[dict] | None = None,
) -> list[dict]:
    """Generate agent action sequence for a scene.

    Returns list of action dicts.
    """
    agents = agents or []
    scene_type = outline.get("type", "slide")

    # Build content summary for the prompt
    content_summary = _summarize_content(content, scene_type)

    params = LLMCallParams(
        system=SCENE_ACTIONS_SYSTEM_PROMPT,
        prompt=build_scene_actions_user_prompt(
            outline_title=outline.get("title", ""),
            outline_description=outline.get("description", ""),
            scene_type=scene_type,
            content_summary=content_summary,
            agents=agents,
            language_directive=language_directive,
        ),
    )

    try:
        response = await call_llm(params, provider_chain)
        actions = parse_actions_from_structured_output(response, scene_type=scene_type)
        if actions:
            return actions
    except Exception as exc:  # noqa: BLE001
        logger.warning("generate_scene_actions: LLM failed: %s", exc)

    return _build_fallback_actions(outline)


async def generate_agent_profiles(
    stage_name: str,
    language_directive: str,
    provider_chain: Sequence[LLMProvider],
    stage_description: str | None = None,
    scene_outlines: list[dict] | None = None,
    available_avatars: list[str] | None = None,
) -> list[dict]:
    """Generate agent personas for a classroom session."""
    from app.features.classroom.generation.prompts.agent_profiles import (
        AGENT_PROFILES_SYSTEM_PROMPT,
        build_agent_profiles_user_prompt,
    )

    available_avatars = available_avatars or ["default_teacher", "default_student"]
    scene_outlines = scene_outlines or []

    scene_summary = "\n".join(
        f"{i+1}. {s.get('title', '')} ({s.get('type', 'slide')})"
        for i, s in enumerate(scene_outlines[:10])
    ) or "（暂无场景信息）"

    params = LLMCallParams(
        system=AGENT_PROFILES_SYSTEM_PROMPT,
        prompt=build_agent_profiles_user_prompt(
            stage_name=stage_name,
            stage_description=stage_description,
            scene_outlines_summary=scene_summary,
            language_directive=language_directive,
            available_avatars=available_avatars,
        ),
    )

    try:
        response = await call_llm(params, provider_chain)
        parsed = parse_json_response(response)
        if isinstance(parsed, list) and parsed:
            return parsed
    except Exception as exc:  # noqa: BLE001
        logger.warning("generate_agent_profiles: LLM failed: %s", exc)

    return _build_fallback_agents(stage_name)


# ── Private helpers ─────────────────────────────────────────────────────────────

async def _generate_slide_content(
    outline: dict,
    provider_chain: Sequence[LLMProvider],
    language_directive: str,
    course_context: str,
) -> dict:
    key_points = outline.get("keyPoints", []) or outline.get("key_points", [])
    params = LLMCallParams(
        system=SLIDE_CONTENT_SYSTEM_PROMPT,
        prompt=build_slide_content_user_prompt(
            outline_title=outline.get("title", ""),
            outline_description=outline.get("description", ""),
            key_points=key_points,
            language_directive=language_directive,
            course_context=course_context,
        ),
    )

    try:
        response = await call_llm(params, provider_chain)
        parsed = parse_json_response(response)
        if isinstance(parsed, dict) and "elements" in parsed:
            return parsed
    except Exception as exc:  # noqa: BLE001
        logger.warning("_generate_slide_content: LLM failed: %s", exc)

    return _build_fallback_slide(outline)


def _generate_discussion_content(outline: dict) -> dict:
    """讨论场景的内容仅记录题面与背景，正式 turn 由 director graph 触发。"""
    return {
        "topic": outline.get("title", ""),
        "prompt": outline.get("description", ""),
        "keyPoints": outline.get("keyPoints", []) or outline.get("key_points", []),
    }


async def _generate_pbl_content(
    outline: dict,
    provider_chain: Sequence[LLMProvider],
    language_directive: str,
) -> dict:
    """PBL content generation — simpler structure for P0."""
    pbl_config = outline.get("pblConfig") or {}

    return {
        "projectTitle": pbl_config.get("projectTopic", outline.get("title", "")),
        "projectOverview": pbl_config.get("projectDescription", outline.get("description", "")),
        "issues": [
            {
                "id": f"issue_{i+1}",
                "title": f"任务 {i+1}",
                "description": f"完成项目的第 {i+1} 个关键任务",
                "assigneeRole": "student",
            }
            for i in range(pbl_config.get("issueCount", 3))
        ],
    }


def _summarize_content(content: dict, scene_type: str) -> str:
    """生成动作 prompt 时的简要内容描述。"""
    if scene_type == "slide":
        elements = content.get("elements", [])
        texts = [
            e.get("content", "") for e in elements
            if e.get("type") == "text" and e.get("content")
        ]
        return "\n".join(str(t)[:200] for t in texts[:5]) or "（幻灯片内容）"
    elif scene_type == "pbl":
        return f"项目式学习：{content.get('projectTitle', '')}。{content.get('projectOverview', '')[:200]}"
    elif scene_type == "discussion":
        return f"讨论环节：{content.get('topic', '')} —— {content.get('prompt', '')[:200]}"
    return "（场景内容）"


def _build_fallback_slide(outline: dict) -> dict:
    """Minimal slide content as fallback when LLM fails."""
    title_id = f"text_{uuid.uuid4().hex[:6]}"
    body_id = f"text_{uuid.uuid4().hex[:6]}"
    key_points = outline.get("keyPoints", []) or outline.get("key_points", [])
    points_html = "".join(
        f'<li style="margin:4px 0">{kp}</li>' for kp in key_points[:5]
    )

    return {
        "background": {"type": "solid", "color": "#ffffff"},
        "elements": [
            {
                "id": title_id,
                "type": "text",
                "left": 60,
                "top": 60,
                "width": 880,
                "height": 76,
                "content": f'<p style="font-size:32px;font-weight:bold;color:#1a1a1a">{outline.get("title", "")}</p>',
                "defaultFontName": "",
                "defaultColor": "#333333",
            },
            {
                "id": body_id,
                "type": "text",
                "left": 60,
                "top": 160,
                "width": 880,
                "height": 300,
                "content": f'<ul style="font-size:18px;color:#333;line-height:1.6">{points_html}</ul>',
                "defaultFontName": "",
                "defaultColor": "#444444",
            },
        ],
    }


def _build_fallback_agents(stage_name: str) -> list[dict]:
    """Minimal agent list as fallback."""
    return [
        {
            "id": "agent_teacher",
            "name": "张老师",
            "role": "teacher",
            "persona": "资深教育工作者，擅长将复杂知识简单化，教学风格生动有趣。",
            "avatar": "default_teacher",
            "color": "#4A90D9",
        },
        {
            "id": "agent_student",
            "name": "小明",
            "role": "student",
            "persona": "好奇心强的学生，喜欢提问，思维活跃。",
            "avatar": "default_student",
            "color": "#2ECC71",
        },
    ]


def _build_fallback_actions(outline: dict) -> list[dict]:
    """Minimal action list as fallback."""
    title = outline.get("title", "本节内容")
    return [
        {
            "id": f"action_{uuid.uuid4().hex[:8]}",
            "type": "speech",
            "text": "让我们开始学习'{}'。".format(title),
        }
    ]
