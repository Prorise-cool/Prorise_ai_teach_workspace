/**
 * 文件说明：提供视频图片预处理的 MSW handlers。
 */
import { http, HttpResponse } from 'msw';

import {
  getMockVideoPreprocessError,
  getVideoPreprocessFixtureError,
  getMockVideoPreprocessSuccess,
  normalizeMockVideoPreprocessError,
} from '@/services/mock/fixtures/video-preprocess';
import type { VideoPreprocessMockScenario } from '@/types/video';
import { isVideoPreprocessMockScenario } from '@/types/video';

function readVideoPreprocessMockScenario(request: Request): VideoPreprocessMockScenario | null {
  const url = new URL(request.url);
  const scenario = url.searchParams.get('scenario');

  return isVideoPreprocessMockScenario(scenario) ? scenario : null;
}

function createVideoPreprocessHttpError(
  status: number,
  code: string,
  message: string,
  retryable = false,
  details: Record<string, unknown> = {},
) {
  return Object.assign(new Error(message), {
    status,
    code,
    retryable,
    details,
  });
}

function toVideoPreprocessHttpErrorResponse(error: unknown) {
  const normalizedError = normalizeMockVideoPreprocessError(error);

  return HttpResponse.json(
    {
      code: normalizedError.status,
      msg: normalizedError.message,
      data: {
        errorCode: normalizedError.code,
        retryable: normalizedError.retryable,
        requestId: null,
        taskId: null,
        details: normalizedError.details,
      },
    },
    { status: normalizedError.status },
  );
}

export const videoPreprocessHandlers = [
  http.post('*/api/v1/video/preprocess', async ({ request }) => {
    try {
      const scenario = readVideoPreprocessMockScenario(request);
      const fixtureError = getVideoPreprocessFixtureError(scenario ?? undefined);

      if (fixtureError) {
        return HttpResponse.json(
          getMockVideoPreprocessError('validation-error'),
          { status: fixtureError.status },
        );
      }

      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        throw createVideoPreprocessHttpError(
          422,
          'TASK_INVALID_INPUT',
          '缺少 file 字段',
          false,
          { field: 'file' },
        );
      }

      const successScenario =
        scenario && scenario !== 'validation-error'
          ? scenario
          : 'success';
      const response = getMockVideoPreprocessSuccess(successScenario, file);

      return HttpResponse.json(response, { status: 200 });
    } catch (error) {
      return toVideoPreprocessHttpErrorResponse(error);
    }
  }),
];
