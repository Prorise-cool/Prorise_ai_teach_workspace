"""题目理解服务。

接收原始题目输入与用户画像，通过 LLM 生成结构化的 ``UnderstandingResult``，
包含题目摘要、知识点、解题步骤、难度和学科信息。

支持可选的 ``include_storyboard`` 模式，一次 LLM 调用同时输出
理解结果与分镜场景，减少一轮 LLM 往返。
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Sequence

from app.core.logging import get_logger

logger = get_logger("app.features.video.pipeline.understanding")

from app.features.video.pipeline._helpers import (
    extract_json_object,
    extract_source_text,
    first_non_empty,
    infer_difficulty,
    infer_subject,
    split_sentences,
    unique_preserve_order,
)
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.models import (
    Scene,
    SolutionStep,
    Storyboard,
    UnderstandingResult,
    VideoConfig,
    VideoStage,
    normalize_storyboard_duration,
)
from app.features.video.pipeline.runtime import VideoRuntimeStateStore
from app.providers.failover import ProviderAllFailedError, ProviderFailoverService

# 合并 prompt：一次 LLM 调用同时输出 understanding + storyboard
MERGED_UNDERSTANDING_STORYBOARD_PROMPT = """你是一位资深教师，请同时完成以下两步：

## 第一步：理解题目
分析以下题目的知识点、难度和解题思路。

## 第二步：生成分镜
为该题目生成 4-6 个教学视频场景。

## 题目信息
题目内容：{source_text}
用户画像：{user_profile}

## 输出格式
严格按以下 JSON 格式输出（不要输出其他内容）：

