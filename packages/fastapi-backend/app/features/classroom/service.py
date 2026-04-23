"""课堂任务业务服务。

合并了原 ``app.features.openmaic.service`` 与现有 ``ClassroomService``：
- 任务元数据 CRUD 通过继承 ``BaseTaskMetadataService`` 复用 RuoYi
  ``xm_classroom_session`` 表
- 课堂生成 pipeline（outline / scene_content / scene_actions /
  agent_profiles）按 stage 调用 LLM provider chain
- 长期落库通过 ``app.shared.long_term`` & ``xm_session_artifact``
"""
from __future__ import annotations

import logging
from typing import Any

from app.features.classroom.generation.outline_generator import generate_scene_outlines
from app.features.classroom.generation.scene_generator import (
    generate_agent_profiles,
    generate_scene_actions,
    generate_scene_content,
)
from app.features.classroom.llm_adapter import resolve_classroom_providers
from app.features.classroom.schemas import ClassroomBootstrapResponse
from app.shared.task_metadata import TaskType
from app.shared.task_metadata_service import BaseTaskMetadataService

logger = logging.getLogger(__name__)


class ClassroomService(BaseTaskMetadataService):
    """课堂任务业务服务，继承 ``BaseTaskMetadataService``。

    任务生命周期：
    - 创建：通过 ``persist_task`` 写入 RuoYi ``xm_classroom_session``
    - 调度：通过 ``enqueue_classroom_generation`` 入队 Dramatiq actor
            （worker 通过 ``runtime_auth`` 取回 RuoYi 凭据后执行）
    - 进度/事件：走 ``app.shared.task_framework`` 的 RuntimeStore + SSE
    """

    _RESOURCE = "classroom-session"
    _LIST_ENDPOINT = "/classroom/session/list"
    _WRITE_ENDPOINT = "/classroom/session"
    _TASK_TYPE = TaskType.CLASSROOM

    async def bootstrap_status(self) -> ClassroomBootstrapResponse:
        """返回课堂功能域 bootstrap 状态。"""
        return ClassroomBootstrapResponse()

    # ── Direct generation (per-endpoint calls) ─────────────────────────────────

    async def generate_outlines(
        self,
        requirement: str,
        pdf_text: str | None = None,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> dict[str, Any]:
        """生成课堂大纲（一次性，不流式）。"""
        chain = await resolve_classroom_providers("outline", access_token, client_id)
        return await generate_scene_outlines(
            requirement=requirement,
            provider_chain=chain,
            pdf_text=pdf_text,
        )

    async def generate_scene_content_for(
        self,
        outline: dict[str, Any],
        language_directive: str = "",
        course_context: str = "",
        agents: list[dict[str, Any]] | None = None,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> dict[str, Any]:
        """为单场景生成正文内容。"""
        chain = await resolve_classroom_providers("scene_content", access_token, client_id)
        return await generate_scene_content(
            outline=outline,
            provider_chain=chain,
            language_directive=language_directive,
            course_context=course_context,
            agents=agents,
        )

    async def generate_scene_actions_for(
        self,
        outline: dict[str, Any],
        content: dict[str, Any],
        language_directive: str = "",
        agents: list[dict[str, Any]] | None = None,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """为单场景生成动作序列。"""
        chain = await resolve_classroom_providers("scene_actions", access_token, client_id)
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
        scene_outlines: list[dict[str, Any]] | None = None,
        available_avatars: list[str] | None = None,
        stage_description: str | None = None,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """生成多智能体画像。"""
        chain = await resolve_classroom_providers("agent_profiles", access_token, client_id)
        return await generate_agent_profiles(
            stage_name=stage_name,
            language_directive=language_directive,
            provider_chain=chain,
            stage_description=stage_description,
            scene_outlines=scene_outlines,
            available_avatars=available_avatars,
        )


__all__ = ["ClassroomService"]
