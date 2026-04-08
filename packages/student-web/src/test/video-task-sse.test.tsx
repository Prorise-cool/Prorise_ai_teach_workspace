/**
 * 文件说明：验证视频等待页 SSE hook 与 snapshot 恢复态之间的协作边界。
 * 重点覆盖已恢复快照时不应被 resetState 覆盖，以及切换任务时应显式重置。
 */
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVideoTaskSse } from '@/features/video/hooks/use-video-task-sse';
import { useVideoGeneratingStore } from '@/features/video/stores/video-generating-store';

const streamTaskEventsMock = vi.fn();

vi.mock('@/services/sse', () => ({
  resolveTaskEventStream: () => ({
    streamTaskEvents: (...args: unknown[]) => streamTaskEventsMock(...args),
  }),
}));

async function* createEmptyStream() {
  return;
}

describe('useVideoTaskSse', () => {
  beforeEach(() => {
    streamTaskEventsMock.mockReset();
    streamTaskEventsMock.mockImplementation(() => createEmptyStream());
    useVideoGeneratingStore.getState().resetState();
  });

  afterEach(() => {
    useVideoGeneratingStore.getState().resetState();
  });

  it('preserves snapshot-restored state for the same task', async () => {
    useVideoGeneratingStore.getState().restoreSnapshot({
      taskId: 'video-task-1',
      requestId: 'req-video-task-1',
      taskType: 'video',
      status: 'processing',
      progress: 48,
      message: 'snapshot restored',
      timestamp: '2026-04-08T09:00:00Z',
      currentStage: 'render',
      stageLabel: 'video.stages.render',
      stageProgress: 65,
      errorCode: null,
    });

    renderHook(() => useVideoTaskSse('video-task-1'));

    await waitFor(() => {
      expect(useVideoGeneratingStore.getState()).toMatchObject({
        taskId: 'video-task-1',
        progress: 48,
        currentStage: 'render',
        stageLabel: 'video.stages.render',
        hasHydratedRuntime: true,
      });
    });
  });

  it('resets state when switching to a different task id', async () => {
    useVideoGeneratingStore.getState().restoreSnapshot({
      taskId: 'video-task-1',
      requestId: 'req-video-task-1',
      taskType: 'video',
      status: 'processing',
      progress: 48,
      message: 'snapshot restored',
      timestamp: '2026-04-08T09:00:00Z',
      currentStage: 'render',
      stageLabel: 'video.stages.render',
      stageProgress: 65,
      errorCode: null,
    });

    renderHook(() => useVideoTaskSse('video-task-2'));

    await waitFor(() => {
      expect(useVideoGeneratingStore.getState()).toMatchObject({
        taskId: 'video-task-2',
        progress: 0,
        status: 'pending',
        currentStage: null,
        hasHydratedRuntime: false,
      });
    });
  });
});
