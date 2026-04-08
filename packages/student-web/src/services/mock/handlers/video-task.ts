/**
 * 文件说明：提供视频任务创建的 MSW handlers。
 * Story 3.1：拦截 POST /api/v1/video/tasks，消费 mock fixtures 返回预期 payload。
 */
import { http, HttpResponse } from 'msw';

import {
  getMockPublishedVideoListSuccess,
  getMockVideoPublicListSuccess,
  getVideoPublicFixtureError,
  normalizeMockVideoPublicError,
} from '@/services/mock/fixtures/video-public';
import {
  getMockVideoTaskCreateError,
  getMockVideoTaskCreateSuccess,
  normalizeMockVideoTaskError,
} from '@/services/mock/fixtures/video-task';
import { isVideoTaskMockScenario } from '@/types/video';
import {
  isVideoPublicMockScenario,
  type VideoPublicMockScenario,
} from '@/types/video';
import type { VideoTaskCreateRequest, VideoTaskMockScenario } from '@/types/video';
import { readJsonBody, readRecord, readString } from '@/lib/type-guards';

/**
 * 从请求 URL 中提取 mock 场景参数。
 *
 * @param request - MSW 拦截的请求对象。
 * @returns mock 场景标识或 null。
 */
function readVideoMockScenario(request: Request): VideoTaskMockScenario | null {
  const url = new URL(request.url);
  const scenario = url.searchParams.get('scenario');

  return isVideoTaskMockScenario(scenario) ? scenario : null;
}

/**
 * 从请求 URL 中提取公开视频 mock 场景参数。
 *
 * @param request - MSW 拦截的请求对象。
 * @returns mock 场景标识或 null。
 */
function readVideoPublicMockScenario(
  request: Request,
): VideoPublicMockScenario | undefined {
  const url = new URL(request.url);
  const scenario = url.searchParams.get('scenario');

  return isVideoPublicMockScenario(scenario) ? scenario : undefined;
}

function createVideoTaskHttpError(
  status: number,
  code: string,
  message: string,
) {
  return Object.assign(new Error(message), {
    status,
    code,
  });
}

/**
 * 从请求体中解析视频任务创建请求。
 *
 * @param payload - 已解析的 JSON 请求体。
 * @returns 视频任务创建请求对象。
 * @throws 请求体结构不合法时抛出。
 */
function parseVideoTaskCreateRequest(payload: unknown): VideoTaskCreateRequest {
  const body = readRecord(payload);

  if (!body) {
    throw createVideoTaskHttpError(
      422,
      'TASK_INVALID_INPUT',
      '视频任务创建请求体必须是 JSON 对象',
    );
  }

  const inputType = readString(body.inputType);

  if (inputType !== 'text' && inputType !== 'image') {
    throw createVideoTaskHttpError(
      422,
      'TASK_INVALID_INPUT',
      'inputType 必须是 text 或 image',
    );
  }

  const clientRequestId = readString(body.clientRequestId);

  if (!clientRequestId) {
    throw createVideoTaskHttpError(
      422,
      'TASK_INVALID_INPUT',
      'clientRequestId 不能为空',
    );
  }

  const sourcePayload = readRecord(body.sourcePayload);

  if (!sourcePayload) {
    throw createVideoTaskHttpError(
      422,
      'TASK_INVALID_INPUT',
      'sourcePayload 必须是 JSON 对象',
    );
  }

  const userProfile = readRecord(body.userProfile) ?? undefined;

  if (inputType === 'text') {
    const text = readString(sourcePayload.text)?.trim();

    if (!text) {
      throw createVideoTaskHttpError(
        422,
        'VIDEO_INPUT_EMPTY',
        '输入内容为空，请填写后重新提交',
      );
    }

    return {
      inputType: 'text',
      sourcePayload: { text },
      userProfile,
      clientRequestId,
    };
  }

  const imageRef = readString(sourcePayload.imageRef)?.trim();

  if (!imageRef) {
    throw createVideoTaskHttpError(
      422,
      'TASK_INVALID_INPUT',
      '图片输入缺少 imageRef',
    );
  }

  const ocrText = readString(sourcePayload.ocrText)?.trim();

  return {
    inputType: 'image',
    sourcePayload: {
      imageRef,
      ocrText: ocrText || undefined,
    },
    userProfile,
    clientRequestId,
  };
}

