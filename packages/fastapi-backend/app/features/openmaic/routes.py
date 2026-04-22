"""OpenMAIC routes — scaffold (Team A fills in).

Endpoints (P0):
- POST /classroom                     — submit generation job
- GET  /classroom/{job_id}            — poll status
- GET  /classroom/{job_id}/events     — SSE progress stream
- POST /generate/scene-outlines-stream
- POST /generate/scene-content
- POST /generate/scene-actions
- POST /generate/agent-profiles
- POST /chat                          — multi-agent discussion (SSE)
- POST /quiz-grade
- POST /parse-pdf
"""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/openmaic", tags=["openmaic"])


@router.get("/bootstrap")
async def bootstrap() -> dict[str, str]:
    """Feature bootstrap — verifies router is wired."""
    return {"feature": "openmaic", "status": "scaffold"}
