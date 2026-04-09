"""分镜生成服务。

一次 LLM 调用生成全部场景（含 ``voiceText`` + ``imageDesc``），并为
后续 TTS / Manim / Compose 提供可消费的时长提示。
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
)
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.models import (
    Scene,
    Storyboard,
    UnderstandingResult,
    VideoConfig,
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
    """根据场景旁白粗估时长。

    当前渲染链路不会在 Manim 阶段直接消费真实 TTS 时长，因此需要在
    storyboard 阶段给出足够接近的 ``duration_hint``，避免渲染仅持续几秒、
    后续 compose 再用末帧补齐整段音频。
    """
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
        requested_duration = sum(scene.duration_hint for scene in estimated_scenes) or settings.video_target_duration_seconds

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


STORYBOARD_PROMPT = """你是一位资深教师，请为以下题目生成教学视频分镜。

## 题目信息
{understanding_json}

## 要求
生成 4-6 个教学场景，严格按以下 JSON 格式输出（不要输出其他内容）：

```json
{{
  "scenes": [
    {{
      "title": "场景标题",
      "voiceText": "口语化讲解文字（数学符号口语化：x²→x的平方，∫→积分，≤→小于等于）",
      "imageDesc": "Manim场景描述（要显示什么文本/公式/图形，公式用LaTeX，用MathTex）",
      "durationHint": 12
    }}
  ]
}}
```

## 场景规划
1. 展示题目 — 展示题目核心条件
2. 分析考点 — 点明关键知识点和解题思路
3-4. 步骤解析 — 逐步讲解解题过程
5. 总结归纳 — 归纳解法和要点

## 约束
- voiceText 必须口语化，面向学生讲解，禁止 LaTeX
- imageDesc 描述 Manim 能实现的内容，公式用 LaTeX
- 每个场景补充 durationHint（秒），单场景建议 8-30 秒，总时长尽量落在 90-180 秒
- 展示题目时不要展示答案"""


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


@dataclass(slots=True)
class StoryboardService:
    """分镜生成服务，单次 LLM 调用生成完整分镜。"""

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
        """执行分镜生成，返回 ``Storyboard``。

        单次 LLM 调用生成全部场景；若 JSON 解析失败，使用启发式默认分镜。
        """
        understanding_json = understanding.model_dump_json(by_alias=True)
        prompt = STORYBOARD_PROMPT.format(understanding_json=understanding_json)

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

        logger.debug("[分镜] LLM响应 (前800字): %s", provider_result.content[:800])
        parsed = extract_json_object(provider_result.content)
        if parsed is not None and isinstance(parsed.get("scenes"), list):
            try:
                scenes = [
                    Scene.model_validate(_normalize_scene_payload(scene, index))
                    for index, scene in enumerate(parsed["scenes"])
                    if isinstance(scene, dict)
                ]
            except Exception:  # noqa: BLE001
                logger.warning("场景解析失败，使用默认分镜")
                scenes = []

            if scenes:
                storyboard = _finalize_storyboard(
                    scenes=scenes,
                    provider_used=provider_result.provider,
                    settings=self.settings,
                    requested_total_duration=_coerce_duration_value(
                        parsed.get("totalDuration") or parsed.get("total_duration")
                    ),
                    requested_target_duration=_coerce_duration_value(
                        parsed.get("targetDuration") or parsed.get("target_duration")
                    ),
                )
                logger.info(
                    "[分镜完成] scenes=%d total_duration=%d target_duration=%d titles=%s provider=%s",
                    len(storyboard.scenes),
                    storyboard.total_duration,
                    storyboard.target_duration,
                    [s.title for s in storyboard.scenes],
                    provider_result.provider,
                )
                self.runtime.save_model("storyboard", storyboard)
                return storyboard

        # JSON 解析失败 → 默认分镜
        logger.warning("LLM 分镜输出无法解析，使用默认分镜")
        storyboard = _build_default_storyboard(
            understanding=understanding,
            provider_used=provider_result.provider,
            settings=self.settings,
        )
        self.runtime.save_model("storyboard", storyboard)
        return storyboard
