# Classroom Upgrade · Worker 预备资料

> Coordinator 在 Wave 1 期间做的预调研。所有 worker 起来第一件事读这个文件，能省 1-3 小时的重复探索。

---

## 1. 测试基础设施（所有 worker 必看）

**测试目录是 `tests/unit/classroom/`**（不是 plan 里写的 `tests/features/classroom/`，那是错的）。

现有测试文件：
```
packages/fastapi-backend/tests/unit/classroom/
├── test_chat_sse_broker.py
├── test_job_store.py
├── test_orchestration_summarizers.py
├── test_routes_chat.py
└── openmaic_legacy/
```

**新增测试放这里**。跑测试命令：
```bash
cd packages/fastapi-backend && uv run pytest tests/unit/classroom/ -v
```

---

## 2. SSE 基础设施（Phase 3 worker 看）—— ✨ 基建比预想完备

**核心发现**：视频 SSE 端点已经抽成"共享 task events 路由"，课堂可以直接复用。

**视频侧现状**（`packages/fastapi-backend/app/features/video/routes.py:416-444`）：
```python
from app.api.routes.tasks import get_task_events as get_shared_task_events

@router.get("/tasks/{task_id}/events", ...)
async def get_video_task_events(task_id, request, last_event_id, access_context):
    return await get_shared_task_events(task_id, request, last_event_id, access_context)
```

**共享 helper**（`app/api/routes/tasks.py:310`）：
- 输入：`task_id`, `Last-Event-ID` 头部, `access_context`
- 内部通过 `runtime_store.load_task_recovery_state(task_id, after_event_id)` 拿 snapshot + 缺失事件
- 返回 `StreamingResponse(stream_task_events(...), media_type='text/event-stream')`

**所以 Phase 3 的前端+后端工作量显著降低**：

### ✨ 更重大发现：task_framework 已有 publisher 抽象

**Phase 3 worker 无需手撸 broker.publish**。`packages/fastapi-backend/app/shared/task_framework/publisher.py` 定义了：

```python
TaskPublishedEvent = TaskDispatchEvent | TaskProgressEvent

class TaskEventPublisher(Protocol):
    def publish(self, event: TaskPublishedEvent) -> None: ...

class BrokerTaskEventPublisher:
    def __init__(self, broker: InMemorySseBroker): ...
    def publish(self, event): ...  # 自动把 TaskDispatchEvent 转换为 TaskProgressEvent

@dataclass
class TaskDispatchEvent:
    event: str                 # 'progress' / 'stage' / 'completed' / 'failed'
    snapshot: TaskRuntimeSnapshot
    context: dict[str, object]  # 额外上下文数据
```

还有工具函数 `build_task_event(event, snapshot, context)` 把高层事件转成底层 `TaskProgressEvent`。

**Phase 3 发布事件的标准代码**：
```python
# 在 job_runner.py 的各 stage 边界：
from app.shared.task_framework.publisher import TaskDispatchEvent
publisher: TaskEventPublisher = ...  # 从 scheduler/dispatcher 注入或 lifespan 全局获取

publisher.publish(TaskDispatchEvent(
    event='progress',
    snapshot=current_snapshot,
    context={'progress': 20, 'stage': 'agent_profiles'}
))
```

**查找 publisher 注入方式**：`packages/fastapi-backend/app/shared/task_framework/scheduler/dispatcher.py` 和 `app/core/lifespan.py`。**视频管线已经在用这一套**（`app/features/video/pipeline/orchestration/orchestrator.py` 调 publisher）— Phase 3 worker 照抄视频的注入+调用模式即可。

**精确调用点**：publisher.publish 实际在 `app/shared/task_framework/scheduler/runtime_manager.py:45-46, 97-99`：
```python
# line 97-99
self.event_publisher.publish(
    TaskDispatchEvent(event=event, snapshot=snapshot, context=payload or {})
)
```
这意味着**视频是通过 TaskRuntimeManager 自动 publish** 的，不是 orchestrator 直接 publish。

### ⚠️ 课堂架构现状 — Phase 3 worker 要先确认这个

课堂 `job_runner.py:88` 用的是 `_make_runtime_state_store()` 而**不是** `TaskRuntimeManager`（这是两个不同的 runtime 抽象）。而 `get_shared_task_events` 共享 helper 内部用的是 `runtime_store.load_task_recovery_state(task_id)` —— 也就是 `TaskRuntimeManager` 使用的 store。

