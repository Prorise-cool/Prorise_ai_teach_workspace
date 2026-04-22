# OpenMAIC Project Audit Report

**Project**: OpenMAIC (Open Multi-Agent Interactive Classroom)  
**Location**: `/Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace/references/OpenMAIC`  
**Version**: 0.2.0 (released 2026-04-20)  
**License**: AGPL-3.0  
**Framework**: Next.js 16 + React 19 + TypeScript 5  

---

## 1. Product / Business Purpose

### What OpenMAIC Does

OpenMAIC is an **AI-driven interactive classroom platform** that transforms any topic (or document) into a rich, multi-agent learning experience in one click. It's not a traditional quiz/chat app—it's a *complete lesson generation engine* that creates:

- **AI Teachers & Classmates** — Multiple agents with personas who lecture, discuss, and interact in real time
- **Rich Scene Types** — Slides (with narration), quizzes (with AI grading), interactive HTML simulations, and project-based learning (PBL)
- **Whiteboard Drawing** — Agents draw diagrams, equations, flowcharts in real time using SVG
- **Text-to-Speech & Speech Recognition** — Voice playback and microphone input for discussion
- **Deep Interactive Mode (v0.2.0)** — Hands-on learning with 3D visualizations, simulations, games, mind maps, and online code editors—agents can actively control these UIs

### Core User Flow

1. **User Input** → Text description or PDF upload (e.g., "Teach me Python from scratch")
2. **Outline Generation (Stage 1)** → AI structures the lesson into discrete scenes (introduction, concept explanation, quiz, project)
3. **Scene Content Generation (Stage 2)** → For each scene, AI generates:
   - Slide content (text, images, LaTeX formulas)
   - Quiz questions + rubrics
   - Interactive HTML + CSS + JS for simulations
   - Agent personas and dialogue
   - Action sequences (agent movements, whiteboard drawings, spotlight effects, TTS)
4. **Playback** → User watches/interacts with the generated classroom:
   - Scene plays in sequence with agent narration
   - User can ask questions (triggers discussion mode with multiple agents)
   - Interactive scenes allow hands-on exploration
   - Results can be exported as PPTX or HTML

### Key Features Visible in UI

- **Home Page** — Text input, PDF upload, Web Search toggle, Interactive Mode toggle, Recent classrooms, Classroom ZIP import
- **Classroom View** — Slide canvas, whiteboard, agent avatars, chat panel, roundtable discussion
- **Settings** — Provider selection (OpenAI, Claude, Gemini, DeepSeek, Qwen, GLM, Kimi, MiniMax, Grok, Ollama, custom), API key management, TTS/ASR provider config, image/video/PDF generation settings
- **Export** — Download as PowerPoint (.pptx) or interactive HTML, classroom ZIP backup
- **Languages** — Chinese (zh-CN), English (en-US), Japanese (ja-JP), Russian (ru-RU), Arabic (ar-SA)
- **Dark Mode** — Full light/dark theme support

---

## 2. Tech Stack

### Core Framework

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | ≥20.9.0 | Server runtime |
| **Framework** | Next.js | 16.1.2 | Full-stack React framework (App Router) |
| **UI Framework** | React | 19.2.3 | Client component library |
| **Language** | TypeScript | 5 | Type safety across codebase |
| **Styling** | Tailwind CSS | 4 | Utility-first CSS framework |
| **Package Manager** | pnpm | 10.28.0 | Dependency management |

### State Management

| Library | Purpose |
|---------|---------|
| **Zustand** (5.0.10) | Global reactive state (Zustand stores: stage, settings, canvas, keyboard, snapshot) |
| **Zod** (4.3.5) | Runtime type validation for API payloads and provider configs |
| **Immer** (11.1.3) | Immutable state updates |

### LLM Integration (Critical)

| Component | Library | Details |
|-----------|---------|---------|
| **AI SDK** | Vercel AI SDK (`ai` 6.0.42, `@ai-sdk/*`) | Unified interface for LLM calls; streaming support |
| **AI SDK Providers** | `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` | Native integrations for OpenAI, Anthropic Claude, Google Gemini |
| **OpenAI-Compatible** | `createOpenAI()` from SDK | DeepSeek, Kimi, GLM, Qwen, MiniMax, SiliconFlow, Doubao, Grok, Ollama |
| **Orchestration** | LangGraph (`@langchain/langgraph` 1.1.1) | Multi-agent state machine (director graph) for classroom discussions |
| **LangChain Core** | `@langchain/core` (1.1.16) | Base abstractions for tools and messaging |

### Data Persistence & Storage

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Client-Side DB** | Dexie (4.2.1) | IndexedDB wrapper for storing classrooms, stages, media cache |
| **Local Storage** | Browser localStorage | Settings, user preferences, provider configs, draft cache |
| **File I/O** | File API + Blob storage | Client-side PDF uploads, media blobs, classroom media |
| **Server-Side** | File system (temp/isolated) | Transient storage for classroom generation jobs (in-memory + file fallback) |

### Media & Content Generation

