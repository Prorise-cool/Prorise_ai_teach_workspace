/**
 * 文件说明：统一的任务生成等待 hook，服务于视频 & 课堂等需要实时 SSE
 * 进度 + 断线降级轮询的"等待页"场景。
 *
 * 设计要点（Phase 3）：
 * - 走已有的 `resolveTaskEventStream({ module })`，SSE 失败后内部自动
 *   退化到 `getTaskSnapshot` 轮询（由 `real-stream.ts` 托管）。
 * - 对外暴露 `status / progress / stageLabel / logs / error /
 *   degradedToPolling` 五个稳定字段，与 `TaskGeneratingShell` 对齐。
 * - `lifecycleStatus` 是等待页组件可直接消费的四值（pending/processing/
 *   completed/failed），不暴露底层 `TaskLifecycleStatus` 的 `cancelled`
 *   细节给 UI 层。
 */
import { useEffect, useRef, useState } from 'react';

import { resolveTaskEventStream } from '@/services/sse';
import type { TaskLifecycleStatus, TaskStreamEventPayload } from '@/types/task';

export type GenerationTaskModule = 'video' | 'classroom';

export type GenerationTaskLifecycle = 'pending' | 'processing' | 'completed' | 'failed';

export interface GenerationTaskLog {
  id: string;
  label: string;
  timestamp: number;
}

export interface UseGenerationTaskOptions {
  /** 任务 id，为空或 undefined 时 hook 不做任何事。 */
  taskId: string | undefined;
  /** 业务模块，决定后端路由前缀。 */
  module: GenerationTaskModule;
  /** 设为 false 可临时禁用 SSE 订阅（比如路由未就绪）。 */
  enabled?: boolean;
  /** 把 stream payload 映射为展示文案；缺省用 `message` / `stageLabel`。 */
  mapStageLabel?: (event: TaskStreamEventPayload) => string | null;
  /** 把事件转为一条可见日志条目。返回 null 表示忽略。 */
  mapLog?: (event: TaskStreamEventPayload) => GenerationTaskLog | null;
  /** 完成事件到外部的回调（例如触发 navigate）。 */
  onCompleted?: (event: TaskStreamEventPayload) => void;
  /** 失败事件到外部的回调。 */
  onFailed?: (event: TaskStreamEventPayload) => void;
}

export interface UseGenerationTaskResult {
  status: GenerationTaskLifecycle;
  progress: number;
  stageLabel: string;
  logs: GenerationTaskLog[];
  error: {
    code: string | null;
    message: string | null;
  } | null;
  /** SSE 断开降级到轮询时置 true（前端可显示「网络较慢，轮询中」）。 */
  degradedToPolling: boolean;
  /** SSE 通道是否已建立（connected 事件触发后为 true）。 */
  sseConnected: boolean;
}

const LOG_MAX = 50;
const TERMINAL_STATUSES: ReadonlySet<TaskLifecycleStatus> = new Set([
  'completed',
  'failed',
  'cancelled',
]);

function lifecycleFromStatus(status: TaskLifecycleStatus | undefined): GenerationTaskLifecycle {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'failed':
    case 'cancelled':
      return 'failed';
    case 'processing':
      return 'processing';
    default:
      return 'pending';
  }
}

function defaultMapStageLabel(event: TaskStreamEventPayload): string | null {
  return event.stageLabel ?? event.message ?? event.currentStage ?? event.stage ?? null;
}

function defaultMapLog(event: TaskStreamEventPayload): GenerationTaskLog | null {
  if (event.event === 'heartbeat' || event.event === 'connected') {
    return null;
  }
  const label = event.stageLabel ?? event.message ?? event.currentStage ?? event.stage;
  if (!label) {
    return null;
  }
  return {
    id: event.id ?? `evt-${event.sequence}`,
    label,
    timestamp: Date.now(),
  };
}

/**
 * 订阅任务 SSE，并把事件压平为等待页组件需要的最小状态。
 */
