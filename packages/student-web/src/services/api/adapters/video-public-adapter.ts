/**
 * 文件说明：提供视频输入页公开视频发现区的 mock / real adapter 抽象。
 * 兼容 Story 3.6 当前 `video/public` 形态与 Epic 4 `video/published` 列表形态。
 */
import {
  type ApiClient,
  isApiClientError,
} from '@/services/api/client';
import { fastapiClient } from '@/services/api/fastapi-client';
import {
  getMockVideoPublicListSuccess,
  getVideoPublicFixtureError,
} from '@/services/mock/fixtures/video-public';
import type {
  VideoPublicCard,
  VideoPublicListEnvelope,
  VideoPublicListQuery,
  VideoPublicListResult,
  VideoPublicMockScenario,
} from '@/types/video';
import {
  readNumber,
  readRecord,
  readString,
} from '@/lib/type-guards';

import { pickAdapterImplementation } from './base-adapter';

type VideoPublicOptions = {
  signal?: AbortSignal;
  scenario?: VideoPublicMockScenario;
};

type ResolveVideoPublicAdapterOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

type RealVideoPublicAdapterOptions = {
  client?: ApiClient;
};

export class VideoPublicAdapterError extends Error {
  name = 'VideoPublicAdapterError' as const;

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

export function isVideoPublicAdapterError(
  error: unknown,
): error is VideoPublicAdapterError {
  return error instanceof VideoPublicAdapterError;
}

export interface VideoPublicAdapter {
  fetchPublicVideos(
    query?: Partial<VideoPublicListQuery>,
    options?: VideoPublicOptions,
  ): Promise<VideoPublicListResult>;
}

/**
 * 为公开视频列表请求拼接统一查询参数。
 *
 * @param path - API 路径。
 * @param query - 分页和排序参数。
 * @param scenario - mock 场景。
 * @returns 追加查询参数后的路径。
 */
function appendVideoPublicQuery(
  path: string,
  query: Partial<VideoPublicListQuery> = {},
  scenario?: VideoPublicMockScenario,
) {
  const url = new URL(path, 'http://xiaomai.local');

  url.searchParams.set('page', String(query.page ?? 1));
  url.searchParams.set('pageSize', String(query.pageSize ?? 12));
  url.searchParams.set('sort', query.sort ?? 'latest');

  if (scenario) {
    url.searchParams.set('scenario', scenario);
  }

  return `${url.pathname}${url.search}`;
}

/**
 * 创建公开视频 adapter 错误。
 *
 * @param status - HTTP 状态码。
 * @param code - 业务错误码。
 * @param message - 错误消息。
 * @param extras - 附加信息。
 * @returns 统一错误实例。
 */
function createVideoPublicError(
  status: number,
  code: string,
  message: string,
  extras: {
    retryable?: boolean;
    details?: Record<string, unknown>;
  } = {},
) {
  return new VideoPublicAdapterError(
    status,
    code,
    message,
    extras.retryable ?? false,
    extras.details ?? {},
  );
}

/**
 * 归一化单张公开视频卡片。
 *
 * @param payload - 原始卡片负载。
 * @returns 统一后的卡片；字段不完整时返回 null。
 */
function normalizePublicCard(payload: unknown): VideoPublicCard | null {
  const item = readRecord(payload);

  if (!item) {
    return null;
  }

  const videoId =
    readString(item.videoId) ??
    readString(item.resultId) ??
    readString(item.id);
  const title = readString(item.title);
  const summary =
    readString(item.summary) ??
    readString(item.description) ??
    title;
  const thumbnail =
    readString(item.thumbnail) ??
    readString(item.coverUrl) ??
    null;
  const duration = readString(item.duration);
  const viewCount = readNumber(item.viewCount) ?? 0;
  const createdAt =
    readString(item.createdAt) ??
    readString(item.publishedAt);
  const sourceText =
    readString(item.sourceText) ??
    readString(item.summary) ??
    title;
  const authorName = readString(item.authorName) ?? '小麦公开视频';
  const authorAvatar = readString(item.authorAvatar);
  const knowledgePoints = Array.isArray(item.knowledgePoints)
    ? item.knowledgePoints.filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    )
    : undefined;

  if (
    !videoId ||
    !title ||
    !summary ||
    !duration ||
    !createdAt ||
    !sourceText
  ) {
    return null;
  }

