/**
 * 文件说明：提供任务列表、详情与状态快照的 mock / real adapter 抽象。
 */
import {
  createApiClient,
  type ApiClient,
  type ApiRequestConfig,
  isApiClientError
} from '@/services/api/client';
import {
  getMockTaskDetailEnvelope,
  getMockTaskListEnvelope,
  getMockTaskSnapshotEnvelope
} from '@/services/mock/fixtures/task';
import type {
  TaskDataEnvelope,
  TaskDetail,
  TaskListResult,
  TaskMockScenario,
  TaskRowsEnvelope,
  TaskSnapshot,
  TaskSummary
} from '@/types/task';

import {
  pickAdapterImplementation
} from './base-adapter';

const fastapiClient = createApiClient({
  baseURL: import.meta.env.VITE_FASTAPI_BASE_URL
});

export class TaskAdapterError extends Error {
  name = 'TaskAdapterError' as const;

  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

type TaskQueryOptions = {
  scenario?: TaskMockScenario;
  signal?: AbortSignal;
};

type ResolveTaskAdapterOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

type RealTaskAdapterOptions = {
  client?: ApiClient;
};

const TASK_OPERATION_UNSUPPORTED_CODE = 'TASK_OPERATION_UNSUPPORTED';

export interface TaskAdapter {
  listTasks(options?: TaskQueryOptions): Promise<TaskListResult>;
  getTask(taskId: string, options?: TaskQueryOptions): Promise<TaskDetail>;
  getTaskSnapshot(taskId: string, options?: TaskQueryOptions): Promise<TaskSnapshot>;
}

/**
 * 在请求 URL 上附加 mock 场景查询参数。
 *
 * @param url - 原始请求地址。
 * @param scenario - mock 场景标识。
 * @returns 附加场景后的请求地址。
 */
function appendScenario(url: string, scenario?: TaskMockScenario) {
  if (!scenario) {
    return url;
  }

  const nextUrl = new URL(url, 'http://xiaomai.local');
  nextUrl.searchParams.set('scenario', scenario);

  return `${nextUrl.pathname}${nextUrl.search}`;
}

/**
 * 映射任务摘要对象，便于后续集中扩展字段转换。
 *
 * @param summary - 原始任务摘要。
 * @returns 映射后的任务摘要。
 */
function mapTaskSummary(summary: TaskSummary): TaskSummary {
  return {
    ...summary
  };
}

/**
 * 映射任务详情对象，便于后续集中扩展字段转换。
 *
 * @param detail - 原始任务详情。
 * @returns 映射后的任务详情。
 */
function mapTaskDetail(detail: TaskDetail): TaskDetail {
  return {
    ...detail
  };
}

/**
 * 把表格型任务响应包转换为任务列表结果。
 *
 * @param envelope - 任务列表响应包。
 * @returns 任务列表结果。
 */
function mapTaskRowsEnvelope(envelope: TaskRowsEnvelope<TaskSummary>): TaskListResult {
  return {
    requestId: envelope.requestId ?? null,
    items: envelope.rows.map(mapTaskSummary),
    total: envelope.total
  };
}

/**
 * 从数据响应包中提取真实业务数据。
 *
 * @param envelope - 数据响应包。
 * @returns 解包后的业务数据。
 */
function mapTaskDataEnvelope<T>(envelope: TaskDataEnvelope<T>) {
  return envelope.data;
}

/**
 * 创建统一任务 adapter 错误对象。
 *
 * @param status - 错误状态码。
 * @param code - 业务错误码。
 * @param message - 错误消息。
 * @returns 统一任务 adapter 错误。
 */
function createTaskError(status: number, code: string, message: string) {
  return new TaskAdapterError(status, code, message);
}

/**
 * 创建当前尚未开放的任务接口错误。
 *
 * @param operation - 未支持的任务操作类型。
 * @returns 统一任务 adapter 错误。
 */
function createUnsupportedTaskOperationError(operation: 'list' | 'detail') {
  const label = operation === 'list' ? '列表' : '详情';

  return createTaskError(
    501,
    TASK_OPERATION_UNSUPPORTED_CODE,
    `FastAPI 当前仅提供任务恢复端点，任务${label}接口尚未实现`
  );
}

/**
 * 把底层 API Client 异常映射为任务 adapter 错误。
 *
 * @param error - 原始异常对象。
 * @returns 统一任务 adapter 错误。
 */
function mapTaskApiClientError(error: unknown): TaskAdapterError {
  if (isApiClientError(error)) {
    const payload = error.data as
      | {
          code?: number | string;
          msg?: string;
        }
      | undefined;

    return createTaskError(
      error.status,
      String(payload?.code ?? error.status),
      payload?.msg ?? error.message
    );
  }

  if (error instanceof TaskAdapterError) {
    return error;
  }

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    'code' in error &&
    'message' in error
  ) {
    return createTaskError(
      Number(error.status),
      String(error.code),
      String(error.message)
    );
  }

