# Video Input Task Queue and Cancel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `/video/input` 按设计稿显示“多个进行中任务”的任务中心，并支持从输入工作区与等待页主动取消任务；用户从等待页返回工作区后，仍能随时回到对应任务或终止任务。

**Architecture:** 前端不重排输入页主体结构，而是把任务中心作为工作区顶栏的可选插槽，严格贴合设计稿的 bell/dropdown 位置；任务列表数据由“视频任务元数据列表 + 每个任务的 `/status` 快照 enrich”组合得到。后端新增 `cancel` 端点、运行态取消标记和流水线协作式中断检查，确保取消既能立刻反馈给前端，也能尽快停止后续资源消耗。

**Tech Stack:** React + TanStack Query + React Router + Zustand + Tailwind/现有 token 体系；FastAPI + RuntimeStore(Redis) + 统一 Task Framework + SSE。

---

## 0. 锁定需求与非目标

### 锁定需求

- 输入工作区定义为 `packages/student-web/src/features/video/pages/video-input-page.tsx` 对应的 `/video/input`，不是公共首页 `/`。
- 输入页 UI 必须以设计稿为准：
  - `Ux/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/03-视频输入页/01-input.html`
- 等待页顶部动作必须以设计稿为准：
  - `Ux/03UI:UX 设计素材/001UI 设计稿/04-成品图/01-正式路由页面/04-视频等待页/01-generating.html`
- 任务中心必须支持“多个并行任务列表”。
- 用户从等待页返回工作区后，任务继续存在，并能从工作区再次进入。
- 用户可从工作区取消任务。
- 用户可从等待页取消任务并直接回到工作区。
- 不能再自行发明新的输入页布局；只做最小侵入式接入。

### 非目标

- 不改结果页 `/video/:id` 的主布局与功能边界。
- 不把等待页 section preview 扩展到结果页。
- 不新增“全部任务页”；输入页只实现设计稿里的顶栏任务中心。
- 不改课堂输入页的交互结构；如果共享壳层被扩展，课堂页必须保持视觉不变。

### 实施假设（本计划默认）

- 任务中心只展示活跃任务：`pending` + `processing`。
- 活跃任务按 `updatedAt` 倒序展示，顶栏 dropdown 最多直出 5 条，超过时仅显示“查看全部 N 个任务”的占位 footer，但本轮不实现新页面跳转。
- 输入页在“无活跃任务”时不显示显著任务列表主体；任务中心触发器可以按最终实现选择隐藏或无 badge 静置，但不得偏离设计稿位置。
- 等待页 header 动作按状态切换：
  - 活跃态：`返回工作区` + `取消任务` + `主题切换`
  - 完成态：`返回工作区` + `前往结果页` + `主题切换`

---

## 1. 文件结构与职责锁定

### 前端改动

- **Modify:** `packages/student-web/src/components/navigation/global-top-nav-shared.ts`
  - 为 workspace 顶栏增加可选 utility slot / action slot 类型定义。
- **Modify:** `packages/student-web/src/components/navigation/global-top-nav-desktop.tsx`
  - 在 workspace 右侧操作区挂入任务中心触发器/下拉内容，不影响已有主题切换与账号动作。
- **Modify:** `packages/student-web/src/components/navigation/global-top-nav-mobile.tsx`
  - 给移动端保留同源入口，避免只有桌面端能回到任务。
- **Modify:** `packages/student-web/src/components/input-page/workspace-input-shell.tsx`
  - 只负责把 video 页提供的顶栏 utility slot 透传给 `GlobalTopNav`，不改主体内容顺序。
- **Create:** `packages/student-web/src/features/video/components/video-task-center.tsx`
  - 封装 bell badge、dropdown 列表、取消按钮、进入工作区按钮。
- **Create:** `packages/student-web/src/features/video/hooks/use-video-workspace-tasks.ts`
  - 拉取活跃任务列表并 enrich `/status` 快照。
