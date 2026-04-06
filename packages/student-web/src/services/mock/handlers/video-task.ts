/**
 * 文件说明：提供视频任务创建的 MSW handlers。
 * Story 3.1：拦截 POST /api/v1/video/tasks，消费 mock fixtures 返回预期 payload。
 */
import { http, HttpResponse } from 'msw';

import {
  getMockVideoTaskCreateError,
  getMockVideoTaskCreateSuccess,
  normalizeMockVideoTaskError,
} from '@/services/mock/fixtures/video-task';
import { isVideoTaskMockScenario } from '@/types/video';
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
 * 从请求体中解析视频任务创建请求。
 *
 * @param payload - 已解析的 JSON 请求体。
 * @returns 视频任务创建请求对象。
 * @throws 请求体结构不合法时抛出。
 */
function parseVideoTaskCreateRequest(payload: unknown): VideoTaskCreateRequest {
  const body = readRecord(payload);

  if (!body) {
    throw new Error('视频任务创建请求体必须是 JSON 对象');
  }

  const inputType = readString(body.inputType);

  if (inputType !== 'text' && inputType !== 'image') {
    throw new Error('inputType 必须是 text 或 image');
  }

  const clientRequestId = readString(body.clientRequestId);

  if (!clientRequestId) {
    throw new Error('clientRequestId 不能为空');
  }

  const sourcePayload = readRecord(body.sourcePayload);

  if (!sourcePayload) {
    throw new Error('sourcePayload 必须是 JSON 对象');
  }

  return {
    inputType,
    sourcePayload: sourcePayload as unknown as VideoTaskCreateRequest['sourcePayload'],
    userProfile: readRecord(body.userProfile) as Record<string, unknown> | undefined,
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
      data: null,
    },
    { status: mockError.status },
  );
}

/** 视频任务 mock handlers 列表。 */
export const videoTaskHandlers = [
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