  return createTaskError(500, '500', error instanceof Error ? error.message : '未知任务适配错误');
}

/**
 * 发送任务接口请求，并从数据响应包中取出业务数据。
 *
 * @param client - API Client 实例。
 * @param config - 请求配置。
 * @returns 解包后的业务数据。
 */
async function requestDataEnvelope<T>(
  client: ApiClient,
  config: ApiRequestConfig
) {
  try {
    const response = await client.request<TaskDataEnvelope<T>>(config);

    return response.data;
  } catch (error) {
    throw mapTaskApiClientError(error);
  }
}

/**
 * 创建真实任务 adapter。
 *
 * @param options - 真实 adapter 参数。
 * @param options.client - 可替换的 API Client。
 * @returns 真实任务 adapter。
 */
export function createRealTaskAdapter({
  client = fastapiClient
}: RealTaskAdapterOptions = {}): TaskAdapter {
  return {
    listTasks() {
      return Promise.reject(createUnsupportedTaskOperationError('list'));
    },
    getTask() {
      return Promise.reject(createUnsupportedTaskOperationError('detail'));
    },
    async getTaskSnapshot(taskId, options) {
      const envelope = await requestDataEnvelope<TaskSnapshot>(client, {
        url: appendScenario(`/api/v1/tasks/${taskId}/status`, options?.scenario),
        method: 'get',
        signal: options?.signal
      });

      return mapTaskDataEnvelope(envelope);
    }
  };
}

/**
 * 在微任务中执行 mock 任务逻辑，模拟异步接口语义。
 *
 * @param operation - 需要执行的 mock 操作。
 * @returns 异步化后的 mock 执行结果。
 */
function runMockTaskOperation<T>(operation: () => T): Promise<T> {
  return Promise.resolve().then(operation);
}

/**
 * 创建本地 mock 任务 adapter。
 *
 * @returns mock 任务 adapter。
 */
export function createMockTaskAdapter(): TaskAdapter {
  return {
    listTasks(options) {
      return runMockTaskOperation(() =>
        mapTaskRowsEnvelope(getMockTaskListEnvelope(options?.scenario))
      );
    },
    getTask(taskId, options) {
      return runMockTaskOperation(() =>
        mapTaskDetail(getMockTaskDetailEnvelope(taskId, options?.scenario).data)
      );
    },
    getTaskSnapshot(taskId, options) {
      return runMockTaskOperation(() =>
        getMockTaskSnapshotEnvelope(taskId, options?.scenario).data
      );
    }
  };
}

/**
 * 根据运行模式选择 mock 或 real 任务 adapter。
 *
 * @param options - 任务 adapter 解析参数。
 * @returns 当前运行模式对应的任务 adapter。
 */
export function resolveTaskAdapter(
  options: ResolveTaskAdapterOptions = {}
): TaskAdapter {
  return pickAdapterImplementation(
    {
      mock: createMockTaskAdapter(),
      real: createRealTaskAdapter({
        client: options.client ?? fastapiClient
      })
    },
    {
      useMock: options.useMock
    }
  );
}
