/**
 * 文件说明：提供任务列表、详情、状态快照与事件流的 mock fixture 基线。
 */
import type {
  TaskDataEnvelope,
  TaskDetail,
  TaskEventPayload,
  TaskLifecycleStatus,
  TaskListResult,
  TaskMockScenario,
  TaskRowsEnvelope,
  TaskSnapshot,
  TaskSummary
} from '@/types/task';

const FIXTURE_UPDATED_AT = '2026-03-29T16:30:00+08:00';
const TASK_TYPE = 'video';

type TaskFixtureError = {
  status: number;
  code: string;
  message: string;
};

function buildTaskSummary(
  id: string,
  status: TaskLifecycleStatus,
  progress: number,
  requestId: string
): TaskSummary {
  return {
    id,
    taskId: id,
    requestId,
    title: `任务 ${id}`,
    taskType: TASK_TYPE,
    status,
    progress,
    updatedAt: FIXTURE_UPDATED_AT
  };
}

function buildTaskDetail(
  id: string,
  status: TaskLifecycleStatus,
  progress: number,
  requestId: string
): TaskDetail {
  const summary = buildTaskSummary(id, status, progress, requestId);

  return {
    ...summary,
    description: `${summary.title} 的 mock 详情`,
    resultUrl:
      status === 'completed'
        ? `https://static.prorise.test/results/${id}.mp4`
        : null,
    errorCode: status === 'failed' ? 'TASK_PROVIDER_TIMEOUT' : null
  };
}

function buildTaskDataEnvelope<T>(data: T, msg: string): TaskDataEnvelope<T> {
  return {
    code: 200,
    msg,
    data
  };
}

function buildTaskRowsEnvelope(
  result: TaskListResult,
  msg = '获取任务列表成功'
): TaskRowsEnvelope<TaskSummary> {
  return {
    code: 200,
    msg,
    rows: result.items,
    total: result.total,
    requestId: result.requestId
  };
}

const taskSummaries = {
  processing: buildTaskSummary('task_mock_processing', 'processing', 42, 'req_task_processing'),
  completed: buildTaskSummary('task_mock_completed', 'completed', 100, 'req_task_completed'),
  failed: buildTaskSummary('task_mock_failed', 'failed', 87, 'req_task_failed')
} as const;

const taskDetails = {
  processing: buildTaskDetail('task_mock_processing', 'processing', 42, 'req_task_processing'),
  completed: buildTaskDetail('task_mock_completed', 'completed', 100, 'req_task_completed'),
  failed: buildTaskDetail('task_mock_failed', 'failed', 87, 'req_task_failed')
} as const;

export const taskMockFixtures = {
  lists: {
    default: {
      requestId: 'req_task_list_default',
      items: [
        taskSummaries.processing,
        taskSummaries.completed,
        taskSummaries.failed
      ],
      total: 3
    } satisfies TaskListResult,
    empty: {
      requestId: 'req_task_list_empty',
      items: [],
      total: 0
    } satisfies TaskListResult
  },
  details: taskDetails,
  errors: {
    unauthorized: {
      status: 401,
      code: '401',
      message: '当前会话已失效，请重新登录'
    } satisfies TaskFixtureError,
    forbidden: {
      status: 403,
      code: '403',
      message: '当前账号暂无任务访问权限'
    } satisfies TaskFixtureError,
    notFound: {
      status: 404,
      code: '404',
      message: '未找到对应任务'
    } satisfies TaskFixtureError
  }
} as const;

function getTaskFixtureError(scenario: TaskMockScenario | undefined) {
  if (scenario === 'unauthorized') {
    return taskMockFixtures.errors.unauthorized;
  }

  if (scenario === 'forbidden') {
    return taskMockFixtures.errors.forbidden;
  }

  return null;
}

function throwTaskFixtureError(error: TaskFixtureError): never {
  const taskError = new Error(error.message);

  Object.assign(taskError, {
    name: 'TaskAdapterError',
    status: error.status,
    code: error.code
  });

  throw taskError;
}

function resolveDetailFixtureById(taskId: string) {
  if (taskId === taskDetails.processing.id) {
    return taskDetails.processing;
  }

  if (taskId === taskDetails.completed.id) {
    return taskDetails.completed;
  }

  if (taskId === taskDetails.failed.id) {
    return taskDetails.failed;
  }

  return null;
}

