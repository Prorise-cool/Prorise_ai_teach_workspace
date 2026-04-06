/**
 * 文件说明：封装视频等待页任务状态快照查询 hook。
 * 页面 mount 时查询当前任务快照，用于恢复上下文或直接跳转终态页面。
 */
import { useQuery } from '@tanstack/react-query';

import { resolveTaskAdapter } from '@/services/api/adapters/task-adapter';
import type { TaskSnapshot } from '@/types/task';

/** 任务状态查询结果。 */
export interface VideoTaskStatusResult {
  /** 任务快照数据。 */
  snapshot: TaskSnapshot | null;
  /** 是否正在加载。 */
  isLoading: boolean;
  /** 查询是否出错。 */
  isError: boolean;
  /** 错误对象。 */
  error: Error | null;
  /** 是否为 404（任务不存在）。 */
  isNotFound: boolean;
}

/**
 * 查询视频任务当前状态快照。
 *
 * @param taskId - 任务 ID；为空时不发起查询。
 * @returns 任务状态查询结果。
 */
export function useVideoTaskStatus(taskId: string | undefined): VideoTaskStatusResult {
  const adapter = resolveTaskAdapter();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['video', 'task-status', taskId],
    queryFn: () => adapter.getTaskSnapshot(taskId!),
    enabled: !!taskId,
    staleTime: 0,
    retry: 1,
  });

  const isNotFound =
    isError &&
    error != null &&
    typeof error === 'object' &&
    'status' in error &&
    (error as { status: number }).status === 404;

  return {
    snapshot: data ?? null,
    isLoading,
    isError,
    error: error instanceof Error ? error : null,
    isNotFound,
  };
}
