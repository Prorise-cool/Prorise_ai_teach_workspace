/**
 * Mock 流：提供本地 mock 任务事件流实现，用于开发和测试。
 */
import type {
  TaskMockScenario,
  TaskStreamEventPayload,
} from "@/types/task";

import cancelledSequence from "../../../../../mocks/tasks/sse.sequence.cancelled.json";
import completedSequence from "../../../../../mocks/tasks/sse.sequence.completed.json";
import failedSequence from "../../../../../mocks/tasks/sse.sequence.failed.json";
import providerSwitchSequence from "../../../../../mocks/tasks/sse.sequence.provider-switch.json";
import snapshotSequence from "../../../../../mocks/tasks/sse.sequence.snapshot.json";

import { buildTaskEventId } from "./utils";

interface MockTaskEventStream {
  streamTaskEvents(
    taskId: string,
    options?: {
      scenario?: TaskMockScenario;
      signal?: AbortSignal;
    },
  ): AsyncIterable<TaskStreamEventPayload>;
}

type TaskEventTemplate = Omit<TaskStreamEventPayload, "taskId" | "id"> & {
  taskId?: string;
  id?: string;
};

const DEFAULT_TASK_TYPE = "video";
const DEFAULT_REQUEST_ID_PREFIX = "req_task_mock";

const MOCK_SSE_SEQUENCES: Record<string, TaskEventTemplate[]> = {
  default: completedSequence as TaskEventTemplate[],
  completed: completedSequence as TaskEventTemplate[],
  cancelled: cancelledSequence as TaskEventTemplate[],
  failed: failedSequence as TaskEventTemplate[],
  snapshot: snapshotSequence as TaskEventTemplate[],
  provider_switch: providerSwitchSequence as TaskEventTemplate[],
};

/**
 * 克隆 mock 事件模板，并补齐任务 ID、请求 ID 与事件序列。
 *
 * @param taskId - 任务 ID。
 * @param sequence - 事件模板序列。
 * @returns 标准化后的 mock 事件数组。
 */
export function cloneMockEventSequence(
  taskId: string,
  sequence: TaskEventTemplate[],
): TaskStreamEventPayload[] {
  const requestId = `${DEFAULT_REQUEST_ID_PREFIX}_${taskId}_sse`;

  return sequence.map((event, index) => ({
    ...event,
    taskId,
    taskType: event.taskType ?? DEFAULT_TASK_TYPE,
    requestId: event.requestId ?? requestId,
    id: buildTaskEventId(taskId, event.sequence ?? index + 1),
    sequence: event.sequence ?? index + 1,
  }));
}

/**
 * 根据任务场景选择 mock 事件序列。
 *
 * @param taskId - 任务 ID。
 * @param scenario - mock 场景标识。
 * @returns 对应场景的 mock 事件数组。
 */
function resolveMockSequence(
  taskId: string,
  scenario: TaskMockScenario | undefined,
): TaskStreamEventPayload[] {
  if (scenario === "pending") {
    return cloneMockEventSequence(
      taskId,
      (completedSequence as TaskEventTemplate[]).slice(0, 1),
    );
  }

  if (scenario === "processing") {
    return cloneMockEventSequence(
      taskId,
      (completedSequence as TaskEventTemplate[]).slice(0, 3),
    );
  }

  if (scenario === "cancelled") {
    return cloneMockEventSequence(
      taskId,
      cancelledSequence as TaskEventTemplate[],
    );
  }

  const template =
    MOCK_SSE_SEQUENCES[scenario ?? "default"] ?? MOCK_SSE_SEQUENCES.default;

  return cloneMockEventSequence(taskId, template);
}

/**
 * 创建本地 mock 任务事件流实现。
 *
 * @returns mock 任务事件流。
 */
export function createMockTaskEventStream(): MockTaskEventStream {
  return {
    async *streamTaskEvents(taskId, options) {
      for (const event of resolveMockSequence(taskId, options?.scenario)) {
        await Promise.resolve();
        yield event;
      }
    },
  };
}