**Phase 3 可能需要做的迁移工作**（worker 要自己判断选哪条路）：
- **选项 A（低风险）**：课堂侧新建一个独立 SSE 端点，用课堂专属 runtime store（不复用 `get_shared_task_events`）—— 代码量稍多但不动现有管线
- **选项 B（中风险）**：改造 `_make_runtime_state_store` 让它同时写进 `TaskRuntimeManager` 的 store，这样 `get_shared_task_events` 天然可用 —— 更优雅但涉及架构对齐

**推荐**：先读 `scheduler/runtime_manager.py` 完整理解，再读 `_make_runtime_state_store` 实现，然后选方案。如果两个 runtime_store 结构差异大，先走 A，B 作为未来 sprint 的技术债。

### ✨ 架构迷雾澄清（Coordinator 替 Phase 3 worker 预读完后的结论）

**两边用的是同一个 `RuntimeStore` 对象（`app/infra/redis_client.py:55`）**，只是访问接口不同：

| 访问者 | 调用方式 | 位置 |
|---|---|---|
| **课堂** `ClassroomRuntimeStateStore` | `set_runtime_value("status:{task_id}", ...)` / `get_runtime_value(...)` — 原始 KV | `app/features/classroom/jobs/job_store.py:27-81` |
| **任务框架** `TaskRuntimeManager` | `load_task_recovery_state(task_id)` — 结构化快照 + 事件列表 | 方法在 `app/infra/redis_task_store.py:175` |

`get_runtime_store()`（`app/worker.py:104`）是**全局单例 RuntimeStore**，两边共享。

**对 Phase 3 的含义**：
- 物理上没有"迁移"，只是**读写协议**不同
- `get_shared_task_events` helper 通过 `load_task_recovery_state` 读结构化快照——如果课堂不往这个结构里写，shared helper 就抓不到
- Phase 3 worker 的三种路径（清晰版）：

**A. 最小改动（推荐 MVP）**：
课堂新建独立 SSE 端点 `/api/v1/classroom/tasks/{id}/events`，直接用 `ClassroomRuntimeStateStore` 读 KV + `InMemorySseBroker` 推送事件。**不用 `get_shared_task_events`，不动任务框架**。前端 `useGenerationTask` 通过 module 参数分 URL 走不同端点即可。约 80-120 行。

**B. 架构对齐（优雅但多改 3-4 文件）**：
改造 `ClassroomRuntimeStateStore` 让它同时写结构化快照（调 `TaskRuntimeManager.publish_snapshot` 或类似），这样 `get_shared_task_events` 天然可用，一行路由转发即可复用。约 200 行，但后续维护成本低。

**C. 混合（过渡）**：
先 A 实现 MVP，保留技术债；后续 sprint 走 B 统一架构。

**我的建议**：给 Phase 3 worker 的默认路径是 **A**（风险可控、2 天能完成），worker 起来后可以自行评估选 B 的收益。

**课堂 job_runner.py 现有 state.set_progress / set_status 调用点**（Phase 3 worker 在这些位置插入 SSE publish）：
- `line 114-115` — `generating_outline` 起点（stage + progress=5）
- `line 128` — outline 完成（progress=20）
- `line 139-140` — 智能体画像完成 + 进入 `generating_scenes`（stage + progress=30）
- `line 180` — 每个场景完成（progress 递增到 95）
- `line 204` — `status_value="completed"` 终态
- `line 216-223` — failed 分支

在 set_progress/set_status 旁边加一句 `publisher.publish(TaskDispatchEvent(...))` 即可。

### 后端（~50 行）
1. `packages/fastapi-backend/app/features/classroom/routes.py` 加一个路由即可：
```python
from app.api.routes.tasks import get_task_events as get_shared_task_events

@router.get("/tasks/{task_id}/events", status_code=200)
async def get_classroom_task_events(task_id, request, last_event_id=Header(None, alias="Last-Event-ID"), access_context=Depends(get_access_context)):
    return await get_shared_task_events(task_id, request, last_event_id, access_context)
```

2. `packages/fastapi-backend/app/features/classroom/jobs/job_runner.py` 在 stage 边界和 scene 就绪处 publish `TaskProgressEvent` 到 `runtime_store`：
   - `generating_outline` 开始 / 结束
   - `agent_profiles` 开始 / 结束
   - 每个 scene 完成 → `scene_ready` event（可选）
   - 终态 `completed` / `failed`
   - ⚠️ **前提**：classroom 的 task_id 需要被 `runtime_store` 识别（`load_task_recovery_state` 背后的 store 可能是 per-module 的，Phase 3 worker 要先确认 classroom 是否也有 snapshot 推送到同一个 store，如果没有就要加 snapshot 写入逻辑）

