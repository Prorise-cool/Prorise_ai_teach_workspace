/**
 * 文件说明：视频结果公开发布/取消 mutation hook（Story 4.10）。
 * 使用 useMutation 封装 publish/unpublish，sonner toast 反馈。
 * 操作成功后自动刷新结果页数据和公开列表缓存。
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { resolveVideoPublishAdapter } from '@/services/api/adapters/video-publish-adapter';
import type { VideoResultData } from '@/services/api/adapters/video-result-adapter';
import { useFeedback } from '@/shared/feedback';

/**
 * 管理视频公开发布/取消操作的 mutation 状态。
 *
 * @param taskId - 任务 ID。
 * @returns mutation 状态与操作函数。
 */
export function useVideoPublish(taskId: string) {
  const adapter = resolveVideoPublishAdapter();
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const { t } = useAppTranslation();

  const syncPublishedState = (published: boolean) => {
    queryClient.setQueryData<VideoResultData | null>(
      ['video', 'result', taskId],
      (current) => {
        if (!current?.result) {
          return current ?? null;
        }

        return {
          ...current,
          result: {
            ...current.result,
            published,
          },
        };
      },
    );
  };

  const publishMutation = useMutation({
    mutationFn: () => adapter.publish(taskId),
    onSuccess: (result) => {
      syncPublishedState(result.published);
      notify({ tone: 'success', title: t('video.result.publishSuccess') });
      void queryClient.invalidateQueries({ queryKey: ['video', 'result', taskId] });
      void queryClient.invalidateQueries({ queryKey: ['video', 'published'] });
    },
    onError: () => {
      notify({ tone: 'error', title: t('video.result.publishFailed') });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => adapter.unpublish(taskId),
    onSuccess: (result) => {
      syncPublishedState(result.published);
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