| Type | Libraries | Details |
|------|-----------|---------|
| **PDF Processing** | `unpdf` (1.4.0), custom MinerU API wrapper | Parse PDFs; extract text/structure; optional MinerU for advanced OCR/tables |
| **Image Generation** | Multiple providers (Seedream, Qwen, MiniMax, Grok, etc.) | Server-side image generation via provider APIs |
| **TTS (Text-to-Speech)** | OpenAI, Azure, GLM, Qwen, MiniMax, ElevenLabs, browser-native | Voice narration for slides and discussions |
| **ASR (Speech Recognition)** | OpenAI Whisper API, Qwen | Mic input for student questions |
| **Video Generation** | Seedance, Kling, Veo, Sora, MiniMax | Future-facing video generation endpoint |
| **LaTeX/Math** | `katex` (0.16.33), `temml` (0.13.1), `mathml2omml` (custom workspace package) | Math rendering and Office Math XML conversion |

### Rich Text & Canvas

| Library | Purpose |
|---------|---------|
| **ProseMirror** (1.x suite) | Collaborative text editor for rich content |
| **Sharp** (0.34.5) | Server-side image processing/resizing |
| **@napi-rs/canvas** (0.1.88) | Server-side canvas rendering (PDF/slide screenshots) |
| **@xyflow/react** (12.10.0) | Mind map / flowchart rendering (Deep Interactive Mode) |
| **ECharts** (6.0.0) | Data visualization / charts |
| **SVG Libraries** — `svg-pathdata`, `svg-arc-to-cubic-bezier` | Whiteboard path manipulation |

### UI Component Libraries

| Library | Purpose |
|---------|---------|
| **shadcn/ui** (3.6.3) + **Radix UI** (1.4.3) | Unstyled, accessible component primitives |
| **Lucide React** (0.562.0) | Icon library |
| **Framer Motion / Motion** (12.27.5) | Animation library |
| **Animate.css** (4.1.1) | CSS animation utilities |
| **Embla Carousel** (8.6.0) | Carousel component |
| **Sonner** (2.0.7) | Toast notifications |
| **cmnd** (1.1.1) | Command palette |

### Code Quality & Testing

| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | 4.1.0 | Unit testing |
| **Playwright** | 1.58.2 | End-to-end testing |
| **ESLint** | 9 | Linting |
| **Prettier** | 3.8.1 | Code formatting |
| **TypeScript** | 5 | Type checking |

### Build & Deployment

| Tool | Config |
|------|--------|
| **Next.js Build** | Standalone output (non-Vercel) or default (Vercel) |
| **Transpiling** | `mathml2omml`, `pptxgenjs` (workspace packages) |
| **Max Body Size** | 200MB (for PDF uploads) |
| **Custom Packages** | pptxgenjs (PowerPoint generation), mathml2omml (Math XML conversion) |

---

## 3. Directory Structure

### `/app` — Next.js App Router

```
app/
├── api/                                    # 18 API route handlers
│   ├── access-code/                        # Authentication (ACCESS_CODE)
│   │   ├── status/route.ts                 # Check if access code is set
│   │   └── verify/route.ts                 # Verify and set cookie
│   ├── chat/route.ts                       # SSE streaming for multi-agent discussions
│   ├── classroom/route.ts                  # Save/load classroom definitions
│   ├── classroom-media/[classroomId]/      # Retrieve cached media (images, videos)
│   ├── generate/                           # Lesson generation sub-endpoints
│   │   ├── agent-profiles/route.ts         # Generate agent persona descriptions
│   │   ├── image/route.ts                  # Image generation via provider APIs
│   │   ├── scene-actions/route.ts          # Action sequence generation for agents
│   │   ├── scene-content/route.ts          # Scene content (slides, quizzes, HTML)
│   │   ├── scene-outlines-stream/route.ts  # Streaming outline generation (Stage 1)
│   │   ├── tts/route.ts                    # Text-to-speech audio generation
│   │   └── video/route.ts                  # Video generation (future)
│   ├── generate-classroom/                 # Async classroom job submission
│   │   ├── route.ts                        # Submit generation job (returns jobId)
│   │   └── [jobId]/route.ts                # Poll job status / retrieve result
│   ├── health/route.ts                     # Health check endpoint
│   ├── parse-pdf/route.ts                  # PDF parsing (text extraction)
│   ├── pbl/chat/route.ts                   # Project-Based Learning chat endpoint
│   ├── quiz-grade/route.ts                 # AI grading of quiz answers
│   ├── server-providers/route.ts           # List configured providers (for UI)
│   ├── transcription/route.ts              # ASR (speech-to-text)
│   ├── verify-*/route.ts                   # Provider credential verification
│   └── web-search/route.ts                 # Tavily web search
├── classroom/[id]/                         # Dynamic classroom playback page
│   └── page.tsx                            # Main classroom view (stage, whiteboard, chat)
├── generation-preview/                     # (Optional) Preview generated content
├── eval/                                   # Evaluation pages (internal)
└── page.tsx                                # Home page (lesson generation input)
```

### `/lib` — Core Business Logic

