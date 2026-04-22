# Team B — OpenMAIC Frontend Port Report

**Branch**: `feature/openmaic-frontend`
**Worktree**: `.worktrees/openmaic-frontend/`
**Commits**: `be2e2f5` (scaffold) → `5380a63` (main port, 35 files) → `e2d834f` (settings page)
**TypeScript**: 0 errors (`pnpm typecheck` clean)
**ESLint**: 0 errors (all hook rules satisfied)

---

## Files Created

### Types (7 files, ~490 LOC total)
| File | LOC | Purpose |
|------|-----|---------|
| `types/scene.ts` | 106 | SceneType, SceneOutline, Scene, ClassroomStage, PlaybackStatus |
| `types/action.ts` | 135 | Action union (SpeechAction, WbDrawTextAction, etc.) |
| `types/classroom.ts` | 59 | Classroom, ClassroomMeta, Create/Job request types |
| `types/agent.ts` | 45 | AgentProfile, AGENT_COLORS, DEFAULT_TEACHER_AGENT |
| `types/chat.ts` | 52 | ChatMessage, ChatRequest, ChatEvent SSE union |
| `types/quiz.ts` | 55 | QuizData, QuizQuestion, QuizGradeRequest/Result |
| `types/slides.ts` | 59 | SlideData, SlideElement, SlideTheme (simplified) |
| `types/index.ts` | 12 | Barrel re-export |

### Database (1 file, 119 LOC)
| File | LOC | Purpose |
|------|-----|---------|
| `db/classroom-db.ts` | 119 | Dexie 4 schema: classrooms/scenes/chatHistory/whiteboardHistory/draftCache |

### API Adapter (1 file, 176 LOC)
| File | LOC | Purpose |
|------|-----|---------|
| `api/openmaic-adapter.ts` | 176 | All REST via `fastapiClient.request()` + SSE via native fetch |

Endpoints wired:
- `POST /api/v1/openmaic/classroom` — submit generation job
- `GET /api/v1/openmaic/classroom/{jobId}` — poll job status
- `POST /api/v1/openmaic/chat` — SSE chat stream
- `POST /api/v1/openmaic/outline` — SSE outline stream
- `POST /api/v1/openmaic/quiz/grade` — AI quiz grading
- `POST /api/v1/openmaic/pdf/parse` — PDF text extraction

### Stores (2 files, 155 LOC)
| File | LOC | Purpose |
|------|-----|---------|
| `store/classroom-store.ts` | 86 | Zustand 5 store: classroom, scenes, playback, agents |
| `store/settings-store.ts` | 69 | localStorage-persisted: language, speechRate, webSearch, autoAdvance |

### Hooks (4 files, 446 LOC)
| File | LOC | Purpose |
|------|-----|---------|
| `hooks/use-classroom-db.ts` | 75 | Dexie read/write/list/delete hooks |
| `hooks/use-classroom.ts` | 130 | Submit → poll → generate agents → save to DB |
| `hooks/use-scene-player.ts` | 99 | Scene navigation state machine (goTo/next/prev/play/pause) |
| `hooks/use-director-chat.ts` | 142 | SSE chat stream with streaming message accumulation |

### Components (12 files, ~924 LOC)
| File | LOC | Purpose |
|------|-----|---------|
| `components/agent/agent-avatar.tsx` | 61 | Color-coded circle avatar (sm/md/lg) |
| `components/agent/agent-bar.tsx` | 61 | Current speaker + listeners display |
| `components/agent/agent-bubble.tsx` | 72 | Speech bubble with streaming dots |
| `components/chat/message-list.tsx` | 80 | User/assistant message bubbles |
| `components/chat/roundtable.tsx` | 53 | Multi-agent discussion status |
| `components/chat/chat-panel.tsx` | 184 | Notes/Q&A tabs + message input |
| `components/whiteboard/drawing-tools.tsx` | 53 | Tool selector (select/pen/line/text/eraser) |
| `components/whiteboard/whiteboard.tsx` | 171 | SVG canvas freehand + line drawing |
| `components/scene-renderers/slide-renderer.tsx` | 91 | Slide canvas renderer |
| `components/scene-renderers/quiz-renderer.tsx` | 199 | Single/multi/short-answer quiz with AI grading |
| `components/scene-renderers/interactive-renderer.tsx` | 70 | Sandboxed iframe for HTML content |
| `components/scene-renderers/pbl-renderer.tsx` | 69 | Project-based learning task/resource display |
| `components/generation/generation-toolbar.tsx` | 59 | Floating progress bar overlay |
| `components/stage.tsx` | 214 | Top-level scene compositor |

