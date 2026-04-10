/**
 * 类型守卫：提供任务 SSE 事件相关类型的运行时判断。
 */
import type {
  TaskErrorCode,
  TaskEventName,
  TaskLifecycleStatus,
} from "@/types/task";
import {
  TASK_ERROR_CODE_VALUES,
  TASK_EVENT_NAME_VALUES,
  TASK_STATUS_VALUES,
} from "@/types/task";

/**
 * 判断给定值是否为支持的任务事件名。
 *
 * @param value - 待判断的值。
 * @returns 是否为合法任务事件名。
 */
export function isTaskEventName(value: unknown): value is TaskEventName {
  return (
    typeof value === "string" &&
    TASK_EVENT_NAME_VALUES.includes(value as TaskEventName)
  );
}

/**
 * 判断给定值是否为支持的任务生命周期状态。
 *
 * @param value - 待判断的值。
 * @returns 是否为合法任务状态。
 */
export function isTaskLifecycleStatus(
  value: unknown,
): value is TaskLifecycleStatus {
  return (
    typeof value === "string" &&
    TASK_STATUS_VALUES.includes(value as TaskLifecycleStatus)
  );
}

/**
 * 判断给定值是否为支持的任务错误码。
 *
 * @param value - 待判断的值。
 * @returns 是否为合法任务错误码。
 */
export function isTaskErrorCode(value: unknown): value is TaskErrorCode {
  return (
    typeof value === "string" &&
    TASK_ERROR_CODE_VALUES.includes(value as TaskErrorCode)
  );
}

/**
 * 判断给定值是否为普通对象记录。
 *
 * @param value - 待判断的值。
 * @returns 是否为非数组对象。
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
