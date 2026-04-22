"""OpenMAIC service — orchestrates generation pipeline components.

Composes: outline_generator + scene_generator + llm_adapter + job lifecycle.
Target ≤ 500 LOC.
"""

from __future__ import annotations

import logging
import uuid

from app.features.openmaic.generation.outline_generator import generate_scene_outlines
from app.features.openmaic.generation.scene_generator import (
    generate_agent_profiles,
    generate_scene_actions,
    generate_scene_content,
)
from app.features.openmaic.jobs.job_store import JobStore
from app.features.openmaic.llm_adapter import (
    LLMCallParams,
    call_llm,
    resolve_openmaic_providers,
)
from app.features.openmaic.generation.json_repair import parse_json_response

logger = logging.getLogger(__name__)


class OpenMAICService:
    """Main service for OpenMAIC classroom generation."""

    def __init__(self, job_store: JobStore) -> None:
        self._job_store = job_store

    # ── Job lifecycle ──────────────────────────────────────────────────────────

    async def create_classroom_job(
        self,
        requirement: str,
        pdf_text: str | None = None,
        user_id: str | None = None,
    ) -> str:
        """Create a classroom generation job and enqueue it.

        Returns job_id.
        """
        job_id = f"classroom_{uuid.uuid4().hex[:12]}"
        self._job_store.create(job_id)

        # Enqueue Dramatiq task
        from app.features.openmaic.jobs.job_runner import run_classroom_generation

        run_classroom_generation.send(
            job_id=job_id,
            requirement=requirement,
            pdf_text=pdf_text,
            user_id=user_id,
        )

        logger.info("openmaic.service: enqueued job_id=%s", job_id)
        return job_id

    def get_job_status(self, job_id: str) -> dict:
        """Return job status including classroom data when ready."""
        return self._job_store.get_status(job_id)

    # ── Direct generation (for per-endpoint calls) ─────────────────────────────

    async def generate_outlines(
        self,
        requirement: str,
        pdf_text: str | None = None,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> dict:
        """Generate scene outlines (one-shot, non-streaming)."""
        chain = await resolve_openmaic_providers("outline", access_token, client_id)
        return await generate_scene_outlines(
            requirement=requirement,
            provider_chain=chain,
            pdf_text=pdf_text,
        )

    async def generate_scene_content_for(
        self,
        outline: dict,
        language_directive: str = "",
        course_context: str = "",
        agents: list[dict] | None = None,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> dict:
        """Generate content for a single scene."""
        chain = await resolve_openmaic_providers("scene_content", access_token, client_id)
        return await generate_scene_content(
            outline=outline,
            provider_chain=chain,
            language_directive=language_directive,
            course_context=course_context,
            agents=agents,
        )

    async def generate_scene_actions_for(
        self,
        outline: dict,
        content: dict,
        language_directive: str = "",
        agents: list[dict] | None = None,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> list[dict]:
        """Generate action sequence for a single scene."""
        chain = await resolve_openmaic_providers("scene_actions", access_token, client_id)
        return await generate_scene_actions(
            outline=outline,
            content=content,
            provider_chain=chain,
            language_directive=language_directive,
            agents=agents,
        )

    async def generate_agent_profiles_for(
        self,
        stage_name: str,
        language_directive: str,
        scene_outlines: list[dict] | None = None,
        available_avatars: list[str] | None = None,
        stage_description: str | None = None,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> list[dict]:
        """Generate agent profiles for a classroom."""
        chain = await resolve_openmaic_providers("agent_profiles", access_token, client_id)
        return await generate_agent_profiles(
            stage_name=stage_name,
            language_directive=language_directive,
            provider_chain=chain,
            stage_description=stage_description,
            scene_outlines=scene_outlines,
            available_avatars=available_avatars,
        )

    async def grade_quiz_answer(
        self,
        question: str,
        user_answer: str,
        points: float = 10.0,
        comment_prompt: str | None = None,
        language: str | None = None,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> dict:
        """Grade a quiz answer using LLM.

        Returns {"score": float, "comment": str}.
        """
        chain = await resolve_openmaic_providers("quiz_grade", access_token, client_id)
        is_zh = language == "zh-CN"

        if is_zh:
            system_prompt = (
                f"你是一位专业的教育评估专家。请根据题目和学生答案进行评分并给出简短评语。\n"
                f"必须以如下JSON格式回复（不要包含其他内容）：\n"
                f'{{"score": <0到{points}的整数>, "comment": "<一两句评语>"}}'
            )
            user_prompt = (
                f"题目：{question}\n"
                f"满分：{points}分\n"
                f"{f'评分要点：{comment_prompt}' + chr(10) if comment_prompt else ''}"
                f"学生答案：{user_answer}"
            )
        else:
            system_prompt = (
                f"You are a professional educational assessor. Grade the student's answer.\n"
                f'Reply ONLY in JSON: {{"score": <int 0-{points}>, "comment": "<feedback>"}}'
            )
            user_prompt = (
                f"Question: {question}\n"
                f"Full marks: {points}\n"
                f"{f'Grading guidance: {comment_prompt}' + chr(10) if comment_prompt else ''}"
                f"Student answer: {user_answer}"
            )

        params = LLMCallParams(system=system_prompt, prompt=user_prompt)

        try:
            response = await call_llm(params, chain)
            parsed = parse_json_response(response)
            if isinstance(parsed, dict):
                raw_score = float(parsed.get("score", 0))
                score = max(0.0, min(float(points), round(raw_score)))
                comment = str(parsed.get("comment", ""))
                return {"score": score, "comment": comment}
        except Exception as exc:  # noqa: BLE001
            logger.warning("openmaic.service.grade_quiz: failed: %s", exc)

        # Fallback: partial credit
        fallback_comment = (
            "已作答，请参考标准答案。" if is_zh else "Answer received. Please refer to the standard answer."
        )
        return {"score": round(float(points) * 0.5), "comment": fallback_comment}
