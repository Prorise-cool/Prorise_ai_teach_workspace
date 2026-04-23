"""课堂生成相关 HTTP 端点。

合并自 ``app.features.openmaic.routes`` 的 ``/openmaic/classroom``、
``/openmaic/generate/*``、``/openmaic/chat`` 等。Wave 1 新路径前缀：
``/api/v1/classroom``。
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, StreamingResponse

from app.core.security import AccessContext, get_access_context
from app.features.classroom.jobs.job_store import ClassroomRuntimeStateStore
from app.features.classroom.runtime_auth import (
    delete_classroom_runtime_auth,
    save_classroom_runtime_auth,
)
from app.features.classroom.schemas import (
    AgentProfilesRequest,
    ClassroomCreateRequest,
    ClassroomCreateResponse,
    JobStatusResponse,
    OutlineStreamRequest,
    SceneActionsRequest,
    SceneContentRequest,
)
from app.features.classroom.service import ClassroomService
from app.schemas.common import build_success_envelope

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_runtime_store(request: Request):
    return request.app.state.runtime_store


def _get_runtime_state_store(request: Request) -> ClassroomRuntimeStateStore:
    return ClassroomRuntimeStateStore(_get_runtime_store(request))


def _get_service() -> ClassroomService:
    return ClassroomService()


def _sse_event(data: str, event: str | None = None) -> str:
    lines = []
    if event:
        lines.append(f"event: {event}")
    lines.append(f"data: {data}")
    lines.append("")
    return "\n".join(lines) + "\n"


def _sse_done() -> str:
    return _sse_event("[DONE]")


@router.post("/generate/classroom")
async def create_classroom_generation(
    payload: ClassroomCreateRequest,
    request: Request,
    access_context: AccessContext = Depends(get_access_context),
) -> dict[str, object]:
    """提交课堂生成任务。返回 ``task_id`` 用于轮询/SSE。"""
    task_id = f"classroom_{uuid.uuid4().hex[:12]}"

    runtime_store = _get_runtime_store(request)
    runtime_state = ClassroomRuntimeStateStore(runtime_store)
    runtime_state.create(task_id)
    save_classroom_runtime_auth(
        runtime_store, task_id=task_id, access_context=access_context,
    )

    try:
        from app.features.classroom.jobs.job_runner import run_classroom_generation
        run_classroom_generation.send(
            task_id=task_id,
            requirement=payload.requirement,
            pdf_text=payload.pdf_text,
            user_id=access_context.user_id,
        )
    except Exception:
        delete_classroom_runtime_auth(runtime_store, task_id=task_id)
        raise

    response = ClassroomCreateResponse(
        task_id=task_id,
        poll_url=f"/api/v1/classroom/generate/classroom/{task_id}",
    )
    logger.info("classroom.routes_generation.enqueued task_id=%s", task_id)
    return build_success_envelope(response, msg="操作成功")


@router.get("/generate/classroom/{task_id}")
async def get_classroom_generation_status(
    task_id: str,
    request: Request,
    access_context: AccessContext = Depends(get_access_context),  # noqa: ARG001
) -> dict[str, object]:
    """轮询课堂生成任务状态。

    返回统一信封 ``{code, msg, data: JobStatusResponse}``，与其他 POST
    接口保持一致，供前端 ``unwrapEnvelope`` 统一解包。
    """
    runtime_state = _get_runtime_state_store(request)
    info = runtime_state.get_status(task_id)
    payload = JobStatusResponse(
        task_id=task_id,
        status=info["status"],
        progress=info.get("progress", 0),
        classroom=info.get("classroom"),
        error=info.get("error"),
        message=info.get("message"),
    )
    return build_success_envelope(payload, msg="操作成功")


@router.get("/generate/classroom/{task_id}/events")
async def stream_classroom_generation_events(
    task_id: str,
    request: Request,
    access_context: AccessContext = Depends(get_access_context),  # noqa: ARG001
) -> StreamingResponse:
    """以 SSE 推送课堂生成进度事件。

    NOTE: 当前以 RuntimeStore 轮询作为简化实现；后续接入 ``app.shared.task_framework``
    的统一 SSE 流（见 Wave 1.5 计划）。事件名沿用 ``progress / ready / failed``，
    与 ``app.api.routes.tasks.get_task_events`` 的 ``progress / ready / error`` 对齐
    （前端 TaskEventName 已支持）。
    """
    runtime_state = _get_runtime_state_store(request)

    async def _event_stream() -> AsyncIterator[str]:
        poll_interval = 2.0
        max_polls = 300  # ~10 min
        for _ in range(max_polls):
            info = runtime_state.get_status(task_id)
            payload = json.dumps(
                {
                    "type": "progress",
                    "taskId": task_id,
                    "status": info["status"],
                    "progress": info.get("progress", 0),
                    "message": info.get("message"),
                },
                ensure_ascii=False,
            )
            yield _sse_event(payload, event="progress")

            if info["status"] in ("ready", "failed"):
                final_payload = json.dumps(
                    {
                        "type": info["status"],
                        "taskId": task_id,
                        "classroom": info.get("classroom"),
                        "error": info.get("error"),
                    },
                    ensure_ascii=False,
                )
                yield _sse_event(final_payload, event=info["status"])
                yield _sse_done()
                return
            await asyncio.sleep(poll_interval)

        yield _sse_event(
            json.dumps({"type": "failed", "message": "轮询超时"}, ensure_ascii=False),
            event="failed",
        )
        yield _sse_done()

    return StreamingResponse(
        _event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/generate/scene-outlines-stream")
async def generate_scene_outlines_stream(
    payload: OutlineStreamRequest,
    access_context: AccessContext = Depends(get_access_context),
) -> StreamingResponse:
    """SSE 流式生成场景大纲（Stage 1）。"""
    from app.features.classroom.generation.outline_generator import (
        generate_scene_outlines,
        stream_scene_outlines,
    )
    from app.features.classroom.llm_adapter import resolve_classroom_providers

    async def _outline_stream() -> AsyncIterator[str]:
        try:
            chain = await resolve_classroom_providers(
                "outline",
                access_token=access_context.token,
                client_id=access_context.client_id,
            )
            async for chunk in stream_scene_outlines(
                requirement=payload.requirement,
                provider_chain=chain,
                pdf_text=payload.pdf_text,
            ):
                yield _sse_event(
                    json.dumps({"type": "chunk", "content": chunk}, ensure_ascii=False)
                )
            result = await generate_scene_outlines(
                requirement=payload.requirement,
                provider_chain=chain,
                pdf_text=payload.pdf_text,
            )
            yield _sse_event(
                json.dumps({"type": "result", "data": result}, ensure_ascii=False),
                event="result",
            )
            yield _sse_done()
        except Exception as exc:  # noqa: BLE001
            logger.error("classroom.routes_generation.outline_stream_error %s", exc)
            yield _sse_event(
                json.dumps({"type": "error", "message": str(exc)}, ensure_ascii=False),
                event="error",
            )
            yield _sse_done()

    return StreamingResponse(
        _outline_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/generate/scene-content")
async def generate_scene_content(
    payload: SceneContentRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: ClassroomService = Depends(_get_service),
) -> JSONResponse:
    """为单场景生成正文内容。"""
    outline_dict = payload.outline.model_dump(by_alias=True)
    agents_dicts = [a.model_dump(by_alias=True) for a in payload.agents]
    content = await service.generate_scene_content_for(
        outline=outline_dict,
        language_directive=payload.language_directive,
        course_context=payload.course_context,
        agents=agents_dicts,
        access_token=access_context.token,
        client_id=access_context.client_id,
    )
    return build_success_envelope(
        {
            "sceneId": outline_dict.get("id", ""),
            "content": content,
        },
        msg="操作成功",
    )


@router.post("/generate/scene-actions")
async def generate_scene_actions(
    payload: SceneActionsRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: ClassroomService = Depends(_get_service),
) -> JSONResponse:
    """为单场景生成动作序列。"""
    outline_dict = payload.outline.model_dump(by_alias=True)
    agents_dicts = [a.model_dump(by_alias=True) for a in payload.agents]
    actions = await service.generate_scene_actions_for(
        outline=outline_dict,
        content=payload.content,
        language_directive=payload.language_directive,
        agents=agents_dicts,
        access_token=access_context.token,
        client_id=access_context.client_id,
    )
    return build_success_envelope(
        {
            "sceneId": outline_dict.get("id", ""),
            "actions": actions,
        },
        msg="操作成功",
    )


@router.post("/generate/agent-profiles")
async def generate_agent_profiles(
    payload: AgentProfilesRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: ClassroomService = Depends(_get_service),
) -> JSONResponse:
    """生成多智能体画像。"""
    agents = await service.generate_agent_profiles_for(
        stage_name=payload.stage_name,
        language_directive=payload.language_directive,
        scene_outlines=payload.scene_outlines,
        available_avatars=payload.available_avatars,
        stage_description=payload.stage_description,
        access_token=access_context.token,
        client_id=access_context.client_id,
    )
    return build_success_envelope({"agents": agents}, msg="操作成功")