export function useGenerationTask(options: UseGenerationTaskOptions): UseGenerationTaskResult {
  const { taskId, module, enabled = true, onCompleted, onFailed } = options;
  // 用 ref 承接可选映射器，避免外部每次 render 重建函数引用触发 effect 重连。
  const mapStageLabelRef = useRef(options.mapStageLabel ?? defaultMapStageLabel);
  const mapLogRef = useRef(options.mapLog ?? defaultMapLog);
  mapStageLabelRef.current = options.mapStageLabel ?? defaultMapStageLabel;
  mapLogRef.current = options.mapLog ?? defaultMapLog;

  const [state, setState] = useState<UseGenerationTaskResult>({
    status: 'pending',
    progress: 0,
    stageLabel: '',
    logs: [],
    error: null,
    degradedToPolling: false,
    sseConnected: false,
  });
  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);
  onCompletedRef.current = onCompleted;
  onFailedRef.current = onFailed;

  useEffect(() => {
    if (!taskId || !enabled) {
      return;
    }

    setState({
      status: 'pending',
      progress: 0,
      stageLabel: '',
      logs: [],
      error: null,
      degradedToPolling: false,
      sseConnected: false,
    });

    const controller = new AbortController();
    let cancelled = false;

    async function consume() {
      const stream = resolveTaskEventStream({ module });
      const iterable = stream.streamTaskEvents(taskId as string, {
        signal: controller.signal,
      });

      for await (const event of iterable) {
        if (cancelled) {
          break;
        }
        applyEvent(event);
      }
    }

    function applyEvent(event: TaskStreamEventPayload) {
      // snapshot 事件代表轮询回退拿到的快照，置降级标记。
      const isSnapshot = event.event === 'snapshot';

      setState((prev) => {
        const log = mapLogRef.current(event);
        const nextLogs = log
          ? [...prev.logs.slice(-LOG_MAX + 1), log]
          : prev.logs;

        if (event.event === 'connected') {
          return { ...prev, sseConnected: true };
        }

        if (event.event === 'heartbeat') {
          return prev;
        }

        const nextProgress =
          typeof event.progress === 'number' && Number.isFinite(event.progress)
            ? Math.max(0, Math.min(100, event.progress))
            : prev.progress;
        const nextStageLabel = mapStageLabelRef.current(event) ?? prev.stageLabel;

        if (event.event === 'failed' || event.status === 'failed') {
          return {
            ...prev,
            status: 'failed',
            progress: nextProgress,
            stageLabel: nextStageLabel,
            logs: nextLogs,
            error: {
              code: event.errorCode ?? null,
              message: event.message ?? nextStageLabel ?? null,
            },
            degradedToPolling: isSnapshot || prev.degradedToPolling,
          };
        }

        if (event.event === 'cancelled' || event.status === 'cancelled') {
          return {
            ...prev,
            status: 'failed',
            progress: nextProgress,
            stageLabel: nextStageLabel,
            logs: nextLogs,
            error: {
              code: event.errorCode ?? 'TASK_CANCELLED',
              message: event.message ?? '任务已取消',
            },
            degradedToPolling: isSnapshot || prev.degradedToPolling,
          };
        }

        if (event.event === 'completed' || event.status === 'completed') {
          return {
            ...prev,
            status: 'completed',
            progress: 100,
            stageLabel: nextStageLabel,
            logs: nextLogs,
            error: null,
            degradedToPolling: isSnapshot || prev.degradedToPolling,
          };
        }

        return {
          ...prev,
          status: lifecycleFromStatus(event.status),
          progress: nextProgress,
          stageLabel: nextStageLabel,
          logs: nextLogs,
          degradedToPolling: isSnapshot || prev.degradedToPolling,
        };
      });

      if (event.event === 'completed' || event.status === 'completed') {
        onCompletedRef.current?.(event);
      } else if (
        event.event === 'failed' ||
        event.event === 'cancelled' ||
        event.status === 'failed' ||
        event.status === 'cancelled'
      ) {
        onFailedRef.current?.(event);
      }

      // 终态后不需要继续处理（iterator 也会自然终止）。
      if (TERMINAL_STATUSES.has(event.status)) {
        cancelled = true;
      }
    }

    consume().catch((err) => {
      if (cancelled || controller.signal.aborted) {
        return;
      }
      setState((prev) => ({
        ...prev,
        status: 'failed',
        error: {
          code: null,
          message: err instanceof Error ? err.message : String(err),
        },
      }));
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [taskId, module, enabled]);

  return state;
}