### 前端
**照抄视频 `use-video-task-sse.ts`** 为 `useGenerationTask({ taskId, module: 'classroom' | 'video' })`，内部只是 URL 拼接不同：
- video: `/api/v1/task/{id}/events`（或 video prefix）
- classroom: `/api/v1/classroom/tasks/{id}/events`

其他文件：
- `app/infra/sse_broker.py` — `InMemorySseBroker`（已有）
- `app/infra/event_bus.py` — `EventBuffer`（已有）
- `app/core/sse.py` — `TaskProgressEvent`, `ensure_sse_event_identity`, `parse_sse_event_id`（已有）
- `app/features/classroom/chat_sse_broker.py` — 是 chat 的 broker，**与 task 进度事件无关**，别搞混

## 2-OLD. 旧版 SSE 基础设施说明（已被上面取代，保留备查）

**不要自己造 broker**。基建已完备：

| 文件 | 用途 |
|---|---|
| `app/infra/event_bus.py` — `EventBuffer` | 通用环形缓冲，所有 broker 都用它做存储 |
| `app/infra/sse_broker.py` — `InMemorySseBroker` | **视频任务进度事件 broker**（Phase 3 课堂任务事件可直接复用这个类，或按相同模式新建 `ClassroomTaskSseBroker`） |
| `app/core/sse.py` — `TaskProgressEvent`, `ensure_sse_event_identity`, `parse_sse_event_id` | 事件类型 + ID 标准化工具 |
| `app/features/classroom/chat_sse_broker.py` | **不是任务进度**，是课堂 chat 的 SSE（与 Phase 3 无关，别搞混） |

**Phase 3 推荐路径**：
- 直接让课堂任务事件复用 `InMemorySseBroker` + `TaskProgressEvent`
- 仅加课堂侧路由：`GET /api/v1/classroom/tasks/{taskId}/events`（路径和视频的 `/api/v1/task/{taskId}/events` 对称）
- `job_runner.py` 在 stage 切换点调用 broker.publish(...)

视频侧前端对标：`packages/student-web/src/features/video/hooks/use-video-task-sse.ts`（197 行，Phase 3 的 `useGenerationTask` 要抽取这个的逻辑）

---

## 3. Phase 4 · Canvas 元素序列化（TS 端口参考）

**✅ 已核对我们项目的 Scene 类型（Coordinator 替 Phase 4 worker 预读）**：

真实类型在 `packages/student-web/src/features/classroom/types/scene.ts:33-47`：
```ts
export interface SlideElement {
  id: string;
  type: 'text' | 'shape' | 'image' | 'latex';  // ← 只有 4 种，不是 OpenMAIC 的 10+
  left: number;
  top: number;
  width: number;
  height: number;
  content: string | null;   // ← 所有类型统一用 content（string 或 null）
  extra?: Record<string, unknown>;  // ← 类型特定数据放这里
}

export interface SlideContent {
  background?: { type?: string; color?: string };
  elements?: SlideElement[];
}
```

**关键差异**：
- 我们**只有 4 种 type**：`text / shape / image / latex`
- 我们**统一用 `content: string | null`**，不像 OpenMAIC 分 `el.content` / `el.text.content` / `el.latex` / `el.src`
- `elements` 是 `SlideContent.elements`（可选），**不是 `scene.content.canvas.elements`**
- 只有 `SlideScene`（`scene.type === 'slide'`）才有 `elements`；`InteractiveScene` 和 `PBLScene` 没有

**Phase 4 worker 的 summarizeElements 应简化为**（删掉 OpenMAIC 的 chart/table/line/code/video/audio 死分支）：
```ts
function summarizeElement(el: SlideElement): string {
  const id = `[id:${el.id}]`;
  const pos = `at (${Math.round(el.left)},${Math.round(el.top)})`;
  const size = ` size ${Math.round(el.width)}×${Math.round(el.height)}`;
  const text = (el.content || '').replace(/<[^>]*>/g, '').trim().slice(0, 60);
  const suffix = text.length >= 60 ? '...' : '';

  switch (el.type) {
    case 'text':
      return `${id} text: "${text}${suffix}" ${pos}${size}`;
    case 'shape':
      return `${id} shape${text ? `: "${text}"` : ''} ${pos}${size}`;
    case 'image': {
      const src = el.content?.startsWith('data:') ? '[embedded]' : (el.content?.slice(0, 50) ?? 'unknown');
      return `${id} image: ${src} ${pos}${size}`;
    }
    case 'latex':
      return `${id} latex: "${text}" ${pos}${size}`;
    default:
      return `${id} ${el.type} ${pos}${size}`;
  }
}

export function summarizeElements(elements: SlideElement[] = []): string {
  if (elements.length === 0) return '  (empty)';
  return elements.map((el, i) => `  ${i + 1}. ${summarizeElement(el)}`).join('\n');
}
```

