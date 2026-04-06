/**
 * 文件说明：封装视频任务创建的 useMutation hook。
 */
import { useMutation } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { useNavigate } from 'react-router-dom';

import { resolveVideoPreprocessAdapter } from '@/services/api/adapters/video-preprocess-adapter';
import { resolveVideoTaskAdapter } from '@/services/api/adapters/video-task-adapter';
import { useFeedback } from '@/shared/feedback';
import type { VideoInputFormValues } from '@/features/video/schemas/video-input-schema';
import type { VideoTaskCreateRequest } from '@/types/video';

/**
 * 管理视频任务创建链路。
 *
 * 图片模式会先调用 preprocess，再调用 create task。
 *
 * @returns 视频任务创建 mutation。
 */
export function useVideoCreate() {
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const videoTaskAdapter = resolveVideoTaskAdapter();
  const videoPreprocessAdapter = resolveVideoPreprocessAdapter();

  return useMutation({
    mutationKey: ['video', 'create'],
    mutationFn: async (values: VideoInputFormValues) => {
      const clientRequestId = `video_${nanoid(12)}`;
      let request: VideoTaskCreateRequest;

      if (values.inputType === 'image' && values.imageFile) {
        const preprocessResult = await videoPreprocessAdapter.preprocessImage(values.imageFile);

        if (preprocessResult.errorCode) {
          notify({
            title: '图片已上传',
            description:
              preprocessResult.suggestions[0] ?? 'OCR 结果可信度不足，建议补充手动文本',
            tone: 'warning',
          });
        }

        request = {
          inputType: 'image',
          sourcePayload: {
            imageRef: preprocessResult.imageRef,
            ocrText: values.text.trim() || preprocessResult.ocrText || undefined,
          },
          clientRequestId,
        };
      } else {
        request = {
          inputType: 'text',
          sourcePayload: {
            text: values.text.trim(),
          },
          clientRequestId,
        };
      }

      return videoTaskAdapter.createTask(request);
    },
    onSuccess: (result) => {
      void navigate(`/video/${result.taskId}/generating`);
    },
    onError: (error) => {
      notify({
        title: '创建失败',
        description: error instanceof Error ? error.message : '视频任务创建失败，请稍后重试',
        tone: 'error',
      });
    },
  });
}
