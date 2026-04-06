/**
 * 文件说明：SSE 断开后的 status 降级轮询 hook（Story 4.7）。
 * SSE 断开后启动 3s 间隔轮询 /api/v1/video/tasks/:id/status。
 * SSE 重新连接后自动停止轮询。使用 @tanstack/react-query 的 useQuery + refetchInterval。
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { createApiClient } from '@/services/api/client';
import { resolveFastapiBaseUrl } from '@/services/auth-consistency';
import { resolveRuntimeMode } from '@/services/api/adapters/base-adapter';
import type { TaskDataEnvelope } from '@/types/task';
import type { VideoPipelineStage } from '@/types/video';

import { useVideoGeneratingStore } from '../stores/video-generating-store';

/** Status 查询返回的快照结构。 */
interface VideoTaskStatusSnapshot {
  taskId: string;
  status: string;
  progress: number;
  message: string;
  errorCode: string | null;
  currentStage: VideoPipelineStage | null;
  stageLabel: string | null;
}

const POLLING_INTERVAL_MS = 3000;

const apiClient = createApiClient({ baseURL: resolveFastapiBaseUrl() });

/**
 * 查询视频任务状态快照。
 *
 * @param taskId - 任务 ID。
 * @returns 状态快照。
 */
async function fetchVideoTaskStatus(taskId: string): Promise<VideoTaskStatusSnapshot> {
  const response = await apiClient.request<TaskDataEnvelope<VideoTaskStatusSnapshot>>({
    url: `/api/v1/video/tasks/${taskId}/status`,
    method: 'get',
  });

  return response.data.data;
}

/**
 * SSE 断开后的降级轮询 hook。
 * 仅在 sseConnected === false 且任务未到终态时启用轮询。
 * 轮询结果映射到同一 zustand store，保持 UI 一致。
 *
 * @param taskId - 任务 ID。
 */
export function useVideoStatusPolling(taskId: string | undefined) {
  const sseConnected = useVideoGeneratingStore((s) => s.sseConnected);
  const status = useVideoGeneratingStore((s) => s.status);
  const store = useVideoGeneratingStore;

  const isTerminal = status === 'completed' || status === 'failed' || status === 'cancelled';
  const shouldPoll = !!taskId && !sseConnected && !isTerminal;

  const isMock = resolveRuntimeMode() === 'mock';

  const { data } = useQuery({
    queryKey: ['video', 'status-polling', taskId],
    queryFn: () => {
      if (isMock) {
        // mock 模式下从 MSW handler 获取数据
        return fetch(`${resolveFastapiBaseUrl()}/api/v1/video/tasks/${taskId}/status`)
          .then((r) => r.json() as Promise<TaskDataEnvelope<VideoTaskStatusSnapshot>>)
          .then((envelope) => envelope.data);
      }

      return fetchVideoTaskStatus(taskId!);
    },
    enabled: shouldPoll,
    refetchInterval: shouldPoll ? POLLING_INTERVAL_MS : false,
    retry: 1,
    staleTime: 0,
  });

  useEffect(() => {
    if (!data || !shouldPoll) {
      return;
    }

    const state = store.getState();

    state.setDegradedPolling(true);

    if (data.status === 'completed') {
      state.setCompleted();
      return;
    }

    if (data.status === 'failed') {
      state.setFailed({
        errorCode: data.errorCode,
        errorMessage: data.message,
        failedStage: data.currentStage,
        retryable: false,
      });
      return;
    }

    if (data.currentStage) {
      state.updateStage({
        currentStage: data.currentStage,
        stageLabel: data.stageLabel ?? data.currentStage,
        progress: data.progress,
      });
    } else {
      state.updateProgress({
        progress: data.progress,
        message: data.message,
      });
    }
  }, [data, shouldPoll, store]);

  // SSE 恢复连接后关闭降级标志
  useEffect(() => {
    if (sseConnected) {
      store.getState().setDegradedPolling(false);
    }
  }, [sseConnected, store]);
}
