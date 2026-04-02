/**
 * 文件说明：提供任务列表、详情、状态快照与事件流的 mock fixture 基线。
 */
import type {
  TaskDataEnvelope,
  TaskDetail,
  TaskEventPayload,
  TaskErrorCode,
  TaskLifecycleStatus,
  TaskListResult,
  TaskMockScenario,
  TaskSnapshot,
  TaskRowsEnvelope,
  TaskSummary,
} from "@/types/task";
import { readNumber, readRecord, readString } from "@/lib/type-guards";

const FIXTURE_TIMESTAMP = "2026-03-30T13:05:00Z";
const TASK_TYPE = "video";

type TaskFixtureError = {
  status: number;
  code: string;
  message: string;
};

function buildTaskSummary(
  id: string,
  status: TaskLifecycleStatus,
  progress: number,
  requestId: string,
  message: string,
  errorCode: TaskErrorCode | null = null,
): TaskSummary {
  return {
    id,
    taskId: id,
    requestId,
    title: `任务 ${id}`,
    taskType: TASK_TYPE,
    status,
    progress,
    message,
    timestamp: FIXTURE_TIMESTAMP,
    errorCode,
  };
}

function buildTaskDetail(
  id: string,
  status: TaskLifecycleStatus,
  progress: number,
  requestId: string,
  message: string,
  errorCode: TaskErrorCode | null = null,
): TaskDetail {
  const summary = buildTaskSummary(
    id,
    status,
    progress,
    requestId,
    message,
    errorCode,
  );

  return {
    ...summary,
    description: `${summary.title} 的 mock 详情`,
    resultUrl:
      status === "completed"
        ? `https://static.prorise.test/results/${id}.mp4`
        : null,
    errorCode,
  };
}

function buildTaskSnapshot(detail: TaskDetail): TaskSnapshot {
  return {
    taskId: detail.taskId,
    requestId: detail.requestId,
    taskType: detail.taskType,
    status: detail.status,
    progress: detail.progress,
    message: detail.message,
    timestamp: detail.timestamp,
    errorCode: detail.errorCode,
  };
}

function buildTaskDataEnvelope<T>(data: T, msg: string): TaskDataEnvelope<T> {
  return {
    code: 200,
    msg,
    data,
  };
}

function buildTaskRowsEnvelope(
  result: TaskListResult,
  msg = "获取任务列表成功",
): TaskRowsEnvelope<TaskSummary> {
  return {
    code: 200,
    msg,
    rows: result.items,
    total: result.total,
    requestId: result.requestId,
  };
}

const taskSummaries = {
  pending: buildTaskSummary(
    "task_mock_pending",
    "pending",
    0,
    "req_task_pending",
    "任务已创建，等待调度",
  ),
  processing: buildTaskSummary(
    "task_mock_processing",
    "processing",
    42,
    "req_task_processing",
    "任务处理中状态已同步",
  ),
  completed: buildTaskSummary(
    "task_mock_completed",
    "completed",
    100,
    "req_task_completed",
    "任务执行完成",
  ),
  failed: buildTaskSummary(
    "task_mock_failed",
    "failed",
    87,
    "req_task_failed",
    "任务执行失败",
    "TASK_PROVIDER_TIMEOUT",
  ),
  cancelled: buildTaskSummary(
    "task_mock_cancelled",
    "cancelled",
    0,
    "req_task_cancelled",
    "任务已取消",
    "TASK_CANCELLED",
  ),
} as const;

const taskDetails = {
  pending: buildTaskDetail(
    "task_mock_pending",
    "pending",
    0,
    "req_task_pending",
    "任务已创建，等待调度",
  ),
  processing: buildTaskDetail(
    "task_mock_processing",
    "processing",
    42,
    "req_task_processing",
    "任务处理中状态已同步",
  ),
  completed: buildTaskDetail(
    "task_mock_completed",
    "completed",
    100,
    "req_task_completed",
    "任务执行完成",
  ),
  failed: buildTaskDetail(
    "task_mock_failed",
    "failed",
    87,
    "req_task_failed",
    "任务执行失败",
    "TASK_PROVIDER_TIMEOUT",
  ),
  cancelled: buildTaskDetail(
    "task_mock_cancelled",
    "cancelled",
    0,
    "req_task_cancelled",
    "任务已取消",
    "TASK_CANCELLED",
  ),
} as const;

export const taskMockFixtures = {
  lists: {
    default: {
      requestId: "req_task_list_default",
      items: [
        taskSummaries.processing,
        taskSummaries.completed,
        taskSummaries.failed,
      ],
      total: 3,
    } satisfies TaskListResult,
    empty: {
      requestId: "req_task_list_empty",
      items: [],
      total: 0,
    } satisfies TaskListResult,
  },
  details: taskDetails,
  errors: {
    unauthorized: {
      status: 401,
      code: "401",
      message: "当前会话已失效，请重新登录",
    } satisfies TaskFixtureError,
    forbidden: {
      status: 403,
      code: "403",
      message: "当前账号暂无任务访问权限",
    } satisfies TaskFixtureError,
    notFound: {
      status: 404,
      code: "404",
      message: "未找到对应任务",
    } satisfies TaskFixtureError,
  },
} as const;

function getTaskFixtureError(scenario: TaskMockScenario | undefined) {
  if (scenario === "unauthorized") {
    return taskMockFixtures.errors.unauthorized;
  }

  if (scenario === "forbidden") {
    return taskMockFixtures.errors.forbidden;
  }

  return null;
}

function throwTaskFixtureError(error: TaskFixtureError): never {
  const taskError = new Error(error.message);

  Object.assign(taskError, {
    name: "TaskAdapterError",
    status: error.status,
    code: error.code,
  });

  throw taskError;
}

