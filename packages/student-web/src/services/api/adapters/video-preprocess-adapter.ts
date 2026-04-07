/**
 * 文件说明：提供视频图片预处理的 mock / real adapter 抽象。
 */
import {
  type ApiClient,
  isApiClientError,
} from '@/services/api/client';
import { fastapiClient } from '@/services/api/fastapi-client';
import {
  getVideoPreprocessFixtureError,
  getMockVideoPreprocessSuccess,
} from '@/services/mock/fixtures/video-preprocess';
import type {
  VideoPreprocessMockScenario,
  VideoPreprocessResult,
  VideoPreprocessSuccessEnvelope,
} from '@/types/video';
import { readRecord, readString } from '@/lib/type-guards';

import { pickAdapterImplementation } from './base-adapter';

export class VideoPreprocessAdapterError extends Error {
  name = 'VideoPreprocessAdapterError' as const;

  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryable = false,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isVideoPreprocessAdapterError(
  error: unknown,
): error is VideoPreprocessAdapterError {
  if (error instanceof VideoPreprocessAdapterError) {
    return true;
  }

  const candidate = readRecord(error);

  return (
    !!candidate &&
    readString(candidate.name) === 'VideoPreprocessAdapterError' &&
    typeof candidate.status === 'number' &&
    typeof candidate.code === 'string'
  );
}

type VideoPreprocessOptions = {
  signal?: AbortSignal;
  scenario?: VideoPreprocessMockScenario;
};

type ResolveVideoPreprocessAdapterOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

type RealVideoPreprocessAdapterOptions = {
  client?: ApiClient;
};

export interface VideoPreprocessAdapter {
  preprocessImage(
    file: File,
    options?: VideoPreprocessOptions,
  ): Promise<VideoPreprocessResult>;
}

function appendPreprocessScenario(
  url: string,
  scenario?: VideoPreprocessMockScenario,
) {
  if (!scenario) {
    return url;
  }

  const nextUrl = new URL(url, 'http://xiaomai.local');
  nextUrl.searchParams.set('scenario', scenario);

  return `${nextUrl.pathname}${nextUrl.search}`;
}

function createVideoPreprocessError(
  status: number,
  code: string,
  message: string,
  extras: {
    retryable?: boolean;
    details?: Record<string, unknown>;
  } = {},
) {
  return new VideoPreprocessAdapterError(
    status,
    code,
    message,
    extras.retryable ?? false,
    extras.details ?? {},
  );
}

function mapVideoPreprocessApiClientError(
  error: unknown,
): VideoPreprocessAdapterError {
  if (error instanceof VideoPreprocessAdapterError) {
    return error;
  }

  if (isApiClientError(error)) {
    const payload = error.data as
      | {
        code?: number | string;
        msg?: string;
        data?: {
          errorCode?: string;
          error_code?: string;
          retryable?: boolean;
          details?: Record<string, unknown>;
        };
      }
      | undefined;

    return createVideoPreprocessError(
      error.status,
      String(
        payload?.data?.errorCode ??
        payload?.data?.error_code ??
        payload?.code ??
        error.status,
      ),
      payload?.msg ?? error.message,
      {
        retryable: payload?.data?.retryable,
        details: payload?.data?.details,
      },
    );
  }

  return createVideoPreprocessError(
    500,
    'VIDEO_PREPROCESS_UNKNOWN_ERROR',
    error instanceof Error ? error.message : '未知图片预处理错误',
  );
}

export function createRealVideoPreprocessAdapter(
  { client = fastapiClient }: RealVideoPreprocessAdapterOptions = {},
): VideoPreprocessAdapter {
  return {
    async preprocessImage(file, options) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await client.request<VideoPreprocessSuccessEnvelope>({
          url: appendPreprocessScenario('/api/v1/video/preprocess', options?.scenario),
          method: 'post',
          data: formData,
          signal: options?.signal,
        });

        return response.data.data;
      } catch (error) {
        throw mapVideoPreprocessApiClientError(error);
      }
    },
  };
}

export function createMockVideoPreprocessAdapter(): VideoPreprocessAdapter {
  return {
    async preprocessImage(file, options) {
      await Promise.resolve();

      const fixtureError = getVideoPreprocessFixtureError(options?.scenario);

      if (fixtureError) {
        throw createVideoPreprocessError(
          fixtureError.status,
          fixtureError.code,
          fixtureError.message,
          {
            retryable: fixtureError.retryable,
            details: fixtureError.details,
          },
        );
      }

      const successScenario =
        options?.scenario && options.scenario !== 'validation-error'
          ? options.scenario
          : 'success';

      return getMockVideoPreprocessSuccess(successScenario, file).data;
    },
  };
}

export function resolveVideoPreprocessAdapter(
  options: ResolveVideoPreprocessAdapterOptions = {},
): VideoPreprocessAdapter {
  return pickAdapterImplementation(
    {
      mock: createMockVideoPreprocessAdapter(),
      real: createRealVideoPreprocessAdapter({
        client: options.client ?? fastapiClient,
      }),
    },
    {
      useMock: options.useMock,
    },
  );
}
