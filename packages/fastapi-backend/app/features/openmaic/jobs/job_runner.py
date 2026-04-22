"""Dramatiq actor: run full OpenMAIC classroom generation pipeline.

Enqueued by POST /openmaic/classroom endpoint.
Writes progress to Redis via JobStore (synchronous).
"""

from __future__ import annotations

import asyncio
import logging
import time

import dramatiq

logger = logging.getLogger(__name__)


def _make_job_store():
    """Lazy-import JobStore + RuntimeStore to avoid import-time side effects."""
    from app.worker import get_runtime_store
    from app.features.openmaic.jobs.job_store import JobStore
    return JobStore(get_runtime_store())


@dramatiq.actor(queue_name="openmaic-jobs", max_retries=0, time_limit=30 * 60 * 1000)
def run_classroom_generation(
    job_id: str,
    requirement: str,
    pdf_text: str | None = None,
    user_id: str | None = None,
) -> None:
    """Background task: orchestrate full classroom generation pipeline.

    Stages:
    1. Generate outline (Stage 1)
    2. Generate agent profiles
    3. Generate scene content + actions (Stage 2, sequential for P0)
    4. Persist result to Redis via JobStore
    """
    asyncio.run(_async_run_classroom_generation(job_id, requirement, pdf_text, user_id))


async def _async_run_classroom_generation(
    job_id: str,
    requirement: str,
    pdf_text: str | None,
    user_id: str | None,
) -> None:
    """Async implementation of the classroom generation pipeline."""
    from app.features.openmaic.llm_adapter import resolve_openmaic_providers
    from app.features.openmaic.generation.outline_generator import generate_scene_outlines
    from app.features.openmaic.generation.scene_generator import (
        generate_scene_content,
        generate_scene_actions,
        generate_agent_profiles,
    )

    job_store = _make_job_store()

    try:
        job_store.set_status(job_id, "generating_outline")
        job_store.set_progress(job_id, 5)

        # ── Stage 1: Outline ─────────────────────────────────────────────
        outline_chain = await resolve_openmaic_providers("outline")
        outline_result = await generate_scene_outlines(
            requirement=requirement,
            provider_chain=outline_chain,
            pdf_text=pdf_text,
        )

        language_directive = outline_result.get("languageDirective", "")
        outlines = outline_result.get("outlines", [])

        job_store.set_progress(job_id, 20)

        # ── Stage 1.5: Agent profiles ────────────────────────────────────
        profile_chain = await resolve_openmaic_providers("agent_profiles")
        agents = await generate_agent_profiles(
            stage_name=requirement[:60],
            language_directive=language_directive,
            provider_chain=profile_chain,
            scene_outlines=outlines,
            available_avatars=_default_avatars(),
        )

        job_store.set_progress(job_id, 30)
        job_store.set_status(job_id, "generating_scenes")

        # ── Stage 2: Scene content + actions ─────────────────────────────
        content_chain = await resolve_openmaic_providers("scene_content")
        actions_chain = await resolve_openmaic_providers("scene_actions")

        scenes = []
        total_outlines = len(outlines)

        for idx, outline in enumerate(outlines):
            scene_id = outline.get("id") or f"scene_{idx + 1}"

            content = await generate_scene_content(
                outline=outline,
                provider_chain=content_chain,
                language_directive=language_directive,
                agents=agents,
            )

            actions = await generate_scene_actions(
                outline=outline,
                content=content,
                provider_chain=actions_chain,
                language_directive=language_directive,
                agents=agents,
            )

            scenes.append({
                "id": scene_id,
                "type": outline.get("type", "slide"),
                "title": outline.get("title", ""),
                "content": content,
                "actions": actions,
                "outline": outline,
            })

            progress = 30 + int(60 * (idx + 1) / max(total_outlines, 1))
            job_store.set_progress(job_id, progress)

        # ── Finalize ─────────────────────────────────────────────────────
        classroom = {
            "id": job_id,
            "name": requirement[:80],
            "requirement": requirement,
            "languageDirective": language_directive,
            "scenes": scenes,
            "agents": agents,
            "generatedAt": int(time.time() * 1000),
        }

        job_store.set_result(job_id, classroom)
        logger.info("openmaic.job_runner.completed job_id=%s scenes=%d", job_id, len(scenes))

    except Exception as exc:  # noqa: BLE001
        logger.error("openmaic.job_runner.failed job_id=%s error=%s", job_id, exc)
        job_store.set_error(job_id, str(exc))


def _default_avatars() -> list[str]:
    return ["teacher_1", "student_1", "student_2", "assistant_1"]
