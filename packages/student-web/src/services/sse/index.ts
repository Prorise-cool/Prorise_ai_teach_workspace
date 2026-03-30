import completedSequence from '../../../../../mocks/tasks/sse.sequence.completed.json';
import failedSequence from '../../../../../mocks/tasks/sse.sequence.failed.json';
import providerSwitchSequence from '../../../../../mocks/tasks/sse.sequence.provider-switch.json';
import snapshotSequence from '../../../../../mocks/tasks/sse.sequence.snapshot.json';

import type {
  TaskErrorCode,
  TaskEventName,
  TaskLifecycleStatus,
  TaskMockScenario,
  TaskStreamEventPayload
} from '@/types/task';
import {
  TASK_ERROR_CODE_VALUES,
  TASK_EVENT_ID_SEPARATOR,
  TASK_EVENT_NAME_VALUES,
  TASK_STATUS_VALUES
} from '@/types/task';

import { resolveRuntimeMode } from '@/services/api/adapters/base-adapter';

type TaskEventStreamOptions = {
  scenario?: TaskMockScenario;
  signal?: AbortSignal;
  useMock?: boolean;
  lastEventId?: string | null;
};

type TaskEventParserLogger = Pick<Console, 'warn'>;

type RawSseMessage = {
  eventName: string | null;
  eventId: string | null;
  data: string;
};

type TaskEventTemplate = Omit<TaskStreamEventPayload, 'taskId' | 'id'> & {
  taskId?: string;
  id?: string;
};

const DEFAULT_TASK_TYPE = 'video';
const DEFAULT_REQUEST_ID_PREFIX = 'req_task_mock';

const MOCK_SSE_SEQUENCES: Record<string, TaskEventTemplate[]> = {
  default: completedSequence as TaskEventTemplate[],
  completed: completedSequence as TaskEventTemplate[],
  failed: failedSequence as TaskEventTemplate[],
  snapshot: snapshotSequence as TaskEventTemplate[],
  provider_switch: providerSwitchSequence as TaskEventTemplate[]
};

export interface TaskEventStream {
  streamTaskEvents(
    taskId: string,
    options?: TaskEventStreamOptions
  ): AsyncIterable<TaskStreamEventPayload>;
}

function parseTaskEventId(eventId: string): number | null {
  const parts = eventId.split(TASK_EVENT_ID_SEPARATOR);

  if (parts.length !== 2) {
    return null;
  }

  const sequence = Number.parseInt(parts[1] ?? '', 10);

  return Number.isInteger(sequence) && sequence > 0 ? sequence : null;
}

export function buildTaskEventId(taskId: string, sequence: number) {
  return `${taskId}${TASK_EVENT_ID_SEPARATOR}${String(sequence).padStart(6, '0')}`;
}

function isTaskEventName(value: unknown): value is TaskEventName {
  return typeof value === 'string' && TASK_EVENT_NAME_VALUES.includes(value as TaskEventName);
}

function isTaskLifecycleStatus(value: unknown): value is TaskLifecycleStatus {
  return typeof value === 'string' && TASK_STATUS_VALUES.includes(value as TaskLifecycleStatus);
}

function isTaskErrorCode(value: unknown): value is TaskErrorCode {
  return typeof value === 'string' && TASK_ERROR_CODE_VALUES.includes(value as TaskErrorCode);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function warnParseIssue(logger: TaskEventParserLogger, message: string, payload?: unknown) {
  logger.warn(`[task-sse] ${message}`, payload);
}

function toOptionalString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function toOptionalResult(value: unknown) {
  return isRecord(value) ? value : null;
}

function normalizeTaskEventPayload(
  rawPayload: unknown,
  metadata: Pick<RawSseMessage, 'eventName' | 'eventId'>,
  logger: TaskEventParserLogger = console
): TaskStreamEventPayload | null {
  if (!isRecord(rawPayload)) {
    warnParseIssue(logger, 'Ignoring non-object task SSE payload', rawPayload);
    return null;
  }

  const eventName = metadata.eventName ?? rawPayload.event;
  const eventId = metadata.eventId ?? rawPayload.id;
  const sequence = typeof rawPayload.sequence === 'number' ? rawPayload.sequence : (
    typeof eventId === 'string' ? parseTaskEventId(eventId) : null
  );

  if (!isTaskEventName(eventName)) {
    warnParseIssue(logger, 'Ignoring unknown task SSE event type', rawPayload);
    return null;
  }

  if (typeof eventId !== 'string' || sequence === null) {
    warnParseIssue(logger, 'Ignoring task SSE event without valid id/sequence', rawPayload);
    return null;
  }

  if (
    typeof rawPayload.taskId !== 'string' ||
    typeof rawPayload.taskType !== 'string' ||
    !isTaskLifecycleStatus(rawPayload.status) ||
    typeof rawPayload.progress !== 'number' ||
    rawPayload.progress < 0 ||
    rawPayload.progress > 100 ||
    typeof rawPayload.message !== 'string' ||
    typeof rawPayload.timestamp !== 'string'
  ) {
    warnParseIssue(logger, 'Ignoring malformed task SSE payload fields', rawPayload);
    return null;
  }

  const requestId =
    rawPayload.requestId === null || typeof rawPayload.requestId === 'string'
      ? rawPayload.requestId
      : null;
  const errorCode =
    rawPayload.errorCode === null || rawPayload.errorCode === undefined
      ? null
      : isTaskErrorCode(rawPayload.errorCode)
        ? rawPayload.errorCode
        : null;

  if (eventName === 'failed' && errorCode === null) {
    warnParseIssue(logger, 'Ignoring failed task SSE event without errorCode', rawPayload);
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
    from: toOptionalString(rawPayload.from),
    to: toOptionalString(rawPayload.to),
    reason: toOptionalString(rawPayload.reason),
    result: toOptionalResult(rawPayload.result),
    resumeFrom: toOptionalString(rawPayload.resumeFrom),
    context: isRecord(rawPayload.context) ? rawPayload.context : undefined
  };

  if (eventName === 'provider_switch' && (!payload.from || !payload.to || !payload.reason)) {
    warnParseIssue(logger, 'Ignoring provider_switch task SSE event without provider fields', rawPayload);
    return null;
  }

  if (eventName === 'snapshot' && !payload.resumeFrom) {
    warnParseIssue(logger, 'Ignoring snapshot task SSE event without resumeFrom', rawPayload);
    return null;
  }

  return payload;
}

function parseSseMessages(rawBody: string): RawSseMessage[] {
  const messages: RawSseMessage[] = [];
  let eventName: string | null = null;
  let eventId: string | null = null;
  let dataLines: string[] = [];

  const flush = () => {
    if (dataLines.length === 0) {
      eventName = null;
      eventId = null;
      return;
    }

    messages.push({
      eventName,
      eventId,
      data: dataLines.join('\n')
    });
    eventName = null;
    eventId = null;
    dataLines = [];
  };

  for (const line of rawBody.split(/\r?\n/)) {
    if (line === '') {
      flush();
      continue;
    }

    if (line.startsWith(':')) {
      continue;
    }

    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim() || null;
      continue;
    }

    if (line.startsWith('id:')) {
      eventId = line.slice('id:'.length).trim() || null;
      continue;
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim());
    }
  }

  flush();

  return messages;
}

