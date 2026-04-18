/**
 * 文件说明：验证视频等待页对任务快照、zustand store 状态、失败态与终态跳转的编排行为。
 * Story 4.7 重构：状态由 zustand store 驱动，SSE hook 不再返回状态。
 */
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { VideoTaskPreviewResult } from '@/features/video/hooks/use-video-task-preview';
import { useCancelVideoTask } from '@/features/video/hooks/use-cancel-video-task';
import { useVideoTaskPreview } from '@/features/video/hooks/use-video-task-preview';
import { useVideoTaskSse } from '@/features/video/hooks/use-video-task-sse';
import type { VideoTaskStatusResult } from '@/features/video/hooks/use-video-task-status';
import { useVideoTaskStatus } from '@/features/video/hooks/use-video-task-status';
import { VideoGeneratingPage } from '@/features/video/pages/video-generating-page';
import { useVideoGeneratingStore } from '@/features/video/stores/video-generating-store';
import { useFeedback } from '@/shared/feedback';
import { renderWithApp } from '@/test/utils/render-app';
import type { TaskSnapshot } from '@/types/task';
import type { VideoTaskPreview } from '@/types/video';

vi.mock('@/features/video/hooks/use-video-task-status', () => ({
  useVideoTaskStatus: vi.fn(),
}));

vi.mock('@/features/video/hooks/use-video-task-preview', () => ({
  useVideoTaskPreview: vi.fn(),
}));

vi.mock('@/features/video/hooks/use-video-task-sse', () => ({
  useVideoTaskSse: vi.fn(),
}));

vi.mock('@/features/video/hooks/use-cancel-video-task', () => ({
  useCancelVideoTask: vi.fn(),
}));

vi.mock('@/shared/feedback', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/feedback')>();

  return {
    ...actual,
    useFeedback: vi.fn(),
  };
});

vi.mock('@/features/video/components/video-player', () => ({
  VideoPlayer: ({ videoUrl }: { videoUrl: string }) => <div data-testid="mock-video-player">{videoUrl}</div>,
}));

const useVideoTaskPreviewMock = vi.mocked(useVideoTaskPreview);
const useCancelVideoTaskMock = vi.mocked(useCancelVideoTask);
const useVideoTaskStatusMock = vi.mocked(useVideoTaskStatus);
const useVideoTaskSseMock = vi.mocked(useVideoTaskSse);
const useFeedbackMock = vi.mocked(useFeedback);
const notifyMock = vi.fn();
const cancelTaskMock = vi.fn();

function createSnapshot(overrides: Partial<TaskSnapshot> = {}): TaskSnapshot {
  return {
    taskId: 'vtask_mock_text_001',
    requestId: 'req_video_001',
    taskType: 'video',
    status: 'processing',
    progress: 42,
    message: '任务处理中状态已同步',
    timestamp: '2026-04-06T12:00:00Z',
    currentStage: 'render',
    stageLabel: 'video.stages.render',
    stageProgress: 60,
    errorCode: null,
    ...overrides,
  };
}

function createStatusResult(
  overrides: Partial<VideoTaskStatusResult> = {},
): VideoTaskStatusResult {
  return {
    snapshot: createSnapshot(),
    isLoading: false,
    isError: false,
    error: null,
    isNotFound: false,
    ...overrides,
  };
}

function createPreview(overrides: Partial<VideoTaskPreview> = {}): VideoTaskPreview {
  return {
    taskId: 'vtask_mock_text_001',
    status: 'processing',
    previewAvailable: true,
    previewVersion: 2,
    summary: '先建立 **导数直觉**，再看公式：$$f\'(x)=\\lim_{h \\to 0}\\frac{f(x+h)-f(x)}{h}$$',
    knowledgePoints: ['平均变化率', '切线斜率'],
    totalSections: 3,
    readySections: 1,
    failedSections: 0,
    sections: [
      {
        sectionId: 'section_1',
        sectionIndex: 0,
        title: '瞬时速度切入',
        lectureLines: ['从速度表过渡到函数变化率。'],
        status: 'ready',
        audioUrl: 'https://static.prorise.test/audio-1.mp3',
        clipUrl: 'https://static.prorise.test/clip-1.mp4',
        errorMessage: null,
        fixAttempt: null,
        updatedAt: '2026-04-16T10:00:00Z',
      },
      {
        sectionId: 'section_2',
        sectionIndex: 1,
        title: '割线到切线',
        lectureLines: ['观察平均变化率如何逼近切线斜率。'],
        status: 'rendering',
        audioUrl: 'https://static.prorise.test/audio-2.mp3',
        clipUrl: null,
        errorMessage: null,
        fixAttempt: null,
        updatedAt: '2026-04-16T10:00:10Z',
      },
    ],
    updatedAt: '2026-04-16T10:00:10Z',
    ...overrides,
  };
}