```json
{{
  "understanding": {{
    "topicSummary": "题目摘要",
    "knowledgePoints": ["知识点1", "知识点2"],
    "solutionSteps": [
      {{"stepId": "step_1", "title": "步骤1", "explanation": "详解"}}
    ],
    "difficulty": "简单/中等/困难",
    "subject": "数学/物理/..."
  }},
  "storyboard": {{
    "scenes": [
      {{
        "title": "场景标题",
        "voiceText": "口语化讲解文字（数学符号口语化：x²→x的平方，≤→小于等于）",
        "imageDesc": "Manim场景描述（公式用LaTeX，用MathTex）",
        "durationHint": 12
      }}
    ]
  }}
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
- 每个场景 durationHint 建议 8-30 秒，总时长 90-180 秒"""


def _build_default_understanding(
    *,
    source_text: str,
    provider_used: str,
    user_profile: dict[str, object],
) -> UnderstandingResult:
    """当 LLM 返回无法解析时，构建一个基于启发式规则的默认理解结果。"""
    summary = first_non_empty(split_sentences(source_text), fallback=source_text[:120] or "题目解析")
    subject = str(user_profile.get("subject") or infer_subject(source_text))
    difficulty = str(user_profile.get("difficulty") or infer_difficulty(source_text))
    sentences = split_sentences(source_text)
    knowledge_points = unique_preserve_order(
        [
            str(user_profile.get("focusPoint") or ""),
            f"{subject} 核心概念",
            "题干信息提取",
            "分步讲解",
            *[sentence[:18] for sentence in sentences[:3]],
        ]
    )
    solution_steps = [
        SolutionStep(
            step_id=f"step_{index + 1}",
            title=f"步骤 {index + 1}",
            explanation=sentence,
        )
        for index, sentence in enumerate(sentences[:4] or [summary])
    ]
    return UnderstandingResult(
        topic_summary=summary,
        knowledge_points=knowledge_points or ["核心知识点提炼"],
        solution_steps=solution_steps,
        difficulty=difficulty,
        subject=subject,
        provider_used=provider_used,
    )


def _normalize_solution_step(
    step: dict[str, object],
    *,
    index: int,
    fallback_text: str,
) -> SolutionStep | None:
    """将常见 LLM 步骤字段别名规整为 ``SolutionStep``。"""
    explanation = first_non_empty(
        [
            str(step.get("explanation") or "").strip(),
            str(step.get("action") or "").strip(),
            str(step.get("description") or "").strip(),
            str(step.get("desc") or "").strip(),
            str(step.get("content") or "").strip(),
            str(step.get("narration") or "").strip(),
        ],
        fallback="",
    )
    title = first_non_empty(
        [
            str(step.get("title") or "").strip(),
            str(step.get("name") or "").strip(),
            str(step.get("heading") or "").strip(),
            str(step.get("label") or "").strip(),
        ],
        fallback="",
    )
    step_no = step.get("step") or step.get("index") or index
    try:
        step_no = int(step_no)
    except (TypeError, ValueError):
        step_no = index

    if not explanation:
        explanation = fallback_text.strip()
    if not explanation:
        return None

    if not title:
        title = f"步骤 {step_no}"

    return SolutionStep(
        step_id=str(step.get("stepId") or step.get("step_id") or f"step_{step_no}"),
        title=title,
        explanation=explanation,
    )


@dataclass(slots=True)
class UnderstandingService:
    """题目理解服务，调用 LLM 将原始题目转换为结构化理解结果。

    支持可选的 ``include_storyboard`` 模式，一次 LLM 调用同时输出
    理解结果与分镜场景，减少一轮 LLM 往返。
    """

    providers: Sequence[Any]
    failover_service: ProviderFailoverService
    runtime: VideoRuntimeStateStore
    settings: Any | None = None

    async def execute(
        self,
        *,
        source_payload: dict[str, object],
        user_profile: dict[str, object],
        emit_switch=None,
        include_storyboard: bool = False,
    ) -> UnderstandingResult | tuple[UnderstandingResult, Storyboard | None]:
        """执行题目理解。

        当 ``include_storyboard=True`` 时，使用合并 prompt 一次 LLM 调用
        同时输出理解和分镜，返回 ``(UnderstandingResult, Storyboard | None)`` 元组。
        """
        source_text = extract_source_text(source_payload)

        if include_storyboard and self.settings is not None:
            return await self._execute_merged(
                source_text=source_text,
                user_profile=user_profile,
                emit_switch=emit_switch,
            )

        # 原有独立理解路径
        prompt = (
            "请把题目理解为 JSON，字段包含 "
            "topicSummary, knowledgePoints, solutionSteps, difficulty, subject。\n"
            f"题目内容：{source_text}\n"
            f"用户画像：{json.dumps(user_profile, ensure_ascii=False)}"
        )
        try:
            provider_result = await self.failover_service.generate(
                self.providers,
                prompt,
                emit_switch=emit_switch,
            )
        except ProviderAllFailedError as exc:
            raise VideoPipelineError(
                stage=VideoStage.UNDERSTANDING,
                error_code=VideoTaskErrorCode.VIDEO_UNDERSTANDING_FAILED,
                message=str(exc),
            ) from exc

        logger.debug("[理解] LLM响应 (前500字): %s", provider_result.content[:500])
        parsed = extract_json_object(provider_result.content)
        understanding = self._parse_understanding(parsed, source_text, user_profile, provider_result.provider)
        if understanding is None:
            understanding = _build_default_understanding(
                source_text=source_text,
                provider_used=provider_result.provider,
                user_profile=user_profile,
            )

        self.runtime.save_model("understanding", understanding)
        logger.info("[理解完成] topic=%s steps=%d provider=%s", understanding.topic_summary[:40], len(understanding.solution_steps), understanding.provider_used)
        return understanding

    async def _execute_merged(
        self,
        *,
        source_text: str,
        user_profile: dict[str, object],
        emit_switch=None,
    ) -> tuple[UnderstandingResult, Storyboard]:
        """使用合并 prompt 一次调用同时输出理解和分镜。"""
        from app.features.video.pipeline.storyboard import (
            _build_default_storyboard,
            _coerce_duration_value,
            _finalize_storyboard,
            _normalize_scene_payload,
        )

        prompt = MERGED_UNDERSTANDING_STORYBOARD_PROMPT.format(
            source_text=source_text,
            user_profile=json.dumps(user_profile, ensure_ascii=False),
        )
        try:
            provider_result = await self.failover_service.generate(
                self.providers,
                prompt,
                emit_switch=emit_switch,
            )
        except ProviderAllFailedError as exc:
            raise VideoPipelineError(
                stage=VideoStage.UNDERSTANDING,
                error_code=VideoTaskErrorCode.VIDEO_UNDERSTANDING_FAILED,
                message=str(exc),
            ) from exc

        logger.debug("[理解+分镜] LLM响应 (前800字): %s", provider_result.content[:800])
        parsed = extract_json_object(provider_result.content)

        if parsed is None:
            # 合并解析失败 → 回退到默认理解
            understanding = _build_default_understanding(
                source_text=source_text,
                provider_used=provider_result.provider,
                user_profile=user_profile,
            )
            self.runtime.save_model("understanding", understanding)
            # 返回 None 标记让 orchestrator 走独立 storyboard 路径
            return understanding, None  # type: ignore[return-value]

        # 解析 understanding 部分
        understanding_data = parsed.get("understanding")
        understanding = self._parse_understanding(understanding_data, source_text, user_profile, provider_result.provider) if isinstance(understanding_data, dict) else None
        if understanding is None:
            understanding = _build_default_understanding(
                source_text=source_text,
                provider_used=provider_result.provider,
                user_profile=user_profile,
            )
        self.runtime.save_model("understanding", understanding)

        # 解析 storyboard 部分
        storyboard_data = parsed.get("storyboard")
        storyboard = None
        if isinstance(storyboard_data, dict) and isinstance(storyboard_data.get("scenes"), list):
            try:
                scenes = [
                    Scene.model_validate(_normalize_scene_payload(scene, index))
                    for index, scene in enumerate(storyboard_data["scenes"])
                    if isinstance(scene, dict)
                ]
                if scenes:
                    storyboard = _finalize_storyboard(
                        scenes=scenes,
                        provider_used=provider_result.provider,
                        settings=self.settings,
                        requested_total_duration=_coerce_duration_value(
                            storyboard_data.get("totalDuration") or storyboard_data.get("total_duration")
                        ),
                        requested_target_duration=_coerce_duration_value(
                            storyboard_data.get("targetDuration") or storyboard_data.get("target_duration")
                        ),
                    )
            except Exception:  # noqa: BLE001
                logger.warning("合并模式分镜解析失败，将回退独立路径")

        if storyboard is not None:
            self.runtime.save_model("storyboard", storyboard)
            logger.info("[理解+分镜完成] scenes=%d provider=%s", len(storyboard.scenes), provider_result.provider)
        else:
            logger.warning("合并模式分镜解析失败，将回退独立路径")

        return understanding, storyboard

    def _parse_understanding(
        self,
        parsed: dict[str, Any] | None,
        source_text: str,
        user_profile: dict[str, object],
        provider_used: str,
    ) -> UnderstandingResult | None:
        """解析 LLM 返回的 JSON 为 ``UnderstandingResult``，失败返回 ``None``。"""
        if parsed is None:
            return None

        solution_steps: list[SolutionStep] = []
        for index, step in enumerate(parsed.get("solutionSteps", []), start=1):
            if not isinstance(step, dict):
                continue
            normalized_step = _normalize_solution_step(
                step,
                index=index,
                fallback_text=source_text[:80],
            )
            if normalized_step is not None:
                solution_steps.append(normalized_step)

        return UnderstandingResult.model_validate(
            {
                "topicSummary": parsed.get("topicSummary") or source_text[:120],
                "knowledgePoints": parsed.get("knowledgePoints") or ["核心知识点提炼"],
                "solutionSteps": solution_steps or [
                    {"stepId": "step_1", "title": "步骤 1", "explanation": source_text[:80]}
                ],
                "difficulty": parsed.get("difficulty") or infer_difficulty(source_text),
                "subject": parsed.get("subject") or infer_subject(source_text),
                "providerUsed": provider_used,
            }
        )