export async function parseTaskEventResponse(
  response: Response,
  logger: TaskEventParserLogger = console
): Promise<TaskStreamEventPayload[]> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const payload: unknown = await response.json();
    const rawEvents = Array.isArray(payload) ? payload : [payload];

    return rawEvents.flatMap(rawEvent => {
      const event = normalizeTaskEventPayload(rawEvent, { eventId: null, eventName: null }, logger);

      return event ? [event] : [];
    });
  }

  const rawBody = await response.text();

  return parseSseMessages(rawBody).flatMap(message => {
    try {
      const event = normalizeTaskEventPayload(
        JSON.parse(message.data),
        message,
        logger
      );

      return event ? [event] : [];
    } catch (error) {
      warnParseIssue(logger, `Ignoring invalid task SSE JSON payload: ${String(error)}`, message.data);
      return [];
    }
  });
}

function cloneMockEventSequence(
  taskId: string,
  sequence: TaskEventTemplate[]
): TaskStreamEventPayload[] {
  const requestId = `${DEFAULT_REQUEST_ID_PREFIX}_${taskId}_sse`;

  return sequence.map((event, index) => ({
    ...event,
    taskId,
    taskType: event.taskType ?? DEFAULT_TASK_TYPE,
    requestId: event.requestId ?? requestId,
    id: buildTaskEventId(taskId, event.sequence ?? index + 1),
    sequence: event.sequence ?? index + 1
  }));
}

function resolveMockSequence(
  taskId: string,
  scenario: TaskMockScenario | undefined
): TaskStreamEventPayload[] {
  if (scenario === 'pending') {
    return cloneMockEventSequence(taskId, (completedSequence as TaskEventTemplate[]).slice(0, 1));
  }

  if (scenario === 'processing') {
    return cloneMockEventSequence(taskId, (completedSequence as TaskEventTemplate[]).slice(0, 3));
  }

  if (scenario === 'cancelled') {
    const snapshotTemplate = cloneMockEventSequence(
      taskId,
      (snapshotSequence as TaskEventTemplate[]).slice(0, 2)
    );

    return [
      ...snapshotTemplate,
      {
        ...snapshotTemplate.at(-1)!,
        id: buildTaskEventId(taskId, 3),
        sequence: 3,
        event: 'snapshot',
        status: 'cancelled',
        progress: 0,
        message: '任务已取消，当前为最终快照',
        errorCode: 'TASK_CANCELLED',
        resumeFrom: buildTaskEventId(taskId, 2)
      }
    ];
  }

  const template = MOCK_SSE_SEQUENCES[scenario ?? 'default'] ?? MOCK_SSE_SEQUENCES.default;

  return cloneMockEventSequence(taskId, template);
}

export function createMockTaskEventStream(): TaskEventStream {
  return {
    async *streamTaskEvents(taskId, options) {
      for (const event of resolveMockSequence(taskId, options?.scenario)) {
        await Promise.resolve();
        yield event;
      }
    }
  };
}

export function createRealTaskEventStream(): TaskEventStream {
  return {
    async *streamTaskEvents(taskId, options) {
      const headers: HeadersInit = {
        Accept: 'text/event-stream, application/json'
      };

      if (options?.lastEventId) {
        headers['Last-Event-ID'] = options.lastEventId;
      }

      const response = await fetch(
        `${import.meta.env.VITE_FASTAPI_BASE_URL}/api/v1/tasks/${taskId}/events`,
        {
          headers,
          signal: options?.signal
        }
      );

      if (!response.ok) {
        throw new Error(`任务事件流初始化失败：${response.status}`);
      }

      const events = await parseTaskEventResponse(response);

      yield* events;
    }
  };
}

export function resolveTaskEventStream(
  options: Pick<TaskEventStreamOptions, 'useMock'> = {}
) {
  return resolveRuntimeMode(options) === 'mock'
    ? createMockTaskEventStream()
    : createRealTaskEventStream();
}

export async function collectTaskEvents(
  iterable: AsyncIterable<TaskStreamEventPayload>
) {
  const events: TaskStreamEventPayload[] = [];

  for await (const event of iterable) {
    events.push(event);
  }

  return events;
}
