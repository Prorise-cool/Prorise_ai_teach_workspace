/**
 * 文件说明：验证视频等待页 SSE hook 与 snapshot 恢复态之间的协作边界。
 * 重点覆盖已恢复快照时不应被 resetState 覆盖，以及切换任务时应显式重置。
 */
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVideoTaskSse } from '@/features/video/hooks/use-video-task-sse';
import { useVideoGeneratingStore } from '@/features/video/stores/video-generating-store';
import { resolveTaskEventStream, type TaskEventStream } from '@/services/sse';
import type { TaskStreamEventPayload } from '@/types/task';

vi.mock('@/services/sse', () => ({
  resolveTaskEventStream: vi.fn(),
}));

const resolveTaskEventStreamMock = vi.mocked(resolveTaskEventStream);
const streamTaskEventsMock = vi.fn<TaskEventStream['streamTaskEvents']>();
const emptyEvents: TaskStreamEventPayload[] = [];

async function* createEmptyStream(): AsyncGenerator<TaskStreamEventPayload, void, unknown> {
  await Promise.resolve();
  yield* emptyEvents;
}

async function* createEventStream(
  events: TaskStreamEventPayload[],
): AsyncGenerator<TaskStreamEventPayload, void, unknown> {
  await Promise.resolve();
  yield* events;
}

describe('useVideoTaskSse', () => {
  beforeEach(() => {
    resolveTaskEventStreamMock.mockReset();
    streamTaskEventsMock.mockReset();
    streamTaskEventsMock.mockImplementation(() => createEmptyStream());
    resolveTaskEventStreamMock.mockReturnValue({
      streamTaskEvents: streamTaskEventsMock,
    });
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

  it('hydrates preview signals and section-level progress from SSE events', async () => {
    streamTaskEventsMock.mockImplementation(() =>
      createEventStream([
        {
          id: 'video-task-3:evt:000001',
          sequence: 1,
          event: 'connected',
          taskId: 'video-task-3',
          requestId: 'req-video-task-3',
          taskType: 'video',
          status: 'processing',
          progress: 10,
          message: 'connected',
          timestamp: '2026-04-16T10:00:00Z',
        },
        {
          id: 'video-task-3:evt:000002',
          sequence: 2,
          event: 'section_progress',
          taskId: 'video-task-3',
          requestId: 'req-video-task-3',
          taskType: 'video',
          status: 'processing',
          progress: 42,
          message: 'section rendering',
          timestamp: '2026-04-16T10:00:10Z',
          currentStage: 'render',
          stageLabel: 'video.stages.render',
          context: {
            previewAvailable: true,
            previewVersion: 2,
            totalSections: 3,
            sectionId: 'section_2',
            sectionIndex: 1,
            sectionStatus: 'rendering',
          },
        },
        {
          id: 'video-task-3:evt:000003',
          sequence: 3,
          event: 'section_ready',
          taskId: 'video-task-3',
          requestId: 'req-video-task-3',
          taskType: 'video',
          status: 'processing',
          progress: 58,
          message: 'section ready',
          timestamp: '2026-04-16T10:00:20Z',
          currentStage: 'render',
          stageLabel: 'video.stages.render',
          context: {
            previewAvailable: true,
            previewVersion: 3,
            totalSections: 3,
            sectionId: 'section_2',
            sectionIndex: 1,
            sectionStatus: 'ready',
            clipUrl: 'https://static.prorise.test/clip-2.mp4',
          },
        },
      ]));

    renderHook(() => useVideoTaskSse('video-task-3'));

    await waitFor(() => {
      expect(useVideoGeneratingStore.getState()).toMatchObject({
        taskId: 'video-task-3',
        sseConnected: true,
        previewAvailable: true,
        previewVersion: 3,
        totalSections: 3,
        currentStage: 'render',
        progress: 58,
      });
    });

    expect(useVideoGeneratingStore.getState().sections).toEqual([
      expect.objectContaining({
        sectionId: 'section_2',
        sectionIndex: 1,
        status: 'ready',
        clipUrl: 'https://static.prorise.test/clip-2.mp4',
      }),
    ]);
  });
});