- **Create:** `packages/student-web/src/services/api/adapters/video-workspace-task-adapter.ts`
  - 组合 `GET /api/v1/video/tasks` 与 `GET /api/v1/video/tasks/{id}/status`，输出输入页可直接消费的 `VideoWorkspaceTaskItem[]`。
- **Modify:** `packages/student-web/src/services/api/adapters/video-task-adapter.ts`
  - 扩展 `cancelTask(taskId)`，统一 mock/real 行为。
- **Create:** `packages/student-web/src/features/video/hooks/use-cancel-video-task.ts`
  - 封装取消 mutation、通知、query invalidation 与导航差异。
- **Modify:** `packages/student-web/src/features/video/pages/video-input-page.tsx`
  - 将 `VideoTaskCenter` 作为顶栏 slot 注入，不改输入区、建议区、guide cards、public feed 的骨架顺序。
- **Modify:** `packages/student-web/src/features/video/pages/video-generating-page.tsx`
  - 将 header actions 调整为设计稿结构，并接入主动取消。
- **Modify:** `packages/student-web/src/app/i18n/resources/entry-page-content.ts`
  - 新增输入页任务中心文案。
- **Modify:** `packages/student-web/src/app/i18n/resources/video-content.ts`
  - 新增等待页取消确认、取消成功、返回工作区等文案。
- **Test:** `packages/student-web/src/features/video/pages/video-input-page.test.tsx`
- **Test:** `packages/student-web/src/features/video/pages/video-generating-page.test.tsx`
- **Test:** `packages/student-web/src/services/api/adapters/video-workspace-task-adapter.test.ts`

### 后端改动

- **Modify:** `packages/fastapi-backend/app/features/video/routes.py`
  - 新增 `POST /api/v1/video/tasks/{task_id}/cancel`。
- **Create:** `packages/fastapi-backend/app/features/video/service/cancel_task.py`
  - 集中实现 owner 校验、终态校验、runtime cancel flag、事件写回、metadata 持久化。
- **Modify:** `packages/fastapi-backend/app/features/video/service/__init__.py`
  - 暴露 cancel service/mixin（若采用 mixin 模式）。
- **Modify:** `packages/fastapi-backend/app/features/video/pipeline/orchestration/runtime.py`
  - 为 `VideoRuntimeStateStore` 增加 cancel flag 的 save/load helpers。
- **Modify:** `packages/fastapi-backend/app/features/video/pipeline/orchestration/orchestrator.py`
  - 在大阶段边界、render section 循环、finalize 前增加协作式取消检查。
- **Modify:** `packages/fastapi-backend/app/features/video/tasks/video_task_actor.py`
  - finalize 对 `cancelled` 做幂等持久化，避免晚到的 completed/failed 覆盖取消终态。
- **Test:** `packages/fastapi-backend/tests/api/video/test_video_cancel_route.py`
- **Test:** `packages/fastapi-backend/tests/unit/video/test_video_cancel_service.py`
- **Test:** `packages/fastapi-backend/tests/unit/video/test_video_pipeline_orchestrator_runtime.py`

### 文档回写（实现时完成）

- **Modify:** `_bmad-output/INDEX.md`
- **Modify:** `_bmad-output/implementation-artifacts/sprint-status.yaml`
- **Modify or Create:** `_bmad-output/implementation-artifacts/<对应 Story 实施文档>.md`
- **Modify:** `docs/01开发人员手册/INDEX.md`
- **Modify or Create:** `docs/01开发人员手册/<视频任务中心与取消说明>.md`

---

## 2. 数据流设计

### 输入页任务中心数据流

1. 前端先拉取视频元数据列表：
   - `GET /api/v1/video/tasks?pageNum=1&pageSize=10&status=pending`
   - `GET /api/v1/video/tasks?pageNum=1&pageSize=10&status=processing`
2. 合并两批 `rows`，按 `updatedAt` 倒序排序。
3. 对最多 5 个候选任务并发调用：
   - `GET /api/v1/video/tasks/{task_id}/status`
4. 用 `/status` 的 `progress/currentStage/stageLabel/message` enrich 顶栏卡片。
5. 标题优先级：
   - `sessionStorage['video-task-draft:${taskId}']`
   - `metadata.summary`
   - 默认兜底标题

