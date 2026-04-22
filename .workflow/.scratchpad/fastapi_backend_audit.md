# FastAPI Backend Audit Report

**Date:** 2026-04-23  
**Project:** Prorise AI Teach Workspace  
**Backend Path:** `/Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/packages/fastapi-backend`  
**Purpose:** Complete infrastructure reuse map for OpenMAIC LLM porting  

---

## 1. PROJECT STRUCTURE

```
packages/fastapi-backend/
├── app/
│   ├── api/                          # API routing layer
│   │   ├── router.py                 # Main API router composition
│   │   └── routes/
│   │       ├── health.py             # /health endpoint
│   │       ├── tasks.py              # /api/v1/tasks/* (unified task recovery)
│   │       └── contracts.py          # Contract baseline routes
│   │
│   ├── core/                         # Core infrastructure
│   │   ├── config.py                 # Settings (pydantic-settings, env-based)
│   │   ├── security.py               # Auth (Bearer token, RuoYi integration, AccessContext)
│   │   ├── errors.py                 # Global exception handlers (AppError, IntegrationError)
│   │   ├── logging.py                # Logging configuration + request context
│   │   ├── sse.py                    # SSE event models (TaskProgressEvent)
│   │   ├── lifespan.py               # App startup/shutdown
│   │   └── middleware/
│   │       └── request_context.py    # RequestContextMiddleware (request_id injection)
│   │
│   ├── infra/                        # Infrastructure adapters
│   │   ├── redis_client.py           # Redis runtime store (state, sessions)
│   │   ├── redis_token_store.py      # Online token validation
│   │   ├── redis_task_store.py       # Task status/event cache
│   │   ├── redis_provider_store.py   # Provider health state
│   │   ├── sse_broker.py             # SSE event publishing (Redis-backed)
│   │   └── http/
│   │       └── (HTTP client utilities)
│   │
│   ├── providers/                    # LLM + TTS provider system (CRITICAL)
│   │   ├── protocols.py              # ProviderProtocol, LLMProvider, VisionLLMProvider, TTSProvider
│   │   ├── factory.py                # ProviderFactory, build_default_registry(), get_provider_factory()
│   │   ├── registry.py               # ProviderRegistry (registration + instantiation)
│   │   ├── failover.py               # ProviderFailoverService (retry + health-based switching)
│   │   ├── health.py                 # ProviderHealthStore (Redis-backed health tracking)
│   │   ├── runtime_config_service.py # ProviderRuntimeResolver (RuoYi + settings binding)
│   │   ├── http_utils.py             # OpenAI error handling, settings validators
│   │   ├── demo_provider.py          # DemoLLMProvider (stub with deterministic output)
│   │   ├── llm/
│   │   │   ├── factory.py            # register_llm_providers(), get_llm_provider()
│   │   │   ├── openai_compatible_provider.py  # OpenAICompatibleLLMProvider (vision-aware)
│   │   │   ├── openai_client_factory.py       # AsyncOpenAI client creation
│   │   │   └── stub_provider.py      # StubLLMProvider (no-op, for testing)
│   │   └── tts/
│   │       ├── factory.py            # register_tts_providers(), get_tts_provider()
│   │       ├── openai_provider.py    # OpenAI TTS (text-to-speech)
│   │       ├── doubao_provider.py    # Doubao/ByteDance TTS
│   │       └── stub_provider.py      # StubTTSProvider
│   │
│   ├── features/                     # Domain features (auth, video, classroom, companion, learning, etc.)
│   │   ├── auth/
│   │   │   ├── routes.py             # POST /api/v1/auth/login|register|logout, GET /auth/me|code|binding/*
│   │   │   ├── service.py            # AuthService (RuoYi proxy, encryption)
│   │   │   ├── crypto.py             # RSA encryption for RuoYi protocol
│   │   │   └── models.py             # Auth schemas
│   │   │
│   │   ├── video/                    # Video generation pipeline
│   │   │   ├── routes.py             # POST /api/v1/video/tasks, GET /tasks/{id}, /published, etc.
│   │   │   ├── service/
│   │   │   │   ├── create_task.py    # create_video_task() main entry
│   │   │   │   ├── delete_task.py
│   │   │   │   ├── cancel_task.py
│   │   │   │   └── _helpers.py       # Video task utilities
│   │   │   ├── pipeline/
│   │   │   │   ├── services.py       # Pipeline orchestration services
│   │   │   │   ├── models.py         # Video task models + persistence
│   │   │   │   ├── engine/
│   │   │   │   │   ├── agent.py      # ManimCat orchestration agent (>900 LOC)
│   │   │   │   │   └── gpt_request.py # LLM request building (design + coding phases)
│   │   │   │   ├── orchestration/
│   │   │   │   │   ├── orchestrator.py # Main video orchestrator (2923 LOC!)
│   │   │   │   │   ├── assets.py     # LocalAssetStore (video intermediate products)
│   │   │   │   │   └── subtitle.py   # Subtitle extraction
│   │   │   │   └── prompts/
│   │   │   │       └── manimcat/     # Prompt templates for video design/coding
│   │   │   ├── tasks/                # Dramatiq background tasks
│   │   │   ├── providers/            # Video-specific provider logic
│   │   │   ├── schemas.py            # Video task request/response schemas
│   │   │   ├── models/               # Database models
│   │   │   └── long_term/            # Video metadata persistence
│   │   │
│   │   ├── learning_coach/           # Learning Coach (quiz + checkpoint generation)
│   │   │   ├── routes.py             # POST /api/v1/learning-coach/checkpoint|quiz|path|coach/ask
│   │   │   ├── service.py            # LearningCoachService (1266 LOC)
│   │   │   ├── llm_generator.py      # LLM quiz/checkpoint generation (600 LOC)
│   │   │   ├── schemas.py            # Request/response schemas
│   │   │   └── rate_limit.py         # Per-feature rate limiting
│   │   │
│   │   ├── companion/                # Companion AI (video chat)
│   │   │   ├── routes.py             # GET/POST /api/v1/companion/* endpoints
│   │   │   ├── service.py            # CompanionService (RuoYi persistence)
│   │   │   ├── context_window.py     # Context management
│   │   │   └── context_adapter/      # Context extraction from video/classroom
│   │   │
│   │   ├── classroom/                # Classroom feature
│   │   │   ├── routes.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   │
│   │   ├── learning/                 # Learning/persistence
│   │   │   ├── routes.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   │
│   │   ├── knowledge/                # Knowledge retrieval
│   │   │   ├── routes.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   │
│   │   ├── common.py                 # Shared feature utilities
│   │   └── tasks/                    # Feature-level task definitions
│   │
│   ├── shared/                       # Cross-feature shared code
│   │   ├── task_metadata.py          # Video + classroom shared metadata models
│   │   ├── task_metadata_service.py  # Metadata service base
│   │   ├── task_framework/           # Unified task orchestration
│   │   │   ├── base.py               # Task definition base class
│   │   │   ├── contracts.py          # Task contract + payload models
│   │   │   ├── status.py             # Task status enums + error codes
│   │   │   ├── events.py             # Task event definitions
│   │   │   ├── runtime.py            # Task runtime execution context
│   │   │   ├── runtime_store.py      # Task state persistence
│   │   │   ├── publisher.py          # Event publishing
│   │   │   └── scheduler/
│   │   │       ├── dispatcher.py     # Task dispatcher (Dramatiq)
│   │   │       ├── registry.py       # Task registry
│   │   │       └── runtime_manager.py
│   │   │
│   │   ├── long_term/                # Long-term (RuoYi-backed) persistence
│   │   │   ├── models.py             # Companion turn, learning logs schemas
│   │   │   ├── records.py            # Snapshot + mapping logic
│   │   │   ├── repository.py         # RuoYi CRUD
│   │   │   └── mapper.py             # Schema ↔ RuoYi mapping
│   │   │
│   │   ├── ruoyi/                    # RuoYi integration (auth + persistence)
│   │   │   ├── client/
│   │   │   │   ├── base.py           # RuoYiClientBase
│   │   │   │   ├── http_core.py      # HTTP layer (HTTPX-based)
│   │   │   │   ├── requests.py       # Request building
│   │   │   │   ├── response_parser.py # Response parsing
│   │   │   │   └── shortcuts.py
│   │   │   ├── auth.py               # Auth token validation
│   │   │   ├── models.py             # RuoYi response schemas
│   │   │   └── service_mixin.py      # RuoYiServiceMixin (authenticated factory)
│   │   │
│   │   ├── cos_client.py             # COS (object storage) client
│   │   ├── tencent_adp.py            # Tencent adapter utilities
│   │   └── agent_config.py           # Agent configuration
│   │
│   ├── schemas/
│   │   ├── common.py                 # Unified response envelopes, pagination
│   │   └── examples.py               # Example payloads
│   │
│   └── main.py                       # App entry point (create_app())
│
├── worker.py                         # Dramatiq worker + background task execution
├── tests/
│   ├── unit/                         # Unit tests
│   ├── integration/                  # Integration tests (RuoYi, Redis)
│   ├── api/                          # API endpoint tests
│   ├── contracts/                    # Contract validation tests
│   └── helpers/                      # Test utilities
│
├── pyproject.toml                    # Dependencies + metadata
├── .env.example                      # Full env var reference (extensive)
└── README.md                         # Local dev + testing guide
```

