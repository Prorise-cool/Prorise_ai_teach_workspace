/**
 * 文件说明：提供视频任务创建的 mock / real adapter 抽象。
 * Story 3.1：冻结创建接口 adapter，支持 mock 模式下完整创建 → 跳转等待页流程。
 */
import {
  createApiClient,
  type ApiClient,
  isApiClientError,
} from '@/services/api/client';
import { resolveFastapiBaseUrl } from '@/services/auth-consistency';
import {
  getMockVideoTaskCreateError,
  getMockVideoTaskCreateSuccess,
  getVideoTaskFixtureError,
  throwVideoTaskFixtureError,
} from '@/services/mock/fixtures/video-task';
import type {
  VideoTaskCreateRequest,
  VideoTaskCreateResult,
  VideoTaskCreateSuccessEnvelope,
  VideoTaskCreateErrorEnvelope,
  VideoTaskMockScenario,
} from '@/types/video';

import { pickAdapterImplementation } from './base-adapter';

const fastapiClient = createApiClient({
  baseURL: resolveFastapiBaseUrl(),
});

/* ---------- 错误类型 ---------- */

/** 视频任务 adapter 统一错误。 */
export class VideoTaskAdapterError extends Error {
  name = 'VideoTaskAdapterError' as const;

  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 判断异常是否为视频任务 adapter 错误。
 *
 * @param error - 待判断异常。
 * @returns 是否为 VideoTaskAdapterError。
 */
export function isVideoTaskAdapterError(
  error: unknown,
): error is VideoTaskAdapterError {
  return error instanceof VideoTaskAdapterError;
}

/* ---------- 类型定义 ---------- */

type VideoTaskCreateOptions = {
  scenario?: VideoTaskMockScenario;
  signal?: AbortSignal;
};

type ResolveVideoTaskAdapterOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

type RealVideoTaskAdapterOptions = {
  client?: ApiClient;
};

/** 视频任务 adapter 接口。 */
export interface VideoTaskAdapter {
  /** 创建视频任务，返回创建成功的任务数据。 */
  createTask(
    request: VideoTaskCreateRequest,
    options?: VideoTaskCreateOptions,
  ): Promise<VideoTaskCreateResult>;
}

/* ---------- 辅助函数 ---------- */

/**
 * 创建视频任务 adapter 错误。
 *
 * @param status - HTTP 状态码。
 * @param code - 业务错误码。
 * @param message - 错误消息。
 * @returns VideoTaskAdapterError。
 */
function createVideoTaskError(
  status: number,
  code: string,
  message: string,
) {
  return new VideoTaskAdapterError(status, code, message);
}

/**
 * 把底层 API Client 异常映射为视频任务 adapter 错误。
 *
 * @param error - 原始异常。
 * @returns VideoTaskAdapterError。
 */
function mapVideoTaskApiClientError(
  error: unknown,
): VideoTaskAdapterError {
  if (isApiClientError(error)) {
    const payload = error.data as
      | { code?: number | string; msg?: string; data?: { errorCode?: string } }
      | undefined;

    return createVideoTaskError(
      error.status,
      String(payload?.data?.errorCode ?? payload?.code ?? error.status),
      payload?.msg ?? error.message,
    );
  }

  if (error instanceof VideoTaskAdapterError) {
    return error;
  }

  return createVideoTaskError(
    500,
    '500',
    error instanceof Error ? error.message : '未知视频任务适配错误',
  );
}

/**
 * 在请求 URL 上附加 mock 场景查询参数。
 *
 * @param url - 原始请求地址。
 * @param scenario - mock 场景标识。
 * @returns 附加场景后的请求地址。
 */
function appendVideoScenario(url: string, scenario?: VideoTaskMockScenario) {
  if (!scenario) {
    return url;
  }

  const nextUrl = new URL(url, 'http://xiaomai.local');

  nextUrl.searchParams.set('scenario', scenario);

  return `${nextUrl.pathname}${nextUrl.search}`;
}

/* ---------- Real Adapter ---------- */

/**
 * 创建真实视频任务 adapter。
 *
 * @param options - 真实 adapter 参数。
 * @returns 真实视频任务 adapter。
 */
export function createRealVideoTaskAdapter(
  { client = fastapiClient }: RealVideoTaskAdapterOptions = {},
): VideoTaskAdapter {
  return {
    async createTask(request, options) {
      try {
        const response = await client.request<VideoTaskCreateSuccessEnvelope>({
          url: appendVideoScenario('/api/v1/video/tasks', options?.scenario),
          method: 'post',
          data: request,
          signal: options?.signal,
        });

        return response.data.data;
      } catch (error) {
        throw mapVideoTaskApiClientError(error);
      }
    },
  };
}

/* ---------- Mock Adapter ---------- */

/**
 * 在微任务中执行 mock 视频任务逻辑，模拟异步接口语义。
 *
 * @param operation - 需要执行的 mock 操作。
 * @returns 异步化后的 mock 执行结果。
 */
function runMockVideoTaskOperation<T>(operation: () => T): Promise<T> {
  return Promise.resolve().then(operation);
}

/**
 * 创建本地 mock 视频任务 adapter。
 *
 * @returns mock 视频任务 adapter。
 */
export function createMockVideoTaskAdapter(): VideoTaskAdapter {
  return {
    createTask(request, options) {
      return runMockVideoTaskOperation(() => {
        /* 检查是否为错误场景 */
        const fixtureError = getVideoTaskFixtureError(options?.scenario);

        if (fixtureError) {
          throwVideoTaskFixtureError(fixtureError);
        }

        /* 根据 inputType 选择成功场景 */
        const successScenario =
          request.inputType === 'image' ? 'image-success' : 'text-success';
        const envelope = getMockVideoTaskCreateSuccess(
          successScenario,
          request,
        );

        return envelope.data;
      });
    },
  };
}

/* ---------- Resolver ---------- */

/**
 * 根据运行模式选择 mock 或 real 视频任务 adapter。
 *
 * @param options - 视频任务 adapter 解析参数。
 * @returns 当前运行模式对应的视频任务 adapter。
 */
export function resolveVideoTaskAdapter(
  options: ResolveVideoTaskAdapterOptions = {},
): VideoTaskAdapter {
  return pickAdapterImplementation(
    {
      mock: createMockVideoTaskAdapter(),
      real: createRealVideoTaskAdapter({
        client: options.client ?? fastapiClient,
      }),
    },
    {
      useMock: options.useMock,
    },
  );
}