/**
 * 将 mock 错误转为 HTTP 响应。
 *
 * @param error - 原始异常对象。
 * @returns MSW HttpResponse。
 */
function toVideoTaskHttpErrorResponse(error: unknown) {
  const mockError = normalizeMockVideoTaskError(error);

  return HttpResponse.json(
    {
      code: mockError.status,
      msg: mockError.message,
      data: {
        errorCode: mockError.code,
        retryable: false,
        requestId: null,
        taskId: null,
        details: {},
      },
    },
    { status: mockError.status },
  );
}

/**
 * 将公开视频 mock 错误转为 HTTP 响应。
 *
 * @param error - 原始异常对象。
 * @returns MSW HttpResponse。
 */
function toVideoPublicHttpErrorResponse(error: unknown) {
  const mockError = normalizeMockVideoPublicError(error);

  return HttpResponse.json(
    {
      code: mockError.status,
      msg: mockError.message,
      data: {
        errorCode: mockError.code,
        retryable: true,
        details: mockError.details,
      },
    },
    { status: mockError.status },
  );
}

/** 视频任务 mock handlers 列表。 */
export const videoTaskHandlers = [
  http.get('*/api/v1/video/public', ({ request }) => {
    try {
      const scenario = readVideoPublicMockScenario(request);
      const fixtureError = getVideoPublicFixtureError(scenario);

      if (fixtureError) {
        return toVideoPublicHttpErrorResponse(fixtureError);
      }

      const url = new URL(request.url);
      const page = Number(url.searchParams.get('page') ?? 1);
      const pageSize = Number(url.searchParams.get('pageSize') ?? 12);
      const sort = url.searchParams.get('sort') === 'popular' ? 'popular' : 'latest';
      const envelope = getMockVideoPublicListSuccess(
        scenario === 'empty' ? 'empty' : 'default',
        {
        page,
        pageSize,
        sort,
      });

      return HttpResponse.json(envelope, { status: 200 });
    } catch (error) {
      return toVideoPublicHttpErrorResponse(error);
    }
  }),
  http.get('*/api/v1/video/published', ({ request }) => {
    try {
      const scenario = readVideoPublicMockScenario(request);
      const fixtureError = getVideoPublicFixtureError(
        scenario === 'published-shape' ? undefined : scenario,
      );

      if (fixtureError) {
        return toVideoPublicHttpErrorResponse(fixtureError);
      }

      const url = new URL(request.url);
      const page = Number(url.searchParams.get('page') ?? 1);
      const pageSize = Number(url.searchParams.get('pageSize') ?? 12);
      const sort = url.searchParams.get('sort') === 'popular' ? 'popular' : 'latest';
      const envelope = getMockPublishedVideoListSuccess({
        page,
        pageSize,
        sort,
      });

      return HttpResponse.json(envelope, { status: 200 });
    } catch (error) {
      return toVideoPublicHttpErrorResponse(error);
    }
  }),
  http.post('*/api/v1/video/tasks', async ({ request }) => {
    try {
      const scenario = readVideoMockScenario(request);

      /* 场景驱动：显式指定错误场景时直接返回错误 fixture */
      if (scenario === 'validation-error') {
        const errorEnvelope = getMockVideoTaskCreateError('validation-error');

        return HttpResponse.json(errorEnvelope, { status: 422 });
      }

      if (scenario === 'permission-denied') {
        const errorEnvelope = getMockVideoTaskCreateError('permission-denied');

        return HttpResponse.json(errorEnvelope, { status: 403 });
      }

      /* 解析请求体 */
      const body = parseVideoTaskCreateRequest(await readJsonBody(request));

      /* 根据 inputType 选择成功场景 */
      const successScenario =
        body.inputType === 'image' ? 'image-success' : 'text-success';
      const successEnvelope = getMockVideoTaskCreateSuccess(
        successScenario,
        body,
      );

      return HttpResponse.json(successEnvelope, { status: 202 });
    } catch (error) {
      return toVideoTaskHttpErrorResponse(error);
    }
  }),
];
