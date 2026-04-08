/**
 * 文件说明：提供任务事件流的解析、mock 回放与真实流消费入口。
 * 该模块统一承接任务 SSE 的恢复、补帧和 snapshot 回退策略。
 */
import {
  createParser,
  type EventSourceMessage,
  type ParseError,
} from "eventsource-parser";

import { parseJsonText, readJsonBody } from "@/lib/type-guards";
import { resolveFastapiBaseUrl } from "@/services/api/fastapi-base-url";
import { resolveRuntimeMode } from "@/services/api/adapters/base-adapter";
import {
  resolveTaskAdapter,
  type TaskAdapter,
} from "@/services/api/adapters/task-adapter";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import type {
  TaskErrorCode,
  TaskEventName,
  TaskLifecycleStatus,
  TaskMockScenario,
  TaskSnapshot,
  TaskStreamEventPayload,
} from "@/types/task";
import {
  TASK_ERROR_CODE_VALUES,
  TASK_EVENT_ID_SEPARATOR,
  TASK_EVENT_NAME_VALUES,
  TASK_STATUS_VALUES,
} from "@/types/task";

import cancelledSequence from "../../../../../mocks/tasks/sse.sequence.cancelled.json";
import completedSequence from "../../../../../mocks/tasks/sse.sequence.completed.json";
import failedSequence from "../../../../../mocks/tasks/sse.sequence.failed.json";
import providerSwitchSequence from "../../../../../mocks/tasks/sse.sequence.provider-switch.json";
import snapshotSequence from "../../../../../mocks/tasks/sse.sequence.snapshot.json";

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

type TaskEventParserLogger = Pick<Console, "warn">;

type RawSseMessage = {
  eventName: string | null;
  eventId: string | null;
  data: string;
};

type TaskRecoveryMode = "replay" | "snapshot-required";

type TaskSseAttemptResult = {
  events: TaskStreamEventPayload[];
  recoveryMode: TaskRecoveryMode;
  lastEventId: string | null;
};

type TaskEventTemplate = Omit<TaskStreamEventPayload, "taskId" | "id"> & {
  taskId?: string;
  id?: string;
};

const DEFAULT_TASK_TYPE = "video";
const DEFAULT_REQUEST_ID_PREFIX = "req_task_mock";
const DEFAULT_RECONNECT_ATTEMPTS = 3;
const DEFAULT_RECONNECT_DELAY_MS = 250;
const DEFAULT_POLLING_INTERVAL_MS = 2000;

const MOCK_SSE_SEQUENCES: Record<string, TaskEventTemplate[]> = {
  default: completedSequence as TaskEventTemplate[],
  completed: completedSequence as TaskEventTemplate[],
  cancelled: cancelledSequence as TaskEventTemplate[],
  failed: failedSequence as TaskEventTemplate[],
  snapshot: snapshotSequence as TaskEventTemplate[],
  provider_switch: providerSwitchSequence as TaskEventTemplate[],
};

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

export interface TaskEventStream {
  streamTaskEvents(
    taskId: string,
    options?: TaskEventStreamOptions,
  ): AsyncIterable<TaskStreamEventPayload>;
}

/**
 * 从任务事件 ID 中解析序列号部分。
 *
 * @param eventId - 事件 ID。
 * @returns 事件序列号；无法解析时返回 `null`。
 */