---

## 2. TECH STACK

### Core Dependencies
- **FastAPI** 0.115.x: Web framework
- **Pydantic v2** (via pydantic-settings 2.7.x): Type-safe configuration + validation
- **Uvicorn 0.34.x**: ASGI server (with standard extras)
- **HTTPX 0.28.x**: Async HTTP client (for RuoYi, COS, external APIs)
- **Dramatiq[redis] 1.17.x**: Task queue + background job execution
  - Broker: Redis
  - Workers: Configurable threads/processes
  - Supports Prometheus metrics
- **OpenAI SDK 1.30.x**: Official OpenAI Python client (async support)
- **python-multipart 0.0.20.x**: Form data parsing
- **cryptography 44.0.x**: RSA encryption (RuoYi auth protocol)
- **Jinja2 3.1.x**: Template rendering (prompts)

### Dev Dependencies
- **pytest 8.3.x**: Testing framework
- **pytest-asyncio 1.2.x**: Async test support
- **pytest-cov 6.0.x**: Coverage reporting

### NOT included (but referenced as inspiration):
- No SQLAlchemy/ORM: Uses RuoYi + Redis for persistence (no direct DB)
- No Langchain/LiteLLM: Uses OpenAI SDK directly + custom provider abstraction
- No FastAPI-SQLAdmin: No admin panel

