/**
 * 文件说明：封装视频任务创建的 mock / real adapter 抽象。
 * 对齐 Story 3.1 冻结的 POST /api/v1/video/tasks 契约。
 * mock 模式使用内存 fixture 返回模拟创建结果；real 模式调用 FastAPI 后端。
 */
import {
  createApiClient,
  type ApiClient,
  isApiClientError,
} from '@/services/api/client';
import { resolveFastapiBaseUrl } from '@/services/auth-consistency';
import type {
  CreateVideoTaskRequest,
  CreateVideoTaskResult,
  CreateVideoTaskEnvelope,
} from '@/types/video';

import { pickAdapterImplementation } from './base-adapter';

const fastapiClient = createApiClient({
  baseURL: resolveFastapiBaseUrl(),
});

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

/** 视频任务 adapter 接口定义。 */
export interface VideoTaskAdapter {
  /** 创建视频任务。 */
  createVideoTask(
    request: CreateVideoTaskRequest,
    signal?: AbortSignal,
  ): Promise<CreateVideoTaskResult>;
}

/**
 * 把底层 API Client 异常映射为视频任务 adapter 错误。
 *
 * @param error - 原始异常对象。
 * @returns 统一视频任务 adapter 错误。
 */
function mapVideoTaskApiError(error: unknown): VideoTaskAdapterError {
  if (isApiClientError(error)) {
    const payload = error.data as
      | { code?: number | string; msg?: string }
      | undefined;

    return new VideoTaskAdapterError(
      error.status,
      String(payload?.code ?? error.status),
      payload?.msg ?? error.message,
    );
  }

  if (error instanceof VideoTaskAdapterError) {
    return error;
  }

  return new VideoTaskAdapterError(
    500,
    '500',
    error instanceof Error ? error.message : '未知视频任务适配错误',
  );
}

/** mock 创建任务计数器，用于生成唯一 ID。 */
let mockTaskCounter = 0;

/**
 * 创建视频任务 mock adapter。
 *
 * @returns mock 视频任务 adapter。
 */
export function createMockVideoTaskAdapter(): VideoTaskAdapter {
  return {
    createVideoTask(request) {
      mockTaskCounter += 1;
      const taskId = `video_mock_${Date.now()}_${mockTaskCounter}`;

      const result: CreateVideoTaskResult = {
        taskId,
        requestId: `req_${taskId}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      /* 模拟网络延迟 300~800ms */
      const delay = 300 + Math.random() * 500;

      return new Promise((resolve) => {
        setTimeout(() => resolve(result), delay);
      });
    },
  };
}

/**
 * 创建真实视频任务 adapter。
 *
 * @param client - 可替换的 API Client。
 * @returns 真实视频任务 adapter。
 */
export function createRealVideoTaskAdapter(
  client: ApiClient = fastapiClient,
): VideoTaskAdapter {
  return {
    async createVideoTask(request, signal) {
      try {
        const response = await client.request<CreateVideoTaskEnvelope>({
          url: '/api/v1/video/tasks',
          method: 'post',
          data: request,
          signal,
        });

        return response.data.data;
      } catch (error) {
        throw mapVideoTaskApiError(error);
      }
    },
  };
}

type ResolveVideoTaskAdapterOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

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
      real: createRealVideoTaskAdapter(options.client ?? fastapiClient),
    },
    { useMock: options.useMock },
  );
}