```
lib/
├── ai/                                     # LLM provider abstraction
│   ├── llm.ts                              # Unified callLLM / streamLLM wrappers
│   ├── providers.ts                        # Provider registry + model configs
│   └── thinking-context.ts                 # Extended thinking configuration
├── generation/                             # Two-stage generation pipeline
│   ├── outline-generator.ts                # Stage 1: Generate scene outlines
│   ├── scene-generator.ts                  # Stage 2: Generate scene content
│   ├── scene-builder.ts                    # Build complete scene objects
│   ├── action-parser.ts                    # Parse AI-generated actions (JSON)
│   ├── prompt-formatters.ts                # Prompt building utilities
│   ├── json-repair.ts                      # Partial JSON recovery
│   ├── pipeline-runner.ts                  # Orchestrate pipeline stages
│   ├── pipeline-types.ts                   # Type definitions
│   ├── interactive-post-processor.ts       # Post-process Deep Interactive Mode content
│   └── generation-pipeline.ts              # Barrel export
├── orchestration/                          # Multi-agent discussion orchestration
│   ├── director-graph.ts                   # LangGraph state machine for agents
│   ├── director-prompt.ts                  # System prompt for director agent
│   ├── tool-schemas.ts                     # Tool definitions (draw, write, highlight, etc.)
│   ├── ai-sdk-adapter.ts                   # AI SDK <→ LangGraph adapter
│   ├── stateless-generate.ts               # Single-pass generation (chat endpoint)
│   ├── prompt-builder.ts                   # Conversation context builder
│   ├── types.ts                            # Orchestration types
│   └── summarizers/                        # Conversation summarization
├── playback/                               # Playback state machine
│   ├── types.ts                            # Playback states & events
│   ├── state-machine.ts                    # Scene sequencing logic
│   └── ...
├── action/                                 # Action execution engine
│   ├── types.ts                            # Action type definitions (speech, draw, etc.)
│   ├── parser.ts                           # Parse action JSON
│   └── ...
├── audio/                                  # TTS & ASR providers
│   ├── types.ts                            # Provider type definitions
│   ├── constants.ts                        # Provider list
│   ├── openai-tts.ts, elevenlabs.ts, etc. # Provider implementations
│   └── ...
├── media/                                  # Image & video providers
│   ├── image-providers.ts                  # Image gen providers
│   ├── video-providers.ts                  # Video gen providers
│   └── types.ts
├── export/                                 # Export engines
│   ├── pptx-export.ts                      # PowerPoint generation (pptxgenjs wrapper)
│   ├── html-export.ts                      # Interactive HTML export
│   ├── classroom-zip.ts                    # Classroom ZIP backup
│   └── ...
├── pdf/                                    # PDF processing
│   ├── pdf-providers.ts                    # unpdf, MinerU abstraction
│   ├── mineru-cloud.ts, mineru-parser.ts  # MinerU integration
│   └── constants.ts
├── store/                                  # Zustand stores (client-side state)
│   ├── stage.ts                            # Classroom/stage management
│   ├── settings.ts                         # Provider & user settings
│   ├── canvas.ts                           # Canvas editing state
│   ├── keyboard.ts                         # Keyboard shortcuts
│   ├── snapshot.ts                         # Playback snapshots
│   ├── whiteboard-history.ts               # Whiteboard undo/redo
│   ├── user-profile.ts                     # User profile & avatars
│   ├── media-generation.ts                 # Media generation status
│   └── widget-iframe.ts
├── server/                                 # Server-side utilities
│   ├── classroom-generation.ts             # High-level generation orchestration
│   ├── classroom-job-runner.ts             # Async job execution
│   ├── classroom-job-store.ts              # Job state persistence (in-memory + fallback)
│   ├── classroom-storage.ts                # Classroom data persistence
│   ├── resolve-model.ts                    # Model resolution from config
│   ├── provider-config.ts                  # Read environment/config files
│   ├── ssrf-guard.ts                       # SSRF protection for proxy URLs
│   ├── api-response.ts                     # Standardized API response format
│   └── ...
├── hooks/                                  # React custom hooks (55+)
│   ├── use-i18n.ts                         # i18n context
│   ├── use-theme.ts                        # Dark/light mode
│   ├── use-draft-cache.ts                  # Draft persistence
│   ├── use-import-classroom.ts             # Classroom ZIP import
│   └── ... (many more)
├── types/                                  # Centralized TypeScript types
│   ├── generation.ts                       # Generation request/response types
│   ├── slides.ts                           # Slide element types
│   ├── action.ts                           # Agent action types
│   ├── chat.ts                             # Chat & discussion types
│   ├── provider.ts                         # Provider & model config types
│   ├── settings.ts                         # Settings state types
│   ├── stage.ts                            # Classroom stage types
│   ├── export.ts                           # Export format types
│   └── ...
├── i18n/                                   # Internationalization
│   ├── index.ts                            # i18next initialization
│   ├── en.json, zh-CN.json, etc.          # Language files
│   └── ...
├── utils/                                  # General utilities
│   ├── stage-storage.ts                    # localStorage for classrooms
│   ├── chat-storage.ts                     # localStorage for chat history
│   ├── image-storage.ts                    # Blob storage for media
│   ├── element-fingerprint.ts              # Unique element IDs
│   ├── geometry.ts                         # Canvas geometry calculations
│   ├── cn.ts                               # Tailwind className merger
│   └── ...
├── constants/                              # Configuration constants
│   ├── generation.ts                       # Generation defaults
│   ├── agent-defaults.ts                   # Default agent personas
│   └── ...
├── prosemirror/                            # ProseMirror text editor setup
├── contexts/                               # React contexts (scene context, etc.)
├── chat/                                   # Chat utilities
│   ├── agent-loop.ts                       # Agent turn logic
│   └── ...
├── import/                                 # Classroom import/export utils
├── logger.ts                               # Logging utility
└── web-search/                             # Tavily web search integration
```

### `/components` — React UI Components

