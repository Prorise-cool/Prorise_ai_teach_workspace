/**
 * 文件说明：提供视频等待页渐进 preview 的 mock / real adapter 抽象。
 * 统一收口 `/preview` 查询路径与响应映射，避免页面层直接处理运行模式。
 */
import {
  type ApiClient,
  isApiClientError,
} from '@/services/api/client';
import { unwrapEnvelope } from '@/services/api/envelope';
import { fastapiClient } from '@/services/api/fastapi-client';
import { getMockVideoPreview } from '@/services/mock/fixtures/video-pipeline';
import type {
  VideoPipelineMockScenario,
  VideoTaskPreview,
  VideoTaskPreviewResponseEnvelope,
} from '@/types/video';

import { pickAdapterImplementation } from './base-adapter';

type VideoPreviewQueryOptions = {
  scenario?: VideoPipelineMockScenario;
  signal?: AbortSignal;
};

type ResolveVideoPreviewAdapterOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

type RealVideoPreviewAdapterOptions = {
  client?: ApiClient;
};

export interface VideoPreviewAdapter {
  getPreview(
    taskId: string,
    options?: VideoPreviewQueryOptions,
  ): Promise<VideoTaskPreview>;
}

export class VideoPreviewAdapterError extends Error {
  name = 'VideoPreviewAdapterError' as const;

  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function createVideoPreviewError(status: number, code: string, message: string) {
  return new VideoPreviewAdapterError(status, code, message);
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

function mapVideoPreviewApiClientError(error: unknown): VideoPreviewAdapterError {
  if (error instanceof VideoPreviewAdapterError) {
    return error;
  }

  if (isApiClientError(error)) {
    const payload = error.data as
      | {
          code?: number | string;
          msg?: string;
        }
      | undefined;

    return createVideoPreviewError(
      error.status,
      String(payload?.code ?? error.status),
      payload?.msg ?? error.message,
    );
  }

  return createVideoPreviewError(
    500,
    'VIDEO_PREVIEW_UNKNOWN',
    error instanceof Error ? error.message : '未知视频预览适配错误',
  );
}

export function createMockVideoPreviewAdapter(): VideoPreviewAdapter {
  return {
    getPreview(taskId, options) {
      return Promise.resolve(
        getMockVideoPreview(taskId, inferPipelineScenario(taskId, options?.scenario)),
      );
    },
  };
}

export function createRealVideoPreviewAdapter(
  { client = fastapiClient }: RealVideoPreviewAdapterOptions = {},
): VideoPreviewAdapter {
  return {
    async getPreview(taskId, options) {
      try {
        const response = await client.request<VideoTaskPreviewResponseEnvelope>({
          url: `/api/v1/video/tasks/${taskId}/preview`,
          method: 'get',
          signal: options?.signal,
        });

        return unwrapEnvelope(response);
      } catch (error) {
        throw mapVideoPreviewApiClientError(error);
      }
    },
  };
}

export function resolveVideoPreviewAdapter(
  options: ResolveVideoPreviewAdapterOptions = {},
): VideoPreviewAdapter {
  return pickAdapterImplementation(
    {
      mock: createMockVideoPreviewAdapter(),
      real: createRealVideoPreviewAdapter({
        client: options.client ?? fastapiClient,
      }),
    },
    {
      useMock: options.useMock,
    },
  );
}
