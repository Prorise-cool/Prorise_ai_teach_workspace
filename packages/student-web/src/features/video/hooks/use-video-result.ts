/**
 * 文件说明：视频结果页数据获取 hook（Story 4.8）。
 * 使用 @tanstack/react-query 的 useQuery 获取视频任务结果。
 * 处理 loading（skeleton）、success、视频缺失、权限失败、加载失败。
 */
import { useQuery } from '@tanstack/react-query';

import {
  resolveVideoResultAdapter,
  type VideoResultData,
} from '@/services/api/adapters/video-result-adapter';

/** 结果页视图状态。 */
export type VideoResultViewStatus =
  | 'loading'
  | 'success'
  | 'deleted'
  | 'video-missing'
  | 'permission-denied'
  | 'error';

/** useVideoResult hook 返回值。 */
export interface VideoResultState {
  /** 结果数据。 */
  data: VideoResultData | null;
  /** 视图状态。 */
  viewStatus: VideoResultViewStatus;
  /** 是否正在加载。 */
  isLoading: boolean;
  /** 错误对象。 */
  error: Error | null;
  /** 重试函数。 */
  refetch: () => void;
}

export interface UseVideoResultOptions {
  /** 是否为匿名公开详情页。 */
  publicView?: boolean;
}

/**
 * 判断错误对象是否包含 HTTP status 码。
 *
 * @param err - 未知错误。
 * @returns 是否为带 status 的 Error。
 */
function hasStatusCode(err: unknown): err is Error & { status: number } {
  return err instanceof Error && typeof (err as unknown as Record<string, unknown>).status === 'number';
}

/**
 * 查询视频任务结果，支持缓存与重新验证。
 *
 * @param taskId - 任务 ID 或公开 resultId；为空时不发起查询。
 * @param options - 查询模式配置。
 * @returns 结果页状态。
 */
export function useVideoResult(
  taskId: string | undefined,
  options: UseVideoResultOptions = {},
): VideoResultState {
  const adapter = resolveVideoResultAdapter();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['video', options.publicView ? 'public-result' : 'result', taskId],
    queryFn: () =>
      options.publicView ? adapter.getPublicResult(taskId!) : adapter.getResult(taskId!),
    enabled: !!taskId,
    staleTime: 5 * 60 * 1000, // 5 分钟
    retry: 1,
  });

  let viewStatus: VideoResultViewStatus = 'loading';

  if (isLoading) {
    viewStatus = 'loading';
  } else if (error) {
    if (hasStatusCode(error) && error.status === 403) {
      viewStatus = 'permission-denied';
    } else {
      viewStatus = 'error';
    }
  } else if (data) {
    const status = String(data.status ?? '').toLowerCase();
    const summary = String((data.result as { summary?: string } | null | undefined)?.summary ?? '');
    const isDeleted =
      status === 'deleted' ||
      status === 'cancelled' ||
      status === 'canceled' ||
      summary === '任务已删除';
    if (isDeleted) {
      viewStatus = 'deleted';
    } else if (data.result && data.result.videoUrl) {
      viewStatus = 'success';
    } else if (data.status === 'completed' && (!data.result || !data.result.videoUrl)) {
      viewStatus = 'video-missing';
    } else if (data.status === 'failed') {
      viewStatus = 'error';
    } else {
      viewStatus = 'loading';
    }
  }

  return {
    data: data ?? null,
    viewStatus,
    isLoading,
    error: error instanceof Error ? error : null,
    refetch: () => {
      void refetch();
    },
  };
}
