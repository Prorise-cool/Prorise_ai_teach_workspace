"""独立解题服务。

参考 manim-to-video-claw 的 solve_problem() 策略：
独立调用推理模型（DeepSeek R1）生成参考答案和完整解题步骤，
为后续分镜和代码生成提供准确的数学内容基础。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence

from app.core.logging import get_logger
from app.features.video.pipeline._helpers import extract_json_object, extract_source_text
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.models import (
    SolutionStep,
    SolveResult,
    UnderstandingResult,
    VideoStage,
)
from app.features.video.pipeline.prompts.solve_prompts import build_solve_prompt
from app.features.video.pipeline.runtime import VideoRuntimeStateStore
from app.providers.failover import ProviderAllFailedError, ProviderFailoverService

logger = get_logger("app.features.video.pipeline.solve")


def _parse_solve_result(
    parsed: dict[str, Any] | None,
    *,
    understanding: UnderstandingResult,
    provider_used: str,
) -> SolveResult | None:
    """解析 LLM 返回的 JSON 为 SolveResult，失败返回 None。"""
    if parsed is None:
        return None

    reference_answer = parsed.get("referenceAnswer") or parsed.get("reference_answer") or ""
    if not reference_answer:
        return None

    raw_steps = parsed.get("solutionSteps") or parsed.get("solution_steps") or []
    steps: list[SolutionStep] = []
    for index, step in enumerate(raw_steps, start=1):
        if not isinstance(step, dict):
            continue
        explanation = (
            str(step.get("explanation") or step.get("action") or step.get("content") or "").strip()
        )
        if not explanation:
            continue
        title = str(step.get("title") or step.get("name") or f"步骤 {index}").strip()
        step_id = str(step.get("stepId") or step.get("step_id") or f"step_{index}")
        steps.append(SolutionStep(step_id=step_id, title=title, explanation=explanation))

    if not steps:
        return None

    reasoning_trace = str(
        parsed.get("reasoningTrace") or parsed.get("reasoning_trace") or ""
    ).strip()

    return SolveResult(
        reference_answer=str(reference_answer).strip(),
        solution_steps=steps,
        reasoning_trace=reasoning_trace,
        provider_used=provider_used,
    )


def _build_fallback_solve_result(
    *,
    understanding: UnderstandingResult,
    provider_used: str,
) -> SolveResult:
    """当 LLM 解析失败时，从 understanding 构建最小可用的 SolveResult。"""
    steps = understanding.solution_steps or [
        SolutionStep(step_id="step_1", title="分析", explanation=understanding.topic_summary)
    ]
    return SolveResult(
        reference_answer=f"基于题目理解生成的参考解答：{understanding.topic_summary}",
        solution_steps=steps,
        reasoning_trace="",
        is_fallback=True,
        provider_used=provider_used,
    )


@dataclass(slots=True)
class SolveService:
    """独立解题服务，调用推理模型生成参考答案。"""

    providers: Sequence[Any]
    failover_service: ProviderFailoverService
    runtime: VideoRuntimeStateStore

    async def execute(
        self,
        *,
        source_payload: dict[str, object],
        understanding: UnderstandingResult,
        emit_switch=None,
    ) -> SolveResult:
        """执行独立解题，返回 SolveResult。"""
        source_text = extract_source_text(source_payload)
        prompt = build_solve_prompt(
            source_text=source_text,
            topic_summary=understanding.topic_summary,
            subject=understanding.subject,
            difficulty=understanding.difficulty,
            knowledge_points=understanding.knowledge_points,
        )

        try:
            provider_result = await self.failover_service.generate(
                self.providers,
                prompt,
                emit_switch=emit_switch,
            )
        except ProviderAllFailedError as exc:
            raise VideoPipelineError(
                stage=VideoStage.SOLVE,
                error_code=VideoTaskErrorCode.VIDEO_SOLVE_FAILED,
                message=str(exc),
            ) from exc

        logger.debug("[Solve] LLM响应 (前500字): %s", provider_result.content[:500])
        parsed = extract_json_object(provider_result.content)
        solve_result = _parse_solve_result(
            parsed,
            understanding=understanding,
            provider_used=provider_result.provider,
        )
        if solve_result is None:
            logger.warning("[Solve] LLM 输出无法解析，使用 understanding 回退")
            solve_result = _build_fallback_solve_result(
                understanding=understanding,
                provider_used=provider_result.provider,
            )

        self.runtime.save_model("solve", solve_result)
        logger.info(
            "[Solve完成] answer_len=%d steps=%d provider=%s",
            len(solve_result.reference_answer),
            len(solve_result.solution_steps),
            solve_result.provider_used,
        )
        return solve_result