### 取消任务数据流

1. 前端调用 `POST /api/v1/video/tasks/{task_id}/cancel`。
2. 后端立即：
   - 校验 owner
   - 拒绝终态任务取消
   - 写入 runtime cancel flag
   - 把 runtime snapshot 更新为 `cancelled`
   - 追加一条 `cancelled` SSE 事件
   - 把 metadata status 持久化为 `cancelled`
3. Worker 在下一阶段边界或 section 循环处读到 cancel flag，提前返回 `TaskResult(status=cancelled, ...)`。
4. 前端取消成功后：
   - 输入页：invalidate 活跃任务 query，移除条目
   - 等待页：toast + navigate(`/video/input`)

---

## 3. 任务拆解

### Task 1: 建立输入页活跃任务数据层

**Files:**
- Create: `packages/student-web/src/services/api/adapters/video-workspace-task-adapter.ts`
- Create: `packages/student-web/src/features/video/hooks/use-video-workspace-tasks.ts`
- Modify: `packages/student-web/src/services/api/adapters/video-task-adapter.ts`
- Test: `packages/student-web/src/services/api/adapters/video-workspace-task-adapter.test.ts`

- [ ] **Step 1: 写 adapter 测试，锁定“列表 + 快照 enrich”的输出形状**

```ts
it('merges pending and processing video tasks with per-task status snapshots', async () => {
  const result = await adapter.listActiveTasks();

  expect(result.total).toBe(3);
  expect(result.items[0]).toMatchObject({
    taskId: 'vtask_processing_002',
    lifecycleStatus: 'processing',
    progress: 58,
    stageLabel: 'video.stages.render',
  });
  expect(result.items[1]).toMatchObject({
    taskId: 'vtask_pending_001',
    lifecycleStatus: 'pending',
    progress: 0,
  });
});
```

- [ ] **Step 2: 先让测试 fail，执行定向测试**

Run: `pnpm --filter @xiaomai/student-web test -- src/services/api/adapters/video-workspace-task-adapter.test.ts`

Expected: FAIL，提示 `Cannot find module '@/services/api/adapters/video-workspace-task-adapter'` 或缺少 `listActiveTasks`。

- [ ] **Step 3: 实现新 adapter，组合现有接口而不是改动输入页页面层直接 fetch**

```ts
export interface VideoWorkspaceTaskItem {
  taskId: string;
  title: string;
  lifecycleStatus: TaskLifecycleStatus;
  progress: number;
  stageLabel: string | null;
  currentStage: string | null;
  updatedAt: string;
  message: string;
}

export async function listActiveTasks(): Promise<VideoWorkspaceTaskListResult> {
  const [pendingPage, processingPage] = await Promise.all([
    client.get('/api/v1/video/tasks', { params: { status: 'pending', pageNum: 1, pageSize: 10 } }),
    client.get('/api/v1/video/tasks', { params: { status: 'processing', pageNum: 1, pageSize: 10 } }),
  ]);

  const activeRows = [...pendingPage.data.rows, ...processingPage.data.rows]
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));

  const enriched = await Promise.all(activeRows.slice(0, 5).map(async row => {
    const snapshot = await resolveTaskAdapter({ module: 'video' }).getTaskSnapshot(row.taskId);
    return mapWorkspaceTask(row, snapshot);
  }));

  return { items: enriched, total: activeRows.length };
}
```

- [ ] **Step 4: 为输入页暴露 query hook，并约定轮询频率**

```ts
export function useVideoWorkspaceTasks() {
  const adapter = resolveVideoWorkspaceTaskAdapter();

  return useQuery({
    queryKey: ['video', 'workspace', 'active-tasks'],
    queryFn: () => adapter.listActiveTasks(),
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}
```

- [ ] **Step 5: 扩展视频任务 adapter 的 cancel 能力**

```ts
export interface VideoTaskAdapter {
  createTask(request: VideoTaskCreateRequest, options?: VideoTaskCreateOptions): Promise<VideoTaskCreateResult>;
  cancelTask(taskId: string, options?: { signal?: AbortSignal }): Promise<TaskSnapshot>;
}
```