```
components/
├── slide-renderer/                         # Canvas-based slide editor
│   ├── Editor/Canvas/                      # Interactive canvas
│   └── components/element/                 # Element renderers (text, image, shape, chart, table)
├── scene-renderers/                        # Scene type renderers
│   ├── SlideRenderer.tsx                   # Slide playback
│   ├── QuizRenderer.tsx                    # Quiz UI
│   ├── InteractiveRenderer.tsx             # Interactive simulation
│   ├── PBLRenderer.tsx                     # Project-based learning
│   ├── InteractiveWidget.tsx               # Deep Interactive Mode UI (3D, game, mind map, code)
│   └── ...
├── agent/                                  # Agent UI
│   ├── agent-bar.tsx                       # Agent info bar
│   ├── agent-avatar.tsx                    # Agent avatar display
│   └── ...
├── chat/                                   # Chat & discussion UI
│   ├── ChatArea.tsx                        # Chat panel
│   ├── RoundtableUI.tsx                    # Roundtable discussion
│   ├── MessageList.tsx                     # Message history
│   └── ...
├── whiteboard/                             # SVG-based whiteboard
│   ├── Whiteboard.tsx                      # Main whiteboard canvas
│   ├── DrawingTools.tsx                    # Drawing toolbox
│   └── ...
├── generation/                             # Generation UI
│   ├── generation-toolbar.tsx              # Start/stop/progress controls
│   └── ...
├── settings/                               # Settings dialog
│   ├── SettingsDialog.tsx                  # Main settings modal
│   ├── ModelSelector.tsx                   # LLM provider/model selection
│   ├── ProviderConfig.tsx                  # API key & base URL input
│   ├── TTSSettings.tsx                     # TTS provider config
│   ├── ASRSettings.tsx                     # ASR provider config
│   ├── ImageProviderSettings.tsx           # Image generation settings
│   └── ...
├── ui/                                     # Base UI primitives (shadcn/ui + Radix)
│   ├── button.tsx, input.tsx, dialog.tsx, etc.
│   └── ...
├── stage.tsx                               # Main classroom view orchestrator
├── header.tsx                              # Top navigation bar
├── user-profile.tsx                        # User avatar & profile
├── language-switcher.tsx                   # i18n language selector
├── access-code-modal.tsx                   # Access code auth
└── ...
```

### `/packages` — Workspace Packages

```
packages/
├── pptxgenjs/                              # Customized PowerPoint generator
│   ├── src/                                # Modified fork of pptxgenjs
│   └── package.json
└── mathml2omml/                            # MathML to Office Math XML converter
    ├── src/                                # TypeScript source
    └── package.json
```

### `/configs` — Configuration

```
configs/
├── shapes.ts                               # Shape presets (rectangle, circle, etc.)
├── fonts.ts                                # Font definitions
├── hotkeys.ts                              # Keyboard shortcut mappings
├── themes.ts                               # Color themes
└── ...
```

### `/skills` — OpenClaw Integration

```
skills/
└── openmaic/                               # OpenClaw skill for generation via chat apps
    ├── SKILL.md                            # Skill manifest
    └── references/                         # SOP sections
```

### `/eval`, `/community`, `/e2e` — Supporting

