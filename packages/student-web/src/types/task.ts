/**
 * 文件说明：定义任务列表、详情、状态快照与 SSE 事件的稳定领域类型。
 */

export const TASK_SUCCESS_CODE = 200;
export const TASK_UNAUTHORIZED_STATUS = 401;
export const TASK_FORBIDDEN_STATUS = 403;

export const TASK_STATUS_VALUES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;

export type TaskLifecycleStatus = (typeof TASK_STATUS_VALUES)[number];

export const TASK_TERMINAL_STATUS_VALUES = [
  "completed",
  "failed",
  "cancelled",
] as const;

export const TASK_ERROR_CODE_VALUES = [
  "TASK_INVALID_INPUT",
  "TASK_PROVIDER_UNAVAILABLE",
  "TASK_PROVIDER_TIMEOUT",
  "TASK_PROVIDER_ALL_FAILED",
  "TASK_CANCELLED",
  "TASK_UNHANDLED_EXCEPTION",
] as const;

export type TaskErrorCode = (typeof TASK_ERROR_CODE_VALUES)[number];

export const TASK_EVENT_NAME_VALUES = [
  "connected",
  "progress",
  "section_progress",
  "section_ready",
  "provider_switch",
  "completed",
  "failed",
  "cancelled",
  "heartbeat",
  "snapshot",
  "ready",
  "error",
] as const;

export type TaskEventName = (typeof TASK_EVENT_NAME_VALUES)[number];

export type TaskMockScenario =
  | "default"
  | "empty"
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "snapshot"
  | "provider_switch"
  | "unauthorized"
  | "forbidden";

export const TASK_MOCK_SCENARIO_VALUES = [
  "default",
  "empty",
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
  "snapshot",
  "provider_switch",
  "unauthorized",
  "forbidden",
] as const satisfies ReadonlyArray<TaskMockScenario>;

/**
 * 判断值是否为受支持的任务 mock 场景。
 *
 * @param value - 待判断值。
 * @returns 是否为 `TaskMockScenario`。
 */
export function isTaskMockScenario(value: unknown): value is TaskMockScenario {
  return TASK_MOCK_SCENARIO_VALUES.some((scenario) => scenario === value);
}

export const TASK_EVENT_ID_SEPARATOR = ":evt:";

export interface TaskRuntimeState {
  taskId: string;
  requestId: string | null;
  taskType: string;
  status: TaskLifecycleStatus;
  progress: number;
  message: string;
  timestamp: string;
  stage?: string | null;
  currentStage?: string | null;
  stageLabel?: string | null;
  stageProgress?: number | null;
  errorCode?: TaskErrorCode | null;
  context?: Record<string, unknown>;
}

export interface TaskSummary extends TaskRuntimeState {
  id: string;
  title: string;
}

export interface TaskDetail extends TaskSummary {
  description: string;
  resultUrl: string | null;
}

export interface TaskSnapshot extends TaskRuntimeState {
  resumeFrom?: string | null;
  lastEventId?: string | null;
}

export interface TaskListResult {
  requestId: string | null;
  items: TaskSummary[];
  total: number;
}

export interface TaskEventPayload extends TaskRuntimeState {
  id?: string;
  sequence?: number;
  event: TaskEventName;
  from?: string | null;
  to?: string | null;
  reason?: string | null;
  result?: Record<string, unknown> | null;
  resumeFrom?: string | null;
}

export interface TaskStreamEventPayload extends TaskEventPayload {
  id: string;
  sequence: number;
}

export interface TaskDataEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

export interface TaskRowsEnvelope<T> {
  code: number;
  msg: string;
  rows: T[];
  total: number;
  requestId: string | null;
}