- [ ] **Step 6: 重新执行 adapter 定向测试**

Run: `pnpm --filter @xiaomai/student-web test -- src/services/api/adapters/video-workspace-task-adapter.test.ts`

Expected: PASS。

### Task 2: 把任务中心接进输入工作区顶栏，不改页面主体骨架

**Files:**
- Modify: `packages/student-web/src/components/navigation/global-top-nav-shared.ts`
- Modify: `packages/student-web/src/components/navigation/global-top-nav-desktop.tsx`
- Modify: `packages/student-web/src/components/navigation/global-top-nav-mobile.tsx`
- Modify: `packages/student-web/src/components/input-page/workspace-input-shell.tsx`
- Create: `packages/student-web/src/features/video/components/video-task-center.tsx`
- Modify: `packages/student-web/src/features/video/pages/video-input-page.tsx`
- Modify: `packages/student-web/src/app/i18n/resources/entry-page-content.ts`
- Test: `packages/student-web/src/features/video/pages/video-input-page.test.tsx`

- [ ] **Step 1: 写页面测试，锁定 bell/dropdown 位置来自顶栏，不是页面主体新卡片**

```ts
it('renders active task center in workspace top nav when there are active tasks', async () => {
  useVideoWorkspaceTasksMock.mockReturnValue({
    data: {
      total: 2,
      items: [
        { taskId: 'vtask_1', title: '导数题', lifecycleStatus: 'processing', progress: 58, stageLabel: '动画渲染中', currentStage: 'render', updatedAt: '2026-04-17T10:00:00Z', message: '任务处理中' },
      ],
    },
  });

  renderVideoInputPage();

  expect(screen.getByRole('button', { name: /进行中的任务|bell/i })).toBeInTheDocument();
  expect(screen.queryByText('热门题目讲解视频')).toBeInTheDocument();
  expect(screen.queryByText('导数题')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /进行中的任务|bell/i }));
  expect(screen.getByText('导数题')).toBeInTheDocument();
  expect(screen.getByText('58%')).toBeInTheDocument();
});
```

- [ ] **Step 2: 给顶栏共享组件增加 workspace utility slot，而不是把 video-specific 逻辑塞进 nav 内核**

```ts
export type GlobalTopNavProps = {
  links: GlobalTopNavLink[];
  variant?: 'home' | 'surface' | 'workspace';
  workspaceRoutes?: WorkspaceRoute[];
  workspaceUtilitySlot?: ReactNode;
  showBrandIcon?: boolean;
  showAuthAction?: boolean;
  showLocaleToggle?: boolean;
  className?: string;
};
```

- [ ] **Step 3: 让 `WorkspaceInputShell` 只负责透传 slot，不改 header/card/suggestions/guide/feed 顺序**

```tsx
<GlobalTopNav
  links={navLinks}
  variant="workspace"
  workspaceRoutes={workspaceRoutes}
  workspaceUtilitySlot={workspaceUtilitySlot}
  showAuthAction
  showBrandIcon
  showLocaleToggle
  className="xm-landing-glass-nav"
/>
```

- [ ] **Step 4: 实现 `VideoTaskCenter`，严格贴合设计稿 bell + dropdown 结构**

```tsx
export function VideoTaskCenter({ items, total, isCancellingTaskId, onCancel, onEnterTask }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" data-testid="video-task-center">
      <button type="button" className="relative rounded-full border ..." onClick={() => setOpen(v => !v)}>
        <Bell className="h-4 w-4" />
        {total > 0 ? <span className="absolute right-0 top-0 ..." /> : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-full mt-3 w-[320px] sm:w-[380px] rounded-3xl border ...">
          {/* header + list + footer */}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: 在 `VideoInputPage` 注入 slot，并用 query 数据驱动按钮行为**

```tsx
const workspaceTasks = useVideoWorkspaceTasks();
const cancelTask = useCancelVideoTask({ navigateOnSuccess: false });

