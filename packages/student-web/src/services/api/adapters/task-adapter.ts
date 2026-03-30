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

export interface TaskAdapter {
  listTasks(options?: TaskQueryOptions): Promise<TaskListResult>;
  getTask(taskId: string, options?: TaskQueryOptions): Promise<TaskDetail>;
  getTaskSnapshot(taskId: string, options?: TaskQueryOptions): Promise<TaskSnapshot>;
}

function appendScenario(url: string, scenario?: TaskMockScenario) {
  if (!scenario) {
    return url;
  }

  const nextUrl = new URL(url, 'http://xiaomai.local');
  nextUrl.searchParams.set('scenario', scenario);

  return `${nextUrl.pathname}${nextUrl.search}`;
}

function mapTaskSummary(summary: TaskSummary): TaskSummary {
  return {
    ...summary
  };
}

function mapTaskDetail(detail: TaskDetail): TaskDetail {
  return {
    ...detail
  };
}

function mapTaskRowsEnvelope(envelope: TaskRowsEnvelope<TaskSummary>): TaskListResult {
  return {
    requestId: envelope.requestId ?? null,
    items: envelope.rows.map(mapTaskSummary),
    total: envelope.total
  };
}

function mapTaskDataEnvelope<T>(envelope: TaskDataEnvelope<T>) {
  return envelope.data;
}

function createTaskError(status: number, code: string, message: string) {
  return new TaskAdapterError(status, code, message);
}

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

async function requestRowsEnvelope<T>(
  client: ApiClient,
  config: ApiRequestConfig
) {
  try {
    const response = await client.request<TaskRowsEnvelope<T>>(config);

    return response.data;
  } catch (error) {
    throw mapTaskApiClientError(error);
  }
}

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

export function createRealTaskAdapter({
  client = fastapiClient
}: RealTaskAdapterOptions = {}): TaskAdapter {
  return {
    async listTasks(options) {
      const envelope = await requestRowsEnvelope<TaskSummary>(client, {
        url: appendScenario('/api/v1/tasks', options?.scenario),
        method: 'get',
        signal: options?.signal
      });

      return mapTaskRowsEnvelope(envelope);
    },
    async getTask(taskId, options) {
      const envelope = await requestDataEnvelope<TaskDetail>(client, {
        url: appendScenario(`/api/v1/tasks/${taskId}`, options?.scenario),
        method: 'get',
        signal: options?.signal
      });

      return mapTaskDetail(mapTaskDataEnvelope(envelope));
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

function runMockTaskOperation<T>(operation: () => T): Promise<T> {
  return Promise.resolve().then(operation);
}

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
