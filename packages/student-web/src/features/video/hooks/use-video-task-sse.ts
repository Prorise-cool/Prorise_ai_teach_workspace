/**
 * 文件说明：封装视频等待页的 SSE 事件流消费 hook。
 * 继续复用统一 SSE parser，同时识别 preview 信号与 section 级事件。
 */
import { useCallback, useEffect, useRef } from 'react';

import {
  readBooleanProperty,
  readNumberProperty,
  readRecord,
  readStringProperty,
} from '@/lib/type-guards';
import { resolveTaskEventStream } from '@/services/sse';
import type { TaskStreamEventPayload } from '@/types/task';
import {
  isVideoPipelineStage,
  isVideoPreviewSectionStatus,
} from '@/types/video';

import { useVideoGeneratingStore } from '../stores/video-generating-store';

function extractPipelineFields(event: TaskStreamEventPayload) {
  const context = readRecord(event.context) ?? null;
  const currentStage = event.currentStage ?? event.stage ?? null;
  const fixAttempt = context
    ? readNumberProperty(context, 'fixAttempt') ?? readNumberProperty(context, 'attemptNo')
    : undefined;

  return {
    currentStage: isVideoPipelineStage(currentStage) ? currentStage : null,
    stageLabel: typeof event.stageLabel === 'string' ? event.stageLabel : null,
    previewAvailable: context ? readBooleanProperty(context, 'previewAvailable') : undefined,
    previewVersion: context ? readNumberProperty(context, 'previewVersion') : undefined,
    sectionId: context ? readStringProperty(context, 'sectionId') : undefined,
    sectionIndex: context ? readNumberProperty(context, 'sectionIndex') : undefined,
    totalSections: context ? readNumberProperty(context, 'totalSections') : undefined,
    sectionStatus:
      context && isVideoPreviewSectionStatus(context.sectionStatus)
        ? context.sectionStatus
        : undefined,
    clipUrl: context ? readStringProperty(context, 'clipUrl') : undefined,
    errorMessage: context ? readStringProperty(context, 'errorMessage') : undefined,
    fixAttempt,
    maxFixAttempts: context ? readNumberProperty(context, 'maxFixAttempts') : undefined,
    failure: context ? readRecord(context.failure) ?? null : null,
  };
}

export function useVideoTaskSse(
  taskId: string | undefined,
  options?: { enabled?: boolean },
) {
  const abortRef = useRef<AbortController | null>(null);
  const store = useVideoGeneratingStore;

  const handleEvent = useCallback((event: TaskStreamEventPayload) => {
    const pipeline = extractPipelineFields(event);
    const state = store.getState();

    if (pipeline.previewAvailable !== undefined || pipeline.previewVersion !== undefined) {
      state.setPreviewSignal({
        previewAvailable: pipeline.previewAvailable,
        previewVersion: pipeline.previewVersion,
        totalSections: pipeline.totalSections,
      });
    }

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
          (typeof pipeline.failure?.errorCode === 'string' ? pipeline.failure.errorCode : null),
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

    if (pipeline.currentStage) {
      state.updateStage({
        currentStage: pipeline.currentStage,
        stageLabel: pipeline.stageLabel ?? pipeline.currentStage,
        progress: event.progress,
        fixAttempt: pipeline.fixAttempt,
        fixTotal: pipeline.maxFixAttempts,
      });
    } else {
      state.updateProgress({
        progress: event.progress,
        currentStage: state.currentStage,
        stageLabel: pipeline.stageLabel ?? state.stageLabel,
      });
    }

    if (pipeline.sectionId) {
      state.upsertSection({
        sectionId: pipeline.sectionId,
        sectionIndex: pipeline.sectionIndex,
        totalSections: pipeline.totalSections,
        status: pipeline.sectionStatus,
        clipUrl: pipeline.clipUrl,
        errorMessage: pipeline.errorMessage,
        fixAttempt: pipeline.fixAttempt ?? null,
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
      currentState.resetState(taskId);
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