---

## 3. LLM PROVIDER SYSTEM (CRITICAL)

### Provider Architecture

**File:** `/app/providers/protocols.py`

```python
# Key Protocol Definitions:
class ProviderProtocol(Protocol):
    """Base provider protocol."""
    provider_id: str
    config: ProviderRuntimeConfig

class LLMProvider(ProviderProtocol, Protocol):
    """LLM provider interface."""
    async def generate(self, prompt: str) -> ProviderResult: ...

class VisionLLMProvider(LLMProvider, Protocol):
    """Multimodal LLM (image + text)."""
    async def generate_vision(
        self, 
        prompt: str, 
        *, 
        image_base64: str, 
        image_media_type: str = "image/jpeg"
    ) -> ProviderResult: ...

class TTSProvider(ProviderProtocol, Protocol):
    """TTS (text-to-speech) provider."""
    async def synthesize(
        self, 
        text: str, 
        voice_config: Any | None = None
    ) -> ProviderResult: ...
```

**ProviderRuntimeConfig** (immutable dataclass):
- `provider_id: str` — must match pattern `[a-z0-9]+-[a-z0-9_-]*`
- `priority: int` — failover ordering (lower = higher priority)
- `timeout_seconds: float` — per-call timeout (default 30.0)
- `retry_attempts: int` — auto-retry count
- `health_source: str` — health tracking strategy (e.g., "redis")
- `settings: Mapping[str, Any]` — provider-specific config (api_key, base_url, model_name, temperature, headers, extra_body, etc.)

**ProviderResult** (immutable):
- `provider: str` — which provider produced this
- `content: str` — generated text/output
- `metadata: Mapping[str, Any]` — usage, tokens, latency, etc.

### Provider Registry & Factory

**File:** `/app/providers/factory.py`

Main entry point:
```python
from app.providers.factory import get_provider_factory

factory = get_provider_factory()  # Singleton, cached

# Get single provider
llm = factory.get_llm_provider("openai-compatible")  # or custom config dict
tts = factory.get_tts_provider("openai-tts")

# Or build chains (for failover)
llm_chain = factory.build_chain(ProviderCapability.LLM, ["openai-compatible", "demo-chat"])

# Or assemble from settings
assembly = factory.assemble_from_settings()
llm_providers = assembly.llm  # tuple of LLMProvider instances
tts_providers = assembly.tts  # tuple of TTSProvider instances

# Or with failover
result = await factory.generate_with_failover(
    providers=["openai-compatible", "demo-chat"],
    prompt="your prompt",
    emit_switch=callback_when_switching,
    ignore_cached_unhealthy=False
)
```

### Registered LLM Providers

**File:** `/app/providers/llm/factory.py`

1. **stub-llm** (default fallback)
   - Class: `StubLLMProvider`
   - Priority: 100 (lowest)
   - No-op: always returns fixed response
   - Use for: testing, demo, when real LLM unavailable

2. **demo-chat**
   - Class: `DemoLLMProvider`
   - Priority: 10
   - Deterministic mock responses for testing
   - Use for: local development, E2E demo

3. **openai-compatible**
   - Class: `OpenAICompatibleLLMProvider`
   - Priority: 20
   - Supports ANY OpenAI-compatible API (OpenAI, Azure, Doubao, etc.)
   - **Supports Vision** (image + text multimodal)
   - File: `/app/providers/llm/openai_compatible_provider.py` (80 LOC shown)

   **Config required:**
   ```python
   {
       "provider": "openai-compatible",
       "settings": {
           "base_url": "https://api.openai.com/v1",  # or any OAI-compatible endpoint
           "api_key": "sk-...",
           "model_name": "gpt-4o",
           "temperature": 0.2,  # optional
           "headers": {...},     # optional extra headers
           "extra_body": {...},  # optional extra request body
           "request_path": "/v1/chat/completions"  # optional override
       }
   }
   ```

   **Usage:**
   ```python
   provider = factory.get_llm_provider("openai-compatible")
   
   # Text-only
   result = await provider.generate("What is 2+2?")
   
   # Vision (if VisionLLMProvider)
   result = await provider.generate_vision(
       "Describe this image",
       image_base64="...",
       image_media_type="image/jpeg"
   )
   ```

### Registered TTS Providers

**File:** `/app/providers/tts/factory.py`

1. **stub-tts** (default fallback)
   - No-op TTS provider
   
2. **openai-tts**
   - Class: `OpenAITTSProvider`
   - Uses OpenAI TTS API
   
3. **doubao-tts**
   - Class: `DoubaoTTSProvider`
   - ByteDance Doubao TTS

### Failover Service

**File:** `/app/providers/failover.py`

