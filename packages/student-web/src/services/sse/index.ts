/**
 * 任务 SSE 事件流模块 - 公共出口（barrel file）。
 *
 * 子模块：parsers.ts / mock-stream.ts / real-stream.ts / type-guards.ts / utils.ts
 */
import type { TaskAdapter } from "@/services/api/adapters/task-adapter";
import { resolveRuntimeMode } from "@/services/api/adapters/base-adapter";
import type { TaskMockScenario, TaskSnapshot, TaskStreamEventPayload } from "@/types/task";

import { createMockTaskEventStream } from "./mock-stream";
import { createRealTaskEventStream } from "./real-stream";

export { buildTaskEventId } from "./utils";
export { normalizeTaskEventPayload, parseSseMessages, parseTaskEventResponse } from "./parsers";
export { createMockTaskEventStream, cloneMockEventSequence } from "./mock-stream";
export { createRealTaskEventStream, streamPollingFallback } from "./real-stream";
export type { CreateRealTaskEventStreamOptions, TaskRecoveryMode, TaskSseAttempt } from "./real-stream";
export { isTaskEventName, isTaskLifecycleStatus, isTaskErrorCode, isRecord } from "./type-guards";

export type TaskEventParserLogger = Pick<Console, "warn">;

export type TaskEventStreamOptions = {
  scenario?: TaskMockScenario;
  signal?: AbortSignal;
  useMock?: boolean;
  module?: string;
  lastEventId?: string | null;
  reconnectAttempts?: number;
  reconnectDelayMs?: number;
  pollingIntervalMs?: number;
  initialSnapshot?: TaskSnapshot | null;
};

export interface TaskEventStream {
  streamTaskEvents(taskId: string, options?: TaskEventStreamOptions): AsyncIterable<TaskStreamEventPayload>;
}

/** 根据运行模式解析最终的任务事件流实现。 */
export function resolveTaskEventStream(
  options: Pick<TaskEventStreamOptions, "useMock" | "module"> = {},
) {
  return resolveRuntimeMode(options) === "mock"
    ? createMockTaskEventStream()
    : createRealTaskEventStream({ module: options.module });
}

/** 消费异步任务事件流，并收集为数组。 */
export async function collectTaskEvents(iterable: AsyncIterable<TaskStreamEventPayload>) {
  const events: TaskStreamEventPayload[] = [];
  for await (const event of iterable) { events.push(event); }
  return events;
}