<WorkspaceInputShell
  ...
  workspaceUtilitySlot={workspaceTasks.data?.total ? (
    <VideoTaskCenter
      items={workspaceTasks.data.items}
      total={workspaceTasks.data.total}
      isCancellingTaskId={cancelTask.variables ?? null}
      onCancel={(taskId) => cancelTask.mutate(taskId)}
      onEnterTask={(taskId) => navigate(`/video/${taskId}/generating`)}
    />
  ) : null}
/>
```

- [ ] **Step 6: 重新执行输入页测试**

Run: `pnpm --filter @xiaomai/student-web test -- src/features/video/pages/video-input-page.test.tsx`

Expected: PASS，且现有 public feed / input card 断言不回归。

### Task 3: 等待页接入“返回工作区 / 取消任务”动作

**Files:**
- Create: `packages/student-web/src/features/video/hooks/use-cancel-video-task.ts`
- Modify: `packages/student-web/src/features/video/pages/video-generating-page.tsx`
- Modify: `packages/student-web/src/app/i18n/resources/video-content.ts`
- Test: `packages/student-web/src/features/video/pages/video-generating-page.test.tsx`

- [ ] **Step 1: 写等待页测试，锁定活跃态 header action 与取消后返回工作区**

```ts
it('shows return-to-workspace and cancel-task actions while task is active', async () => {
  renderGeneratingPage({ status: 'processing' });

  expect(screen.getByRole('button', { name: '返回工作区' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '取消任务' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '前往结果页' })).not.toBeInTheDocument();
});