function parseTaskEventId(eventId: string): number | null {
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
 * 判断给定值是否为支持的任务事件名。
 *
 * @param value - 待判断的值。
 * @returns 是否为合法任务事件名。
 */
function isTaskEventName(value: unknown): value is TaskEventName {
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
function isTaskLifecycleStatus(value: unknown): value is TaskLifecycleStatus {
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
function isTaskErrorCode(value: unknown): value is TaskErrorCode {
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
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 统一输出任务 SSE 解析告警。
 *
 * @param logger - 告警输出器。
 * @param message - 告警消息。
 * @param payload - 触发告警的原始载荷。
 */
function warnParseIssue(
  logger: TaskEventParserLogger,
  message: string,
  payload?: unknown,
) {
  logger.warn(`[task-sse] ${message}`, payload);
}

/**
 * 把可选值转换为非空字符串或 `null`。
 *
 * @param value - 原始值。
 * @returns 归一后的字符串值。
 */
function toOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * 把可选值转换为结果对象或 `null`。
 *
 * @param value - 原始值。
 * @returns 归一后的结果对象。
 */
function toOptionalResult(value: unknown) {
  return isRecord(value) ? value : null;
}

/**
 * 判断任务状态是否已经结束。
 *
 * @param status - 任务状态。
 * @returns 是否为终态。
 */
function isTerminalTaskStatus(status: TaskLifecycleStatus) {
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
function isTaskSnapshotEqual(left: TaskSnapshot, right: TaskSnapshot) {
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
 * 从事件 ID 中提取序列号，缺失时回退为 `0`。
 *
 * @param eventId - 事件 ID。
 * @returns 可比较的序列号。
 */
function parseEventSequenceFromId(eventId: string | null | undefined) {
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
function pickLatestEventId(
  currentEventId: string | null,
  candidateEventId: string | null,
) {
  if (!candidateEventId) {
    return currentEventId;
  }

  if (!currentEventId) {
    return candidateEventId;
  }

  return parseEventSequenceFromId(candidateEventId) >=
    parseEventSequenceFromId(currentEventId)
    ? candidateEventId
    : currentEventId;
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
 * 创建统一的中断异常对象。
 *
 * @returns `AbortError` 异常实例。
 */
function createAbortError() {
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
async function waitWithSignal(ms: number, signal?: AbortSignal) {
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
 * 把原始 SSE 或 JSON 载荷标准化为任务流事件。
 *
 * @param rawPayload - 原始事件载荷。
 * @param metadata - 从 SSE 协议头解析出的元信息。
 * @param logger - 解析日志输出器。
 * @returns 标准化后的任务事件；非法载荷返回 `null`。
 */
function normalizeTaskEventPayload(
  rawPayload: unknown,
  metadata: Pick<RawSseMessage, "eventName" | "eventId">,
  logger: TaskEventParserLogger = console,
): TaskStreamEventPayload | null {
  if (!isRecord(rawPayload)) {
    warnParseIssue(logger, "Ignoring non-object task SSE payload", rawPayload);
    return null;
  }

  const eventName = metadata.eventName ?? rawPayload.event;
  const eventId = metadata.eventId ?? rawPayload.id;
  const sequence =
    typeof rawPayload.sequence === "number"
      ? rawPayload.sequence
      : typeof eventId === "string"
        ? parseTaskEventId(eventId)
        : null;

  if (!isTaskEventName(eventName)) {
    warnParseIssue(logger, "Ignoring unknown task SSE event type", rawPayload);
    return null;
  }

  if (typeof eventId !== "string" || sequence === null) {
    warnParseIssue(
      logger,
      "Ignoring task SSE event without valid id/sequence",
      rawPayload,
    );
    return null;
  }

  if (
    typeof rawPayload.taskId !== "string" ||
    typeof rawPayload.taskType !== "string" ||
    !isTaskLifecycleStatus(rawPayload.status) ||
    typeof rawPayload.progress !== "number" ||
    rawPayload.progress < 0 ||
    rawPayload.progress > 100 ||
    typeof rawPayload.message !== "string" ||
    typeof rawPayload.timestamp !== "string"
  ) {
    warnParseIssue(
      logger,
      "Ignoring malformed task SSE payload fields",
      rawPayload,
    );
    return null;
  }

  const requestId =
    rawPayload.requestId === null || typeof rawPayload.requestId === "string"
      ? rawPayload.requestId
      : null;
  const errorCode =
    rawPayload.errorCode === null || rawPayload.errorCode === undefined
      ? null
      : isTaskErrorCode(rawPayload.errorCode)
        ? rawPayload.errorCode
        : null;

  if (eventName === "failed" && errorCode === null) {
    warnParseIssue(
      logger,
      "Ignoring failed task SSE event without errorCode",
      rawPayload,
    );
    return null;
  }

  const payload: TaskStreamEventPayload = {
    id: eventId,
    sequence,
    event: eventName,
    taskId: rawPayload.taskId,
    taskType: rawPayload.taskType,
    status: rawPayload.status,
    progress: rawPayload.progress,
    message: rawPayload.message,
    timestamp: rawPayload.timestamp,
    requestId,
    errorCode,
    stage: toOptionalString(rawPayload.stage),
    currentStage: toOptionalString(rawPayload.currentStage) ?? toOptionalString(rawPayload.stage),
    stageLabel:
      toOptionalString(rawPayload.stageLabel) ??
      toOptionalString(rawPayload.currentStage) ??
      toOptionalString(rawPayload.stage),
    stageProgress:
      typeof rawPayload.stageProgress === "number" ? rawPayload.stageProgress : null,
    from: toOptionalString(rawPayload.from),
    to: toOptionalString(rawPayload.to),
    reason: toOptionalString(rawPayload.reason),
    result: toOptionalResult(rawPayload.result),
    resumeFrom: toOptionalString(rawPayload.resumeFrom),
    context: isRecord(rawPayload.context) ? rawPayload.context : undefined,
  };

  if (
    eventName === "provider_switch" &&
    (!payload.from || !payload.to || !payload.reason)
  ) {
    warnParseIssue(
      logger,
      "Ignoring provider_switch task SSE event without provider fields",
      rawPayload,
    );
    return null;
  }

  if (eventName === "snapshot" && !payload.resumeFrom) {
    warnParseIssue(
      logger,
      "Ignoring snapshot task SSE event without resumeFrom",
      rawPayload,
    );
    return null;
  }

  return payload;
}

/**
 * 使用 `eventsource-parser` 按 SSE 协议拆分原始文本为消息数组。
 *
 * @param rawBody - 原始 SSE 文本。
 * @param logger - 解析日志输出器。
 * @returns 解析后的 SSE 消息数组。
 */
function parseSseMessages(
  rawBody: string,
  logger: TaskEventParserLogger = console,
): RawSseMessage[] {
  const messages: RawSseMessage[] = [];
  const parser = createParser({
    onEvent(event: EventSourceMessage) {
      messages.push({
        eventName: event.event ?? null,
        eventId: event.id ?? null,
        data: event.data,
      });
    },
    onError(error: ParseError) {
      warnParseIssue(
        logger,
        `Ignoring malformed SSE protocol line: ${error.message}`,
        error.line ?? error.value ?? rawBody,
      );
    },
  });

  parser.feed(`${rawBody}\n\n`);

  return messages;
}

/**
 * 执行一次真实 SSE 拉流尝试，并返回本次收到的事件与恢复信息。
 *
 * @param taskId - 任务 ID。
 * @param options - 拉流选项。
 * @param logger - 解析日志输出器。
 * @returns 单次拉流结果。
 */
async function streamSseAttempt(
  taskId: string,
  options: Pick<TaskEventStreamOptions, "signal" | "lastEventId" | "module">,
  logger: TaskEventParserLogger,
): Promise<TaskSseAttemptResult> {
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

  const events = await parseTaskEventResponse(response, logger);
  const recoveryModeHeader = response.headers.get("x-task-recovery-mode");
  const recoveryMode: TaskRecoveryMode =
    recoveryModeHeader === "snapshot-required" ? "snapshot-required" : "replay";
  const latestEventIdHeader = response.headers.get("x-task-last-event-id");
  let lastEventId = options.lastEventId ?? null;

  for (const event of events) {
    lastEventId = pickLatestEventId(lastEventId, event.id);
  }

  lastEventId = pickLatestEventId(lastEventId, latestEventIdHeader);

  return {
    events,
    recoveryMode,
    lastEventId,
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
async function* streamPollingFallback(
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
 * 解析任务事件接口响应，兼容 JSON 与标准 SSE 文本格式。
 *
 * @param response - 原始响应对象。
 * @param logger - 解析日志输出器。
 * @returns 标准化后的任务事件数组。
 */
export async function parseTaskEventResponse(
  response: Response,
  logger: TaskEventParserLogger = console,
): Promise<TaskStreamEventPayload[]> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = await readJsonBody(response);
    const rawEvents = Array.isArray(payload) ? payload : [payload];

    return rawEvents.flatMap((rawEvent) => {
      const event = normalizeTaskEventPayload(
        rawEvent,
        { eventId: null, eventName: null },
        logger,
      );

      return event ? [event] : [];
    });
  }

  const rawBody = await response.text();

  return parseSseMessages(rawBody, logger).flatMap((message) => {
    try {
      const event = normalizeTaskEventPayload(
        parseJsonText(message.data),
        message,
        logger,
      );

      return event ? [event] : [];
    } catch (error) {
      warnParseIssue(
        logger,
        `Ignoring invalid task SSE JSON payload: ${String(error)}`,
        message.data,
      );
      return [];
    }
  });
}

/**
 * 克隆 mock 事件模板，并补齐任务 ID、请求 ID 与事件序列。
 *
 * @param taskId - 任务 ID。
 * @param sequence - 事件模板序列。
 * @returns 标准化后的 mock 事件数组。
 */
function cloneMockEventSequence(
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
export function createMockTaskEventStream(): TaskEventStream {
  return {
    async *streamTaskEvents(taskId, options) {
      for (const event of resolveMockSequence(taskId, options?.scenario)) {
        await Promise.resolve();
        yield event;
      }
    },
  };
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
          const attempt = await streamSseAttempt(
            taskId,
            {
              signal: options?.signal,
              lastEventId,
              module: options?.module ?? defaults.module,
            },
            console,
          );

          for (const event of attempt.events) {
            sequence = Math.max(sequence, event.sequence);
            lastEventId = event.id;
            yield event;

            if (isTerminalTaskStatus(event.status)) {
              return;
            }
          }

          lastEventId = pickLatestEventId(lastEventId, attempt.lastEventId);
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

/**
 * 根据运行模式解析最终的任务事件流实现。
 *
 * @param options - 运行模式参数。
 * @returns mock 或 real 事件流。
 */
export function resolveTaskEventStream(
  options: Pick<TaskEventStreamOptions, "useMock" | "module"> = {},
) {
  return resolveRuntimeMode(options) === "mock"
    ? createMockTaskEventStream()
    : createRealTaskEventStream({ module: options.module });
}

/**
 * 消费异步任务事件流，并收集为数组。
 *
 * @param iterable - 任务事件异步迭代器。
 * @returns 收集完成的事件数组。
 */
export async function collectTaskEvents(
  iterable: AsyncIterable<TaskStreamEventPayload>,
) {
  const events: TaskStreamEventPayload[] = [];

  for await (const event of iterable) {
    events.push(event);
  }

  return events;
}
