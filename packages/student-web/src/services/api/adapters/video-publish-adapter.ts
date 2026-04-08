/**
 * 文件说明：提供视频公开发布/取消的 mock / real adapter 抽象。
 * 统一承接 publish 接口，避免 hook 直接区分 mock / real。
 */
import {
  type ApiClient,
  isApiClientError,
} from '@/services/api/client';
import { fastapiClient } from '@/services/api/fastapi-client';

import { pickAdapterImplementation } from './base-adapter';

type VideoPublishOptions = {
  signal?: AbortSignal;
};

type ResolveVideoPublishAdapterOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

type RealVideoPublishAdapterOptions = {
  client?: ApiClient;
};

type VideoPublishEnvelope = {
  code: number;
  msg: string;
  data: VideoPublishResult;
};

export interface VideoPublishResult {
  taskId: string;
  published: boolean;
}

export interface VideoPublishAdapter {
  publish(taskId: string, options?: VideoPublishOptions): Promise<VideoPublishResult>;
  unpublish(taskId: string, options?: VideoPublishOptions): Promise<VideoPublishResult>;
}

export class VideoPublishAdapterError extends Error {
  name = 'VideoPublishAdapterError' as const;

  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function createVideoPublishError(status: number, code: string, message: string) {
  return new VideoPublishAdapterError(status, code, message);
}

function mapVideoPublishApiClientError(error: unknown): VideoPublishAdapterError {
  if (error instanceof VideoPublishAdapterError) {
    return error;
  }

  if (isApiClientError(error)) {
    const payload = error.data as
      | {
          code?: number | string;
          msg?: string;
        }
      | undefined;

    return createVideoPublishError(
      error.status,
      String(payload?.code ?? error.status),
      payload?.msg ?? error.message,
    );
  }

  return createVideoPublishError(
    500,
    'VIDEO_PUBLISH_UNKNOWN',
    error instanceof Error ? error.message : '未知视频公开适配错误',
  );
}

async function requestVideoPublish(
  client: ApiClient,
  taskId: string,
  method: 'post' | 'delete',
  signal?: AbortSignal,
) {
  try {
    const response = await client.request<VideoPublishEnvelope>({
      url: `/api/v1/video/tasks/${taskId}/publish`,
      method,
      signal,
    });

    return response.data.data;
  } catch (error) {
    throw mapVideoPublishApiClientError(error);
  }
}

export function createMockVideoPublishAdapter(): VideoPublishAdapter {
  return {
    publish(taskId) {
      return Promise.resolve({
        taskId,
        published: true,
      });
    },
    unpublish(taskId) {
      return Promise.resolve({
        taskId,
        published: false,
      });
    },
  };
}

export function createRealVideoPublishAdapter(
  { client = fastapiClient }: RealVideoPublishAdapterOptions = {},
): VideoPublishAdapter {
  return {
    publish(taskId, options) {
      return requestVideoPublish(client, taskId, 'post', options?.signal);
    },
    unpublish(taskId, options) {
      return requestVideoPublish(client, taskId, 'delete', options?.signal);
    },
  };
}

export function resolveVideoPublishAdapter(
  options: ResolveVideoPublishAdapterOptions = {},
): VideoPublishAdapter {
  return pickAdapterImplementation(
    {
      mock: createMockVideoPublishAdapter(),
      real: createRealVideoPublishAdapter({
        client: options.client ?? fastapiClient,
      }),
    },
    {
      useMock: options.useMock,
    },
  );
}
