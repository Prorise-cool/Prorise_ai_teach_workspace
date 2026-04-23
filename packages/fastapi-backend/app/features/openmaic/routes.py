"""OpenMAIC FastAPI endpoints.

Prefix: /openmaic (registered in app/api/router.py under /api/v1)

Endpoints:
- GET  /bootstrap
- POST /classroom               — submit generation job
- GET  /classroom/{job_id}      — poll job status
- GET  /classroom/{job_id}/events — SSE progress stream
- POST /generate/scene-outlines-stream — SSE outline streaming
- POST /generate/scene-content
- POST /generate/scene-actions
- POST /generate/agent-profiles
- POST /chat                    — multi-agent SSE (delegates to Team C)
- POST /quiz-grade
- POST /parse-pdf
- POST /web-search              — optional Tavily wrapper
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncIterator

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import JSONResponse, StreamingResponse

from app.core.security import AccessContext, get_access_context
from app.features.openmaic.jobs.job_store import JobStore
from app.features.openmaic.pdf.parser import parse_pdf_bytes
from app.features.openmaic.schemas import (
    AgentProfilesRequest,
    AgentProfilesResponse,
    BootstrapResponse,
    ChatRequest,
    ClassroomCreateRequest,
    ClassroomCreateResponse,
    JobStatusResponse,
    OutlineStreamRequest,
    ParsePdfResponse,
    QuizGradeRequest,
    QuizGradeResponse,
    SceneActionsRequest,
    SceneActionsResponse,
    SceneContentRequest,
    SceneContentResponse,
)
from app.features.openmaic.service import OpenMAICService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/openmaic", tags=["openmaic"])


# ── Dependency providers ──────────────────────────────────────────────────────

def _get_job_store() -> JobStore:
    from app.worker import get_runtime_store
    return JobStore(get_runtime_store())


def _get_service(job_store: JobStore = Depends(_get_job_store)) -> OpenMAICService:
    return OpenMAICService(job_store=job_store)


def _access_token_from(ctx: AccessContext) -> str | None:
    return getattr(ctx, "token", None)


def _client_id_from(ctx: AccessContext) -> str | None:
    return getattr(ctx, "client_id", None)


# ── Helper: SSE event formatting ──────────────────────────────────────────────

def _sse_event(data: str, event: str | None = None) -> str:
    lines = []
    if event:
        lines.append(f"event: {event}")
    lines.append(f"data: {data}")
    lines.append("")  # blank line terminates event
    return "\n".join(lines) + "\n"


def _sse_done() -> str:
    return _sse_event("[DONE]")


async def _sse_heartbeat(interval: float = 15.0) -> AsyncIterator[str]:
    """Yield SSE heartbeats to keep connection alive."""
    while True:
        await asyncio.sleep(interval)
        yield ": heartbeat\n\n"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/bootstrap", response_model=BootstrapResponse)
async def bootstrap(
    access_context: AccessContext = Depends(get_access_context),
) -> BootstrapResponse:
    """Feature health + config detect."""
    return BootstrapResponse()


@router.post("/classroom", response_model=ClassroomCreateResponse)
async def create_classroom(
    request: ClassroomCreateRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: OpenMAICService = Depends(_get_service),
) -> ClassroomCreateResponse:
    """Submit a classroom generation job. Returns job_id immediately."""
    job_id = await service.create_classroom_job(
        requirement=request.requirement,
        pdf_text=request.pdf_text,
        user_id=getattr(access_context, "user_id", None),
        access_token=_access_token_from(access_context),
        client_id=_client_id_from(access_context),
    )
    return ClassroomCreateResponse(
        job_id=job_id,
        poll_url=f"/api/v1/openmaic/classroom/{job_id}",
    )


@router.get("/classroom/{job_id}", response_model=JobStatusResponse)
async def get_classroom_status(
    job_id: str,
    access_context: AccessContext = Depends(get_access_context),
    service: OpenMAICService = Depends(_get_service),
) -> JobStatusResponse:
    """Poll classroom generation job status."""
    info = service.get_job_status(job_id)
    return JobStatusResponse(
        job_id=job_id,
        status=info["status"],
        progress=info.get("progress", 0),
        classroom=info.get("classroom"),
        error=info.get("error"),
    )


@router.get("/classroom/{job_id}/events")
async def classroom_events(
    job_id: str,
    access_context: AccessContext = Depends(get_access_context),
    service: OpenMAICService = Depends(_get_service),
) -> StreamingResponse:
    """SSE stream of classroom generation progress events."""

    async def _event_stream() -> AsyncIterator[str]:
        poll_interval = 2.0
        max_polls = 300  # 10 minutes max

        for _ in range(max_polls):
            info = service.get_job_status(job_id)
            payload = json.dumps(
                {
                    "type": "progress",
                    "jobId": job_id,
                    "status": info["status"],
                    "progress": info.get("progress", 0),
                    "message": info.get("message"),
                },
                ensure_ascii=False,
            )
            yield _sse_event(payload, event="progress")

            if info["status"] in ("ready", "failed"):
                # Final event with classroom data or error
                final_payload = json.dumps(
                    {
                        "type": info["status"],
                        "jobId": job_id,
                        "classroom": info.get("classroom"),
                        "error": info.get("error"),
                    },
                    ensure_ascii=False,
                )
                yield _sse_event(final_payload, event=info["status"])
                yield _sse_done()
                return

            await asyncio.sleep(poll_interval)

        # Timeout
        yield _sse_event(
            json.dumps({"type": "error", "message": "Polling timeout"}),
            event="error",
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
    request: OutlineStreamRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: OpenMAICService = Depends(_get_service),
) -> StreamingResponse:
    """SSE streaming outline generation (Stage 1)."""
    from app.features.openmaic.llm_adapter import resolve_openmaic_providers
    from app.features.openmaic.generation.outline_generator import (
        generate_scene_outlines,
        stream_scene_outlines,
    )

    async def _outline_stream() -> AsyncIterator[str]:
        try:
            chain = await resolve_openmaic_providers(
                "outline",
                access_token=_access_token_from(access_context),
                client_id=_client_id_from(access_context),
            )

            # Stream raw LLM output chunks
            async for chunk in stream_scene_outlines(
                requirement=request.requirement,
                provider_chain=chain,
                pdf_text=request.pdf_text,
            ):
                yield _sse_event(
                    json.dumps({"type": "chunk", "content": chunk}, ensure_ascii=False)
                )

            # After streaming, parse and yield structured result
            result = await generate_scene_outlines(
                requirement=request.requirement,
                provider_chain=chain,
                pdf_text=request.pdf_text,
            )
            yield _sse_event(
                json.dumps(
                    {"type": "result", "data": result},
                    ensure_ascii=False,
                ),
                event="result",
            )
            yield _sse_done()

        except Exception as exc:  # noqa: BLE001
            logger.error("outline_stream: error: %s", exc)
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
    request: SceneContentRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: OpenMAICService = Depends(_get_service),
) -> JSONResponse:
    """Generate content for a single scene (Stage 2)."""
    outline_dict = request.outline.model_dump(by_alias=True)
    agents_dicts = [a.model_dump(by_alias=True) for a in request.agents]

    content = await service.generate_scene_content_for(
        outline=outline_dict,
        language_directive=request.language_directive,
        course_context=request.course_context,
        agents=agents_dicts,
        access_token=_access_token_from(access_context),
        client_id=_client_id_from(access_context),
    )

    return JSONResponse(
        content={
            "success": True,
            "data": {
                "sceneId": outline_dict.get("id", ""),
                "content": content,
            },
        }
    )


@router.post("/generate/scene-actions")
async def generate_scene_actions(
    request: SceneActionsRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: OpenMAICService = Depends(_get_service),
) -> JSONResponse:
    """Generate agent action sequence for a scene."""
    outline_dict = request.outline.model_dump(by_alias=True)
    agents_dicts = [a.model_dump(by_alias=True) for a in request.agents]

    actions = await service.generate_scene_actions_for(
        outline=outline_dict,
        content=request.content,
        language_directive=request.language_directive,
        agents=agents_dicts,
        access_token=_access_token_from(access_context),
        client_id=_client_id_from(access_context),
    )

    return JSONResponse(
        content={
            "success": True,
            "data": {
                "sceneId": outline_dict.get("id", ""),
                "actions": actions,
            },
        }
    )


@router.post("/generate/agent-profiles")
async def generate_agent_profiles(
    request: AgentProfilesRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: OpenMAICService = Depends(_get_service),
) -> JSONResponse:
    """Generate agent personas for a classroom."""
    agents = await service.generate_agent_profiles_for(
        stage_name=request.stage_name,
        language_directive=request.language_directive,
        scene_outlines=request.scene_outlines,
        available_avatars=request.available_avatars,
        stage_description=request.stage_description,
        access_token=_access_token_from(access_context),
        client_id=_client_id_from(access_context),
    )

    return JSONResponse(content={"success": True, "data": {"agents": agents}})


@router.post("/chat")
async def chat(
    request: ChatRequest,
    access_context: AccessContext = Depends(get_access_context),
) -> StreamingResponse:
    """Multi-agent discussion SSE stream.

    Delegates to Team C's orchestration.director_graph.run_discussion().
    """
    from app.features.openmaic.orchestration import run_discussion

    messages = [m.model_dump(by_alias=True) for m in request.messages]
    agents = [a.model_dump(by_alias=True) for a in request.agents]

    async def _chat_stream() -> AsyncIterator[str]:
        try:
            async for chunk in run_discussion(
                messages=messages,
                agents=agents,
                classroom_context=request.classroom_context,
                language_directive=request.language_directive,
            ):
                yield _sse_event(chunk)
            yield _sse_done()
        except Exception as exc:  # noqa: BLE001
            logger.error("chat: orchestration error: %s", exc)
            yield _sse_event(
                json.dumps({"type": "error", "message": str(exc)}, ensure_ascii=False),
                event="error",
            )
            yield _sse_done()

    return StreamingResponse(
        _chat_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/quiz-grade")
async def quiz_grade(
    request: QuizGradeRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: OpenMAICService = Depends(_get_service),
) -> JSONResponse:
    """Grade a quiz answer using LLM."""
    result = await service.grade_quiz_answer(
        question=request.question,
        user_answer=request.user_answer,
        points=request.points,
        comment_prompt=request.comment_prompt,
        language=request.language,
        access_token=_access_token_from(access_context),
        client_id=_client_id_from(access_context),
    )
    return JSONResponse(content={"success": True, "data": result})


@router.post("/parse-pdf")
async def parse_pdf(
    file: UploadFile = File(...),
    access_context: AccessContext = Depends(get_access_context),
) -> JSONResponse:
    """Extract text from an uploaded PDF file."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted",
        )

    MAX_SIZE = 200 * 1024 * 1024  # 200 MB
    pdf_bytes = await file.read()

    if len(pdf_bytes) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="PDF file exceeds 200 MB limit",
        )

    result = parse_pdf_bytes(pdf_bytes)
    return JSONResponse(
        content={
            "success": True,
            "data": {
                "text": result.text,
                "pageCount": result.page_count,
            },
        }
    )


@router.post("/web-search")
async def web_search(
    request: Request,
    access_context: AccessContext = Depends(get_access_context),
) -> JSONResponse:
    """Optional Tavily web search wrapper."""
    from app.features.openmaic.search.tavily_client import web_search as _search

    body = await request.json()
    query = str(body.get("query", "")).strip()

    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="query is required",
        )

    results = await _search(query=query, max_results=int(body.get("maxResults", 5)))
    return JSONResponse(
        content={
            "success": True,
            "data": {
                "results": [
                    {"title": r.title, "url": r.url, "content": r.content, "score": r.score}
                    for r in results
                ]
            },
        }
    )
