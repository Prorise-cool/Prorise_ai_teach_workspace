/**
 * 文件说明：视频结果公开发布/取消 mutation hook（Story 4.10）。
 * 使用 useMutation 封装 publish/unpublish，sonner toast 反馈。
 * 操作成功后自动刷新结果页数据和公开列表缓存。
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createApiClient } from '@/services/api/client';
import { resolveFastapiBaseUrl } from '@/services/auth-consistency';
import { resolveRuntimeMode } from '@/services/api/adapters/base-adapter';
import { useFeedback } from '@/shared/feedback';

/** Publish API 响应。 */
interface PublishResponse {
  taskId: string;
  published: boolean;
}

const apiClient = createApiClient({ baseURL: resolveFastapiBaseUrl() });

/**
 * 调用公开发布 API。
 *
 * @param taskId - 任务 ID。
 * @returns 发布响应。
 */
async function publishVideo(taskId: string): Promise<PublishResponse> {
  const isMock = resolveRuntimeMode() === 'mock';

  if (isMock) {
    const response = await fetch(
      `${resolveFastapiBaseUrl()}/api/v1/video/tasks/${taskId}/publish`,
      { method: 'POST' },
    );
    const envelope = await response.json();

    return (envelope as { data: PublishResponse }).data;
  }

  const response = await apiClient.request<{ data: PublishResponse }>({
    url: `/api/v1/video/tasks/${taskId}/publish`,
    method: 'post',
  });

  return response.data.data;
}

/**
 * 调用取消公开 API。
 *
 * @param taskId - 任务 ID。
 * @returns 取消响应。
 */
async function unpublishVideo(taskId: string): Promise<PublishResponse> {
  const isMock = resolveRuntimeMode() === 'mock';

  if (isMock) {
    const response = await fetch(
      `${resolveFastapiBaseUrl()}/api/v1/video/tasks/${taskId}/publish`,
      { method: 'DELETE' },
    );
    const envelope = await response.json();

    return (envelope as { data: PublishResponse }).data;
  }

  const response = await apiClient.request<{ data: PublishResponse }>({
    url: `/api/v1/video/tasks/${taskId}/publish`,
    method: 'delete',
  });

  return response.data.data;
}

/**
 * 管理视频公开发布/取消操作的 mutation 状态。
 *
 * @param taskId - 任务 ID。
 * @returns mutation 状态与操作函数。
 */
export function useVideoPublish(taskId: string) {
  const queryClient = useQueryClient();
  const { notify } = useFeedback();

  const publishMutation = useMutation({
    mutationFn: () => publishVideo(taskId),
    onSuccess: () => {
      notify({ tone: 'success', title: '已公开发布' });
      void queryClient.invalidateQueries({ queryKey: ['video', 'result', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['video', 'published'] });
    },
    onError: () => {
      notify({ tone: 'error', title: '公开发布失败，请稍后重试' });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishVideo(taskId),
    onSuccess: () => {
      notify({ tone: 'success', title: '已取消公开' });
      void queryClient.invalidateQueries({ queryKey: ['video', 'result', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['video', 'published'] });
    },
    onError: () => {
      notify({ tone: 'error', title: '取消公开失败，请稍后重试' });
    },
  });

  return {
    /** 执行公开发布。 */
    publish: () => publishMutation.mutate(),
    /** 执行取消公开。 */
    unpublish: () => unpublishMutation.mutate(),
    /** 是否正在操作中。 */
    isLoading: publishMutation.isPending || unpublishMutation.isPending,
  };
}
