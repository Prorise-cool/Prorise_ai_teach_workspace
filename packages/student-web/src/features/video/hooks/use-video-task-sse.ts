/**
 * 文件说明：封装视频等待页的 SSE 事件流消费 hook（Story 4.7 重构）。
 * 使用 services/sse 统一 parser，将 SSE 事件映射到 zustand store。
 * 支持视频流水线专属 stage 字段和修复上下文。
 */
import { useCallback, useEffect, useRef } from 'react';

import { readRecord } from '@/lib/type-guards';
import { resolveTaskEventStream } from '@/services/sse';
import type { TaskStreamEventPayload } from '@/types/task';
import {
  isVideoPipelineStage,
} from '@/types/video';

import { useVideoGeneratingStore } from '../stores/video-generating-store';

/**
 * 从 SSE 事件中提取视频流水线扩展字段。
 * 使用运行时类型检查代替 unsafe cast，确保字段类型安全。
 *
 * @param event - SSE 事件 payload。
 * @returns 扩展字段对象。
 */
function extractPipelineFields(event: TaskStreamEventPayload) {
  const context = readRecord(event.context) ?? null;
  const currentStage = event.currentStage ?? event.stage ?? null;

  return {
    currentStage: isVideoPipelineStage(currentStage) ? currentStage : null,
    stageLabel: typeof event.stageLabel === 'string' ? event.stageLabel : null,
    stageProgress: typeof event.stageProgress === 'number' ? event.stageProgress : null,
    attemptNo: typeof context?.attemptNo === 'number' ? context.attemptNo : null,
    fixEvent: typeof context?.fixEvent === 'string' ? context.fixEvent : null,
    failure:
      readRecord(context?.failure) ?? null,
  };
}

/**
 * 消费任务 SSE 事件流并驱动 zustand store 状态。
 *
 * @param taskId - 任务 ID；为空时不连接。
 * @param options - 可选配置。
 */
export function useVideoTaskSse(
  taskId: string | undefined,
  options?: { enabled?: boolean },
) {
  const abortRef = useRef<AbortController | null>(null);
  const store = useVideoGeneratingStore;

  const handleEvent = useCallback((event: TaskStreamEventPayload) => {
    const pipeline = extractPipelineFields(event);
    const state = store.getState();

    if (event.event === 'connected') {
      state.setSseConnected(true);
      return;
    }

    if (event.event === 'failed') {
      const rawFailedStage = pipeline.failure?.failedStage;
      const failedStage = isVideoPipelineStage(rawFailedStage)
        ? rawFailedStage
        : pipeline.currentStage ?? state.currentStage;

      state.setFailed({
        errorCode:
          event.errorCode ??
          (typeof pipeline.failure?.errorCode === 'string'
            ? pipeline.failure.errorCode
            : null),
        errorMessage:
          event.message ??
          (typeof pipeline.failure?.errorMessage === 'string'
            ? pipeline.failure.errorMessage
            : null),
        failedStage: failedStage ?? null,
        retryable:
          typeof pipeline.failure?.retryable === 'boolean'
            ? pipeline.failure.retryable
            : false,
      });
      return;
    }

    if (event.event === 'completed') {
      state.setCompleted();
      return;
    }

    if (event.event === 'cancelled') {
      state.setFailed({
        errorCode: event.errorCode ?? 'TASK_CANCELLED',
        errorMessage: event.message ?? '任务已取消',
        failedStage: null,
        retryable: false,
      });
      return;
    }

    if (event.event === 'snapshot') {
      state.restoreSnapshot(event);
      return;
    }

    // progress / heartbeat / provider_switch
    if (pipeline.currentStage) {
      state.updateStage({
        currentStage: pipeline.currentStage,
        stageLabel: pipeline.stageLabel ?? pipeline.currentStage,
        progress: event.progress,
        fixAttempt: pipeline.attemptNo ?? undefined,
      });
    } else {
      state.updateProgress({
        progress: event.progress,
        message: event.message,
      });
    }
  }, [store]);

  const startStream = useCallback(
    async (id: string, signal: AbortSignal) => {
      const stream = resolveTaskEventStream({ module: 'video' });
      const iterable = stream.streamTaskEvents(id, { signal });

      for await (const event of iterable) {
        if (signal.aborted) {
          break;
        }

        handleEvent(event);
      }
    },
    [handleEvent],
  );

  useEffect(() => {
    const enabled = options?.enabled ?? true;

    if (!taskId || !enabled) {
      return;
    }

    const controller = new AbortController();

    abortRef.current = controller;

    const currentState = store.getState();
    if (currentState.taskId !== taskId || !currentState.hasHydratedRuntime) {
      store.getState().resetState(taskId);
    }

    startStream(taskId, controller.signal).catch((err) => {
      if (controller.signal.aborted) {
        return;
      }

      store.getState().setFailed({
        errorCode: null,
        errorMessage: err instanceof Error ? err.message : 'SSE 连接异常',
        failedStage: null,
        retryable: true,
      });
      store.getState().setSseConnected(false);
    });

    return () => {
      controller.abort();
      abortRef.current = null;
    };
  }, [taskId, options?.enabled, startStream, store]);
}