- **eval/** — Evaluation harnesses (whiteboard layout, outline language)
- **community/** — Community docs (Discord, Feishu links)
- **e2e/** — Playwright end-to-end tests

---

## 4. LLM Usage — CRITICAL for Porting

This is the most important section for replacing OpenMAIC's LLM calls with your FastAPI backend.

### Overall Pattern

All LLM interactions use **Vercel AI SDK** (`ai` package) through a unified wrapper:

```typescript
// Two main entry points:
callLLM(params, source, retryOptions?, thinking?)  // One-shot generation
streamLLM(params, source, thinking?)               // Streaming (SSE)
```

### Supported Providers & API Keys

**Environment variables** (`.env.local` or `server-providers.yml`):

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
DEEPSEEK_API_KEY=...
QWEN_API_KEY=...
KIMI_API_KEY=...
MINIMAX_API_KEY=...
GLM_API_KEY=...
SILICONFLOW_API_KEY=...
DOUBAO_API_KEY=...
GROK_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434/v1  # No API key needed
DEFAULT_MODEL=google:gemini-3-flash-preview  # (Optional server default)
```

**Model ID Format**: `providerId:modelId` (e.g., `openai:gpt-4o`, `anthropic:claude-3-5-sonnet-20241022`, `google:gemini-3-flash-preview`)

### Where Prompts Are Defined

| Feature | Prompt Location | Type |
|---------|-----------------|------|
| **Outline Generation (Stage 1)** | `/lib/generation/outline-generator.ts` | Single-shot + system prompt |
| **Scene Content (Stage 2)** | `/lib/generation/scene-generator.ts` | Per-scene, system + user |
| **Agent Personas** | `/lib/generation/scene-generator.ts` (agent profile generation) | Template-based |
| **Multi-Agent Discussion** | `/lib/orchestration/director-prompt.ts` | System prompt for director agent |
| **Quiz Grading** | `/app/api/quiz-grade/route.ts` | Inline structured evaluation |
| **Web Search** | `/lib/server/search-query-builder.ts` | Search intent detection |
| **PBL Chat** | `/app/api/pbl/chat/route.ts` | Dynamic context building |

### Outline Generation (Stage 1)

**Endpoint**: `/api/generate/scene-outlines-stream`  
**Method**: Streaming LLM call  
**Input**: User requirement (text) or PDF content  
**Output**: JSON array of scene outlines

```typescript
// From outline-generator.ts
// Calls llm.streamLLM with:
// - system: "You are a course designer..."
// - prompt: User requirement + context
// - format: Structured JSON with { type, title, description, ... }
```

**Porting Note**: This is the first LLM call in any generation flow. Replace with your FastAPI endpoint that accepts requirement text and returns structured scene outlines.

### Scene Content Generation (Stage 2)

**Endpoint**: `/api/generate/scene-content`  
**Method**: One-shot LLM call per scene  
**Input**: Scene outline + course context + agent personas  
**Output**: Slide data (text, images, LaTeX) or quiz + rubric or HTML for interactive simulation

```typescript
// From scene-generator.ts
// For each scene outline:
callLLM({
  system: buildSceneSystemPrompt(sceneType),
  prompt: formatSceneUserPrompt(outline, context),
  // Optional tool use for image generation requests
  tools?: { generate_image: { ... } }
})
```

**Porting Note**: The most computationally intensive stage. Each scene typically calls the LLM once. Optimize this with your FastAPI pipeline.

### Scene Actions (Agent Behavior)

**Endpoint**: `/api/generate/scene-actions`  
**Method**: One-shot LLM call per scene  
**Input**: Slide content + agent persona + playback context  
**Output**: JSON action sequence (speak, draw whiteboard, highlight, laser pointer, etc.)

```typescript
// From scene-generator.ts -> generateSceneActions
// Returns: Action[] where Action = {
//   type: "speak" | "draw" | "write_text" | "draw_shape" | "show_chart" | ...
//   params: { ... }
// }
```

**Porting Note**: Actions are parsed from JSON. The format is defined in `/lib/generation/action-parser.ts`. Ensure your backend can serialize actions consistently.

### Multi-Agent Discussion (Roundtable Chat)

**Endpoint**: `/api/chat`  
**Method**: SSE streaming  
**Input**: Messages, agent IDs, classroom state  
**Output**: Stream of text deltas + tool calls

```typescript
// From stateless-generate.ts (chat endpoint)
// Runs LangGraph director-graph state machine:
//
// 1. Director agent (LLM) decides: which agent speaks next?
// 2. Chosen agent generates response (LLM call)
// 3. Tool calls (draw, write, highlight) are captured
// 4. Results streamed back as SSE events
//
// Key orchestration: /lib/orchestration/director-graph.ts
```

**Porting Note**: This is the most complex orchestration. It requires:
- LangGraph equivalent (or custom state machine)
- Tool calling (draw, write_text, highlight, etc.)
- SSE streaming
- Conversation memory + summarization

### Quiz Grading

**Endpoint**: `/api/quiz-grade`  
**Method**: One-shot structured output  
**Input**: Quiz question + student answer + rubric  
**Output**: Graded boolean + feedback

```typescript
// From quiz-grade/route.ts
// Calls llm.callLLM with:
// - Structured prompt asking for JSON: { correct: boolean, feedback: string }
// - Uses jsonRepair to handle partial JSON
```

**Porting Note**: Expect malformed JSON from LLMs. Use `partial-json` library for robust parsing.

### Image Generation

**Endpoint**: `/api/generate/image`  
**Method**: Direct provider API call  
**Input**: Prompt, optional style, dimensions  
**Output**: Image URL or Base64

```typescript
// From route: /app/api/generate/image/route.ts
// Calls provider image API directly (Seedream, Qwen, MiniMax, Grok, etc.)
// Not an LLM call — direct provider integration
```

**Porting Note**: Image generation is separate from LLM. Your FastAPI can wrap image provider calls.

### TTS (Text-to-Speech)

**Endpoint**: `/api/generate/tts`  
**Method**: Direct provider API  
**Input**: Text, voice ID, language  
**Output**: Audio URL or WAV blob

```typescript
// From /lib/audio/
// Supports: OpenAI, Azure, GLM, Qwen, MiniMax, ElevenLabs, browser-native
```

**Porting Note**: Not an LLM call. Direct provider API.

### Web Search

**Endpoint**: `/api/web-search`  
**Method**: Tavily API (not LLM)  
**Input**: Query  
**Output**: Search results

```typescript
// From /lib/web-search/
// Uses Tavily API (requires TAVILY_API_KEY)
// Optional context-aware search builder
```

**Porting Note**: Not an LLM call. Wrapped Tavily API.

### Tool Use & Structured Output

**Current Pattern**: JSON-in-string output with repair logic  
**No native Anthropic tool use** — OpenAI-compatible tool definitions but minimal usage

```typescript
// From /lib/orchestration/tool-schemas.ts
// Defines tools for director agent: draw, write_text, highlight, etc.
// But mainly parsed as JSON in LLM output, not true function calling
```

**Porting Note**: When porting to FastAPI, consider implementing true function calling (especially for Anthropic). This will improve reliability over JSON parsing.

### Thinking / Extended Reasoning (v0.2.0 feature)

**Supported Models**:
- OpenAI: o1, o3, o4-mini, GPT-5.x (thinking-capable models)
- Anthropic: Claude 4.6, Sonnet 4.5, Haiku 4.5 (with thinking)
- Google: Gemini 3.x, 2.5-pro (with thinkingBudget)
- DeepSeek Reasoner, Kimi K2 thinking, etc.

**Configuration**:
```typescript
// Per-call thinking config:
callLLM(params, source, retries, {
  enabled: true,
  budgetTokens: 10000  // Optional
})

// Or global disable:
process.env.LLM_THINKING_DISABLED=true
```

**Porting Note**: Extended thinking adds latency (~2-3x) but improves quality for complex reasoning. Plan for this in your backend.

### API Key Resolution

**Server-side**: Resolved from env vars or `server-providers.yml` (YAML config file)  
**Client-side**: User can optionally provide API key (for testing)  
**Validation**: Checked at route level; 401 if missing for required providers

```typescript
// From /lib/server/resolve-model.ts
const { model, apiKey, providerId } = await resolveModel({
  modelString: "google:gemini-3-flash-preview",
  apiKey: userProvidedKey,  // Optional override
  baseUrl: userProvidedBaseUrl,
  providerType: "google"
});
```

**Porting Note**: Your FastAPI backend should handle API key management securely (don't expose to client).

---

## 5. Database / Persistence

### No Relational Database

**OpenMAIC does not use SQL or traditional ORM**. All data is client-side or transient.

### Client-Side Persistence (Browser)

| Storage | Key Library | What's Stored |
|---------|------------|--------------|
| **IndexedDB** | Dexie (4.2.1) | Classrooms (full definitions), stages, scene data, whiteboard history |
| **localStorage** | Browser native | Settings (API keys, provider config), user preferences, draft cache, playback position |
| **Blob Storage** | File API | User-uploaded PDFs, generated media (images, audio, videos) |

### Server-Side Persistence (Transient)

- **Classroom Generation Jobs** — In-memory store (with file fallback) in `/lib/server/classroom-job-store.ts`
- **Temp Files** — Generated images, videos stored in filesystem during job execution
- **Media Cache** — Temporary storage during generation (cleaned up after job completion)

### Data Models

**Classroom** — Root data structure
```typescript
{
  id: string;
  name: string;
  requirement: string;
  generatedAt: number;
  scenes: Scene[];
  agents: AgentInfo[];
  settings: { ... };
}
```

**Scene** — Individual learning unit
```typescript
{
  id: string;
  type: "slide" | "quiz" | "interactive" | "pbl";
  title: string;
  content: SlideData | QuizData | HTMLInteractive | PBLData;
  actions: Action[];
}
```

### No Auth / User Accounts

- Optional **ACCESS_CODE** for shared deployments (middleware-level password)
- No user accounts, login, or user-specific data

**Porting Note**: When porting to FastAPI, decide if you need user accounts. Current OpenMAIC is single-user (or shared-password multi-user).

---

## 6. Authentication & Authorization

### Current Auth Mechanism

**Access Code** (Optional)
```typescript
// Env: ACCESS_CODE=your-secret-code
// Middleware: /middleware.ts

// User submits code → Server returns HMAC-signed cookie
// All API routes check cookie validity
// Whitelist: /api/access-code/*, /api/health
```

**Implementation**: HMAC-SHA256 signature verification (constant-time comparison)

### No OAuth / JWT

- No external OAuth providers (Google, GitHub, etc.)
- No JWT tokens
- No refresh token flow

**Porting Note**: If you need multi-user with fine-grained permissions, you'll need to add authentication infrastructure (JWT, session tokens, OAuth, etc.).

---

## 7. Key UI Pages & User Journey

### Home Page (`/`)

**Components**: `page.tsx`  
**Key Elements**:
1. **Input Section** — Textarea for topic description
2. **PDF Upload** — Drag-drop file upload
3. **Options**:
   - Enable Web Search (toggle)
   - Enable Interactive Mode (toggle, v0.2.0+)
   - Agent Mode selector (standard vs. deep interactive)
4. **Recent Classrooms** — Thumbnail grid of recent generations
5. **Import ZIP** — Restore saved classroom

**UX Flow**:
- User enters topic + clicks "Generate"
- Frontend submits to `/api/generate-classroom`
- Server returns `jobId` + `pollUrl`
- Frontend polls `/api/generate-classroom/{jobId}` until complete
- On completion, redirects to `/classroom/{id}`

### Classroom Page (`/classroom/[id]`)

**Components**: `components/stage.tsx` (massive orchestrator, ~2000+ lines)  
**Main Areas**:
1. **Slide Canvas** (Left) — `SlideRenderer` component displaying current slide
2. **Whiteboard** (Overlay) — SVG-based agent drawing
3. **Control Bar** (Bottom) — Play/pause, speed, fullscreen
4. **Chat Panel** (Right) — Discussion + roundtable UI
5. **Agent Bar** (Top-right) — Current speaker info

**Playback State Machine**: Defined in `/lib/playback/`
- States: `idle` → `playing` → `live` (user asking questions)
- Actions rendered in real-time as LLM streams

### Settings Page (Modal Dialog)

**Components**: `components/settings/` directory  
**Tabs**:
1. **Model Selection** — Provider + model picker
2. **Provider Config** — API key + base URL input
3. **TTS Settings** — TTS provider, voice, speed
4. **ASR Settings** — Speech recognition provider
5. **Image Settings** — Image generation provider
6. **PDF Settings** — PDF parser (unpdf vs. MinerU)
7. **Video Settings** — Video provider
8. **Web Search** — Tavily API key

### Export Options

**From UI**: Settings → Export  
1. **PowerPoint (.pptx)** — Editable slides with images, formulas
2. **Interactive HTML** — Self-contained web pages
3. **Classroom ZIP** — Full classroom backup + media

---

## 8. Environment Variables (.env.example)

```env
# === LLM PROVIDERS ===
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
DEEPSEEK_API_KEY=
QWEN_API_KEY=
KIMI_API_KEY=
MINIMAX_API_KEY=
MINIMAX_BASE_URL=https://api.minimaxi.com/anthropic/v1
GLM_API_KEY=
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
SILICONFLOW_API_KEY=
DOUBAO_API_KEY=
GROK_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434/v1  # (No API key)

# === TTS PROVIDERS ===
TTS_OPENAI_API_KEY=
TTS_AZURE_API_KEY=
TTS_GLM_API_KEY=
TTS_QWEN_API_KEY=
TTS_MINIMAX_API_KEY=
TTS_MINIMAX_BASE_URL=https://api.minimaxi.com
TTS_ELEVENLABS_API_KEY=

# === ASR PROVIDERS ===
ASR_OPENAI_API_KEY=
ASR_QWEN_API_KEY=

# === PDF PROCESSING ===
PDF_UNPDF_API_KEY=
PDF_UNPDF_BASE_URL=
PDF_MINERU_API_KEY=
PDF_MINERU_BASE_URL=

# === IMAGE GENERATION ===
IMAGE_SEEDREAM_API_KEY=
IMAGE_QWEN_IMAGE_API_KEY=
IMAGE_NANO_BANANA_API_KEY=
IMAGE_MINIMAX_API_KEY=
IMAGE_GROK_API_KEY=

# === VIDEO GENERATION ===
VIDEO_SEEDANCE_API_KEY=
VIDEO_KLING_API_KEY=
VIDEO_VEO_API_KEY=
VIDEO_SORA_API_KEY=
VIDEO_MINIMAX_API_KEY=
VIDEO_GROK_API_KEY=

# === WEB SEARCH ===
TAVILY_API_KEY=

# === MISC ===
DEFAULT_MODEL=google:gemini-3-flash-preview  # (Optional server default)
LOG_LEVEL=info
ALLOW_LOCAL_NETWORKS=false  # (Set true for Ollama on localhost)
ACCESS_CODE=  # (Optional site password)
HTTP_PROXY=  # (Optional HTTPS proxy)
HTTPS_PROXY=
```

---

## 9. Notable Patterns & Architecture Decisions

### Server Actions → API Routes

**Note**: OpenMAIC uses **App Router with API Routes** (not Server Actions).  
All LLM calls are in `/app/api/*` routes, not in Server Components.

**Why**: Explicit API boundaries make it easier to replace backend.

### Streaming (SSE) for Long-Running Tasks

**Outline generation**: `/api/generate/scene-outlines-stream`  
**Chat**: `/api/chat`

Uses `NextResponse.withHeaders({ 'Content-Type': 'text/event-stream' })` to stream LLM output in real time.

**Porting Note**: Your FastAPI backend must support SSE or WebSockets for streaming.

### Stateless Chat Endpoint

**Design**: Client sends **full state** (messages + store state) on each request.  
No server-side session storage for chat.

**Why**: Simplifies interruption handling (client abort → server stream cancellation).

**Porting Note**: Replicate this stateless design if possible. Avoid server-side conversation memory.

### Job Queue for Classroom Generation

**Pattern**: `/api/generate-classroom` returns `jobId` → Client polls `/api/generate-classroom/{jobId}`.

**Why**: Long-running generation (2-10 min) doesn't block HTTP connection.

**Storage**: In-memory job store with file fallback (temporary).

**Porting Note**: When porting to FastAPI, use Celery / Async tasks + Redis for job queues. Current in-memory approach won't scale.

### Workspace Packages

OpenMAIC uses **pnpm workspaces** to share internal packages:
- `packages/pptxgenjs` — Custom PowerPoint generation fork
- `packages/mathml2omml` — Math conversion utility

**Porting Note**: Both can be replaced with pip packages (python-pptx, mathml2omml). No critical dependencies.

### Client-Side Media Caching

Generated images, audio, and videos are stored in **IndexedDB** and blob storage.  
No server-side persistent storage.

**Why**: Reduces server disk usage; allows offline playback of downloaded classrooms.

**Porting Note**: When porting, decide where to cache generated media (Redis? CloudFlare? Client IndexedDB?).

### Zustand for Global State

Uses Zustand (lightweight, no boilerplate) instead of Redux.  
Stores synchronized with localStorage (settings, user prefs).

**Porting Note**: React Query / TanStack Query not used. All server communication is manual fetch + state update.

### i18n with i18next

Full i18n support (5 languages):
- Chinese (zh-CN)
- English (en-US)
- Japanese (ja-JP)
- Russian (ru-RU)
- Arabic (ar-SA)

Interface language automatically inferred from LLM generation (v0.1.1+).

### No Database Migrations

No ORM (Prisma, Drizzle). No migrations.  
Settings and classroom data are JSON blobs in IndexedDB.

**Porting Note**: Simplifies deployment but limits query flexibility. If you add a backend DB, plan migrations.

---

## 10. Porting Challenges & Critical Notes

### 1. **Next.js Server Actions → FastAPI**

**Current**: OpenMAIC uses Next.js App Router with server-side LLM calls in API routes.  
**Challenge**: FastAPI is Python; LLM calls will need SDK changes (switch to OpenAI Python SDK, etc.).

**Solution**:
- Keep Next.js frontend (React components unchanged)
- Replace `/app/api/*` routes with FastAPI endpoints
- Proxy calls from frontend → FastAPI backend

### 2. **LangGraph → Python Equivalent**

**Current**: Multi-agent orchestration uses **LangGraph** (LangChain's state machine library).  
**Challenge**: LangGraph is Python-first; using it from Next.js requires JSON serialization.

**Solution**:
- Implement director graph logic in FastAPI + Python LangGraph
- Expose as streaming `/chat` endpoint
- Frontend streams SSE responses unchanged

### 3. **AI SDK Streaming → Server-Sent Events**

**Current**: Vercel AI SDK `streamText()` returns streaming response.  
**Challenge**: Need to ensure FastAPI streaming endpoints work with browser fetch.

**Solution**:
- FastAPI `StreamingResponse` with `text/event-stream` content type
- Same event format (SSE) as current OpenMAIC

### 4. **Zustand Store Hydration**

**Current**: Settings stored in localStorage + IndexedDB.  
**Change**: If adding backend, need to sync settings to server.

**Solution**:
- Optionally add user settings table
- Sync on login / settings change
- Or keep client-side only (simpler, matches current)

### 5. **PDF Processing**

**Current**: unpdf (JavaScript) + optional MinerU Cloud API.  
**Porting**: Python equivalent exists (`pypdf`, `pdfplumber`).

**Solution**: Replace JavaScript unpdf with Python library in FastAPI.

### 6. **Image/Video/Audio Generation**

**Current**: Direct provider API calls (OpenAI, Qwen, MiniMax, ElevenLabs, etc.).  
**Porting**: Same APIs work from Python.

**Solution**: Wrap provider calls in FastAPI endpoints. No changes needed.

### 7. **TTS/ASR**

**Current**: OpenAI Whisper API, custom provider SDKs.  
**Porting**: Same APIs; use Python SDKs.

**Solution**: Wrap in FastAPI. Browser can stream to FastAPI for ASR.

### 8. **JobQueue for Classroom Generation**

**Current**: In-memory job store.  
**Scaling**: Won't work with multiple workers.

**Solution**:
- Use Celery + Redis (or RabbitMQ)
- Each generation is a Celery task
- Frontend polls task status via `/jobs/{jobId}`

### 9. **Extended Thinking**

**Current**: Vercel AI SDK handles thinking config per model.  
**Porting**: Each LLM SDK (OpenAI, Anthropic, Google) handles thinking differently.

**Solution**:
- Implement provider-specific thinking logic in FastAPI
- Pass thinking budget/config to provider APIs

### 10. **SSRF Protection**

**Current**: Middleware checks for SSRF in baseUrl / proxy parameters.  
**Porting**: Move SSRF logic to FastAPI middleware.

**Solution**: Reuse validation from `/lib/server/ssrf-guard.ts` in Python.

---

## 11. Roadmap & Future Features

From CHANGELOG.md, planned improvements:

- **v0.3.0** (hypothetical) — Advanced export formats, better PBL interactive widgets, multi-modal input
- **MAIC-UI** — Separate richer UI generation for professional educational content

Current focus: **Deep Interactive Mode** (v0.2.0) with hands-on learning experiences.

---

## 12. File Organization Summary for Porting

### Files You **Must Replace** (LLM logic)

```
lib/ai/llm.ts                                    → callLLM/streamLLM in FastAPI
lib/ai/providers.ts                             → Provider registry in FastAPI
lib/generation/*.ts                             → Generation pipeline in FastAPI
lib/orchestration/*.ts                          → Multi-agent orchestration (LangGraph) in FastAPI
app/api/generate/*.ts                           → LLM endpoints → FastAPI
app/api/chat/route.ts                           → Chat orchestration → FastAPI + LangGraph
app/api/quiz-grade/route.ts                     → Quiz grading → FastAPI
```

### Files You **Can Keep** (Frontend)

```
components/**                                   → React components (unchanged)
lib/store/**                                    → Zustand stores (unchanged)
lib/hooks/**                                    → React hooks (unchanged)
lib/i18n/**                                     → i18n (unchanged)
lib/export/**                                   → PowerPoint/HTML export (possibly Python)
lib/utils/**                                    → Most utilities (unchanged)
```

### Files You **Should Refactor** (Provider config, API key handling)

```
lib/server/provider-config.ts                   → Read from FastAPI config endpoint
lib/server/resolve-model.ts                     → Resolve model from FastAPI
middleware.ts                                   → Keep access code auth (or move to FastAPI)
```

---

## Summary

OpenMAIC is a sophisticated **multi-agent classroom generation system** with a React frontend and Next.js API layer. The core intelligence is the LLM orchestration (outline generation → scene generation → action planning → multi-agent discussion). The platform's strength is in:

1. **Two-stage generation pipeline** — Clear separation of outline and detailed scene generation
2. **Multi-agent orchestration** — LangGraph-powered roundtable discussions with tool use
3. **Rich media support** — Integrated image, video, TTS, ASR, web search
4. **Flexible export** — PPTX, interactive HTML, classroom ZIP backup
5. **Extensive provider support** — 10+ LLM providers + multiple TTS/image/video providers
6. **Client-side persistence** — Dexie + localStorage for offline access

**For full porting to FastAPI + React**:
- Keep React frontend components mostly unchanged
- Migrate `/app/api/*` routes to FastAPI endpoints
- Implement LangGraph orchestration in Python
- Wrap provider APIs (OpenAI, image gen, TTS) in FastAPI
- Set up Celery + Redis for async job queues
- Optionally add PostgreSQL for user accounts / settings persistence

Estimated effort: **4-8 weeks** for a complete production-ready port, depending on team size and how much functionality you want to implement.