**`build-classroom-context` 取 elements 的正确路径**：
```ts
const elements = scene.type === 'slide' ? (scene.content.elements ?? []) : [];
```
**非 slide 场景**（interactive / pbl）传空数组即可，summarizeElements 输出 `(empty)`。

**目标目录**：`packages/student-web/src/features/classroom/utils/summarize-elements.ts`

**基础实现（可以直接抄作起点，等你校对完类型再微调）**：
```ts
// packages/student-web/src/features/classroom/utils/summarize-elements.ts
import type { CanvasElement } from '../types/classroom';  // 对齐我们的类型

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function summarizeElement(el: any): string {  // 暂用 any，校对后替换为 CanvasElement union
  const id = el.id ? `[id:${el.id}]` : '';
  const pos = `at (${Math.round(el.left ?? 0)},${Math.round(el.top ?? 0)})`;
  const size = el.width != null && el.height != null
    ? ` size ${Math.round(el.width)}×${Math.round(el.height)}`
    : el.width != null ? ` w=${Math.round(el.width)}` : '';

  switch (el.type) {
    case 'text': {
      const text = stripHtml(el.content || '').slice(0, 60);
      const suffix = text.length >= 60 ? '...' : '';
      return `${id} text${el.textType ? `[${el.textType}]` : ''}: "${text}${suffix}" ${pos}${size}`;
    }
    case 'image': {
      const src = el.src?.startsWith('data:') ? '[embedded]' : el.src?.slice(0, 50) || 'unknown';
      return `${id} image: ${src} ${pos}${size}`;
    }
    case 'shape': {
      const shapeText = el.text?.content ? stripHtml(el.text.content).slice(0, 40) : '';
      return `${id} shape${shapeText ? `: "${shapeText}"` : ''} ${pos}${size}`;
    }
    case 'chart':
      return `${id} chart[${el.chartType}]: labels=[${(el.data?.labels || []).slice(0, 4).join(',')}] ${pos}${size}`;
    case 'table': {
      const rows = el.data?.length || 0;
      const cols = el.data?.[0]?.length || 0;
      return `${id} table: ${rows}x${cols} ${pos}${size}`;
    }
    case 'latex':
      return `${id} latex: "${(el.latex || '').slice(0, 40)}" ${pos}${size}`;
    case 'line': {
      const lx = Math.round(el.left ?? 0);
      const ly = Math.round(el.top ?? 0);
      const sx = el.start?.[0] ?? 0;
      const sy = el.start?.[1] ?? 0;
      const ex = el.end?.[0] ?? 0;
      const ey = el.end?.[1] ?? 0;
      return `${id} line: (${lx + sx},${ly + sy}) → (${lx + ex},${ly + ey})`;
    }
    case 'code': {
      const lang = el.language || 'unknown';
      const lineCount = el.lines?.length || 0;
      const codeFn = el.fileName ? ` "${el.fileName}"` : '';
      const linePreview = (el.lines || [])
        .slice(0, 10)
        .map((l: any) => `    ${l.id}: ${l.content}`)
        .join('\n');
      const moreLines = lineCount > 10 ? `\n    ... and ${lineCount - 10} more lines` : '';
      return `${id} code${codeFn} (${lang}, ${lineCount} lines) ${pos}${size}\n${linePreview}${moreLines}`;
    }
    case 'video':
      return `${id} video ${pos}${size}`;
    case 'audio':
      return `${id} audio ${pos}${size}`;
    default:
      return `${id} ${el.type || 'unknown'} ${pos}${size}`;
  }
}

export function summarizeElements(elements: any[]): string {
  if (!elements || elements.length === 0) return '  (empty)';
  return elements
    .map((el, i) => `  ${i + 1}. ${summarizeElement(el)}`)
    .join('\n');
}
```

**加单元测试**在 `summarize-elements.test.ts`，覆盖 text / image / shape / latex / line / empty 6 种场景。

