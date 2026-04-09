"""题目理解服务。

接收原始题目输入与用户画像，通过 LLM 生成结构化的 ``UnderstandingResult``，
包含题目摘要、知识点、解题步骤、难度和学科信息。
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
    SolutionStep,
    UnderstandingResult,
    VideoStage,
)
from app.features.video.pipeline.runtime import VideoRuntimeStateStore
from app.providers.failover import ProviderAllFailedError, ProviderFailoverService


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
    """题目理解服务，调用 LLM 将原始题目转换为结构化理解结果。"""

    providers: Sequence[Any]
    failover_service: ProviderFailoverService
    runtime: VideoRuntimeStateStore

    async def execute(
        self,
        *,
        source_payload: dict[str, object],
        user_profile: dict[str, object],
        emit_switch=None,
    ) -> UnderstandingResult:
        """执行题目理解，返回 ``UnderstandingResult``。"""
        source_text = extract_source_text(source_payload)
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
        if parsed is not None:
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
            understanding = UnderstandingResult.model_validate(
                {
                    "topicSummary": parsed.get("topicSummary") or source_text[:120],
                    "knowledgePoints": parsed.get("knowledgePoints") or ["核心知识点提炼"],
                    "solutionSteps": solution_steps or [
                        {"stepId": "step_1", "title": "步骤 1", "explanation": source_text[:80]}
                    ],
                    "difficulty": parsed.get("difficulty") or infer_difficulty(source_text),
                    "subject": parsed.get("subject") or infer_subject(source_text),
                    "providerUsed": provider_result.provider,
                }
            )
        else:
            understanding = _build_default_understanding(
                source_text=source_text,
                provider_used=provider_result.provider,
                user_profile=user_profile,
            )

        self.runtime.save_model("understanding", understanding)
        logger.info("[理解完成] topic=%s steps=%d provider=%s", understanding.topic_summary[:40], len(understanding.solution_steps), understanding.provider_used)
        return understanding