Automatic failover with health tracking:
```python
service = factory.create_failover_service()

# Auto-retry + health-based fallback
result = await service.generate(
    chain=(provider1, provider2, provider3),
    prompt="...",
    emit_switch=on_provider_switched,  # callback for logging
    ignore_cached_unhealthy=False
)
```

Health tracking via Redis. If a provider fails, mark it unhealthy; subsequent requests automatically skip to next in chain.

### Runtime Configuration Resolver

**File:** `/app/providers/runtime_config_service.py` (742 LOC)

For advanced use cases: resolve provider config from RuoYi instead of static settings.

```python
from app.providers.runtime_config_service import ProviderRuntimeResolver

resolver = ProviderRuntimeResolver(
    settings=get_settings(),
    provider_factory=get_provider_factory()
)

# Resolve for learning_coach
assembly = await resolver.resolve_learning_coach(
    access_token="...",
    client_id="..."
)
provider_chain = assembly.llm  # Dynamic from RuoYi if available
```

If RuoYi is unavailable, automatically falls back to settings defaults.

---

## 4. EXISTING API ENDPOINTS

### Root & Health
- `GET /` — System bootstrap (environment, API prefix, contract version)
- `GET /health` — Health check

### Auth
- `POST /api/v1/auth/login` — RuoYi proxy login (with encryption)
- `POST /api/v1/auth/register` — RuoYi proxy registration
- `POST /api/v1/auth/logout` — Logout
- `GET /api/v1/auth/me` — Current user profile (with roles/permissions)
- `GET /api/v1/auth/code` — Captcha code
- `GET /api/v1/auth/register/enabled` — Registration enabled flag
- `GET /api/v1/auth/binding/{source}` — Social binding

### Tasks (Unified recovery)
- `GET /api/v1/tasks/{task_id}/status` — Current task status + error details
- `GET /api/v1/tasks/{task_id}/events` — SSE stream of task events
- Note: Returns `TaskProgressEvent` (Pydantic model with event types: connected, progress, section_progress, section_ready, provider_switch, completed, failed, cancelled, heartbeat, snapshot)

