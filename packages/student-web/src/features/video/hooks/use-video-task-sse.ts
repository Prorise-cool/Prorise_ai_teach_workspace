/**
 * 文件说明：封装视频等待页的 SSE 事件流消费 hook。
 * 使用 services/sse 统一 parser，将 SSE 事件映射为视频阶段进度状态。
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { GeneratingLogItem } from '@/components/generating/task-generating-view';
import { resolveTaskEventStream } from '@/services/sse';
import type { TaskErrorCode, TaskLifecycleStatus, TaskStreamEventPayload } from '@/types/task';

import { estimateEtaText, resolveVideoStage, VIDEO_STAGES } from '../config/video-stages';

/** SSE 驱动的视频等待页状态。 */
export interface VideoTaskSseState {
  /** 当前任务生命周期状态。 */
  status: TaskLifecycleStatus;
  /** 进度值（0–100）。 */
  progress: number;
  /** 当前阶段标题。 */
  stageTitle: string;
  /** 预估剩余时间文案。 */
  etaText: string;
  /** 日志条目列表。 */
  logs: GeneratingLogItem[];
  /** 错误码（仅 failed 时有值）。 */
  errorCode: TaskErrorCode | null;
  /** 错误消息（仅 failed 时有值）。 */
  errorMessage: string | null;
  /** SSE 是否已连接。 */
  connected: boolean;
}

const INITIAL_STATE: VideoTaskSseState = {
  status: 'pending',
  progress: 0,
  stageTitle: '准备生成视频',
  etaText: '初始化中，即将开始任务...',
  logs: [],
  errorCode: null,
  errorMessage: null,
  connected: false,
};

/**
 * 根据当前进度生成已完成阶段和当前阶段的日志条目。
 *
 * @param progress - 当前进度。
 * @returns 日志条目列表。
 */
function buildLogsFromProgress(progress: number): GeneratingLogItem[] {
  const currentStage = resolveVideoStage(progress);
  const logs: GeneratingLogItem[] = [];

  for (const stage of VIDEO_STAGES) {
    if (progress > stage.max) {
      logs.push({
        id: stage.key,
        status: 'success',
        text: `${stage.label}完成`,
        tag: stage.tag,
      });
    } else if (stage.key === currentStage.key) {
      logs.push({
        id: stage.key,
        status: 'pending',
        text: `正在${stage.label}...`,
        tag: stage.tag,
      });
    }
  }

  return logs;
}

/**
 * 消费任务 SSE 事件流并驱动等待页 UI 状态。
 *
 * @param taskId - 任务 ID；为空时不连接。
 * @param options - 可选配置。
 * @returns 等待页 SSE 状态与控制句柄。
 */
export function useVideoTaskSse(
  taskId: string | undefined,
  options?: { enabled?: boolean },
) {
  const [state, setState] = useState<VideoTaskSseState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const handleEvent = useCallback((event: TaskStreamEventPayload) => {
    setState((prev) => {
      const stage = resolveVideoStage(event.progress);

      if (event.event === 'connected') {
        return { ...prev, connected: true };
      }

      if (event.event === 'failed') {
        return {
          ...prev,
          status: 'failed',
          progress: event.progress,
          stageTitle: '生成失败',
          etaText: '',
          errorCode: event.errorCode ?? null,
          errorMessage: event.message,
          logs: [
            ...buildLogsFromProgress(event.progress),
            {
              id: 'failed',
              status: 'error',
              text: event.message || '任务执行失败',
            },
          ],
        };
      }

      if (event.event === 'cancelled') {
        return {
          ...prev,
          status: 'cancelled',
          progress: event.progress,
          stageTitle: '任务已取消',
          etaText: '',
          errorCode: event.errorCode ?? null,
          errorMessage: event.message,
          logs: [
            ...buildLogsFromProgress(event.progress),
            {
              id: 'cancelled',
              status: 'warning',
              text: '任务已取消',
            },
          ],
        };
      }

      if (event.event === 'completed') {
        const completedLogs = VIDEO_STAGES.map((s) => ({
          id: s.key,
          status: 'success' as const,
          text: `${s.label}完成`,
          tag: s.tag,
        }));

        return {
          ...prev,
          status: 'completed',
          progress: 100,
          stageTitle: '生成完毕',
          etaText: '正在跳转到结果页...',
          logs: completedLogs,
        };
      }

      if (event.event === 'provider_switch') {
        return {
          ...prev,
          logs: [
            ...prev.logs.filter((l) => l.id !== 'provider_switch'),
            {
              id: 'provider_switch',
              status: 'warning' as const,
              text: `服务切换：${event.reason || '正在切换到备用服务'}`,
            },
          ],
        };
      }

      // progress / snapshot / heartbeat
      return {
        ...prev,
        status: event.status,
        progress: event.progress,
        stageTitle: stage.label,
        etaText: estimateEtaText(event.progress),
        logs: buildLogsFromProgress(event.progress),
      };
    });
  }, []);

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
    setState(INITIAL_STATE);

    startStream(taskId, controller.signal).catch((err) => {
      if (controller.signal.aborted) {
        return;
      }

      setState((prev) => ({
        ...prev,
        status: 'failed',
        stageTitle: '连接失败',
        etaText: '',
        errorMessage: err instanceof Error ? err.message : 'SSE 连接异常',
        logs: [
          ...prev.logs,
          {
            id: 'connection_error',
            status: 'error',
            text: 'SSE 连接失败，请刷新页面重试',
          },
        ],
      }));
    });

    return () => {
      controller.abort();
      abortRef.current = null;
    };
  }, [taskId, options?.enabled, startStream]);

  return state;
}
