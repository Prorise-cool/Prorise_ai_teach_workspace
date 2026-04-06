/**
 * 文件说明：视频结果页数据获取 hook（Story 4.8）。
 * 使用 @tanstack/react-query 的 useQuery 获取视频任务结果。
 * 处理 loading（skeleton）、success、视频缺失、权限失败、加载失败。
 */
import { useQuery } from '@tanstack/react-query';

import { createApiClient } from '@/services/api/client';
import { resolveFastapiBaseUrl } from '@/services/auth-consistency';
import { resolveRuntimeMode } from '@/services/api/adapters/base-adapter';
import type { TaskDataEnvelope } from '@/types/task';
import type { VideoFailure, VideoResult } from '@/types/video';

/** 结果页视图状态。 */
export type VideoResultViewStatus =
  | 'loading'
  | 'success'
  | 'video-missing'
  | 'permission-denied'
  | 'error';

/** 结果页查询数据。 */
export interface VideoResultData {
  taskId: string;
  status: string;
  result: VideoResult | null;
  failure: VideoFailure | null;
}

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

/**
 * 延迟创建 API 客户端，确保 resolveFastapiBaseUrl() 在请求时求值。
 *
 * @returns API 客户端实例。
 */
function getApiClient() {
  return createApiClient({ baseURL: resolveFastapiBaseUrl() });
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
 * 获取视频任务结果数据。
 *
 * @param taskId - 任务 ID。
 * @returns 结果数据。
 */
async function fetchVideoResult(taskId: string): Promise<VideoResultData> {
  const isMock = resolveRuntimeMode() === 'mock';

  if (isMock) {
    const response = await fetch(
      `${resolveFastapiBaseUrl()}/api/v1/video/tasks/${taskId}`,
    );

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);

      Object.assign(error, { status: response.status });
      throw error;
    }

    const envelope = (await response.json()) as TaskDataEnvelope<VideoResultData>;

    return envelope.data;
  }

  const response = await getApiClient().request<TaskDataEnvelope<VideoResultData>>({
    url: `/api/v1/video/tasks/${taskId}`,
    method: 'get',
  });

  return response.data.data;
}

/**
 * 查询视频任务结果，支持缓存与重新验证。
 *
 * @param taskId - 任务 ID；为空时不发起查询。
 * @returns 结果页状态。
 */
export function useVideoResult(taskId: string | undefined): VideoResultState {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['video', 'result', taskId],
    queryFn: () => fetchVideoResult(taskId!),
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
    if (data.result && data.result.videoUrl) {
      viewStatus = 'success';
    } else if (data.status === 'completed' && (!data.result || !data.result.videoUrl)) {
      viewStatus = 'video-missing';
    } else if (data.status === 'failed') {
      viewStatus = 'error';
    } else {
      viewStatus = 'success';
    }
  }

  return {
    data: data ?? null,
    viewStatus,
    isLoading,
    error: error instanceof Error ? error : null,
    refetch,
  };
}