  return {
    videoId,
    title,
    summary,
    thumbnail,
    duration,
    viewCount,
    createdAt,
    sourceText,
    authorName,
    authorAvatar: authorAvatar || undefined,
    knowledgePoints,
  };
}

/**
 * 归一化公开视频列表响应。
 *
 * @param data - 原始接口响应。
 * @returns 统一后的列表结果。
 */
function normalizeVideoPublicList(data: unknown): VideoPublicListResult {
  const envelope = readRecord(data);
  const payload = readRecord(envelope?.data) ?? envelope;
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const normalizedItems = items
    .map((item) => normalizePublicCard(item))
    .filter((item): item is VideoPublicCard => item !== null);

  return {
    items: normalizedItems,
    total: readNumber(payload?.total) ?? normalizedItems.length,
    page: readNumber(payload?.page) ?? 1,
    pageSize: readNumber(payload?.pageSize) ?? normalizedItems.length,
  };
}

/**
 * 将 API Client 异常映射为公开视频 adapter 错误。
 *
 * @param error - 原始异常。
 * @returns 统一错误实例。
 */
function mapVideoPublicApiClientError(
  error: unknown,
): VideoPublicAdapterError {
  if (error instanceof VideoPublicAdapterError) {
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

    return createVideoPublicError(
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

  return createVideoPublicError(
    500,
    'VIDEO_PUBLIC_FEED_UNKNOWN',
    error instanceof Error ? error.message : '未知公开视频适配错误',
  );
}

/**
 * 请求并归一化公开视频列表。
 *
 * @param client - API Client。
 * @param path - 接口路径。
 * @param query - 查询参数。
 * @param options - 请求选项。
 * @returns 归一化后的列表结果。
 */
async function requestVideoPublicList(
  client: ApiClient,
  path: string,
  query: Partial<VideoPublicListQuery> = {},
  options?: VideoPublicOptions,
) {
  const response = await client.request<VideoPublicListEnvelope>({
    url: appendVideoPublicQuery(path, query, options?.scenario),
    method: 'get',
    signal: options?.signal,
  });

  return normalizeVideoPublicList(response.data);
}

/**
 * 创建真实公开视频 adapter。
 *
 * @param options - adapter 配置。
 * @returns 真实 adapter。
 */
export function createRealVideoPublicAdapter(
  { client = fastapiClient }: RealVideoPublicAdapterOptions = {},
): VideoPublicAdapter {
  return {
    async fetchPublicVideos(query, options) {
      try {
        return await requestVideoPublicList(
          client,
          '/api/v1/video/public',
          query,
          options,
        );
      } catch (error) {
        if (isApiClientError(error) && error.status === 404) {
          try {
            return await requestVideoPublicList(
              client,
              '/api/v1/video/published',
              query,
              {
                ...options,
                scenario: options?.scenario === 'default'
                  ? 'published-shape'
                  : options?.scenario,
              },
            );
          } catch (fallbackError) {
            throw mapVideoPublicApiClientError(fallbackError);
          }
        }

        throw mapVideoPublicApiClientError(error);
      }
    },
  };
}

/**
 * 创建本地 mock 公开视频 adapter。
 *
 * @returns mock adapter。
 */
export function createMockVideoPublicAdapter(): VideoPublicAdapter {
  return {
    async fetchPublicVideos(query, options) {
      await Promise.resolve();
      const fixtureError = getVideoPublicFixtureError(options?.scenario);

      if (fixtureError) {
        throw createVideoPublicError(
          fixtureError.status,
          fixtureError.code,
          fixtureError.message,
          {
            retryable: true,
            details: fixtureError.details,
          },
        );
      }

      const scenario =
        options?.scenario === 'empty' ? 'empty' : 'default';

      return getMockVideoPublicListSuccess(scenario, query).data;
    },
  };
}

/**
 * 根据运行模式解析公开视频 adapter。
 *
 * @param options - 解析参数。
 * @returns mock 或 real adapter。
 */
export function resolveVideoPublicAdapter(
  options: ResolveVideoPublicAdapterOptions = {},
): VideoPublicAdapter {
  return pickAdapterImplementation(
    {
      mock: createMockVideoPublicAdapter(),
      real: createRealVideoPublicAdapter({
        client: options.client ?? fastapiClient,
      }),
    },
    {
      useMock: options.useMock,
    },
  );
}
