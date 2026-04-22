# OpenMAIC Port — Master Plan

**Target:** Copy OpenMAIC (AI Multi-Agent Interactive Classroom) into Prorise workspace, reusing our existing FastAPI LLM provider stack and student-web design system.

**Branch:** `feature/openmaic-port` (from master `b1da8a9`)

---

## 1. Scope Decision

### IN scope (P0 - must ship)
- **Home entry**: topic input → "generate classroom" button → job creation
- **Classroom view**: slide playback + whiteboard + agent chat sidebar
- **Backend endpoints** (FastAPI feature `openmaic`):
  - `POST /api/v1/openmaic/classroom` — submit generation job (returns jobId)
  - `GET  /api/v1/openmaic/classroom/{job_id}` — poll job status
  - `GET  /api/v1/openmaic/classroom/{job_id}/events` — SSE progress stream
  - `POST /api/v1/openmaic/generate/scene-outlines-stream` — Stage 1 (SSE)
  - `POST /api/v1/openmaic/generate/scene-content` — Stage 2
  - `POST /api/v1/openmaic/generate/scene-actions` — agent actions
  - `POST /api/v1/openmaic/generate/agent-profiles` — personas
  - `POST /api/v1/openmaic/chat` — multi-agent discussion (SSE)
  - `POST /api/v1/openmaic/quiz-grade` — quiz grading
  - `POST /api/v1/openmaic/parse-pdf` — PDF text extraction
  - `POST /api/v1/openmaic/web-search` — Tavily wrapper (optional)
- **Multi-agent orchestration**: Python port of LangGraph director graph
- **Frontend**: New feature `packages/student-web/src/features/openmaic/`
- **Persistence**: Dexie IndexedDB (client-side; we already have Dexie 4.2.1)
- **LLM**: ALL calls go through `app.providers.protocols.LLMProvider` (our provider chain)

