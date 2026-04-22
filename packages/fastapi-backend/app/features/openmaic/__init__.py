"""OpenMAIC feature — AI multi-agent interactive classroom (ported from OpenMAIC).

Public API:
- `router` — FastAPI router to register in `app.api.router`
- `OpenMAICService` — business orchestrator
"""
from app.features.openmaic.routes import router

__all__ = ["router"]
