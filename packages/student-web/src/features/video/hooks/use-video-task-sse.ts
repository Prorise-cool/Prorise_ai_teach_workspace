/**
 * 文件说明：封装视频等待页的 SSE 事件流消费 hook（Story 4.7 重构）。
 * 使用 services/sse 统一 parser，将 SSE 事件映射到 zustand store。
 * 支持视频流水线专属 stage 字段和修复上下文。
 */
import { useCallback, useEffect, useRef } from 'react';

import { resolveTaskEventStream } from '@/services/sse';
import type { TaskStreamEventPayload } from '@/types/task';
import type { VideoPipelineStage } from '@/types/video';

import { useVideoGeneratingStore } from '../stores/video-generating-store';

/**
 * 从 SSE 事件中提取视频流水线扩展字段。
 * 使用运行时类型检查代替 unsafe cast，确保字段类型安全。
 *
 * @param event - SSE 事件 payload。
 * @returns 扩展字段对象。
 */
function extractPipelineFields(event: TaskStreamEventPayload) {
  const raw = event as unknown as Record<string, unknown>;
  const context =
    raw.context && typeof raw.context === 'object'
      ? (raw.context as Record<string, unknown>)
      : null;

  return {
    currentStage: typeof raw.currentStage === 'string' ? (raw.currentStage as VideoPipelineStage) : null,
    stageLabel: typeof raw.stageLabel === 'string' ? raw.stageLabel : null,
    stageProgress: typeof raw.stageProgress === 'number' ? raw.stageProgress : null,
    attemptNo: typeof context?.attemptNo === 'number' ? context.attemptNo : null,
    fixEvent: typeof context?.fixEvent === 'string' ? context.fixEvent : null,
    failure:
      context?.failure && typeof context.failure === 'object'
        ? (context.failure as Record<string, unknown>)
        : null,
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
      const failedStage = (pipeline.failure?.failedStage as VideoPipelineStage)
        ?? pipeline.currentStage
        ?? state.currentStage;

      state.setFailed({
        errorCode: event.errorCode ?? (pipeline.failure?.errorCode as string) ?? null,
        errorMessage: event.message ?? (pipeline.failure?.errorMessage as string) ?? null,
        failedStage: failedStage ?? null,
        retryable: (pipeline.failure?.retryable as boolean) ?? false,
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
      if (pipeline.currentStage) {
        state.updateStage({
          currentStage: pipeline.currentStage,
          stageLabel: pipeline.stageLabel ?? pipeline.currentStage,
          progress: event.progress,
          fixAttempt: pipeline.attemptNo ?? 0,
        });
      } else {
        state.updateProgress({
          progress: event.progress,
          message: event.message,
        });
      }
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
      const stream = resolveTaskEventStream();
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

    // 仅在 taskId 真正切换时执行 resetState；
    // 若 store 中已持有同一 taskId 且有 snapshot 恢复的数据（status 非初始值或 progress > 0），
    // 跳过 reset 以避免覆盖页面层已恢复的快照。
    const currentState = store.getState();
    const isSameTask = currentState.taskId === taskId;
    const hasRestoredSnapshot =
      isSameTask && (currentState.status !== 'pending' || currentState.progress > 0);

    if (!hasRestoredSnapshot) {
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
