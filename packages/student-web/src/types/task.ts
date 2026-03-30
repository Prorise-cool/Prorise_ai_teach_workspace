/**
 * 文件说明：定义任务列表、详情、状态快照与 SSE 事件的稳定领域类型。
 */

export const TASK_SUCCESS_CODE = 200;
export const TASK_UNAUTHORIZED_STATUS = 401;
export const TASK_FORBIDDEN_STATUS = 403;

export const TASK_STATUS_VALUES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
] as const;

export type TaskLifecycleStatus = (typeof TASK_STATUS_VALUES)[number];

export const TASK_TERMINAL_STATUS_VALUES = [
  'completed',
  'failed',
  'cancelled'
] as const;

export const TASK_ERROR_CODE_VALUES = [
  'TASK_INVALID_INPUT',
  'TASK_PROVIDER_UNAVAILABLE',
  'TASK_PROVIDER_TIMEOUT',
  'TASK_PROVIDER_ALL_FAILED',
  'TASK_CANCELLED',
  'TASK_UNHANDLED_EXCEPTION'
] as const;

export type TaskErrorCode = (typeof TASK_ERROR_CODE_VALUES)[number];

export type TaskMockScenario =
  | 'default'
  | 'empty'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'unauthorized'
  | 'forbidden';

export type TaskEventName =
  | 'connected'
  | 'progress'
  | 'provider_switch'
  | 'heartbeat'
  | 'completed'
  | 'failed'
  | 'snapshot';

export interface TaskRuntimeState {
  taskId: string;
  requestId: string | null;
  taskType: string;
  status: TaskLifecycleStatus;
  progress: number;
  message: string;
  timestamp: string;
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

export type TaskSnapshot = TaskRuntimeState;

export interface TaskListResult {
  requestId: string | null;
  items: TaskSummary[];
  total: number;
}

export interface TaskEventPayload extends TaskRuntimeState {
  event: TaskEventName;
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
