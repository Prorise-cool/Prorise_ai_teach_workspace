"""分镜生成服务。

根据题目理解结果，通过 LLM 生成分镜脚本 ``Storyboard``，
包含场景列表、时长分配和旁白文案。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence

from app.core.config import Settings
from app.features.video.pipeline._helpers import extract_json_object
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.models import (
    Scene,
    Storyboard,
    UnderstandingResult,
    VideoStage,
    normalize_storyboard_duration,
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
        or scene.get("voiceover")
        or scene.get("explanation")
        or scene.get("dialogue")
    )
    visual_description = (
        scene.get("visualDescription")
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
            max(1, int(float(duration_hint))) if duration_hint is not None else 20
        )
    except (TypeError, ValueError):
        normalized_duration = 20

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
    }


def _build_default_storyboard(
    *,
    understanding: UnderstandingResult,
    target_duration: int,
    provider_used: str,
) -> Storyboard:
    """当 LLM 返回无法解析时，构建一个基于启发式规则的默认分镜。"""
    raw_scenes = [
        Scene(
            scene_id="scene_1",
            title="题目引入",
            narration=f"我们先理解题目：{understanding.topic_summary}",
            visual_description="展示题目关键条件，并标注求解目标。",
            duration_hint=24,
            order=1,
        ),
        Scene(
            scene_id="scene_2",
            title="知识点定位",
            narration=f"这道题重点涉及：{'、'.join(understanding.knowledge_points[:3])}",
            visual_description="逐项高亮核心知识点，并建立与题目条件的对应关系。",
            duration_hint=28,
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
                duration_hint=22,
                order=index,
            )
        )
    raw_scenes.append(
        Scene(
            scene_id=f"scene_{len(raw_scenes) + 1}",
            title="总结回顾",
            narration="最后回顾解题思路，帮助你记住关键方法。",
            visual_description="总结解法、知识点与常见易错点。",
            duration_hint=20,
            order=len(raw_scenes) + 1,
        )
    )
    scenes = normalize_storyboard_duration(raw_scenes, target_duration=target_duration)
    return Storyboard(
        scenes=scenes,
        total_duration=sum(scene.duration_hint for scene in scenes),
        target_duration=max(90, min(target_duration, 180)),
        provider_used=provider_used,
    )


@dataclass(slots=True)
class StoryboardService:
    """分镜生成服务，调用 LLM 根据理解结果生成视频分镜。"""

    providers: Sequence[Any]
    failover_service: ProviderFailoverService
    runtime: VideoRuntimeStateStore
    settings: Settings

    async def execute(
        self,
        *,
        understanding: UnderstandingResult,
        emit_switch=None,
    ) -> Storyboard:
        """执行分镜生成，返回 ``Storyboard``。"""
        target_duration = self.settings.video_target_duration_seconds
        prompt = (
            "请根据理解结果输出 JSON storyboard，字段包含 scenes, totalDuration, targetDuration。\n"
            f"理解结果：{understanding.model_dump_json(by_alias=True)}"
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

        parsed = extract_json_object(provider_result.content)
        if parsed is not None and isinstance(parsed.get("scenes"), list):
            try:
                scenes = [
                    Scene.model_validate(_normalize_scene_payload(scene, index))
                    for index, scene in enumerate(parsed["scenes"])
                    if isinstance(scene, dict)
                ]
            except Exception:  # noqa: BLE001
                scenes = []

            if scenes:
                scenes = normalize_storyboard_duration(
                    scenes, target_duration=target_duration
                )
                storyboard = Storyboard(
                    scenes=scenes,
                    total_duration=sum(scene.duration_hint for scene in scenes),
                    target_duration=max(
                        self.settings.video_min_duration_seconds,
                        min(target_duration, self.settings.video_max_duration_seconds),
                    ),
                    provider_used=provider_result.provider,
                )
            else:
                storyboard = _build_default_storyboard(
                    understanding=understanding,
                    target_duration=target_duration,
                    provider_used=provider_result.provider,
                )
        else:
            storyboard = _build_default_storyboard(
                understanding=understanding,
                target_duration=target_duration,
                provider_used=provider_result.provider,
            )

        self.runtime.save_model("storyboard", storyboard)
        return storyboard
