/**
 * 文件说明：`useGenerationTask` 的核心用法验证。
 * 重点覆盖 SSE 事件压平、stageLabel 派生、completed/failed 回调、
 * 以及 snapshot 事件触发 degradedToPolling 标记。
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveTaskEventStream, type TaskEventStream } from '@/services/sse';
import type { TaskStreamEventPayload } from '@/types/task';

import { useGenerationTask } from './use-generation-task';

vi.mock('@/services/sse', () => ({
  resolveTaskEventStream: vi.fn(),
}));

const resolveTaskEventStreamMock = vi.mocked(resolveTaskEventStream);
const streamTaskEventsMock = vi.fn<TaskEventStream['streamTaskEvents']>();

async function* emit(events: TaskStreamEventPayload[]): AsyncGenerator<TaskStreamEventPayload> {
  await Promise.resolve();
  for (const e of events) yield e;
}

function payload(overrides: Partial<TaskStreamEventPayload>): TaskStreamEventPayload {
  return {
    id: overrides.id ?? 't:evt:000001',
    sequence: overrides.sequence ?? 1,
    event: overrides.event ?? 'progress',
    taskId: overrides.taskId ?? 't',
    requestId: overrides.requestId ?? null,
    taskType: overrides.taskType ?? 'classroom',
    status: overrides.status ?? 'processing',
    progress: overrides.progress ?? 0,
    message: overrides.message ?? '',
    timestamp: overrides.timestamp ?? '2026-04-24T00:00:00Z',
    stage: overrides.stage ?? null,
    currentStage: overrides.currentStage ?? null,
    stageLabel: overrides.stageLabel ?? null,
    stageProgress: overrides.stageProgress ?? null,
    errorCode: overrides.errorCode ?? null,
    context: overrides.context ?? {},
    ...overrides,
  };
}

describe('useGenerationTask', () => {
  beforeEach(() => {
    resolveTaskEventStreamMock.mockReset();
    streamTaskEventsMock.mockReset();
    resolveTaskEventStreamMock.mockReturnValue({ streamTaskEvents: streamTaskEventsMock });
  });

  it('flattens progress events into status/progress/stageLabel', async () => {
    streamTaskEventsMock.mockImplementation(() =>
      emit([
        payload({
          id: 't:evt:000001',
          sequence: 1,
          event: 'connected',
          status: 'pending',
          message: '',
        }),
        payload({
          id: 't:evt:000002',
          sequence: 2,
          event: 'progress',
          status: 'processing',
          progress: 42,
          message: '生成大纲中…',
          currentStage: 'generating_outline',
        }),
      ]),
    );

    const { result } = renderHook(() => useGenerationTask({ taskId: 't', module: 'classroom' }));

    await waitFor(() => expect(result.current.progress).toBe(42));
    expect(result.current.status).toBe('processing');
    expect(result.current.stageLabel).toBe('生成大纲中…');
    expect(result.current.sseConnected).toBe(true);
  });

  it('invokes onCompleted and reaches completed state', async () => {
    const onCompleted = vi.fn();
    streamTaskEventsMock.mockImplementation(() =>
      emit([
        payload({
          id: 't:evt:000001',
          sequence: 1,
          event: 'completed',
          status: 'completed',
          progress: 100,
          message: 'done',
        }),
      ]),
    );

    const { result } = renderHook(() =>
      useGenerationTask({ taskId: 't', module: 'classroom', onCompleted }),
    );

    await waitFor(() => expect(result.current.status).toBe('completed'));
    expect(result.current.progress).toBe(100);
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it('captures failure errorCode and invokes onFailed', async () => {
    const onFailed = vi.fn();
    streamTaskEventsMock.mockImplementation(() =>
      emit([
        payload({
          id: 't:evt:000001',
          sequence: 1,
          event: 'failed',
          status: 'failed',
          progress: 20,
          message: 'LLM timeout',
          errorCode: 'TASK_UNHANDLED_EXCEPTION',
        }),
      ]),
    );

    const { result } = renderHook(() =>
      useGenerationTask({ taskId: 't', module: 'classroom', onFailed }),
    );

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.error).toEqual({
      code: 'TASK_UNHANDLED_EXCEPTION',
      message: 'LLM timeout',
    });
    expect(onFailed).toHaveBeenCalledTimes(1);
  });

  it('marks degradedToPolling when a snapshot event arrives', async () => {
    streamTaskEventsMock.mockImplementation(() =>
      emit([
        payload({
          id: 't:evt:000001',
          sequence: 1,
          event: 'snapshot',
          status: 'processing',
          progress: 33,
          message: '轮询中',
          resumeFrom: 'resume-1',
        } as Partial<TaskStreamEventPayload>),
      ]),
    );

    const { result } = renderHook(() => useGenerationTask({ taskId: 't', module: 'classroom' }));

    await waitFor(() => expect(result.current.progress).toBe(33));
    expect(result.current.degradedToPolling).toBe(true);
  });

  it('does not subscribe when disabled', () => {
    streamTaskEventsMock.mockImplementation(() => emit([]));
    renderHook(() =>
      useGenerationTask({ taskId: 't', module: 'classroom', enabled: false }),
    );
    expect(streamTaskEventsMock).not.toHaveBeenCalled();
  });
});
