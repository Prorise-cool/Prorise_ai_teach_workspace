/**
 * 真实流：提供真实 SSE 连接、重连与 snapshot 轮询回退功能。
 */
import { resolveTaskAdapter, type TaskAdapter } from "@/services/api/adapters/task-adapter";
import { resolveFastapiBaseUrl } from "@/services/api/fastapi-base-url";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import type {
  TaskMockScenario,
  TaskSnapshot,
  TaskStreamEventPayload,
} from "@/types/task";

import { streamTaskEventResponse } from "./parsers";
import { createAbortError, isTerminalTaskStatus, isTaskSnapshotEqual, parseEventSequenceFromId, pickLatestEventId, waitWithSignal, buildTaskEventId, isStandardTaskEventId } from "./utils";

/* ── 本地类型定义（避免循环导入 index.ts） ── */

type TaskEventStreamOptions = {
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

type CreateRealTaskEventStreamOptions = {
  adapter?: TaskAdapter;
  module?: string;
  reconnectAttempts?: number;
  reconnectDelayMs?: number;
  pollingIntervalMs?: number;
};

type TaskRecoveryMode = "replay" | "snapshot-required";

type TaskSseAttempt = {
  response: Response;
  recoveryMode: TaskRecoveryMode;
  lastEventIdHeader: string | null;
};

export type {
  CreateRealTaskEventStreamOptions,
  TaskRecoveryMode,
  TaskSseAttempt,
};

interface TaskEventStream {
  streamTaskEvents(
    taskId: string,
    options?: TaskEventStreamOptions,
  ): AsyncIterable<TaskStreamEventPayload>;
}

const DEFAULT_RECONNECT_ATTEMPTS = 3;
const DEFAULT_RECONNECT_DELAY_MS = 250;
const DEFAULT_POLLING_INTERVAL_MS = 2000;

/**
 * 构造任务事件流路径；模块级任务优先走 `/api/v1/{module}/tasks/...`。
 *
 * @param taskId - 任务 ID。
 * @param module - 可选模块名。
 * @returns SSE 事件流路径。
 */
function buildTaskEventsPath(taskId: string, module?: string) {
  if (module) {
    return `/api/v1/${module}/tasks/${taskId}/events`;
  }

  return `/api/v1/tasks/${taskId}/events`;
}

/**
 * 把任务快照转换为可供流消费的 `snapshot` 事件。
 *
 * @param taskId - 任务 ID。
 * @param snapshot - 任务快照。
 * @param sequence - 要分配的事件序列号。
 * @param previousEventId - 上一个事件 ID。
 * @returns 标准化后的流事件。
 */
function snapshotToStreamEvent(
  taskId: string,
  snapshot: TaskSnapshot,
  sequence: number,
  previousEventId: string | null,
): TaskStreamEventPayload {
  const id = buildTaskEventId(taskId, sequence);
  const resumeFrom = snapshot.lastEventId ?? previousEventId ?? id;

  return {
    id,
    sequence,
    event: "snapshot",
    taskId: snapshot.taskId,
    taskType: snapshot.taskType,
    status: snapshot.status,
    progress: snapshot.progress,
    message: snapshot.message,
    timestamp: snapshot.timestamp,
    requestId: snapshot.requestId,
    errorCode: snapshot.errorCode ?? null,
    stage: snapshot.stage ?? snapshot.currentStage ?? null,
    currentStage: snapshot.currentStage ?? snapshot.stage ?? null,
    stageLabel: snapshot.stageLabel ?? snapshot.currentStage ?? snapshot.stage ?? null,
    stageProgress: snapshot.stageProgress ?? null,
    resumeFrom,
    context: snapshot.context,
  };
}

/**
 * 执行一次真实 SSE 拉流尝试，并返回本次收到的事件与恢复信息。
 *
 * @param taskId - 任务 ID。
 * @param options - 拉流选项。
 * @returns 单次拉流结果。
 */
async function openSseAttempt(
  taskId: string,
  options: Pick<TaskEventStreamOptions, "signal" | "lastEventId" | "module">,
): Promise<TaskSseAttempt> {
  const headers: Record<string, string> = {
    Accept: "text/event-stream, application/json",
  };

  if (options.lastEventId) {
    headers["Last-Event-ID"] = options.lastEventId;
  }

  /* 自动注入 Bearer token，与 fastapiClient 保持一致。 */
  const accessToken =
    useAuthSessionStore.getState().session?.accessToken ?? null;

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${resolveFastapiBaseUrl()}${buildTaskEventsPath(taskId, options.module)}`,
    {
      headers,
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new Error(`任务事件流初始化失败：${response.status}`);
  }

  const recoveryModeHeader = response.headers.get("x-task-recovery-mode");
  return {
    response,
    recoveryMode:
      recoveryModeHeader === "snapshot-required" ? "snapshot-required" : "replay",
    lastEventIdHeader: response.headers.get("x-task-last-event-id"),
  };
}

/**
 * 在 SSE 不可用时轮询任务快照，并按差异生成 `snapshot` 事件。
 *
 * @param taskId - 任务 ID。
 * @param options - 轮询选项。
 * @param adapter - 任务 adapter。
 * @param startingSequence - 当前已使用的起始序列号。
 * @returns 任务快照事件异步迭代器。
 */
export async function* streamPollingFallback(
  taskId: string,
  options: {
    signal?: AbortSignal;
    pollingIntervalMs: number;
    initialLastEventId?: string | null;
  } & Pick<TaskEventStreamOptions, "scenario">,
  adapter: TaskAdapter,
  startingSequence: number,
) {
  let sequence = startingSequence;
  let previousSnapshot: TaskSnapshot | null = null;

  while (!(options.signal?.aborted ?? false)) {
    const snapshot = await adapter.getTaskSnapshot(taskId, {
      scenario: options.scenario,
      signal: options.signal,
    });

    if (!previousSnapshot || !isTaskSnapshotEqual(snapshot, previousSnapshot)) {
      sequence += 1;
      const event = snapshotToStreamEvent(
        taskId,
        snapshot,
        sequence,
        previousSnapshot?.lastEventId ?? options.initialLastEventId ?? null,
      );

      yield event;
      previousSnapshot = snapshot;

      if (isTerminalTaskStatus(snapshot.status)) {
        return;
      }
    }

    await waitWithSignal(options.pollingIntervalMs, options.signal);
  }
}

/**
 * 创建真实任务事件流实现，并在需要时自动回退到 snapshot 轮询。
 *
 * @param defaults - 默认拉流配置。
 * @returns 真实任务事件流。
 */
export function createRealTaskEventStream(
  defaults: CreateRealTaskEventStreamOptions = {},
): TaskEventStream {
  const adapter = defaults.adapter ?? resolveTaskAdapter({ module: defaults.module });

  return {
    async *streamTaskEvents(taskId, options) {
      if (options?.signal?.aborted) {
        throw createAbortError();
      }

      const reconnectAttempts =
        options?.reconnectAttempts ??
        defaults.reconnectAttempts ??
        DEFAULT_RECONNECT_ATTEMPTS;
      const reconnectDelayMs =
        options?.reconnectDelayMs ??
        defaults.reconnectDelayMs ??
        DEFAULT_RECONNECT_DELAY_MS;
      const pollingIntervalMs =
        options?.pollingIntervalMs ??
        defaults.pollingIntervalMs ??
        DEFAULT_POLLING_INTERVAL_MS;
      let lastEventId =
        options?.lastEventId ?? options?.initialSnapshot?.lastEventId ?? null;
      let sequence = parseEventSequenceFromId(lastEventId);
      let reconnectCount = 0;
      const snapshot = options?.initialSnapshot ?? null;

      if (snapshot) {
        sequence = Math.max(
          sequence,
          parseEventSequenceFromId(snapshot.lastEventId),
        );
        yield snapshotToStreamEvent(
          taskId,
          snapshot,
          sequence + 1,
          lastEventId,
        );

        if (isTerminalTaskStatus(snapshot.status)) {
          return;
        }

        lastEventId = snapshot.lastEventId ?? lastEventId;
        sequence += 1;
      }

      while (!(options?.signal?.aborted ?? false)) {
        try {
          const attempt = await openSseAttempt(
            taskId,
            {
              signal: options?.signal,
              lastEventId,
              module: options?.module ?? defaults.module,
            },
          );

          for await (const event of streamTaskEventResponse(attempt.response, console)) {
            if (isStandardTaskEventId(event.id)) {
              sequence = Math.max(sequence, event.sequence);
              lastEventId = pickLatestEventId(lastEventId, event.id);
            }

            yield event;

            if (isTerminalTaskStatus(event.status)) {
              return;
            }
          }

          lastEventId = pickLatestEventId(lastEventId, attempt.lastEventIdHeader);
          sequence = Math.max(sequence, parseEventSequenceFromId(lastEventId));

          if (attempt.recoveryMode === "snapshot-required") {
            break;
          }

          reconnectCount += 1;
          if (reconnectCount > reconnectAttempts) {
            break;
          }

          await waitWithSignal(reconnectDelayMs, options?.signal);
        } catch (error) {
          if (options?.signal?.aborted) {
            throw createAbortError();
          }

          reconnectCount += 1;
          if (reconnectCount > reconnectAttempts) {
            break;
          }

          await waitWithSignal(reconnectDelayMs, options?.signal);
          void error;
        }
      }

      yield* streamPollingFallback(
        taskId,
        {
          scenario: options?.scenario,
          signal: options?.signal,
          pollingIntervalMs,
          initialLastEventId: lastEventId,
        },
        adapter,
        sequence,
      );
    },
  };
}
