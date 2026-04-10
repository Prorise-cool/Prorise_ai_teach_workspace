"""分镜生成服务（Plan D 两步策略）。

Plan D 策略替代原来的单次 LLM 调用：
1. 教学大纲生成：基于 understanding + solve_result，输出教学步骤列表。
2. 逐场景展开：每次输入 1 个步骤 + 前文上下文，输出 voiceText + imageDesc。

保留原有工具函数（归一化、时长估算、终化）供复用。
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Sequence

from app.core.config import Settings
from app.core.logging import get_logger

logger = get_logger("app.features.video.pipeline.storyboard")
from app.features.video.pipeline._helpers import (
    estimate_narration_duration_seconds,
    extract_json_object,
    extract_source_text,
)
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.models import (
    Scene,
    SolveResult,
    Storyboard,
    UnderstandingResult,
    VideoConfig,
    VideoStage,
    normalize_storyboard_duration,
)
from app.features.video.pipeline.prompts.storyboard_prompts import (
    build_outline_prompt,
    build_scene_expand_prompt,
    build_single_shot_storyboard_prompt,
)
from app.features.video.pipeline.runtime import VideoRuntimeStateStore
from app.providers.failover import ProviderAllFailedError, ProviderFailoverService


def _normalize_scene_payload(scene: dict[str, Any], index: int) -> dict[str, Any]:
    """将 LLM 返回的非标准场景 payload 归一化为标准 Scene 输入。"""
    title = (
        scene.get("title")
        or scene.get("name")
        or scene.get("topic")
        or f"步骤 {index + 1}"
    )
    narration = (
        scene.get("narration")
        or scene.get("voiceText")
        or scene.get("voice_text")
        or scene.get("voiceover")
        or scene.get("explanation")
        or scene.get("dialogue")
    )
    visual_description = (
        scene.get("visualDescription")
        or scene.get("imageDesc")
        or scene.get("image_desc")
        or scene.get("visual")
        or scene.get("sceneDescription")
        or scene.get("content")
        or scene.get("description")
    )
    duration_hint = (
        scene.get("durationHint")
        or scene.get("duration")
        or scene.get("durationSeconds")
        or scene.get("estimatedDuration")
    )

    normalized_narration = str(narration or title).strip()
    normalized_visual = str(visual_description or normalized_narration).strip()
    try:
        normalized_duration = (
            max(1, int(float(duration_hint))) if duration_hint is not None else 0
        )
    except (TypeError, ValueError):
        normalized_duration = 0

    return {
        **scene,
        "sceneId": scene.get("sceneId")
        or scene.get("scene_id")
        or f"scene_{index + 1}",
        "title": str(title).strip() or f"步骤 {index + 1}",
        "narration": normalized_narration,
        "visualDescription": normalized_visual,
        "durationHint": normalized_duration,
        "order": int(scene.get("order") or index + 1),
        "voiceText": scene.get("voiceText") or scene.get("voice_text") or normalized_narration,
        "imageDesc": scene.get("imageDesc") or scene.get("image_desc") or normalized_visual,
        "voiceRole": scene.get("voiceRole") or scene.get("voice_role") or "default_teacher",
    }


def _estimate_scene_duration_hint(scene: Scene, *, settings: Settings) -> int:
    """根据场景旁白粗估时长。"""
    narration = (scene.voice_text or scene.narration or scene.title).strip()
    return estimate_narration_duration_seconds(
        narration,
        chars_per_second=settings.video_narration_chars_per_second,
        sentence_pause_seconds=settings.video_narration_sentence_pause_seconds,
        min_seconds=settings.video_scene_min_duration_seconds,
        max_seconds=settings.video_scene_max_duration_seconds,
    )


def _coerce_duration_value(raw_value: Any) -> int:
    """安全解析 duration 字段。"""
    try:
        return max(int(float(raw_value)), 0)
    except (TypeError, ValueError):
        return 0


def _finalize_storyboard(
    *,
    scenes: Sequence[Scene],
    provider_used: str,
    settings: Settings,
    requested_total_duration: int = 0,
    requested_target_duration: int = 0,
) -> Storyboard:
    """补全时长信息并构建稳定的 Storyboard。"""
    estimated_scenes = [
        scene.model_copy(
            update={
                "duration_hint": scene.duration_hint
                if scene.duration_hint > 0
                else _estimate_scene_duration_hint(scene, settings=settings)
            }
        )
        for scene in scenes
    ]
    requested_duration = requested_target_duration or requested_total_duration
    if requested_duration <= 0:
        requested_duration = settings.video_target_duration_seconds

    bounded_target = max(
        settings.video_min_duration_seconds,
        min(requested_duration, settings.video_max_duration_seconds),
    )
    normalized_scenes = normalize_storyboard_duration(
        list(estimated_scenes),
        target_duration=bounded_target,
    )
    return Storyboard(
        scenes=normalized_scenes,
        total_duration=sum(scene.duration_hint for scene in normalized_scenes),
        target_duration=bounded_target,
        video_config=VideoConfig(),
        provider_used=provider_used,
    )


def _build_default_storyboard(
    *,
    understanding: UnderstandingResult,
    provider_used: str,
    settings: Settings,
) -> Storyboard:
    """当 LLM 返回无法解析时，构建一个基于启发式规则的默认分镜。"""
    raw_scenes = [
        Scene(
            scene_id="scene_1",
            title="题目引入",
            narration=f"我们先理解题目：{understanding.topic_summary}",
            visual_description="展示题目关键条件，并标注求解目标。",
            voice_text=f"我们先理解题目：{understanding.topic_summary}",
            image_desc="展示题目关键条件，并标注求解目标。",
            duration_hint=0,
            order=1,
        ),
        Scene(
            scene_id="scene_2",
            title="知识点定位",
            narration=f"这道题重点涉及：{'、'.join(understanding.knowledge_points[:3])}",
            visual_description="逐项高亮核心知识点，并建立与题目条件的对应关系。",
            voice_text=f"这道题重点涉及：{'、'.join(understanding.knowledge_points[:3])}",
            image_desc="逐项高亮核心知识点，并建立与题目条件的对应关系。",
            duration_hint=0,
            order=2,
        ),
    ]
    for index, step in enumerate(understanding.solution_steps[:3], start=3):
        raw_scenes.append(
            Scene(
                scene_id=f"scene_{index}",
                title=step.title,
                narration=step.explanation,
                visual_description=f"用动画方式演示 {step.title}，并在画面上逐步展开推理。",
                voice_text=step.explanation,
                image_desc=f"用动画方式演示 {step.title}，并在画面上逐步展开推理。",
                duration_hint=0,
                order=index,
            )
        )
    raw_scenes.append(
        Scene(
            scene_id=f"scene_{len(raw_scenes) + 1}",
            title="总结回顾",
            narration="最后回顾解题思路，帮助你记住关键方法。",
            visual_description="总结解法、知识点与常见易错点。",
            voice_text="最后回顾解题思路，帮助你记住关键方法。",
            image_desc="总结解法、知识点与常见易错点。",
            duration_hint=0,
            order=len(raw_scenes) + 1,
        )
    )
    return _finalize_storyboard(
        scenes=raw_scenes,
        provider_used=provider_used,
        settings=settings,
    )


def _format_solution_steps_text(solve_result: SolveResult) -> str:
    """将 SolveResult 的步骤列表格式化为文本。"""
    lines: list[str] = []
    for step in solve_result.solution_steps:
        lines.append(f"- {step.title}：{step.explanation}")
    return "\n".join(lines)


@dataclass(slots=True)
class StoryboardService:
    """分镜生成服务（Plan D 两步策略）。

    Step 1: 教学大纲 — 基于 understanding + solve_result 生成教学步骤。
    Step 2: 逐场景展开 — 每个步骤独立调用 LLM 生成 voiceText + imageDesc。
    """

    providers: Sequence[Any]
    failover_service: ProviderFailoverService
    runtime: VideoRuntimeStateStore
    settings: Settings

    async def execute(
        self,
        *,
        understanding: UnderstandingResult,
        solve_result: SolveResult | None = None,
        source_payload: dict[str, object] | None = None,
        emit_switch=None,
    ) -> Storyboard:
        """执行分镜生成，返回 Storyboard。

        当 solve_result 可用且非 fallback 时使用 Plan D 两步策略；
        Plan D 失败后回退到单次 LLM 调用；
        最终兜底使用默认模板分镜。
        """
        # Plan D 路径（仅当 solve_result 是真实解题结果时）
        if solve_result is not None and not solve_result.is_fallback:
            source_text = extract_source_text(source_payload) if source_payload else understanding.topic_summary
            try:
                return await self._execute_plan_d(
                    understanding=understanding,
                    solve_result=solve_result,
                    source_text=source_text,
                    emit_switch=emit_switch,
                )
            except Exception:  # noqa: BLE001
                logger.warning("Plan D 分镜生成失败，回退到单次 LLM 分镜", exc_info=True)

        # 回退1: 单次 LLM 调用
        try:
            return await self._generate_single_shot(
                understanding=understanding,
                emit_switch=emit_switch,
            )
        except Exception:  # noqa: BLE001
            logger.warning("单次 LLM 分镜也失败，使用默认模板分镜", exc_info=True)

        # 回退2: 纯规则模板
        logger.info("使用默认分镜生成（所有 LLM 路径失败）")
        storyboard = _build_default_storyboard(
            understanding=understanding,
            provider_used="fallback",
            settings=self.settings,
        )
        self.runtime.save_model("storyboard", storyboard)
        return storyboard

    async def _generate_single_shot(
        self,
        *,
        understanding: UnderstandingResult,
        emit_switch=None,
    ) -> Storyboard:
        """单次 LLM 调用生成分镜（Plan D 失败后的回退路径）。"""
        prompt = build_single_shot_storyboard_prompt(
            understanding_json=understanding.model_dump_json(by_alias=True),
        )

        try:
            provider_result = await self.failover_service.generate(
                self.providers,
                prompt,
                emit_switch=emit_switch,
            )
        except ProviderAllFailedError as exc:
            raise VideoPipelineError(
                stage=VideoStage.STORYBOARD,
                error_code=VideoTaskErrorCode.VIDEO_STORYBOARD_FAILED,
                message=str(exc),
            ) from exc

        logger.debug("[分镜-单次] LLM响应 (前600字): %s", provider_result.content[:600])
        parsed = extract_json_object(provider_result.content)
        if parsed is None or not isinstance(parsed.get("scenes"), list):
            raise ValueError("单次 LLM 分镜 JSON 解析失败")

        raw_scenes = parsed["scenes"]
        scenes: list[Scene] = []
        for index, raw_scene in enumerate(raw_scenes):
            if not isinstance(raw_scene, dict):
                continue
            normalized = _normalize_scene_payload(raw_scene, index)
            scenes.append(Scene(**{
                "scene_id": normalized["sceneId"],
                "title": normalized["title"],
                "narration": normalized["narration"],
                "visual_description": normalized["visualDescription"],
                "voice_text": normalized["voiceText"],
                "image_desc": normalized["imageDesc"],
                "voice_role": normalized["voiceRole"],
                "duration_hint": normalized["durationHint"],
                "order": normalized["order"],
            }))

        if not scenes:
            raise ValueError("单次 LLM 分镜未生成有效场景")

        storyboard = _finalize_storyboard(
            scenes=scenes,
            provider_used=provider_result.provider,
            settings=self.settings,
        )
        self.runtime.save_model("storyboard", storyboard)
        logger.info(
            "[分镜完成] single-shot scenes=%d total_duration=%d",
            len(storyboard.scenes),
            storyboard.total_duration,
        )
        return storyboard

    async def _execute_plan_d(
        self,
        *,
        understanding: UnderstandingResult,
        solve_result: SolveResult,
        source_text: str,
        emit_switch=None,
    ) -> Storyboard:
        """Plan D 两步策略：教学大纲 → 逐场景展开。"""
        # Step 1: 生成教学大纲
        outline = await self._generate_outline(
            understanding=understanding,
            solve_result=solve_result,
            source_text=source_text,
            emit_switch=emit_switch,
        )
        if not outline:
            raise ValueError("教学大纲生成失败")

        # Step 2: 逐场景展开
        scenes = await self._expand_scenes(
            outline=outline,
            solve_result=solve_result,
            emit_switch=emit_switch,
        )
        if not scenes:
            raise ValueError("场景展开失败")

        storyboard = _finalize_storyboard(
            scenes=scenes,
            provider_used="plan-d",
            settings=self.settings,
        )
        self.runtime.save_model("storyboard", storyboard)
        logger.info(
            "[分镜完成] Plan D scenes=%d total_duration=%d titles=%s",
            len(storyboard.scenes),
            storyboard.total_duration,
            [s.title for s in storyboard.scenes],
        )
        return storyboard

    async def _generate_outline(
        self,
        *,
        understanding: UnderstandingResult,
        solve_result: SolveResult,
        source_text: str,
        emit_switch=None,
    ) -> list[dict[str, str]]:
        """Step 1: 生成教学大纲。"""
        prompt = build_outline_prompt(
            source_text=source_text,
            subject=understanding.subject,
            difficulty=understanding.difficulty,
            knowledge_points=understanding.knowledge_points,
            reference_answer=solve_result.reference_answer,
            solution_steps_text=_format_solution_steps_text(solve_result),
        )

        try:
            provider_result = await self.failover_service.generate(
                self.providers,
                prompt,
                emit_switch=emit_switch,
            )
        except ProviderAllFailedError as exc:
            raise VideoPipelineError(
                stage=VideoStage.STORYBOARD,
                error_code=VideoTaskErrorCode.VIDEO_STORYBOARD_FAILED,
                message=str(exc),
            ) from exc

        logger.debug("[分镜-大纲] LLM响应 (前600字): %s", provider_result.content[:600])
        parsed = extract_json_object(provider_result.content)
        if parsed is None or not isinstance(parsed.get("outline"), list):
            logger.warning("教学大纲 JSON 解析失败")
            return []

        outline = parsed["outline"]
        logger.info("[分镜-大纲完成] steps=%d", len(outline))
        return outline

    async def _expand_scenes(
        self,
        *,
        outline: list[dict[str, str]],
        solve_result: SolveResult,
        emit_switch=None,
    ) -> list[Scene]:
        """Step 2: 逐场景展开，每个步骤独立调用 LLM。"""
        scenes: list[Scene] = []
        prev_context = ""

        for index, step in enumerate(outline):
            title = str(step.get("title") or f"步骤 {index + 1}").strip()
            teaching_goal = str(step.get("teachingGoal") or step.get("teaching_goal") or "").strip()
            key_content = str(step.get("keyContent") or step.get("key_content") or "").strip()

            # 从 solve_result 中提取对应片段
            reference_snippet = ""
            if index < len(solve_result.solution_steps):
                ref_step = solve_result.solution_steps[index]
                reference_snippet = f"{ref_step.title}：{ref_step.explanation}"

            prompt = build_scene_expand_prompt(
                step_title=title,
                teaching_goal=teaching_goal,
                key_content=key_content,
                reference_snippet=reference_snippet or solve_result.reference_answer[:200],
                prev_context=prev_context,
            )

            try:
                provider_result = await self.failover_service.generate(
                    self.providers,
                    prompt,
                    emit_switch=emit_switch,
                )
            except ProviderAllFailedError:
                logger.warning("场景 %d 展开失败，使用 outline 内容兜底", index + 1)
                scenes.append(Scene(
                    scene_id=f"scene_{index + 1}",
                    title=title,
                    narration=teaching_goal or title,
                    visual_description=key_content or title,
                    voice_text=teaching_goal or title,
                    image_desc=key_content or title,
                    duration_hint=0,
                    order=index + 1,
                ))
                prev_context += f"\n场景{index + 1}「{title}」：{teaching_goal}"
                continue

            parsed = extract_json_object(provider_result.content)
            voice_text = ""
            image_desc = ""
            duration_hint = 0

            if parsed:
                voice_text = str(
                    parsed.get("voiceText") or parsed.get("voice_text") or ""
                ).strip()
                image_desc = str(
                    parsed.get("imageDesc") or parsed.get("image_desc") or ""
                ).strip()
                duration_hint = _coerce_duration_value(
                    parsed.get("durationHint") or parsed.get("duration_hint")
                )

            if not voice_text:
                voice_text = teaching_goal or title
            if not image_desc:
                image_desc = key_content or title

            scene = Scene(
                scene_id=f"scene_{index + 1}",
                title=title,
                narration=voice_text,
                visual_description=image_desc,
                voice_text=voice_text,
                image_desc=image_desc,
                duration_hint=duration_hint,
                order=index + 1,
            )
            scenes.append(scene)

            # 更新前文上下文
            prev_context += f"\n场景{index + 1}「{title}」旁白：{voice_text}\n视觉描述：{image_desc[:120]}"

            logger.debug("[分镜-场景%d] title=%s voice_len=%d", index + 1, title, len(voice_text))

        logger.info("[分镜-展开完成] scenes=%d", len(scenes))
        return scenes