function createPreviewResult(
  overrides: Partial<VideoTaskPreviewResult> = {},
): VideoTaskPreviewResult {
  return {
    preview: null,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createGeneratingRouter(
  initialEntry = '/video/vtask_mock_text_001/generating',
) {
  return createMemoryRouter(
    [
      {
        path: '/video/:id/generating',
        element: <VideoGeneratingPage />,
      },
      {
        path: '/video/input',
        element: <div>视频输入页</div>,
      },
      {
        path: '/video/:id',
        element: <div>视频结果页</div>,
      },
    ],
    {
      initialEntries: [initialEntry],
    },
  );
}

function createCancelTaskResult(
  overrides: Partial<ReturnType<typeof useCancelVideoTask>> = {},
) {
  return {
    cancelTask: cancelTaskMock,
    cancelTaskAsync: vi.fn(),
    isCancelling: false,
    ...overrides,
  };
}

describe('VideoGeneratingPage', () => {
  beforeEach(() => {
    useCancelVideoTaskMock.mockReset();
    useVideoTaskPreviewMock.mockReset();
    useVideoTaskStatusMock.mockReset();
    useVideoTaskSseMock.mockReset();
    cancelTaskMock.mockReset();
    notifyMock.mockReset();
    useVideoTaskStatusMock.mockReturnValue(createStatusResult());
    useVideoTaskPreviewMock.mockReturnValue(createPreviewResult());
    useCancelVideoTaskMock.mockReturnValue(createCancelTaskResult());
    useFeedbackMock.mockReturnValue({
      notify: notifyMock,
      dismissNotice: vi.fn(),
      showSpotlight: vi.fn(),
      hideSpotlight: vi.fn(),
      showLoadingBar: vi.fn(),
      hideLoadingBar: vi.fn(),
    });
    useVideoGeneratingStore.getState().resetState('vtask_mock_text_001');
  });

  afterEach(() => {
    vi.useRealTimers();
    useVideoGeneratingStore.getState().resetState();
  });

  it('使用 status 快照承接任务上下文，并以 enabled=true 启动 SSE', async () => {
    const router = createGeneratingRouter();

    renderWithApp(<RouterProvider router={router} />);

    expect(useVideoTaskStatusMock).toHaveBeenCalledWith('vtask_mock_text_001');
    expect(useVideoTaskPreviewMock).toHaveBeenCalledWith('vtask_mock_text_001', {
      enabled: true,
    });
    expect(useVideoTaskSseMock).toHaveBeenCalledWith('vtask_mock_text_001', {
      enabled: true,
    });
    await waitFor(() => {
      expect(useVideoGeneratingStore.getState()).toMatchObject({
        taskId: 'vtask_mock_text_001',
        currentStage: 'render',
        stageLabel: 'video.stages.render',
        progress: 42,
        hasHydratedRuntime: true,
      });
    });
  });

  it('活跃态显示返回工作区与取消任务动作，并允许用户主动取消', () => {
    const router = createGeneratingRouter();

    renderWithApp(<RouterProvider router={router} />);

    expect(
      screen.getByRole('button', { name: /返回工作区|Back to Workspace/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /取消任务|Cancel Task/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /前往结果页|Go to Result/ }),
    ).not.toBeInTheDocument();
    expect(useCancelVideoTaskMock).toHaveBeenCalledWith(
      'vtask_mock_text_001',
      expect.objectContaining({
        navigateOnSuccess: true,
        returnTo: '/video/input?toast=cancelled&taskId=vtask_mock_text_001',
        replace: true,
      }),
    );

    fireEvent.click(
      screen.getByRole('button', { name: /取消任务|Cancel Task/ }),
    );

    expect(cancelTaskMock).toHaveBeenCalledTimes(1);
  });

  it('点击返回工作区后回到视频输入页', async () => {
    const router = createGeneratingRouter();

    renderWithApp(<RouterProvider router={router} />);

    fireEvent.click(
      screen.getByRole('button', { name: /返回工作区|Back to Workspace/ }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/video/input');
      expect(router.state.location.search).toBe(
        '?focusTask=vtask_mock_text_001&toast=returned',
      );
    });
  });

  it('当 zustand store 有进度数据时渲染阶段与进度', () => {
    // 先设置 store 状态
    act(() => {
      useVideoGeneratingStore.getState().updateStage({
        currentStage: 'tts',
        stageLabel: 'video.stages.tts',
        progress: 75,
      });
    });

    const router = createGeneratingRouter();

    renderWithApp(<RouterProvider router={router} />);

    expect(screen.getAllByText('生成旁白').length).toBeGreaterThan(0);
    expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
  });

  it('在 preview 数据就绪后默认停留摘要，并在用户切换后展示播放器与分段详情', async () => {
    useVideoTaskPreviewMock.mockReturnValue(
      createPreviewResult({
        preview: createPreview(),
      }),
    );
    const router = createGeneratingRouter();

    const { container } = renderWithApp(<RouterProvider router={router} />);

    await screen.findByText('快速讲解摘要');
    expect(screen.queryByTestId('mock-video-player')).not.toBeInTheDocument();
    expect(screen.getByText('导数直觉')).toBeInTheDocument();
    expect(container.querySelector('.xm-generating-rich-content math')).not.toBeNull();
    await waitFor(() => {
      expect(notifyMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: '摘要和分段讲解已经可查看' }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /3\. 分段试看/ }));
    expect(await screen.findByTestId('mock-video-player')).toHaveTextContent('https://static.prorise.test/clip-1.mp4');

    expect(screen.getByRole('button', { name: /3\. 分段试看/ })).toBeInTheDocument();
    expect(screen.getByText('逐段推送')).toBeInTheDocument();
    expect(screen.getByText('1 段已开放')).toBeInTheDocument();
    expect(screen.getAllByText('1 / 3 段已就绪').length).toBeGreaterThan(0);
    expect(screen.queryByText('画面')).not.toBeInTheDocument();
  });

  it('在失败态展示可读错误信息和操作按钮', () => {
    // 通过 store 设置失败状态
    act(() => {
      useVideoGeneratingStore.getState().setFailed({
        errorCode: 'VIDEO_RENDER_TIMEOUT',
        errorMessage: '动画渲染超时',
        failedStage: 'render',
        retryable: true,
      });
    });

    useVideoTaskStatusMock.mockReturnValue(
      createStatusResult({
        snapshot: createSnapshot({
          status: 'failed',
          progress: 70,
          errorCode: null,
        }),
      }),
    );

    const router = createGeneratingRouter();

    renderWithApp(<RouterProvider router={router} />);

    expect(screen.getByText('动画渲染失败')).toBeInTheDocument();
    expect(screen.getByText('动画渲染超时，请稍后重试')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重新生成/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /返回输入页/ })).toBeInTheDocument();
  });

  it('在 taskId 无效时展示 404 提示', () => {
    useVideoTaskStatusMock.mockReturnValue(
      createStatusResult({
        snapshot: null,
        isError: true,
        error: Object.assign(new Error('not found'), { status: 404 }),
        isNotFound: true,
      }),
    );
    const router = createGeneratingRouter();

    renderWithApp(<RouterProvider router={router} />);

    expect(screen.getByText('任务不存在')).toBeInTheDocument();
  });

  it('在未完成时顶部结果按钮保持禁用，完成后允许用户手动前往结果页', async () => {
    const processingRouter = createGeneratingRouter();

    const processingView = renderWithApp(
      <RouterProvider router={processingRouter} />,
    );

    expect(
      screen.queryByRole('button', { name: /前往结果页|Go to Result/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /取消任务|Cancel Task/ }),
    ).toBeInTheDocument();
    processingView.unmount();

    // 通过 store 设置完成状态
    act(() => {
      useVideoGeneratingStore.getState().setCompleted();
    });

    useVideoTaskStatusMock.mockReturnValue(
      createStatusResult({
        snapshot: createSnapshot({
          status: 'completed',
          progress: 100,
        }),
      }),
    );

    const router = createGeneratingRouter();

    renderWithApp(<RouterProvider router={router} />);

    expect(
      screen.getByRole('button', { name: /返回工作区|Back to Workspace/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /取消任务|Cancel Task/ }),
    ).not.toBeInTheDocument();
    const resultButton = screen.getByRole('button', {
      name: /前往结果页|Go to Result/,
    });
    expect(resultButton).toBeEnabled();

    fireEvent.click(resultButton);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/video/vtask_mock_text_001');
    });
  });

  it('zustand store 的 updateStage 正确更新状态', () => {
    const store = useVideoGeneratingStore.getState();

    store.updateStage({
      currentStage: 'manim_fix',
      stageLabel: 'video.stages.manim_fix',
      progress: 50,
      fixAttempt: 1,
      fixTotal: 2,
    });

    const state = useVideoGeneratingStore.getState();

    expect(state.currentStage).toBe('manim_fix');
    expect(state.stageLabel).toBe('video.stages.manim_fix');
    expect(state.progress).toBe(50);
    expect(state.fixAttempt).toBe(1);
    expect(state.fixTotal).toBe(2);
    expect(state.status).toBe('processing');
  });

  it('zustand store 的 setFailed 正确设置错误信息', () => {
    const store = useVideoGeneratingStore.getState();

    store.setFailed({
      errorCode: 'VIDEO_TTS_ALL_PROVIDERS_FAILED',
      errorMessage: '语音合成服务不可用',
      failedStage: 'tts',
      retryable: false,
    });

    const state = useVideoGeneratingStore.getState();

    expect(state.status).toBe('failed');
    expect(state.error?.errorCode).toBe('VIDEO_TTS_ALL_PROVIDERS_FAILED');
    expect(state.error?.failedStage).toBe('tts');
    expect(state.error?.retryable).toBe(false);
  });

  it('zustand store 的 restoreSnapshot 使用 typed 阶段字段恢复失败态', () => {
    const store = useVideoGeneratingStore.getState();

    store.restoreSnapshot(createSnapshot({
      status: 'failed',
      currentStage: 'manim_fix',
      stageLabel: 'video.stages.manim_fix',
      progress: 66,
      errorCode: 'TASK_PROVIDER_TIMEOUT',
      message: '修复阶段超时',
    }));

    const state = useVideoGeneratingStore.getState();

    expect(state.taskId).toBe('vtask_mock_text_001');
    expect(state.status).toBe('failed');
    expect(state.currentStage).toBe('manim_fix');
    expect(state.stageLabel).toBe('video.stages.manim_fix');
    expect(state.error).toMatchObject({
      errorCode: 'TASK_PROVIDER_TIMEOUT',
      errorMessage: '修复阶段超时',
      failedStage: 'manim_fix',
      retryable: false,
    });
    expect(state.hasHydratedRuntime).toBe(true);
  });

  it('zustand store 的 resetState 正确重置', () => {
    const store = useVideoGeneratingStore.getState();

    store.updateProgress({ progress: 50 });
    store.resetState('new_task');

    const state = useVideoGeneratingStore.getState();

    expect(state.taskId).toBe('new_task');
    expect(state.progress).toBe(0);
    expect(state.status).toBe('pending');
  });

  it('降级轮询标志正确切换', () => {
    const store = useVideoGeneratingStore.getState();

    store.setDegradedPolling(true);
    expect(useVideoGeneratingStore.getState().degradedToPolling).toBe(true);

    store.setDegradedPolling(false);
    expect(useVideoGeneratingStore.getState().degradedToPolling).toBe(false);
  });
});