function resolveDetailFixtureById(taskId: string) {
  if (taskId === taskDetails.pending.id) {
    return taskDetails.pending;
  }

  if (taskId === taskDetails.processing.id) {
    return taskDetails.processing;
  }

  if (taskId === taskDetails.completed.id) {
    return taskDetails.completed;
  }

  if (taskId === taskDetails.failed.id) {
    return taskDetails.failed;
  }

  if (taskId === taskDetails.cancelled.id) {
    return taskDetails.cancelled;
  }

  return null;
}

function resolveScenarioDetail(
  scenario: TaskMockScenario | undefined,
  taskId?: string,
) {
  if (scenario === "pending") {
    return taskDetails.pending;
  }

  if (scenario === "processing") {
    return taskDetails.processing;
  }

  if (scenario === "completed") {
    return taskDetails.completed;
  }

  if (scenario === "failed") {
    return taskDetails.failed;
  }

  if (scenario === "cancelled") {
    return taskDetails.cancelled;
  }

  if (taskId) {
    return resolveDetailFixtureById(taskId);
  }

  return taskDetails.processing;
}

export function getMockTaskListEnvelope(
  scenario: TaskMockScenario = "default",
): TaskRowsEnvelope<TaskSummary> {
  const error = getTaskFixtureError(scenario);

  if (error) {
    throwTaskFixtureError(error);
  }

  if (scenario === "empty") {
    return buildTaskRowsEnvelope(taskMockFixtures.lists.empty, "当前暂无任务");
  }

  return buildTaskRowsEnvelope(taskMockFixtures.lists.default);
}

export function getMockTaskDetailEnvelope(
  taskId: string,
  scenario?: TaskMockScenario,
): TaskDataEnvelope<TaskDetail> {
  const error = getTaskFixtureError(scenario);

  if (error) {
    throwTaskFixtureError(error);
  }

  const detail = resolveScenarioDetail(scenario, taskId);

  if (!detail) {
    throwTaskFixtureError(taskMockFixtures.errors.notFound);
  }

  return buildTaskDataEnvelope(detail, "获取任务详情成功");
}

export function getMockTaskSnapshotEnvelope(
  taskId: string,
  scenario?: TaskMockScenario,
): TaskDataEnvelope<TaskSnapshot> {
  const detailEnvelope = getMockTaskDetailEnvelope(taskId, scenario);

  return buildTaskDataEnvelope(
    buildTaskSnapshot(detailEnvelope.data),
    "获取任务快照成功",
  );
}

export function getMockTaskEventSequence(
  taskId: string,
  scenario?: TaskMockScenario,
): TaskEventPayload[] {
  const detail = resolveScenarioDetail(scenario, taskId);

  if (!detail) {
    throwTaskFixtureError(taskMockFixtures.errors.notFound);
  }

  const baseEvents: TaskEventPayload[] = [
    {
      event: "connected",
      taskId: detail.taskId,
      requestId: detail.requestId,
      taskType: detail.taskType,
      status: "pending",
      progress: 0,
      message: "SSE mock 已建立连接",
      timestamp: FIXTURE_TIMESTAMP,
    },
    {
      event: "progress",
      taskId: detail.taskId,
      requestId: detail.requestId,
      taskType: detail.taskType,
      status: "processing",
      progress: Math.max(15, detail.progress - 20),
      message: "任务进入处理中",
      timestamp: FIXTURE_TIMESTAMP,
    },
    {
      event: "heartbeat",
      taskId: detail.taskId,
      requestId: detail.requestId,
      taskType: detail.taskType,
      status: "processing",
      progress: Math.max(30, detail.progress - 10),
      message: "任务仍在执行中",
      timestamp: FIXTURE_TIMESTAMP,
    },
  ];

  if (detail.status === "failed") {
    return [
      ...baseEvents,
      {
        event: "failed",
        taskId: detail.taskId,
        requestId: detail.requestId,
        taskType: detail.taskType,
        status: "failed",
        progress: 100,
        message: detail.message,
        timestamp: FIXTURE_TIMESTAMP,
        errorCode: detail.errorCode,
      },
    ];
  }

  if (detail.status === "completed") {
    return [
      ...baseEvents,
      {
        event: "completed",
        taskId: detail.taskId,
        requestId: detail.requestId,
        taskType: detail.taskType,
        status: "completed",
        progress: 100,
        message: detail.message,
        timestamp: FIXTURE_TIMESTAMP,
      },
    ];
  }

  if (detail.status === "cancelled") {
    return [
      ...baseEvents,
      {
        event: "snapshot",
        taskId: detail.taskId,
        requestId: detail.requestId,
        taskType: detail.taskType,
        status: "cancelled",
        progress: 0,
        message: detail.message,
        timestamp: FIXTURE_TIMESTAMP,
        errorCode: detail.errorCode,
      },
    ];
  }

  return [
    ...baseEvents,
    {
      event: "progress",
      taskId: detail.taskId,
      requestId: detail.requestId,
      taskType: detail.taskType,
      status: "processing",
      progress: detail.progress,
      message: detail.message,
      timestamp: FIXTURE_TIMESTAMP,
    },
  ];
}

export function normalizeMockTaskError(error: unknown) {
  const candidate = readRecord(error);

  if (candidate) {
    const status = readNumber(candidate.status);
    const code = readString(candidate.code);
    const message = readString(candidate.message);

    if (status !== undefined && code !== undefined && message !== undefined) {
      return {
        status,
        code,
        message,
      } satisfies TaskFixtureError;
    }
  }

  return {
    status: 500,
    code: "500",
    message: error instanceof Error ? error.message : "未知任务 mock 错误",
  } satisfies TaskFixtureError;
}
