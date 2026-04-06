/**
 * 文件说明：验证视频等待页对任务快照、zustand store 状态、失败态与终态跳转的编排行为。
 * Story 4.7 重构：状态由 zustand store 驱动，SSE hook 不再返回状态。
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppProvider } from '@/app/provider/app-provider';
import type { VideoTaskStatusResult } from '@/features/video/hooks/use-video-task-status';
import { VideoGeneratingPage } from '@/features/video/pages/video-generating-page';
import { useVideoGeneratingStore } from '@/features/video/stores/video-generating-store';
import type { TaskSnapshot } from '@/types/task';

const useVideoTaskStatusMock = vi.fn();
const useVideoTaskSseMock = vi.fn();
const useVideoStatusPollingMock = vi.fn();

vi.mock('@/features/video/hooks/use-video-task-status', () => ({
  useVideoTaskStatus: (...args: unknown[]) => useVideoTaskStatusMock(...args),
}));

vi.mock('@/features/video/hooks/use-video-task-sse', () => ({
  useVideoTaskSse: (...args: unknown[]) => useVideoTaskSseMock(...args),
}));

vi.mock('@/features/video/hooks/use-video-status-polling', () => ({
  useVideoStatusPolling: (...args: unknown[]) => useVideoStatusPollingMock(...args),
}));

function createSnapshot(overrides: Partial<TaskSnapshot> = {}): TaskSnapshot {
  return {
    taskId: 'vtask_mock_text_001',
    requestId: 'req_video_001',
    taskType: 'video',
    status: 'processing',
    progress: 42,
    message: '任务处理中状态已同步',
    timestamp: '2026-04-06T12:00:00Z',
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

describe('VideoGeneratingPage', () => {
  beforeEach(() => {
    useVideoTaskStatusMock.mockReset();
    useVideoTaskSseMock.mockReset();
    useVideoStatusPollingMock.mockReset();
    useVideoTaskStatusMock.mockReturnValue(createStatusResult());
    useVideoGeneratingStore.getState().resetState('vtask_mock_text_001');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('使用 status 快照承接任务上下文，并以 enabled=true 启动 SSE', async () => {
    const router = createGeneratingRouter();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>,
    );

    expect(useVideoTaskStatusMock).toHaveBeenCalledWith('vtask_mock_text_001');
    expect(useVideoTaskSseMock).toHaveBeenCalledWith('vtask_mock_text_001', {
      enabled: true,
    });
  });

  it('当 zustand store 有进度数据时渲染阶段与进度', async () => {
    // 先设置 store 状态
    act(() => {
      useVideoGeneratingStore.getState().updateStage({
        currentStage: 'tts',
        stageLabel: '生成旁白',
        progress: 75,
      });
    });

    const router = createGeneratingRouter();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>,
    );

    expect(screen.getByText('生成旁白')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('在失败态展示可读错误信息和操作按钮', async () => {
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

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>,
    );

    expect(screen.getByText('动画渲染失败')).toBeInTheDocument();
    expect(screen.getByText('动画渲染超时，请稍后重试')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重新生成/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /返回输入页/ })).toBeInTheDocument();
  });

  it('在 taskId 无效时展示 404 提示', async () => {
    useVideoTaskStatusMock.mockReturnValue(
      createStatusResult({
        snapshot: null,
        isError: true,
        error: Object.assign(new Error('not found'), { status: 404 }),
        isNotFound: true,
      }),
    );
    const router = createGeneratingRouter();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>,
    );

    expect(screen.getByText('任务不存在')).toBeInTheDocument();
  });

  it('在完成态延迟跳转到结果页', async () => {
    vi.useFakeTimers();

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

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(router.state.location.pathname).toBe('/video/vtask_mock_text_001');
  });

  it('zustand store 的 updateStage 正确更新状态', () => {
    const store = useVideoGeneratingStore.getState();

    store.updateStage({
      currentStage: 'manim_fix',
      stageLabel: '修复动画脚本',
      progress: 50,
      fixAttempt: 1,
      fixTotal: 2,
    });

    const state = useVideoGeneratingStore.getState();

    expect(state.currentStage).toBe('manim_fix');
    expect(state.stageLabel).toBe('修复动画脚本');
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