### OUT of scope (defer as P2)
- PPTX / HTML / ZIP export engines (can be added later)
- 3D visualizations / simulations / games (Deep Interactive Mode v0.2.0)
- Video generation (we already have our own pipeline; don't duplicate)
- TTS & ASR (stub initially; student-web has browser-native speechSynthesis as fallback)
- Image generation (optional, stub with placeholder)
- Multi-language beyond zh-CN + en-US

---

## 2. Architecture Mapping

| OpenMAIC (Next.js) | Our Stack |
|---|---|
| Next.js `/app/api/*/route.ts` | FastAPI `app/features/openmaic/routes.py` |
| Vercel AI SDK `callLLM/streamLLM` | `app.providers.protocols.LLMProvider` + thin `llm_adapter.py` wrapper |
| `@langchain/langgraph` (JS) | `langgraph` Python (same authors, full parity) |
| Zustand stores | Zustand stores (student-web already has pattern) |
| Dexie (client IndexedDB) | Dexie 4.2.1 (already installed) |
| shadcn/ui + Radix | Radix UI 1.4.3 (already installed) — reuse |
| Tailwind CSS 4 | Tailwind 4.2.2 — reuse |
| Next.js App Router | React Router 7 |
| middleware.ts (ACCESS_CODE) | AccessContext from `app.core.security` (existing) |
| `server-providers.yml` | `xm_ai_provider` + `xm_ai_resource` + `xm_ai_module_binding` (DB, existing) |

---

## 3. Directory Layout

### Backend — `packages/fastapi-backend/app/features/openmaic/`
```
openmaic/
├── __init__.py
├── routes.py                      # FastAPI routes (target <300 LOC, split if >)
├── schemas.py                     # Pydantic schemas (scene, outline, classroom, chat)
├── service.py                     # OpenMAICService orchestrator (target <500 LOC)
├── llm_adapter.py                 # Thin wrapper: LLMProvider → OpenMAIC callLLM semantics
├── generation/
│   ├── __init__.py
│   ├── outline_generator.py       # Stage 1: topic → scene outlines (SSE)
│   ├── scene_generator.py         # Stage 2: scene content (slide/quiz/interactive/PBL)
│   ├── action_parser.py           # Parse agent actions JSON
│   ├── json_repair.py             # Partial JSON recovery
│   └── prompts/
│       ├── outline.py             # Outline system+user prompts
│       ├── scene_slide.py
│       ├── scene_quiz.py
│       ├── scene_interactive.py
│       ├── scene_actions.py
│       └── agent_profiles.py
├── orchestration/
│   ├── __init__.py
│   ├── director_graph.py          # LangGraph state machine (Python)
│   ├── director_prompt.py
│   ├── tool_schemas.py            # draw, write_text, highlight, laser_pointer
│   └── summarizers.py
├── jobs/
│   ├── __init__.py
│   ├── job_runner.py              # Dramatiq task: run full classroom generation
│   └── job_store.py               # Redis-backed job state
├── pdf/
│   ├── __init__.py
│   └── parser.py                  # PDF text extraction (pypdf or unpdf equivalent)
├── search/
│   ├── __init__.py
│   └── tavily_client.py           # Optional Tavily wrapper
└── tests/
    ├── __init__.py
    ├── test_routes.py
    ├── test_generation.py
    └── test_director_graph.py
```

### Frontend — `packages/student-web/src/features/openmaic/`
```
openmaic/
├── pages/
│   ├── openmaic-home-page.tsx            # Topic input + recent classrooms
│   ├── openmaic-classroom-page.tsx       # Main playback view
│   └── openmaic-settings-page.tsx        # (optional) provider settings
├── components/
│   ├── scene-renderers/
│   │   ├── slide-renderer.tsx
│   │   ├── quiz-renderer.tsx
│   │   ├── interactive-renderer.tsx
│   │   └── pbl-renderer.tsx
│   ├── agent/
│   │   ├── agent-avatar.tsx
│   │   ├── agent-bar.tsx
│   │   └── agent-bubble.tsx
│   ├── chat/
│   │   ├── chat-panel.tsx
│   │   └── roundtable.tsx
│   ├── whiteboard/
│   │   ├── whiteboard.tsx
│   │   └── drawing-tools.tsx
│   ├── generation/
│   │   └── generation-toolbar.tsx
│   └── stage.tsx                        # Top-level composition
├── hooks/
│   ├── use-classroom.ts
│   ├── use-scene-player.ts
│   ├── use-director-chat.ts
│   └── use-classroom-db.ts              # Dexie wrapper
├── store/
│   ├── classroom-store.ts                # Zustand
│   └── settings-store.ts
├── db/
│   └── classroom-db.ts                   # Dexie schema
├── api/
│   └── openmaic-adapter.ts               # Calls to fastapi-backend
├── types/
│   ├── scene.ts
│   ├── action.ts
│   ├── classroom.ts
│   └── agent.ts
└── index.ts                              # Barrel export
```

### Routes (student-web)
- `/openmaic` — home (topic input, recent classrooms)
- `/openmaic/classroom/:id` — classroom playback
- (behind `RequireAuthRoute`)

---

## 4. Database & Provider Config

### New rows in `xm_ai_module` (one per openmaic stage)
- `openmaic.outline` — outline generation (Stage 1)
- `openmaic.scene_content` — scene content (Stage 2)
- `openmaic.scene_actions` — agent action generation
- `openmaic.agent_profiles` — persona generation
- `openmaic.director` — multi-agent director (chat)
- `openmaic.quiz_grade` — quiz grading

### Bindings in `xm_ai_module_binding`
All stages bound to **DeepSeek** (existing provider) as primary; **Gemini Gateway** as fallback.

### New row in `xm_openmaic_classroom` (optional — for user history sync)
Defer to P1.5; IndexedDB is sufficient for P0. If added:
```sql
CREATE TABLE xm_openmaic_classroom (
  id            BIGINT PRIMARY KEY,
  user_id       VARCHAR(64) NOT NULL,
  name          VARCHAR(255),
  requirement   TEXT,
  scenes_json   MEDIUMTEXT,    -- full classroom JSON
  agents_json   TEXT,
  status        VARCHAR(32),   -- generating|ready|failed
  created_at    DATETIME,
  updated_at    DATETIME,
  INDEX(user_id, created_at)
);
```

### Dependencies to add
**Python (fastapi-backend pyproject.toml):**
- `langgraph` — multi-agent state machine
- `langchain-core` — base abstractions
- `pypdf` — PDF parsing (lightweight)
- `partial-json-parser` — robust JSON from LLM
- `tavily-python` — optional web search

**TypeScript (student-web package.json):** none needed (all existing)

---

## 5. LLM Adapter (Most Critical Piece)

**File:** `app/features/openmaic/llm_adapter.py`

```python
from dataclasses import dataclass
from typing import AsyncIterator, Sequence
from app.providers.protocols import LLMProvider, ProviderError

@dataclass
class LLMCallParams:
    system: str
    prompt: str
    temperature: float | None = None
    max_tokens: int | None = None

async def call_llm(
    params: LLMCallParams,
    provider_chain: Sequence[LLMProvider],
) -> str:
    """One-shot generation with failover."""
    combined = f"{params.system}\n\n---\n\n{params.prompt}"
    last_error = None
    for provider in provider_chain:
        try:
            result = await provider.generate(combined)
            return result.content
        except ProviderError as e:
            last_error = e
            continue
    raise last_error or ProviderError("no providers configured")

async def stream_llm(
    params: LLMCallParams,
    provider_chain: Sequence[LLMProvider],
) -> AsyncIterator[str]:
    """Streaming generation. Falls back to non-streaming chunked yield."""
    # Initial P0: emit full result at once (wrap call_llm)
    # P1: check if provider exposes streaming; wire real SSE
    text = await call_llm(params, provider_chain)
    yield text
```

**Why this is enough for P0:** Our `LLMProvider.generate()` already returns the full completion. Streaming can be added in a later phase by extending the protocol.

---

## 6. Parallel Team Layout

| Team | Worktree | Branch Base | Scope | Agent Type |
|---|---|---|---|---|
| **Me (orchestrator)** | main repo | `feature/openmaic-port` | branch setup, deps, DB seeds, integration | self |
| **Team A (Backend)** | `.worktrees/openmaic-backend/` | `feature/openmaic-port` | all of `packages/fastapi-backend/app/features/openmaic/` routes+schemas+service+generation | general-purpose |
| **Team B (Frontend)** | `.worktrees/openmaic-frontend/` | `feature/openmaic-port` | all of `packages/student-web/src/features/openmaic/` | general-purpose |
| **Team C (Orchestration)** | `.worktrees/openmaic-orch/` | `feature/openmaic-port` | `orchestration/` subdir (Python langgraph director) + tests | general-purpose |

Teams A/B/C work in separate worktrees (no file conflicts — each owns different folder).
After each team completes, I cherry-pick or merge their worktree branch back into `feature/openmaic-port` (no rebase needed because non-overlapping files).

---

## 7. Milestones

### M1 — Infrastructure (Me, 30min)
- [x] Feature branch `feature/openmaic-port`
- [x] Feature folder scaffolds (both backend + frontend)
- [x] Python deps installed (langgraph, pypdf, partial-json-parser)
- [x] DB: add `xm_ai_module` rows + bindings SQL
- [x] Backend: register `openmaic` router in `app/api/router.py`
- [x] Frontend: register routes `/openmaic` + `/openmaic/classroom/:id`
- [x] Worktrees created for Teams A/B/C

### M2 — Parallel Implementation (Teams A+B+C, 2-3h)
- Team A: Backend endpoints + generation pipeline
- Team B: Frontend pages + components + Dexie + API adapter
- Team C: LangGraph director + orchestration

### M3 — Integration (Me, 30min)
- Merge worktrees
- Wire frontend ↔ backend
- Fix import/path drift
- Run full test suite

### M4 — Chrome DevTools E2E (Me, 30min-1h)
- Start FastAPI + Dramatiq worker + student-web dev server
- Real browser test: topic input → classroom generated → slide playback
- Iterate on bugs via Agent spawns until green

### M5 — Documentation & handoff (Me, 20min)
- User acceptance checklist (`docs/01开发人员手册/`)
- Sprint status update
- Commit + push

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LangGraph Python API diff from JS | Start with minimal director (2 agents, 3 tools), expand later |
| SSE streaming for chat | P0: stream JSON chunks (not tokens). P1: real token streaming if provider supports |
| Dexie schema evolution | Version schema from v1 with migration-ready design |
| PDF parsing failures | Use `pypdf` + fallback to plain text extraction |
| Provider chain not configured for openmaic stages | Seed DB via migration SQL before testing |
| FastAPI file size >500 LOC limit | Split service into subfiles (service/ dir) from the start |
| Next.js server actions | N/A — OpenMAIC uses explicit API routes (no server actions) |

---

## 9. Acceptance Criteria (End-to-end)

1. ✅ User lands on `/openmaic`, sees input box
2. ✅ User enters "教我微积分基础" → clicks generate
3. ✅ Outline streams in → 4-6 scene cards appear
4. ✅ Scene contents generate in background (progress shown)
5. ✅ Auto-navigate to `/openmaic/classroom/:id`
6. ✅ First scene plays: agent speaks, draws on whiteboard, slide renders
7. ✅ User can click "next scene", progress through
8. ✅ Chat panel: user asks question → multi-agent roundtable response (SSE)
9. ✅ Classroom persists to IndexedDB; reload restores state
10. ✅ Settings: user selects provider; takes effect on next generation

All verified via **chrome-devtools MCP** real browser interaction.
