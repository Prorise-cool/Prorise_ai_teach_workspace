/**
 * 文件说明：提供视频任务创建的 mock / real adapter 抽象。
 * Story 3.1：冻结创建接口 adapter，支持 mock 模式下完整创建 → 跳转等待页流程。
 */
import {
  type ApiClient,
  isApiClientError,
} from '@/services/api/client';
import { fastapiClient } from '@/services/api/fastapi-client';
import {
  getMockVideoTaskCreateSuccess,
  getVideoTaskFixtureError,
  throwVideoTaskFixtureError,
} from '@/services/mock/fixtures/video-task';
import type { TaskDataEnvelope, TaskSnapshot } from '@/types/task';
import type {
  VideoTaskCreateRequest,
  VideoTaskCreateResult,
  VideoTaskCreateSuccessEnvelope,
  VideoTaskMockScenario,
} from '@/types/video';
import {
  createVideoTaskAdapterError,
  VideoTaskAdapterError,
} from '@/services/api/adapters/video-task-error';

import { pickAdapterImplementation } from './base-adapter';

export {
  createVideoTaskAdapterError,
  isVideoTaskAdapterError,
  VideoTaskAdapterError,
} from './video-task-error';

/* ---------- 错误类型 ---------- */

/* ---------- 类型定义 ---------- */

type VideoTaskCreateOptions = {
  scenario?: VideoTaskMockScenario;
  signal?: AbortSignal;
};

type VideoTaskCancelOptions = {
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
  /** 取消视频任务，返回取消后的任务快照。 */
  cancelTask(
    taskId: string,
    options?: VideoTaskCancelOptions,
  ): Promise<TaskSnapshot>;
  /** 删除已完成的视频任务。 */
  deleteTask(
    taskId: string,
    options?: { signal?: AbortSignal },
  ): Promise<{ taskId: string; status: string }>;
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
  extras: {
    retryable?: boolean;
    requestId?: string | null;
    taskId?: string | null;
    details?: Record<string, unknown>;
  } = {},
) {
  return createVideoTaskAdapterError(status, code, message, extras);
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
      | {
        code?: number | string;
        msg?: string;
        data?: {
          errorCode?: string;
          error_code?: string;
          retryable?: boolean;
          requestId?: string | null;
          request_id?: string | null;
          taskId?: string | null;
          task_id?: string | null;
          details?: Record<string, unknown>;
        };
      }
      | undefined;

    return createVideoTaskError(
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
        requestId:
          payload?.data?.requestId ??
          payload?.data?.request_id ??
          null,
        taskId:
          payload?.data?.taskId ??
          payload?.data?.task_id ??
          null,
        details: payload?.data?.details,
      },
    );
  }

  if (error instanceof VideoTaskAdapterError) {
    return error;
  }

  return createVideoTaskError(
    500,
    'TASK_UNHANDLED_EXCEPTION',
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
    async cancelTask(taskId, options) {
      try {
        const response = await client.request<TaskDataEnvelope<TaskSnapshot>>({
          url: `/api/v1/video/tasks/${taskId}/cancel`,
          method: 'post',
          signal: options?.signal,
        });

        return response.data.data;
      } catch (error) {
        throw mapVideoTaskApiClientError(error);
      }
    },
    async deleteTask(taskId, options) {
      try {
        const response = await client.request<TaskDataEnvelope<{ taskId: string; status: string }>>({
          url: `/api/v1/video/tasks/${taskId}`,
          method: 'delete',
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
    cancelTask(taskId) {
      return runMockVideoTaskOperation(() => ({
        taskId,
        requestId: `req_cancel_${taskId}`,
        taskType: 'video',
        status: 'cancelled',
        progress: 0,
        message: '任务已取消',
        timestamp: new Date().toISOString(),
        currentStage: null,
        stageLabel: null,
        errorCode: 'TASK_CANCELLED',
      }));
    },
    deleteTask(taskId) {
      return runMockVideoTaskOperation(() => ({
        taskId,
        status: 'deleted',
      }));
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