---

## 4. Phase 4 · CompanionSidebar 解耦要点

**耦合点只有 3 处**（视频侧 `companion-sidebar-v2.tsx`）：
1. `line 30`: `import type { VideoPlayerHandle } from '../components/video-player';`
2. `line 41, 68, 109, 113`: `playerRef?: RefObject<VideoPlayerHandle | null>` prop
3. `line 47-62`: `captureFrame(playerRef)` 辅助函数（截视频当前帧）
4. `line 80`: 调用 `captureFrame(playerRef)` 生成 `frameBase64`

**解耦方案**：
- 新 prop：`getContextSnapshot: () => { text?: string; imageBase64?: string; metadata?: Record<string, any> }`
- 视频侧 consumer 在 `getContextSnapshot` 里调用 `captureFrame` 返回 imageBase64 + anchor metadata
- 课堂侧 consumer 只返回 `text`（`summarizeElements` 输出），`imageBase64` 为 undefined
- `companion-sidebar-v2.tsx` 的 `createCompanionAdapter` 改成接受 `getContextSnapshot` 而不是 `playerRef + anchor`

---

## 5. Phase 1 · 输入卡片集成点

**`classroom-input-card.tsx`**（207 行已读）— 目前的 tool 区域（line 140-193）有：
- Paperclip（文件上传）
- Mic（语音）
- divider
- Globe（web search toggle）

**Phase 1 "高级"按钮建议插入位置**：line 191-192 之间（Globe toggle 后面），新增一个 `<button className={toolButtonClassName}>` + `SlidersHorizontal` icon。组件 Props 要加：
- `onOpenAdvanced: () => void`
- `labels.toolAdvanced: string`
- `advancedActive: boolean`（true 时 button 高亮，显示有非默认参数）

`classroom-input-page.tsx` 再传入弹窗的 state + open handler。

---

## 6. 共享 i18n 命名空间约定（所有 worker 必守）

| 命名空间 | 所有者 Wave/Phase | 举例 key |
|---|---|---|
| `classroomInput.advanced.*` | Phase 1 | `title`, `sceneCountLabel`, `durationLabel`, `interactiveModeLabel` |
| `classroom.generating.*` | Phase 2 | `stageOutline`, `stageScenes`, `tipCarousel1` |
| `classroom.companion.*` | Phase 4 | `placeholder`, `quickActionExplain`, `highlightedElement` |
| `classroom.interactive.*` | Phase 5 | `widgetSimulation`, `widgetLoading`, `widgetError` |

不要跨命名空间加 key。冲突风险只在两个命名空间同时被修改的 JSON 文件行上——如果两个 worker 都加到 `zh-CN.json` 的末尾 `{` 前，靠 diff 自然合并。

---

## 7. Phase 5 · OpenMAIC Widget HTML 生成要点

OpenMAIC 的 widget HTML 生成是"LLM 产一个完整自包含 HTML"模式。**每个 widget 类型有独立 prompt**：

| Widget 类型 | Prompt 目录 |
|---|---|
| simulation | `references/OpenMAIC/lib/prompts/templates/simulation-content/` |
| diagram | `references/OpenMAIC/lib/prompts/templates/diagram-content/` |
| code | `references/OpenMAIC/lib/prompts/templates/code-content/` |
| game | `references/OpenMAIC/lib/prompts/templates/game-content/` |
| visualization3d | `references/OpenMAIC/lib/prompts/templates/visualization3d-content/` |

**所以 Phase 5 的 `widget_html.py` 实际上是 5 个 prompt 按 widget_type 分流派发**。

**HTML 结构硬性要求**（见 simulation prompt line 1-30）：
1. 完整 HTML5 文档
2. 内嵌 `<script type="application/json" id="widget-config">...</script>` 配置块
3. 交互控件 + Canvas/SVG 可视化
4. Mobile-responsive 设计
5. **postMessage listener** 处理 parent 发来的 teacher actions

**关键 postMessage 协议**（iframe ↔ parent）：
```javascript
window.addEventListener('message', function(event) {
  const { type, target, state, content } = event.data;
  switch (type) {
    case 'SET_WIDGET_STATE':    // parent 更新 widget 变量
    case 'HIGHLIGHT_ELEMENT':   // parent 高亮指定子元素
    // 更多事件...
  }
});
```

