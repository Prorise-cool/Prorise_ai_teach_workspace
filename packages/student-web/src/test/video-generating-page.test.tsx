/**
 * 文件说明：验证视频等待页对任务快照、SSE 状态、失败态与终态跳转的编排行为。
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppProvider } from '@/app/provider/app-provider';
import type { VideoTaskSseState } from '@/features/video/hooks/use-video-task-sse';
import type { VideoTaskStatusResult } from '@/features/video/hooks/use-video-task-status';
import { VideoGeneratingPage } from '@/features/video/pages/video-generating-page';
import type { TaskSnapshot } from '@/types/task';

const useVideoTaskStatusMock = vi.fn();
const useVideoTaskSseMock = vi.fn();

vi.mock('@/features/video/hooks/use-video-task-status', () => ({
  useVideoTaskStatus: (...args: unknown[]) => useVideoTaskStatusMock(...args),
}));

vi.mock('@/features/video/hooks/use-video-task-sse', () => ({
  useVideoTaskSse: (...args: unknown[]) => useVideoTaskSseMock(...args),
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

function createSseState(
  overrides: Partial<VideoTaskSseState> = {},
): VideoTaskSseState {
  return {
    status: 'pending',
    progress: 0,
    stageTitle: '题目理解与知识库检索',
    etaText: '初始化中，即将开始任务...',
    logs: [],
    errorCode: null,
    errorMessage: null,
    connected: false,
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
    useVideoTaskStatusMock.mockReturnValue(createStatusResult());
    useVideoTaskSseMock.mockReturnValue(createSseState());
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
    expect(
      screen.getByText('动画生成'),
    ).toBeInTheDocument();
    expect(screen.getByText('预计还需要 2 分钟')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('在存在 SSE 实时数据时优先渲染 SSE 阶段与日志', async () => {
    useVideoTaskStatusMock.mockReturnValue(
      createStatusResult({
        snapshot: createSnapshot({
          progress: 12,
        }),
      }),
    );
    useVideoTaskSseMock.mockReturnValue(
      createSseState({
        status: 'processing',
        progress: 65,
        stageTitle: '语音合成',
        etaText: '预计还需要 1 分钟',
        connected: true,
        logs: [
          {
            id: 'tts',
            status: 'pending',
            text: '语音轨道生成中',
          },
        ],
      }),
    );
    const router = createGeneratingRouter();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>,
    );

    expect(screen.getByText('语音合成')).toBeInTheDocument();
    expect(screen.getByText('预计还需要 1 分钟')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('语音轨道生成中')).toBeInTheDocument();
  });

  it('在失败态展示可读错误信息，并支持返回输入页重试', async () => {
    const user = userEvent.setup();
    useVideoTaskStatusMock.mockReturnValue(
      createStatusResult({
        snapshot: createSnapshot({
          status: 'failed',
          progress: 87,
          message: '任务执行失败',
          errorCode: 'TASK_PROVIDER_TIMEOUT',
        }),
      }),
    );
    const router = createGeneratingRouter();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>,
    );

    expect(useVideoTaskSseMock).toHaveBeenCalledWith('vtask_mock_text_001', {
      enabled: false,
    });
    expect(screen.getByText('生成失败')).toBeInTheDocument();
    expect(
      screen.getByText('AI 服务响应超时，请稍后重试'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重新生成' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/video/input');
      expect(router.state.location.search).toBe('?retry=1');
    });
  });

  it('在 taskId 无效时展示 404 提示，并支持返回输入页', async () => {
    const user = userEvent.setup();
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

    expect(useVideoTaskSseMock).toHaveBeenCalledWith('vtask_mock_text_001', {
      enabled: false,
    });
    expect(screen.getByText('任务不存在')).toBeInTheDocument();
    expect(
      screen.getByText(
        '任务 vtask_mock_text_001 不存在或已过期，请返回重新创建',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '返回输入页' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/video/input');
    });
  });

  it('在完成态延迟跳转到结果页', async () => {
    vi.useFakeTimers();
    useVideoTaskStatusMock.mockReturnValue(
      createStatusResult({
        snapshot: createSnapshot({
          status: 'completed',
          progress: 100,
          message: '任务执行完成',
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
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(router.state.location.pathname).toBe('/video/vtask_mock_text_001');
  });
});
