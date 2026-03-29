/**
 * 文件说明：定义任务列表、详情、状态快照与 SSE 事件的稳定领域类型。
 */

export const TASK_SUCCESS_CODE = 200;
export const TASK_UNAUTHORIZED_STATUS = 401;
export const TASK_FORBIDDEN_STATUS = 403;

export type TaskLifecycleStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

export type TaskMockScenario =
  | 'default'
  | 'empty'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'unauthorized'
  | 'forbidden';

export type TaskEventName =
  | 'connected'
  | 'progress'
  | 'heartbeat'
  | 'completed'
  | 'failed';

export interface TaskSummary {
  id: string;
  taskId: string;
  requestId: string;
  title: string;
  taskType: string;
  status: TaskLifecycleStatus;
  progress: number;
  updatedAt: string;
}

export interface TaskDetail extends TaskSummary {
  description: string;
  resultUrl: string | null;
  errorCode: string | null;
}

export interface TaskSnapshot {
  requestId: string;
  task: TaskDetail | null;
}

export interface TaskListResult {
  requestId: string;
  items: TaskSummary[];
  total: number;
}

export interface TaskEventPayload {
  event: TaskEventName;
  taskId: string;
  requestId: string;
  taskType: string;
  status: TaskLifecycleStatus;
  progress: number;
  message: string;
  timestamp: string;
  errorCode?: string | null;
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
  requestId: string;
}
