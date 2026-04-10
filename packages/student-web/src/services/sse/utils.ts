/**
 * 工具函数：提供任务 SSE 事件 ID 构造、中断异常创建等通用工具。
 */
import type { TaskSnapshot } from "@/types/task";
import { TASK_EVENT_ID_SEPARATOR } from "@/types/task";

import { isRecord } from "./type-guards";

/**
 * 从任务事件 ID 中解析序列号部分。
 *
 * @param eventId - 事件 ID。
 * @returns 事件序列号；无法解析时返回 `null`。
 */
export function parseTaskEventId(eventId: string): number | null {
  const parts = eventId.split(TASK_EVENT_ID_SEPARATOR);

  if (parts.length !== 2) {
    return null;
  }

  const sequence = Number.parseInt(parts[1] ?? "", 10);

  return Number.isInteger(sequence) && sequence > 0 ? sequence : null;
}

/**
 * 按统一规则构造任务事件 ID。
 *
 * @param taskId - 任务 ID。
 * @param sequence - 事件序列号。
 * @returns 拼接后的事件 ID。
 */
export function buildTaskEventId(taskId: string, sequence: number) {
  return `${taskId}${TASK_EVENT_ID_SEPARATOR}${String(sequence).padStart(6, "0")}`;
}

/**
 * 构造瞬时事件（connected / heartbeat）的临时 ID。
 */
export function buildTransientTaskEventId(
  taskId: string,
  eventName: "connected" | "heartbeat",
  sequence: number,
) {
  return `transient:${taskId}:${eventName}:${String(sequence).padStart(6, "0")}`;
}

/**
 * 判断事件 ID 是否为标准格式（可解析出序列号）。
 */
export function isStandardTaskEventId(eventId: string | null | undefined) {
  return typeof eventId === "string" && parseTaskEventId(eventId) !== null;
}

/**
 * 判断事件名是否为瞬时事件（connected / heartbeat）。
 */
export function isTransientTaskEventName(
  eventName: unknown,
): eventName is "connected" | "heartbeat" {
  return eventName === "connected" || eventName === "heartbeat";
}

/**
 * 从事件 ID 中提取序列号，缺失时回退为 `0`。
 *
 * @param eventId - 事件 ID。
 * @returns 可比较的序列号。
 */
export function parseEventSequenceFromId(eventId: string | null | undefined) {
  if (!eventId) {
    return 0;
  }

  const sequence = parseTaskEventId(eventId);

  return sequence ?? 0;
}

/**
 * 在当前事件 ID 与候选事件 ID 之间选出最新值。
 *
 * @param currentEventId - 当前已记录的事件 ID。
 * @param candidateEventId - 新的候选事件 ID。
 * @returns 最新事件 ID。
 */
export function pickLatestEventId(
  currentEventId: string | null,
  candidateEventId: string | null,
) {
  if (!isStandardTaskEventId(candidateEventId)) {
    return currentEventId;
  }

  if (!isStandardTaskEventId(currentEventId)) {
    return candidateEventId;
  }

  return parseEventSequenceFromId(candidateEventId) >=
    parseEventSequenceFromId(currentEventId)
    ? candidateEventId
    : currentEventId;
}

/**
 * 创建统一的中断异常对象。
 *
 * @returns `AbortError` 异常实例。
 */
export function createAbortError() {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

/**
 * 在支持中断的前提下等待指定毫秒数。
 *
 * @param ms - 等待时长，单位毫秒。
 * @param signal - 可选中断信号。
 * @returns 等待完成后返回。
 */
export async function waitWithSignal(ms: number, signal?: AbortSignal) {
  if (ms <= 0) {
    if (signal?.aborted) {
      throw createAbortError();
    }
    return;
  }

  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(createAbortError());
    };

    const cleanup = () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * 把可选值转换为非空字符串或 `null`。
 *
 * @param value - 原始值。
 * @returns 归一后的字符串值。
 */
export function toOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * 把可选值转换为结果对象或 `null`。
 *
 * @param value - 原始值。
 * @returns 归一后的结果对象。
 */
export function toOptionalResult(value: unknown) {
  return isRecord(value) ? value : null;
}

/**
 * 判断任务状态是否已经结束。
 *
 * @param status - 任务状态。
 * @returns 是否为终态。
 */
export function isTerminalTaskStatus(status: string) {
  return (
    status === "completed" || status === "failed" || status === "cancelled"
  );
}

/**
 * 判断两个任务快照是否等价，避免重复推送。
 *
 * @param left - 左侧任务快照。
 * @param right - 右侧任务快照。
 * @returns 两个快照是否完全一致。
 */
export function isTaskSnapshotEqual(left: TaskSnapshot, right: TaskSnapshot) {
  return (
    left.taskId === right.taskId &&
    left.requestId === right.requestId &&
    left.taskType === right.taskType &&
    left.status === right.status &&
    left.progress === right.progress &&
    left.message === right.message &&
    left.timestamp === right.timestamp &&
    left.stage === right.stage &&
    left.currentStage === right.currentStage &&
    left.stageLabel === right.stageLabel &&
    left.stageProgress === right.stageProgress &&
    left.errorCode === right.errorCode &&
    left.resumeFrom === right.resumeFrom &&
    left.lastEventId === right.lastEventId &&
    JSON.stringify(left.context ?? null) ===
      JSON.stringify(right.context ?? null)
  );
}

/**
 * 统一输出任务 SSE 解析告警。
 *
 * @param logger - 告警输出器。
 * @param message - 告警消息。
 * @param payload - 触发告警的原始载荷。
 */
export function warnParseIssue(
  logger: Pick<Console, "warn">,
  message: string,
  payload?: unknown,
) {
  logger.warn(`[task-sse] ${message}`, payload);
}