### Video
- `GET /api/v1/video/bootstrap` — Video feature bootstrap
- `POST /api/v1/video/preprocess` — Image upload + OCR + validation
- `POST /api/v1/video/tasks` — Create video task (long-running)
- `GET /api/v1/video/tasks` — List tasks (paginated)
- `GET /api/v1/video/tasks/{task_id}` — Get task metadata
- `GET /api/v1/video/tasks/{task_id}/result` — Get video result detail
- `GET /api/v1/video/tasks/{task_id}/events` — SSE task events
- `DELETE /api/v1/video/tasks/{task_id}` — Delete task
- `POST /api/v1/video/tasks/{task_id}/cancel` — Cancel task
- `GET /api/v1/video/voices` — List available voice options (TTS catalog)
- `GET /api/v1/video/published` — List published videos (user's)

### Learning Coach (Epic 8 - CRITICAL FOR OPENMAIC PORT)
- `GET /api/v1/learning-coach/entry` — Entry point for learning coach UI
- `POST /api/v1/learning-coach/checkpoint/generate` — Generate lightweight checkpoint quiz (3 questions, LLM-backed)
- `POST /api/v1/learning-coach/checkpoint/submit` — Submit checkpoint answers
- `POST /api/v1/learning-coach/quiz/generate` — Generate full quiz (up to 50 questions)
- `POST /api/v1/learning-coach/quiz/submit` — Submit quiz
- `GET /api/v1/learning-coach/quiz/history/{quiz_id}` — Get quiz history
- `POST /api/v1/learning-coach/path/plan` — Generate learning path (LLM-backed)
- `POST /api/v1/learning-coach/path/save` — Save learning path
- `POST /api/v1/learning-coach/coach/ask` — Chat with learning coach (SSE streaming)
- `GET /api/v1/learning-coach/_diagnostics` — Internal diagnostics (whitelist-only)

Rate limits (enforced per-minute):
- Checkpoint: 20/min
- Quiz: 10/min
- Path plan: 3/min
- Coach ask: 30/min

### Classroom
- `GET /api/v1/classroom/bootstrap`
- `POST /api/v1/classroom/tasks`
- `GET /api/v1/classroom/tasks`
- `GET /api/v1/classroom/tasks/{task_id}`
- `GET /api/v1/classroom/sessions/{session_id}/replay`

### Companion (Video chat)
- `GET /api/v1/companion/bootstrap`
- `POST /api/v1/companion/turns` — Persist conversation turn
- `GET /api/v1/companion/turns/{turn_id}` — Get turn history

### Knowledge (Retrieval)
- `GET /api/v1/knowledge/bootstrap`
- `POST /api/v1/knowledge/chat-logs` — Create knowledge chat
- `GET /api/v1/knowledge/chat-logs/{chat_log_id}` — Get chat

### Learning
- `GET /api/v1/learning/bootstrap`
- `POST /api/v1/learning/persistence-preview` — Preview persistence
- `POST /api/v1/learning/persistence` — Persist learning records

### Contracts
- `GET /api/v1/contracts/task-snapshot` — Contract baseline (example payloads)

---

## 5. AUTH / SESSION

**File:** `/app/core/security.py`

### Flow
1. Client sends `Authorization: Bearer <token>` header
2. FastAPI extracts & decodes JWT to get `tenant_id`, `client_id`
3. Validates token in Redis (online token TTL)
4. Calls RuoYi `/system/user/getInfo` to fetch roles + permissions
5. Builds immutable `AccessContext` dataclass

### AccessContext (injected via dependency)
```python
@dataclass(frozen=True)
class AccessContext:
    user_id: str                      # from RuoYi
    username: str
    roles: tuple[str, ...]
    permissions: tuple[str, ...]      # supports "*:*:*" super admin
    token: str                        # original Bearer token
    client_id: str | None             # from JWT
    request_id: str | None            # from middleware
    online_ttl_seconds: int | None    # Redis TTL
```

### Dependency injection
```python
from app.core.security import get_access_context

@router.get("/protected")
async def protected_endpoint(access_context: AccessContext = Depends(get_access_context)):
    # access_context.user_id, .permissions, etc.
    pass
```

### Important: FastAPI as AUTH PROXY
- FastAPI does **NOT** create its own auth system
- FastAPI authenticates requests **on behalf of student-web** by forwarding to RuoYi
- Token validation happens via Redis online token table + RuoYi `/system/user/getInfo`
- Credentials (api_key, oauth secrets) are **NOT** stored in `.env`; they come from request headers

---

## 6. DATABASE

**No direct ORM in this backend.**

### Persistence Strategy
1. **Short-term state** (in-flight tasks, sessions): Redis
   - Redis URL: `FASTAPI_REDIS_URL` (default `redis://localhost:6379/0`)
   - Used by: Dramatiq (broker), task state (RuntimeStore), provider health, online tokens

2. **Long-term records** (users, videos, learning results): RuoYi proxy
   - RuoYi base URL: `FASTAPI_RUOYI_BASE_URL`
   - All CRUD goes through RuoYi HTTP API
   - Includes mapping/conversion layer (`/app/shared/ruoyi/` + `/app/shared/long_term/`)

3. **Object storage**: COS (Tencent Cloud Object Storage)
   - Base URL: `FASTAPI_COS_BASE_URL`
   - Used for: video outputs, images

### Migration Tool
**None used.** RuoYi schema is managed separately by RuoYi team. FastAPI just calls RuoYi endpoints.

### Key Models (not DB models, but domain models)
- `TaskMetadata` — video + classroom task metadata
- `CompanionTurnSnapshot`, `LearningLogSnapshot` — long-term records
- See `/app/shared/long_term/models.py` and `/app/shared/task_metadata.py`

---

## 7. FILE STRUCTURE CONVENTIONS

### Feature folder pattern
Each feature under `/app/features/<name>/`:
```
features/learning_coach/
├── __init__.py
├── routes.py              # FastAPI routes (APIRouter)
├── service.py             # Business logic
├── schemas.py             # Pydantic models (request/response)
├── llm_generator.py       # Feature-specific LLM logic
├── rate_limit.py          # Rate limiting
└── (models/, tasks/, etc.)
```

### Where to add new endpoints
1. Add route to `features/<name>/routes.py`
2. Service logic goes in `features/<name>/service.py`
3. Schemas in `features/<name>/schemas.py`
4. Register in `/app/api/router.py` via `include_router()`

### Where to add new services/models
- Domain-specific: `/app/features/<name>/`
- Cross-domain: `/app/shared/`

### Test layout
```
tests/
├── unit/                  # Isolated unit tests
├── integration/           # RuoYi + Redis integration tests
├── api/                   # API endpoint tests (Pytest + TestClient)
├── contracts/             # Contract validation tests
└── conftest.py            # Fixtures (redis, httpx mocks, etc.)
```

---

## 8. SHARED UTILITIES

### Error Handling
**File:** `/app/core/errors.py`

```python
class AppError(Exception):
    """Base app exception."""
    def __init__(self, code: str, message: str, status_code: int = 400, 
                 *, retryable: bool = False, task_id: str | None = None, 
                 details: dict = None):
        ...

class IntegrationError(AppError):
    """External service integration failure (RuoYi, COS, provider)."""
    # Automatically injects service/resource/operation for tracking
```

All exceptions automatically convert to JSON error envelopes:
```python
{
    "success": false,
    "error": {
        "code": "LEARNING_COACH_RATE_LIMIT",
        "message": "Rate limit exceeded",
        "status_code": 429,
        "retryable": true,
        "request_id": "req_...",
        "task_id": "task_...",
        "details": {...}
    }
}
```

### Logging
**File:** `/app/core/logging.py`

```python
from app.core.logging import get_logger, get_request_id, get_task_id

logger = get_logger(__name__)
logger.info("event", extra={"custom_field": value})  # Structurally logged

# Auto-injected request context
request_id = get_request_id()  # From middleware
task_id = get_task_id()
```

### Settings/Config Loader
**File:** `/app/core/config.py`

```python
from app.core.config import get_settings, RuntimeEnvironment

settings = get_settings()  # Singleton, cached
# settings.app_name, .environment, .redis_url, .api_v1_prefix, .default_llm_provider, etc.
```

**Env file loading order** (per `RuntimeEnvironment`):
1. `.env.defaults` (shared defaults)
2. `.env.<env>` (e.g., `.env.development`)
3. (dev/test only) `.env.<env>.local`
4. (dev/test only) `.env.local`

**Critical env vars:**
- `FASTAPI_ENV` → RuntimeEnvironment
- `FASTAPI_DEFAULT_LLM_PROVIDER` → default provider ID (e.g., "stub-llm", "openai-compatible")
- `FASTAPI_DEFAULT_TTS_PROVIDER` → default TTS provider
- `FASTAPI_PROVIDER_RUNTIME_SOURCE` → "settings" or "ruoyi" (where to load provider config)
- `FASTAPI_LLM_PROVIDER_CHAIN` → comma-separated or JSON array of provider IDs (for failover)

### Dependency Injection
FastAPI's native `Depends()`:
```python
@router.get("/example")
async def example(
    access_context: AccessContext = Depends(get_access_context),
    service: SomeService = Depends(get_some_service),
):
    pass
```

Many services use `@lru_cache` decorated dependency providers (e.g., `get_video_service()`) for singleton-like behavior per-request-session.

---

## 9. ENV VARIABLES (.env.example FULL REFERENCE)

**File:** `/Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/packages/fastapi-backend/.env.example`

### Basic
- `FASTAPI_APP_NAME=Prorise AI Teach FastAPI Backend`
- `FASTAPI_ENV={development|staging|production|test}`
- `FASTAPI_LOG_LEVEL={DEBUG|INFO|WARNING|ERROR|CRITICAL}`
- `FASTAPI_HOST=0.0.0.0` (listen address)
- `FASTAPI_PORT=8090`
- `FASTAPI_RELOAD=true` (hot reload in dev)
- `FASTAPI_API_V1_PREFIX=/api/v1`

### Redis
- `FASTAPI_REDIS_URL=redis://localhost:6379/0` (task state, tokens, provider health)

### Dramatiq Task Queue
- `FASTAPI_DRAMATIQ_BROKER_BACKEND=redis` (always redis)
- `FASTAPI_DRAMATIQ_QUEUE_NAME=task-runtime`
- `FASTAPI_DRAMATIQ_WORKER_THREADS=2`
- `FASTAPI_DRAMATIQ_WORKER_PROCESSES=1`
- `FASTAPI_DRAMATIQ_TASK_TIME_LIMIT_MS=36000000` (10 hours)
- `FASTAPI_DRAMATIQ_PROMETHEUS_ENABLED={true|false}` (metrics exposure)
- `FASTAPI_DRAMATIQ_PROMETHEUS_HOST=0.0.0.0`
- `FASTAPI_DRAMATIQ_PROMETHEUS_PORT=9191`
- `FASTAPI_DRAMATIQ_PID_FILE=.runtime/dramatiq-worker.pid`

### RuoYi Integration
- `FASTAPI_RUOYI_BASE_URL=http://127.0.0.1:8080`
- `FASTAPI_RUOYI_TIMEOUT_SECONDS=10.0`
- `FASTAPI_RUOYI_RETRY_ATTEMPTS=2`
- `FASTAPI_RUOYI_RETRY_DELAY_SECONDS=0.1`
- `FASTAPI_RUOYI_ENCRYPT_ENABLED=true` (RSA encryption for auth protocol)
- `FASTAPI_RUOYI_ENCRYPT_HEADER_FLAG=encrypt-key`
- `FASTAPI_RUOYI_ENCRYPT_PUBLIC_KEY=MFww...` (RSA public key for login/register)
- `FASTAPI_RUOYI_ENCRYPT_PRIVATE_KEY=MIIBVAIBADANBgkq...` (RSA private key for response decryption)

### Provider Configuration
- `FASTAPI_PROVIDER_RUNTIME_SOURCE={settings|ruoyi}` (where to load provider config)
- `FASTAPI_DEFAULT_LLM_PROVIDER=stub-llm` (fallback if no explicit provider)
- `FASTAPI_DEFAULT_TTS_PROVIDER=stub-tts`

### Object Storage
- `FASTAPI_COS_BASE_URL=https://cos.example.local` (Tencent COS base URL)

### External APIs
- `FASTAPI_ICONFINDER_API_BASE_URL=https://api.iconfinder.com/v4`
- `FASTAPI_ICONIFY_API_BASE_URL=https://api.iconify.design`

### Video Pipeline
- `FASTAPI_VIDEO_ASSET_ROOT=.runtime/video-assets` (Manim intermediate products)
- `FASTAPI_VIDEO_IMAGE_STORAGE_ROOT=data/uploads/video` (user uploads)
- `FASTAPI_VIDEO_RENDER_QUALITY={l|m|h}` (480p/720p/1080p)
- `FASTAPI_VIDEO_FIX_MAX_ATTEMPTS=2` (code fix retries)
- `FASTAPI_VIDEO_UPLOAD_RETRY_ATTEMPTS=2`
- `FASTAPI_VIDEO_SANDBOX_CPU_COUNT=1.0`
- `FASTAPI_VIDEO_SANDBOX_MEMORY_MB=2048`
- `FASTAPI_VIDEO_SANDBOX_TIMEOUT_SECONDS=120`
- `FASTAPI_VIDEO_SANDBOX_TMP_SIZE_MB=1024`
- `FASTAPI_VIDEO_SANDBOX_ALLOW_LOCAL_FALLBACK=false`

### ManimCat (Video Design + Coding)
- `FASTAPI_VIDEO_DESIGNER_TEMPERATURE=0.8` (creativity)
- `FASTAPI_VIDEO_CODER_TEMPERATURE=0.7` (stability)
- `FASTAPI_VIDEO_STATIC_GUARD_MAX_PASSES=3` (syntax checks)
- `FASTAPI_VIDEO_PATCH_RETRY_MAX_RETRIES=2` (fix retries, can be overridden per-binding)
- `FASTAPI_VIDEO_DESIGNER_MAX_TOKENS=12000`
- `FASTAPI_VIDEO_LLM_STREAM_MAX_INPUT_CHARS=12000` (skip streaming for large inputs)
- `FASTAPI_VIDEO_DEFAULT_DURATION_MINUTES=5`
- `FASTAPI_VIDEO_SECTION_MAX_COUNT=6` (max sections to avoid long storyboards)
- `FASTAPI_VIDEO_SECTION_CODEGEN_CONCURRENCY=1` (section code generation parallelism)
- `FASTAPI_VIDEO_SECTION_CODEGEN_MAX_TOKENS=4000` (per-section limit)
- `FASTAPI_VIDEO_SECTION_CODEGEN_MAX_COMPLETION_TOKENS=8000` (thinking + output budget)
- `FASTAPI_VIDEO_DEFAULT_LAYOUT_HINT={center_stage|two_column}`

### Diagnostics
- `FASTAPI_DIAGNOSTICS_ALLOWLIST=` (comma-separated user_ids allowed to call `/_diagnostics` endpoints)

---

## 10. OPENMAIC PORT REFERENCE RESOURCES

### Key Existing Endpoints for Quiz/Learning
1. **Learning Coach** — `/api/v1/learning-coach/checkpoint|quiz|path|coach/ask`
   - File: `/app/features/learning_coach/routes.py`
   - Service: `/app/features/learning_coach/service.py` (1266 LOC)
   - LLM generation: `/app/features/learning_coach/llm_generator.py` (600 LOC)
   
   **Critical:** This is where you invoke LLM for quiz/checkpoint generation. Study how it:
   - Constructs structured JSON prompts
   - Parses LLM output
   - Falls back to local q-bank if LLM fails
   - Handles vision (if problem has image_ref)

2. **Chat with Coach**
   - Route: `POST /api/v1/learning-coach/coach/ask`
   - Returns SSE stream
   - Uses LLM provider from `ProviderRuntimeResolver`

### Existing Streaming (SSE)
- Learning coach chat streaming
- Task events streaming (`GET /api/v1/tasks/{task_id}/events`)
- Example: `/app/core/sse.py` — Task event serialization

### Existing Multimodal Support
- `VisionLLMProvider` protocol in `/app/providers/protocols.py`
- `OpenAICompatibleLLMProvider.generate_vision()` — vision endpoint
- Already integrated in learning_coach for image-based problems

### Existing Rate Limiting
- `/app/features/learning_coach/rate_limit.py` — per-minute enforcement
- Can be repurposed for OpenMAIC endpoints

### Existing Video Context Extraction
- `/app/features/video/pipeline/orchestration/` — ManimCat orchestrator (2923 LOC)
- Extracts knowledge points, topic summary, solution steps
- Used as context for quiz generation
- File: `/app/features/video/pipeline/engine/agent.py` (977 LOC)

---

## 11. CODE STRUCTURE STANDARDS

### File Size Warning
Large files (>500 LOC) found:
1. `/app/features/video/pipeline/orchestration/orchestrator.py` — **2923 LOC** ⚠️
   - Consider breaking into smaller modules
2. `/app/features/learning_coach/service.py` — 1266 LOC
3. `/app/features/video/pipeline/services.py` — 1082 LOC
4. `/app/features/video/pipeline/engine/agent.py` — 977 LOC
5. `/app/providers/runtime_config_service.py` — 742 LOC
6. `/app/features/learning_coach/llm_generator.py` — 600 LOC
7. `/app/features/video/pipeline/models.py` — 599 LOC

**Note:** Memory Palace (mempalace) is mentioned in project memory as having file-size limits. Check project standards.md for hard limits.

### Test Coverage
- Unit tests: `/tests/unit/`
- Integration tests: `/tests/integration/` (with RuoYi mocks)
- API tests: `/tests/api/`
- Contract tests: `/tests/contracts/`
- Run: `pnpm test:fastapi-backend` or `pytest tests/`

### Naming Conventions
- Provider IDs: lowercase, hyphen-separated (e.g., "openai-compatible", "stub-llm")
- Feature modules: lowercase with underscores (e.g., "learning_coach", "video")
- Classes: PascalCase (e.g., `OpenAICompatibleLLMProvider`)
- Functions: snake_case (e.g., `get_provider_factory()`)
- Constants: UPPER_SNAKE_CASE (e.g., `RATE_LIMIT_QUIZ_PER_MINUTE`)

---

## 12. REUSABLE INFRASTRUCTURE INDEX FOR OPENMAIC PORT

### LLM Integration Checklist
When porting OpenMAIC to use this FastAPI backend, you will:

1. **Replace OpenMAIC's LLM calls with FastAPI endpoints**
   - OpenMAIC quiz generation → `POST /api/v1/learning-coach/quiz/generate`
   - OpenMAIC checkpoint → `POST /api/v1/learning-coach/checkpoint/generate`
   - OpenMAIC learning path → `POST /api/v1/learning-coach/path/plan`
   - OpenMAIC coach chat → `POST /api/v1/learning-coach/coach/ask` (SSE)

2. **Use provider abstraction for flexibility**
   ```python
   from app.providers.factory import get_provider_factory
   
   factory = get_provider_factory()
   llm_provider = factory.get_llm_provider("openai-compatible")
   result = await llm_provider.generate("Your prompt")
   ```

3. **Leverage existing schemas** (reusable)
   - `/app/features/learning_coach/schemas.py` — QuizGenerateRequest, CheckpointGenerateRequest, etc.
   - `/app/schemas/common.py` — Response envelope pattern
   - `/app/shared/long_term/models.py` — Persistence schemas

4. **Use failover for reliability**
   ```python
   result = await factory.generate_with_failover(
       providers=["openai-compatible", "demo-chat"],
       prompt="...",
       emit_switch=log_provider_switch
   )
   ```

5. **Hook into task framework** (optional, for long-running tasks)
   - Define task in `/app/shared/task_framework/base.py`
   - Register in task scheduler
   - Users can poll `/api/v1/tasks/{task_id}/status` and listen to SSE

6. **Auth is transparent**
   - All endpoints require valid Bearer token
   - AccessContext injected automatically
   - No extra auth work needed in service layer

7. **Rate limiting ready**
   - Learning coach already has per-endpoint rate limits
   - Can extend `/app/features/learning_coach/rate_limit.py` for new OpenMAIC endpoints
   - Enforce with `enforce_rate_limit()` decorator

### Quick Import Paths (for future engineer)

```python
# LLM Provider
from app.providers.factory import get_provider_factory
from app.providers.llm.factory import get_llm_provider

# Error handling
from app.core.errors import AppError, IntegrationError

# Auth
from app.core.security import AccessContext, get_access_context

# Config
from app.core.config import get_settings, RuntimeEnvironment

# Task framework
from app.shared.task_framework.base import TaskRuntime
from app.shared.task_framework.contracts import TaskContractPayload
from app.shared.task_framework.status import TaskStatus

# Schemas
from app.schemas.common import build_success_envelope, build_error_envelope

# Redis
from app.worker import get_runtime_store

# RuoYi
from app.shared.ruoyi_client import RuoYiClient

# Logging
from app.core.logging import get_logger, get_request_id
```

---

## 13. CRITICAL FILES SUMMARY

| File Path | Purpose | Size | Status |
|-----------|---------|------|--------|
| `/app/main.py` | App factory | Small | Entry point |
| `/app/core/config.py` | Settings | ~350 LOC | Type-safe config |
| `/app/core/security.py` | Auth + AccessContext | ~200 LOC | Bearer token + RuoYi |
| `/app/core/errors.py` | Global exception handlers | ~150 LOC | JSON error envelopes |
| `/app/core/sse.py` | Task event models | ~80 LOC | SSE serialization |
| `/app/providers/protocols.py` | LLM/TTS abstractions | ~127 LOC | **CRITICAL** |
| `/app/providers/factory.py` | Provider assembly | ~240 LOC | **CRITICAL** |
| `/app/providers/llm/openai_compatible_provider.py` | OpenAI-compatible LLM | ~150+ LOC | **CRITICAL** |
| `/app/features/learning_coach/routes.py` | Learning coach endpoints | ~150 LOC | Quiz/checkpoint routes |
| `/app/features/learning_coach/service.py` | Learning coach logic | **1266 LOC** | ⚠️ Large |
| `/app/features/learning_coach/llm_generator.py` | LLM quiz generation | **600 LOC** | JSON prompt building |
| `/app/shared/task_framework/` | Unified task system | ~1000 LOC total | Task orchestration |
| `/app/shared/ruoyi_client.py` | RuoYi HTTP proxy | ~150 LOC | Persistence layer |
| `/app/worker.py` | Dramatiq worker | 384 LOC | Background jobs |

---

## CONCLUSION

This FastAPI backend is **production-ready for LLM integration** with:
- ✅ Pluggable provider system (OpenAI, custom endpoints, failover)
- ✅ Structured error handling + logging
- ✅ Auth via Bearer token + RuoYi proxy
- ✅ Task orchestration (SSE events, Dramatiq queue)
- ✅ Rate limiting infrastructure
- ✅ Multimodal support (vision LLM)
- ✅ Streaming (SSE) support
- ✅ Configuration from environment

**For OpenMAIC port:** You can **directly replace LLM calls** with the FastAPI learning-coach endpoints, reusing all provider logic, error handling, and rate limiting already in place.

