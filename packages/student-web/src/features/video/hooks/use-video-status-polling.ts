/**
 * 文件说明：SSE 断开后的 status 降级轮询 hook（Story 4.7）。
 * SSE 断开后启动 3s 间隔轮询任务状态快照。
 * 统一通过 task-adapter 获取快照，不再区分 mock / real 或自行构造请求。
 * SSE 重新连接后自动停止轮询。使用 @tanstack/react-query 的 useQuery + refetchInterval。
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { resolveTaskAdapter } from '@/services/api/adapters/task-adapter';
import type { VideoPipelineStage } from '@/types/video';

import { useVideoGeneratingStore } from '../stores/video-generating-store';

/** Status 查询返回的快照结构（从 TaskSnapshot 中提取轮询所需字段）。 */
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

/**
 * 通过 task-adapter 查询视频任务状态快照。
 * adapter 内部已统一 mock / real 分支与 API 路径。
 *
 * @param taskId - 任务 ID。
 * @returns 状态快照。
 */
async function fetchVideoTaskStatus(taskId: string): Promise<VideoTaskStatusSnapshot> {
  const adapter = resolveTaskAdapter({ module: 'video' });
  const snapshot = await adapter.getTaskSnapshot(taskId);

  return {
    taskId: snapshot.taskId,
    status: snapshot.status,
    progress: snapshot.progress,
    message: snapshot.message,
    errorCode: snapshot.errorCode ?? null,
    currentStage: (snapshot.stage as VideoPipelineStage) ?? null,
    stageLabel: snapshot.stage ?? null,
  };
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

  const { data } = useQuery({
    queryKey: ['video', 'status-polling', taskId],
    queryFn: () => fetchVideoTaskStatus(taskId!),
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
