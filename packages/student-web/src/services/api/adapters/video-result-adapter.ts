/**
 * 文件说明：提供视频结果详情的 mock / real adapter 抽象。
 * 统一收口结果页查询路径与响应映射，避免页面层自行区分 mock / real。
 */
import {
  type ApiClient,
  isApiClientError,
} from '@/services/api/client';
import { fastapiClient } from '@/services/api/fastapi-client';
import {
  getMockVideoFailure,
  getMockVideoResult,
} from '@/services/mock/fixtures/video-pipeline';
import type {
  VideoFailure,
  VideoPipelineMockScenario,
  VideoResult,
} from '@/types/video';

import { pickAdapterImplementation } from './base-adapter';

type VideoResultQueryOptions = {
  scenario?: VideoPipelineMockScenario;
  signal?: AbortSignal;
};

type ResolveVideoResultAdapterOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

type RealVideoResultAdapterOptions = {
  client?: ApiClient;
};

type VideoResultEnvelope = {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: string;
    result: VideoResult | null;
    failure: VideoFailure | null;
    publishState?: {
      published?: boolean;
    } | null;
  };
};

export interface VideoResultData {
  taskId: string;
  status: string;
  result: VideoResult | null;
  failure: VideoFailure | null;
}

export interface VideoResultAdapter {
  getResult(
    taskId: string,
    options?: VideoResultQueryOptions,
  ): Promise<VideoResultData>;
}

export class VideoResultAdapterError extends Error {
  name = 'VideoResultAdapterError' as const;

  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function createVideoResultError(status: number, code: string, message: string) {
  return new VideoResultAdapterError(status, code, message);
}

function inferPipelineScenario(
  taskId: string,
  explicitScenario?: VideoPipelineMockScenario,
): VideoPipelineMockScenario {
  if (explicitScenario) {
    return explicitScenario;
  }

  if (taskId.includes('fix')) {
    return 'fix';
  }

  if (taskId.includes('fail')) {
    return 'failure';
  }

  return 'success';
}

function mapVideoResultPayload(payload: VideoResultEnvelope['data']): VideoResultData {
  const published = payload.publishState?.published;

  return {
    taskId: payload.taskId,
    status: payload.status,
    result: payload.result
      ? {
          ...payload.result,
          published: published ?? payload.result.published,
        }
      : null,
    failure: payload.failure,
  };
}

function mapVideoResultApiClientError(error: unknown): VideoResultAdapterError {
  if (error instanceof VideoResultAdapterError) {
    return error;
  }

  if (isApiClientError(error)) {
    const payload = error.data as
      | {
          code?: number | string;
          msg?: string;
        }
      | undefined;

    return createVideoResultError(
      error.status,
      String(payload?.code ?? error.status),
      payload?.msg ?? error.message,
    );
  }

  return createVideoResultError(
    500,
    'VIDEO_RESULT_UNKNOWN',
    error instanceof Error ? error.message : '未知视频结果适配错误',
  );
}

export function createMockVideoResultAdapter(): VideoResultAdapter {
  return {
    async getResult(taskId, options) {
      const scenario = inferPipelineScenario(taskId, options?.scenario);

      if (scenario === 'failure') {
        return {
          taskId,
          status: 'failed',
          result: null,
          failure: getMockVideoFailure(taskId),
        };
      }

      return {
        taskId,
        status: 'completed',
        result: {
          ...getMockVideoResult(taskId),
          published: false,
        },
        failure: null,
      };
    },
  };
}

export function createRealVideoResultAdapter(
  { client = fastapiClient }: RealVideoResultAdapterOptions = {},
): VideoResultAdapter {
  return {
    async getResult(taskId, options) {
      try {
        const response = await client.request<VideoResultEnvelope>({
          url: `/api/v1/video/tasks/${taskId}/result`,
          method: 'get',
          signal: options?.signal,
        });

        return mapVideoResultPayload(response.data.data);
      } catch (error) {
        throw mapVideoResultApiClientError(error);
      }
    },
  };
}

export function resolveVideoResultAdapter(
  options: ResolveVideoResultAdapterOptions = {},
): VideoResultAdapter {
  return pickAdapterImplementation(
    {
      mock: createMockVideoResultAdapter(),
      real: createRealVideoResultAdapter({
        client: options.client ?? fastapiClient,
      }),
    },
    {
      useMock: options.useMock,
    },
  );
}