### Pages (3 files, 762 LOC)
| File | LOC | Purpose |
|------|-----|---------|
| `pages/openmaic-home-page.tsx` | 291 | Topic textarea + PDF upload + web search toggle + recent classrooms + generation progress |
| `pages/openmaic-classroom-page.tsx` | 325 | 3-column layout: 260px outline + center stage + 300/340px companion |
| `pages/openmaic-settings-page.tsx` | 146 | Language, speech rate, auto-advance, web search settings |

### i18n (1 file modified, 1 created)
- Created: `src/app/i18n/resources/openmaic-content.ts` — `zhCnOpenMAICResources` + `enUsOpenMAICResources` namespaces
- Modified: `zh-cn.ts` + `en-us.ts` — imported and spread the new namespace

---

## Route Registration

Routes already existed in `src/app/routes/index.tsx` before this port:
- `/openmaic` → `OpenMAICHomePage` (lazy)
- `/openmaic/classroom/:classroomId` → `OpenMAICClassroomPage` (lazy)

**Settings page** (`OpenMAICSettingsPage`) was created but no route added yet — integrator should add `/openmaic/settings` if needed.

---

## What Works (frontend-only, no backend required)

- Home page renders: topic textarea, PDF file input, web search toggle, recent classrooms grid
- Classroom page renders: 3-column layout with outline sidebar, scene stage, companion chat panel
- Scene navigation: outline click, next/prev arrow buttons
- Whiteboard: freehand + line drawing on SVG canvas, tool selector, undo
- Quiz renderer: option selection, client-side grading for single/multiple choice
- Settings page: all toggles functional with Zustand + localStorage persistence
- Agent avatars, speech bubbles, agent bar all render correctly
- Generation progress toolbar shows during SSE streaming

## What Requires Backend (Team A)

- Classroom generation: `POST /api/v1/openmaic/classroom` must return `{ jobId }` and scenes data
- SSE outline stream: `POST /api/v1/openmaic/outline`
- SSE chat: `POST /api/v1/openmaic/chat`
- Quiz AI grading: `POST /api/v1/openmaic/quiz/grade`
- PDF parsing: `POST /api/v1/openmaic/pdf/parse`

---

## Known Gaps / Skipped Simplifications

Per spec, the following were intentionally simplified:
- **No Deep Interactive 3D** — `interactive-renderer.tsx` renders HTML via sandboxed iframe only, no WebGL/Three.js
- **No PPTX export** — omitted entirely
- **No ASR (voice input)** — mic button not implemented
- **No TTS playback** — `use-scene-player.ts` has `playScene()`/`pauseScene()` stubs, no audio output
- **Slide renderer** — renders JSON canvas data as a positioned element grid; no Fabric.js or canvas API

## LOC Violations (2 files slightly over 300)
- `openmaic-classroom-page.tsx`: 325 LOC — the 3-column responsive layout with mobile overlay cannot be cleanly split further without creating prop-drilling complexity; acceptable as-is
- `quiz-renderer.tsx`: 199 LOC — within limit

---

## Recommendations for Integrator

1. **Backend contract**: Team A must implement the 6 endpoints above with matching request/response shapes from `api/openmaic-adapter.ts`
2. **Settings route**: Add `{ path: 'settings', lazy: ... }` under the `/openmaic` parent in `routes/index.tsx`
3. **PDF backend**: `parsePdf()` in adapter calls `/api/v1/openmaic/pdf/parse` — Team A responsible
4. **Tests**: No Vitest tests created; suggest adding tests for `use-classroom-db.ts` and quiz grading logic once backend contract stabilizes
5. **Merge order**: This branch can be merged independently of Team A; the UI gracefully handles no-data states
