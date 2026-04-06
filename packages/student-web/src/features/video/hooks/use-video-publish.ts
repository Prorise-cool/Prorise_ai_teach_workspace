/**
 * 文件说明：视频结果公开发布/取消 mutation hook（Story 4.10）。
 * 使用 useMutation 封装 publish/unpublish，sonner toast 反馈。
 * 操作成功后自动刷新结果页数据和公开列表缓存。
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { createApiClient } from '@/services/api/client';
import { resolveFastapiBaseUrl } from '@/services/auth-consistency';
import { resolveRuntimeMode } from '@/services/api/adapters/base-adapter';
import { useFeedback } from '@/shared/feedback';

/** Publish API 响应。 */
interface PublishResponse {
  taskId: string;
  published: boolean;
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
 * 发送视频发布/取消请求的统一函数。
 * mock 模式使用原生 fetch，真实模式使用 apiClient。
 *
 * @param taskId - 任务 ID。
 * @param method - HTTP 方法：'post' 公开发布，'delete' 取消公开。
 * @returns 发布/取消响应。
 */
async function videoPublishRequest(
  taskId: string,
  method: 'post' | 'delete',
): Promise<PublishResponse> {
  const isMock = resolveRuntimeMode() === 'mock';

  if (isMock) {
    const response = await fetch(
      `${resolveFastapiBaseUrl()}/api/v1/video/tasks/${taskId}/publish`,
      { method: method.toUpperCase() },
    );
    const envelope = await response.json();

    return (envelope as { data: PublishResponse }).data;
  }

  const response = await getApiClient().request<{ data: PublishResponse }>({
    url: `/api/v1/video/tasks/${taskId}/publish`,
    method,
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
  const { t } = useAppTranslation();

  const publishMutation = useMutation({
    mutationFn: () => videoPublishRequest(taskId, 'post'),
    onSuccess: () => {
      notify({ tone: 'success', title: t('video.result.publishSuccess') });
      void queryClient.invalidateQueries({ queryKey: ['video', 'result', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['video', 'published'] });
    },
    onError: () => {
      notify({ tone: 'error', title: t('video.result.publishFailed') });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => videoPublishRequest(taskId, 'delete'),
    onSuccess: () => {
      notify({ tone: 'success', title: t('video.result.unpublishSuccess') });
      void queryClient.invalidateQueries({ queryKey: ['video', 'result', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['video', 'published'] });
    },
    onError: () => {
      notify({ tone: 'error', title: t('video.result.unpublishFailed') });
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