it('cancels active task then navigates back to /video/input', async () => {
  cancelTaskMock.mockResolvedValue(createSnapshot({ status: 'cancelled' }));
  renderGeneratingPage({ status: 'processing' });

  await user.click(screen.getByRole('button', { name: '取消任务' }));

  await waitFor(() => {
    expect(screen.getByText('视频输入页')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 实现 `useCancelVideoTask`，统一 toast / invalidation / 可选导航**

```ts
export function useCancelVideoTask(options: { navigateOnSuccess?: boolean } = {}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const adapter = resolveVideoTaskAdapter();
  const { notify } = useFeedback();

  return useMutation({
    mutationFn: (taskId: string) => adapter.cancelTask(taskId),
    onSuccess: async (_, taskId) => {
      await queryClient.invalidateQueries({ queryKey: ['video', 'workspace', 'active-tasks'] });
      notify({ tone: 'success', title: '任务已取消' });
      if (options.navigateOnSuccess) void navigate('/video/input', { replace: true });
    },
  });
}
```

- [ ] **Step 3: 按设计稿重排等待页 header actions，但保留完成态去结果页能力**

```tsx
<div className="xm-generating-shell__actions">
  <button type="button" className="xm-generating-shell__secondary" onClick={handleReturn}>
    <PanelLeftClose className="h-4 w-4" />
    <span>{t('video.generating.returnToWorkspace')}</span>
  </button>

  {isResultReady ? (
    <button type="button" className={cn('xm-generating-shell__cta', 'is-ready')} onClick={handleGoToResult}>
      <ArrowRight className="h-4 w-4" />
      <span>{t('video.common.goToResult')}</span>
    </button>
  ) : (
    <button type="button" className="xm-generating-shell__danger" onClick={() => cancelTask.mutate(taskId!)}>
      <XCircle className="h-4 w-4" />
      <span>{t('video.generating.cancelTask')}</span>
    </button>
  )}

  <button type="button" className="xm-generating-shell__theme" onClick={toggleThemeMode} />
</div>
```

- [ ] **Step 4: 补齐 i18n 文案，不在组件里硬编码中文**

```ts
video: {
  generating: {
    returnToWorkspace: '返回工作区',
    cancelTask: '取消任务',
    cancelSuccess: '任务已取消，已返回工作区',
    cancelBusy: '正在取消任务…',
  }
}
```

- [ ] **Step 5: 运行等待页测试**

Run: `pnpm --filter @xiaomai/student-web test -- src/features/video/pages/video-generating-page.test.tsx`

Expected: PASS。

### Task 4: 后端新增视频任务取消端点与服务

**Files:**
- Modify: `packages/fastapi-backend/app/features/video/routes.py`
- Create: `packages/fastapi-backend/app/features/video/service/cancel_task.py`
- Test: `packages/fastapi-backend/tests/api/video/test_video_cancel_route.py`
- Test: `packages/fastapi-backend/tests/unit/video/test_video_cancel_service.py`

- [ ] **Step 1: 写 API 测试，锁定 owner / terminal / success 分支**

```py
def test_video_cancel_route_marks_active_task_cancelled() -> None:
    runtime_store.set_task_state(
        task_id='vtask_cancel_001',
        task_type='video',
        internal_status=TaskInternalStatus.RUNNING,
        message='任务处理中',
        progress=42,
        request_id='req_cancel_001',
        user_id='10001',
        source='video',
        context={'currentStage': 'render'},
    )

    response = client.post('/api/v1/video/tasks/vtask_cancel_001/cancel')

    assert response.status_code == 200
    assert response.json()['data']['status'] == 'cancelled'
```

- [ ] **Step 2: 先让测试 fail**

Run: `python -m pytest packages/fastapi-backend/tests/api/video/test_video_cancel_route.py -q`

Expected: FAIL，提示路由不存在或 404。

- [ ] **Step 3: 实现 cancel service，先做运行态/权限/终态校验，再写入取消终态**

```py
async def cancel_video_task(
    task_id: str,
    *,
    runtime_store: RuntimeStore,
    access_context: AccessContext,
    service: VideoService,
) -> TaskSnapshotPayload:
    recovery_state = runtime_store.load_task_recovery_state(task_id)
    snapshot = recovery_state.snapshot
    if snapshot is None:
        raise AppError(code='COMMON_NOT_FOUND', message='未找到对应任务', status_code=404, task_id=task_id)

    owner_id = snapshot.get('userId')
    if owner_id != access_context.user_id:
        raise AppError(code='AUTH_PERMISSION_DENIED', message='仅任务创建者可取消任务', status_code=403, task_id=task_id)

    if str(snapshot.get('status')) in {'completed', 'failed', 'cancelled'}:
        raise AppError(code='TASK_NOT_CANCELLABLE', message='当前任务已结束，不能取消', status_code=409, task_id=task_id)

    runtime = VideoRuntimeStateStore(runtime_store, task_id)
    runtime.save_cancel_request({'requestedAt': format_trace_timestamp(), 'requestedBy': access_context.user_id})
    runtime_store.set_task_state(
        task_id=task_id,
        task_type='video',
        internal_status=TaskInternalStatus.CANCELLING,
        message='任务已取消',
        progress=int(snapshot.get('progress') or 0),
        request_id=str(snapshot.get('requestId') or access_context.request_id),
        user_id=access_context.user_id,
        error_code=TaskErrorCode.CANCELLED,
        source='video.cancel_task',
        context={**dict(snapshot.get('context') or {}), 'currentStage': snapshot.get('context', {}).get('currentStage'), 'cancelRequested': True},
    )
```

- [ ] **Step 4: 路由返回更新后的共享任务快照 envelope，避免再造 schema**

```py
@router.post('/tasks/{task_id}/cancel', response_model=TaskSnapshotResponseEnvelope)
async def cancel_video_task_endpoint(...):
    payload = await cancel_video_task(...)
    return build_success_envelope(payload, msg='任务已取消')
```

- [ ] **Step 5: 持久化 metadata 为 cancelled，确保输入页列表立即消失**

```py
await service.persist_task(
    service.build_task_request(
        task_id=task_id,
        user_id=access_context.user_id,
        status=TaskStatus.CANCELLED,
        summary=str(snapshot.get('message') or '任务已取消'),
        updated_at=datetime.now(UTC),
    ),
    access_context=access_context,
)
```

- [ ] **Step 6: 重新执行 API 与 service 定向测试**

Run: `python -m pytest packages/fastapi-backend/tests/api/video/test_video_cancel_route.py packages/fastapi-backend/tests/unit/video/test_video_cancel_service.py -q`

Expected: PASS。

### Task 5: 在视频流水线里实现协作式取消，阻止后续资源继续消耗

**Files:**
- Modify: `packages/fastapi-backend/app/features/video/pipeline/orchestration/runtime.py`
- Modify: `packages/fastapi-backend/app/features/video/pipeline/orchestration/orchestrator.py`
- Modify: `packages/fastapi-backend/app/features/video/tasks/video_task_actor.py`
- Test: `packages/fastapi-backend/tests/unit/video/test_video_pipeline_orchestrator_runtime.py`

- [ ] **Step 1: 写 orchestrator 单测，锁定“读到 cancel flag 后返回 cancelled，而不是 failed”**

```py
@pytest.mark.asyncio
async def test_pipeline_returns_cancelled_when_cancel_flag_exists_before_render(monkeypatch, tmp_path: Path) -> None:
    service, runtime_store = _build_service(tmp_path)
    runtime = VideoRuntimeStateStore(runtime_store, 'video_orchestrator_runtime_case')
    runtime.save_cancel_request({'requestedAt': '2026-04-17T15:00:00Z', 'requestedBy': 'user_1'})

    result = await service.run(_RecordingTask())

    assert result.status == TaskStatus.CANCELLED
    assert result.error_code == TaskErrorCode.CANCELLED
    assert result.message == '任务已取消'
```

- [ ] **Step 2: 给 `VideoRuntimeStateStore` 增加 cancel flag helper**

```py
class VideoRuntimeStateStore:
    def save_cancel_request(self, payload: dict[str, object]) -> None:
        self.save_value('cancel_request', payload)

    def load_cancel_request(self) -> dict[str, object] | None:
        raw = self.load_value('cancel_request')
        return dict(raw) if isinstance(raw, dict) else None

    def is_cancel_requested(self) -> bool:
        return self.load_cancel_request() is not None
```

- [ ] **Step 3: 在 orchestrator 大阶段边界与 render/finalize 热点位置检查 cancel**

```py
def _build_cancelled_result(self, *, runtime: VideoRuntimeStateStore, preview_state: VideoTaskPreview | None) -> TaskResult:
    if preview_state is not None:
        runtime.save_preview(preview_state.model_copy(update={'status': 'cancelled'}))
    return TaskResult(
        status=TaskStatus.CANCELLED,
        message='任务已取消',
        progress=0,
        error_code=TaskErrorCode.CANCELLED,
        context={'stage': 'cancelled', 'cancelRequested': True},
    )
```

至少在以下位置调用：

```py
setup = await self._setup_agent(...)
if runtime.is_cancel_requested():
    return self._build_cancelled_result(runtime=runtime, preview_state=preview_state)

for index, section in enumerate(sections):
    if runtime.is_cancel_requested():
        return self._build_cancelled_result(runtime=runtime, preview_state=preview_state)

await self._emit(... VideoStage.COMPOSE ...)
if runtime.is_cancel_requested():
    return self._build_cancelled_result(runtime=runtime, preview_state=preview_state)
```

- [ ] **Step 4: 让 `VideoTask.finalize()` 对 cancelled 幂等持久化**

```py
request = TaskMetadataCreateRequest(
    task_id=self.context.task_id,
    user_id=self.context.user_id,
    status=result.status,
    summary=result.message or '',
    error_summary=result.error_code if result.status == TaskStatus.FAILED else None,
)
```

重点：不要把 `cancelled` 当 `failed` 写 `error_summary`，也不要让后续 completed 覆盖已被路由标记的 cancelled。

- [ ] **Step 5: 重新执行单测**

Run: `python -m pytest packages/fastapi-backend/tests/unit/video/test_video_pipeline_orchestrator_runtime.py -q`

Expected: PASS。

### Task 6: 前后端联动验证与文档回写

**Files:**
- Modify: `_bmad-output/INDEX.md`
- Modify: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Modify or Create: `_bmad-output/implementation-artifacts/<对应实施文档>.md`
- Modify: `docs/01开发人员手册/INDEX.md`
- Modify or Create: `docs/01开发人员手册/<视频任务中心与取消说明>.md`

- [ ] **Step 1: 执行前端定向验证**

Run: `pnpm --filter @xiaomai/student-web test -- src/features/video/pages/video-input-page.test.tsx src/features/video/pages/video-generating-page.test.tsx src/services/api/adapters/video-workspace-task-adapter.test.ts && pnpm --filter @xiaomai/student-web typecheck`

Expected: PASS。

- [ ] **Step 2: 执行后端定向验证**

Run: `python -m pytest packages/fastapi-backend/tests/api/video/test_video_cancel_route.py packages/fastapi-backend/tests/unit/video/test_video_cancel_service.py packages/fastapi-backend/tests/unit/video/test_video_pipeline_orchestrator_runtime.py -q`

Expected: PASS。

- [ ] **Step 3: 执行一次跨层回归 smoke（只覆盖本改动边界）**

Run: `pnpm --filter @xiaomai/student-web test -- src/features/video/hooks/use-video-task-sse.test.tsx && python -m pytest packages/fastapi-backend/tests/unit/video/test_video_create_task.py -q`

Expected: PASS，确保等待页 SSE/创建链路未因 cancel 接入回归。

- [ ] **Step 4: 回写 BMAD 与开发手册**

```md
- 在 `_bmad-output/implementation-artifacts/...` 记录：
  - 输入页任务中心设计稿对齐点
  - 前端 active task 组合查询策略
  - cancel endpoint 合同
  - orchestrator 协作式取消边界
- 在 `docs/01开发人员手册/...` 增补“如何验证返回工作区后仍可找回任务、如何验证取消后资源收口”
```

---

## 4. 风险与防回归点

### 风险 1：为了接入任务中心误改输入页主体布局

**控制策略**
- 只给 `GlobalTopNav` / `WorkspaceInputShell` 增加可选 slot。
- `VideoInputPage` 继续把 card / suggestions / guide / feed 交给现有壳层。

### 风险 2：输入页任务中心拿不到实时进度

**控制策略**
- 不改 list API 合同，直接用 `/tasks` 元数据做 taskId 枚举，再用 `/status` enrich。
- 最多 enrich 前 5 条，避免输入页变成全量状态面板。

### 风险 3：cancel 路由返回成功，但 worker 继续跑完

**控制策略**
- 路由写 cancel flag + cancelled runtime/event + metadata。
- orchestrator 在 stage 边界、section render 循环、compose/upload 前检查 cancel flag。
- finalize 对 cancelled 幂等持久化，防止晚到 completed 覆盖终态。

### 风险 4：等待页完成态丢失“前往结果页”入口

**控制策略**
- 只在活跃态显示 `取消任务`；完成态仍显示 `前往结果页`。
- 保持 `handleGoToResult()` 现有逻辑。

---

## 5. 实施顺序建议

1. 先做 **Task 4 + Task 5**，把 cancel contract 和 worker 收口能力打通。
2. 再做 **Task 1 + Task 2**，保证输入页拿到真实活跃任务。
3. 最后做 **Task 3**，把等待页 header 动作改成设计稿结构。
4. 收尾做 **Task 6**，补文档与定向验证。

---

## 6. 计划自检

### 覆盖检查

- “返回工作区后还能找回任务” → Task 1 + Task 2
- “输入页支持多个并行任务列表” → Task 1 + Task 2
- “输入页可取消任务” → Task 1 + Task 2 + Task 4
- “等待页可取消任务并回到工作区” → Task 3 + Task 4 + Task 5
- “按设计稿，不乱动模板” → Task 2 + Task 3

### 占位词检查

- 本计划没有使用 `TODO` / `TBD` / “后续补充”。
- 所有关键改动都给了明确文件路径、接口、测试命令与代码骨架。

### 命名一致性检查

- 输入页活跃任务查询统一使用 `workspace active tasks` 命名。
- 取消能力统一使用 `cancelTask` / `cancel_video_task` 命名。
- 后端取消标记统一使用 `cancel_request` runtime key。