function resolveScenarioDetail(
  scenario: TaskMockScenario | undefined,
  taskId?: string
) {
  if (scenario === 'processing') {
    return taskDetails.processing;
  }

  if (scenario === 'completed') {
    return taskDetails.completed;
  }

  if (scenario === 'failed') {
    return taskDetails.failed;
  }

  if (taskId) {
    return resolveDetailFixtureById(taskId);
  }

  return taskDetails.processing;
}

export function getMockTaskListEnvelope(
  scenario: TaskMockScenario = 'default'
): TaskRowsEnvelope<TaskSummary> {
  const error = getTaskFixtureError(scenario);

  if (error) {
    throwTaskFixtureError(error);
  }

  if (scenario === 'empty') {
    return buildTaskRowsEnvelope(taskMockFixtures.lists.empty, '当前暂无任务');
  }

  return buildTaskRowsEnvelope(taskMockFixtures.lists.default);
}

export function getMockTaskDetailEnvelope(
  taskId: string,
  scenario?: TaskMockScenario
): TaskDataEnvelope<TaskDetail> {
  const error = getTaskFixtureError(scenario);

  if (error) {
    throwTaskFixtureError(error);
  }

  const detail = resolveScenarioDetail(scenario, taskId);

  if (!detail) {
    throwTaskFixtureError(taskMockFixtures.errors.notFound);
  }

  return buildTaskDataEnvelope(detail, '获取任务详情成功');
}

export function getMockTaskSnapshotEnvelope(
  taskId: string,
  scenario?: TaskMockScenario
): TaskDataEnvelope<TaskSnapshot> {
  const detailEnvelope = getMockTaskDetailEnvelope(taskId, scenario);

  return buildTaskDataEnvelope(
    {
      requestId: detailEnvelope.data.requestId,
      task: detailEnvelope.data
    },
    '获取任务快照成功'
  );
}

export function getMockTaskEventSequence(
  taskId: string,
  scenario?: TaskMockScenario
): TaskEventPayload[] {
  const detail = resolveScenarioDetail(scenario, taskId);

  if (!detail) {
    throwTaskFixtureError(taskMockFixtures.errors.notFound);
  }

  const baseEvents: TaskEventPayload[] = [
    {
      event: 'connected',
      taskId: detail.taskId,
      requestId: detail.requestId,
      taskType: detail.taskType,
      status: 'processing',
      progress: 0,
      message: 'SSE mock 已建立连接',
      timestamp: FIXTURE_UPDATED_AT
    },
    {
      event: 'progress',
      taskId: detail.taskId,
      requestId: detail.requestId,
      taskType: detail.taskType,
      status: 'processing',
      progress: Math.max(15, detail.progress - 20),
      message: '任务进入处理中',
      timestamp: FIXTURE_UPDATED_AT
    },
    {
      event: 'heartbeat',
      taskId: detail.taskId,
      requestId: detail.requestId,
      taskType: detail.taskType,
      status: 'processing',
      progress: Math.max(30, detail.progress - 10),
      message: '任务仍在执行中',
      timestamp: FIXTURE_UPDATED_AT
    }
  ];

  if (detail.status === 'failed') {
    return [
      ...baseEvents,
      {
        event: 'failed',
        taskId: detail.taskId,
        requestId: detail.requestId,
        taskType: detail.taskType,
        status: 'failed',
        progress: 100,
        message: '任务执行失败',
        timestamp: FIXTURE_UPDATED_AT,
        errorCode: detail.errorCode
      }
    ];
  }

  if (detail.status === 'completed') {
    return [
      ...baseEvents,
      {
        event: 'completed',
        taskId: detail.taskId,
        requestId: detail.requestId,
        taskType: detail.taskType,
        status: 'completed',
        progress: 100,
        message: '任务执行完成',
        timestamp: FIXTURE_UPDATED_AT
      }
    ];
  }

  return [
    ...baseEvents,
    {
      event: 'progress',
      taskId: detail.taskId,
      requestId: detail.requestId,
      taskType: detail.taskType,
      status: 'processing',
      progress: detail.progress,
      message: '任务处理中状态已同步',
      timestamp: FIXTURE_UPDATED_AT
    }
  ];
}

export function normalizeMockTaskError(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    'code' in error &&
    'message' in error
  ) {
    return error as TaskFixtureError;
  }

  return {
    status: 500,
    code: '500',
    message: error instanceof Error ? error.message : '未知任务 mock 错误'
  } satisfies TaskFixtureError;
}