**前端类型改动极简**（Coordinator 替 Phase 5 worker 预读 `types/scene.ts`）：
- `SceneType` 已是 `'slide' | 'interactive' | 'pbl'`（line 14）→ **`interactive` 已就位**
- `InteractiveContent` 已有 `html?: string | url?: string`（line 50-53）→ **`html` 字段已就位**，无需改名
- **只需扩展 `InteractiveContent`** 加 `widgetType?: 'simulation'|'diagram'|'code'|'game'|'visualization3d'` + `widgetOutline?: Record<string, unknown>`
- 渲染入口：`scene.type === 'interactive'` 分支（当前在 `stage.tsx` + `scene-renderers/` 下可能有占位 renderer，或直接新建 `<WidgetRuntime>` 挂）

**后端 LLM stage 注册**（Coordinator 替 Phase 5 worker 预读 `llm_adapter.py`）：
- `CLASSROOM_LLM_STAGE_CODES` 当前是 `{"outline", "scene_content", "scene_actions", "agent_profiles", "director"}`（line 27-33）
- **Phase 5 需把 `"widget_html"` 加进这个 set**，否则 `resolve_classroom_providers("widget_html")` 会 `raise ValueError`
- `xm_ai_module_binding` 表如无 `module_code='classroom' AND stage_code='widget_html'` 的 row，会自动回退 `default_llm_provider`（MVP 可接受）

**OpenMAIC interactive-outlines 的关键 prompt 规则**（`references/OpenMAIC/lib/prompts/templates/interactive-outlines/user.md`）：

Distribution Target 硬性规则：
- **70% interactive scenes** (widgets: simulation, diagram, code, game)
- **30% slide scenes**（introductions / summaries / transitions）

Widget Type 配额（MANDATORY）：
| Widget | 约束 |
|---|---|
| simulation | **Minimum 2 scenes** |
| game | **Minimum 1 scene** |
| diagram | **Maximum 1 scene** |

Widget 设计原则（必须在 system prompt 里保留）：
- simulation: Mobile-friendly, reset 按钮必须工作，44px 触点
- diagram: 首节点可见（不要空屏）, 高对比, 节点加 icon
- game: **PREFER action/puzzle games over quizzes**；gameType 必须是 "action/puzzle/strategy"，不能是 "quiz"
- 反面例子：`{ "gameType": "quiz", "questionCount": 5 }` — 这是错的

OpenMAIC 默认 outline（`requirements-to-outlines`）vs Interactive Mode（`interactive-outlines`）的输出格式不同：
- 默认版：`{ languageDirective: ..., outlines: [...] }` — 带 wrapper
- Interactive Mode 版：`[...]` — 直接裸数组
- Phase 5 worker 在 `outline_generator.py` 里解析时要兼容两种格式

变量占位符（user.md 使用）：
`{{requirement}}`, `{{userProfile}}`, `{{language}}`, `{{pdfContent}}`, `{{availableImages}}`, `{{researchContext}}`, `{{teacherContext}}`, `{{mediaGenerationPolicy}}` — 注意与我们项目的 prompt 变量名对齐。

**Phase 5 MVP 决策建议**：
- MVP 先做"纯渲染"：iframe 加载 srcDoc，不实现 postMessage bridge
- 增量：parent 端 post SET_WIDGET_STATE / HIGHLIGHT_ELEMENT，与 Phase 4 的 `[elem:xxx]` 协议整合
- 增量可以 Phase 5 里做，也可以后续 sprint P0

**安全硬约束**：
- iframe sandbox 仅 `allow-scripts`（不加 `allow-same-origin` / `allow-top-navigation` / `allow-popups` / `allow-forms`）
- postMessage 不需要 `allow-same-origin`（跨 origin 照样能 postMessage）

---

## 8. 当前分支状态（供 worktree 新建参考）

```
基础分支：feat/classroom-integration-fix
HEAD：a74ec44 fix(classroom): 课堂播放页端到端修复 — 布局、音频、主题、slide 对齐
项目根：/Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace
Worktree 约定位置：/Volumes/DataDisk/Projects/ProriseProjects/worktrees/classroom-phase-{1,2,3,4,5}
```

**每个 worker 第一步**（确认基础分支在远端）：
```bash
cd /Volumes/DataDisk/Projects/ProriseProjects/Prorise_ai_teach_workspace
git fetch  # 拉最新（coordinator merge 后有新 commit）
git worktree add ../worktrees/classroom-phase-X -b feat/classroom-phase-X feat/classroom-integration-fix
cd ../worktrees/classroom-phase-X
```

**遇到 pre-commit hook 失败**：修好再提交，**不要** `--no-verify`。
