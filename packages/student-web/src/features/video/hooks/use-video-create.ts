/**
 * 文件说明：封装视频任务创建的 useMutation hook。
 * 负责提交状态管理（loading / error / success）、成功跳转与错误反馈。
 * 页面容器只需调用 mutate 即可触发整个创建 -> 跳转流程。
 */
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import {
  resolveVideoTaskAdapter,
  VideoTaskAdapterError,
} from '@/services/api/adapters/video-task-adapter';
import { useFeedback } from '@/shared/feedback';
import type { CreateVideoTaskRequest } from '@/types/video';

/**
 * 管理视频任务创建的 mutation hook。
 *
 * @returns useMutation 返回值，包含 mutate / isPending / isError / error 等状态。
 */
export function useVideoCreate() {
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const adapter = resolveVideoTaskAdapter();

  return useMutation({
    mutationKey: ['video', 'create'],
    mutationFn: (request: CreateVideoTaskRequest) =>
      adapter.createVideoTask(request),
    onSuccess: (result) => {
      navigate(`/video/${result.taskId}/generating`);
    },
    onError: (error) => {
      const message =
        error instanceof VideoTaskAdapterError
          ? error.message
          : '视频任务创建失败，请稍后重试';

      notify({
        title: '创建失败',
        description: message,
        tone: 'error',
      });
    },
  });
}
