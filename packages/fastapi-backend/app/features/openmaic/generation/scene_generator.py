"""Stage 2: Scene content and action generation.

Ported from OpenMAIC /lib/generation/scene-generator.ts.
Generates slide/quiz/interactive/PBL content + agent actions per scene.
"""

from __future__ import annotations

import logging
import uuid
from typing import Sequence

from app.features.openmaic.generation.action_parser import parse_actions_from_structured_output
from app.features.openmaic.generation.json_repair import parse_json_response
from app.features.openmaic.generation.prompts.scene_actions import (
    SCENE_ACTIONS_SYSTEM_PROMPT,
    build_scene_actions_user_prompt,
)
from app.features.openmaic.generation.prompts.scene_interactive import (
    INTERACTIVE_CONTENT_SYSTEM_PROMPT,
    build_interactive_content_user_prompt,
)
from app.features.openmaic.generation.prompts.scene_quiz import (
    QUIZ_CONTENT_SYSTEM_PROMPT,
    build_quiz_content_user_prompt,
)
from app.features.openmaic.generation.prompts.scene_slide import (
    SLIDE_CONTENT_SYSTEM_PROMPT,
    build_slide_content_user_prompt,
)
from app.features.openmaic.llm_adapter import LLMCallParams, call_llm
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

    Returns content dict appropriate for the scene type.
    """
    scene_type = outline.get("type", "slide")

    if scene_type == "slide":
        return await _generate_slide_content(outline, provider_chain, language_directive, course_context)
    elif scene_type == "quiz":
        return await _generate_quiz_content(outline, provider_chain, language_directive, course_context)
    elif scene_type == "interactive":
        return await _generate_interactive_content(outline, provider_chain, language_directive)
    elif scene_type == "pbl":
        return await _generate_pbl_content(outline, provider_chain, language_directive)
    else:
        logger.warning("Unknown scene type: %s, falling back to slide", scene_type)
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
    from app.features.openmaic.generation.prompts.agent_profiles import (
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


async def _generate_quiz_content(
    outline: dict,
    provider_chain: Sequence[LLMProvider],
    language_directive: str,
    course_context: str,
) -> dict:
    quiz_config = outline.get("quizConfig") or {}
    key_points = outline.get("keyPoints", []) or outline.get("key_points", [])

    params = LLMCallParams(
        system=QUIZ_CONTENT_SYSTEM_PROMPT,
        prompt=build_quiz_content_user_prompt(
            outline_title=outline.get("title", ""),
            outline_description=outline.get("description", ""),
            key_points=key_points,
            question_count=quiz_config.get("questionCount", 2),
            difficulty=quiz_config.get("difficulty", "medium"),
            question_types=quiz_config.get("questionTypes", ["single"]),
            language_directive=language_directive,
            course_context=course_context,
        ),
    )

    try:
        response = await call_llm(params, provider_chain)
        parsed = parse_json_response(response)
        if isinstance(parsed, dict) and "questions" in parsed:
            return parsed
    except Exception as exc:  # noqa: BLE001
        logger.warning("_generate_quiz_content: LLM failed: %s", exc)

    return _build_fallback_quiz(outline)


async def _generate_interactive_content(
    outline: dict,
    provider_chain: Sequence[LLMProvider],
    language_directive: str,
) -> dict:
    key_points = outline.get("keyPoints", []) or outline.get("key_points", [])
    params = LLMCallParams(
        system=INTERACTIVE_CONTENT_SYSTEM_PROMPT,
        prompt=build_interactive_content_user_prompt(
            outline_title=outline.get("title", ""),
            outline_description=outline.get("description", ""),
            key_points=key_points,
            widget_type=outline.get("widgetType"),
            widget_outline=outline.get("widgetOutline"),
            interactive_config=outline.get("interactiveConfig"),
            language_directive=language_directive,
        ),
    )

    try:
        response = await call_llm(params, provider_chain)
        parsed = parse_json_response(response)
        if isinstance(parsed, dict) and "html" in parsed:
            return parsed
    except Exception as exc:  # noqa: BLE001
        logger.warning("_generate_interactive_content: LLM failed: %s", exc)

    return {"html": _build_fallback_interactive_html(outline), "css": None, "js": None}


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
    """Create a brief content summary for action generation prompts."""
    if scene_type == "slide":
        elements = content.get("elements", [])
        texts = [
            e.get("content", "") for e in elements
            if e.get("type") == "text" and e.get("content")
        ]
        return "\n".join(str(t)[:200] for t in texts[:5]) or "（幻灯片内容）"
    elif scene_type == "quiz":
        questions = content.get("questions", [])
        if questions:
            q = questions[0]
            return f"测验第一题：{q.get('stem', '')[:100]}"
        return "（测验场景）"
    elif scene_type == "interactive":
        return "互动可视化场景，学生可动手操作体验概念。"
    elif scene_type == "pbl":
        return f"项目式学习：{content.get('projectTitle', '')}。{content.get('projectOverview', '')[:200]}"
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


def _build_fallback_quiz(outline: dict) -> dict:
    """Minimal quiz content as fallback."""
    return {
        "questions": [
            {
                "id": "q_fallback_1",
                "type": "single",
                "stem": "关于'{}'，以下说法正确的是？".format(outline.get("title", "")),
                "options": [
                    {"id": "opt_a", "label": "A", "content": "选项A"},
                    {"id": "opt_b", "label": "B", "content": "选项B"},
                    {"id": "opt_c", "label": "C", "content": "选项C"},
                    {"id": "opt_d", "label": "D", "content": "选项D"},
                ],
                "correctAnswers": ["opt_a"],
                "explanation": "请参考课程内容。",
                "points": 1,
            }
        ]
    }


def _build_fallback_interactive_html(outline: dict) -> str:
    """Simple placeholder HTML for interactive scenes."""
    title = outline.get("title", "互动场景")
    desc = outline.get("description", "")
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
  body {{ margin: 0; display: flex; align-items: center; justify-content: center;
         height: 100vh; font-family: sans-serif; background: #f5f7fa; }}
  .container {{ text-align: center; max-width: 600px; padding: 24px; }}
  h2 {{ color: #2c3e50; }}
  p {{ color: #7f8c8d; line-height: 1.6; }}
  .badge {{ background: #3498db; color: white; padding: 8px 16px;
             border-radius: 20px; display: inline-block; margin-top: 16px; }}
</style>
</head>
<body>
<div class="container">
  <h2>{title}</h2>
  <p>{desc}</p>
  <div class="badge">互动内容加载中...</div>
</div>
</body>
</html>"""


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
