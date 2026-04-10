/**
 * 解析器：提供 SSE 消息解析、任务事件载荷标准化功能。
 */
import {
  createParser,
  type EventSourceMessage,
  type ParseError,
} from "eventsource-parser";

import { parseJsonText, readJsonBody } from "@/lib/type-guards";
import type {
  TaskStreamEventPayload,
} from "@/types/task";

import { isTaskErrorCode, isTaskEventName, isTaskLifecycleStatus, isRecord } from "./type-guards";
import {
  buildTransientTaskEventId,
  isStandardTaskEventId,
  isTransientTaskEventName,
  parseTaskEventId,
  toOptionalResult,
  toOptionalString,
  warnParseIssue,
} from "./utils";

export type TaskEventParserLogger = Pick<Console, "warn">;

export type RawSseMessage = {
  eventName: string | null;
  eventId: string | null;
  data: string;
  fallbackId?: string | null;
  fallbackSequence?: number | null;
};

/**
 * 把原始 SSE 或 JSON 载荷标准化为任务流事件。
 *
 * @param rawPayload - 原始事件载荷。
 * @param metadata - 从 SSE 协议头解析出的元信息。
 * @param logger - 解析日志输出器。
 * @returns 标准化后的任务事件；非法载荷返回 `null`。
 */
export function normalizeTaskEventPayload(
  rawPayload: unknown,
  metadata: Pick<RawSseMessage, "eventName" | "eventId" | "fallbackId" | "fallbackSequence">,
  logger: TaskEventParserLogger = console,
): TaskStreamEventPayload | null {
  if (!isRecord(rawPayload)) {
    warnParseIssue(logger, "Ignoring non-object task SSE payload", rawPayload);
    return null;
  }

  const eventName = metadata.eventName ?? rawPayload.event;
  const preferredEventId =
    metadata.eventId ??
    (typeof rawPayload.id === "string" ? rawPayload.id : null);
  const eventId =
    isStandardTaskEventId(preferredEventId)
      ? preferredEventId
      : metadata.fallbackId ??
        (typeof preferredEventId === "string" ? preferredEventId : null);
  const sequence =
    typeof rawPayload.sequence === "number"
      ? rawPayload.sequence
      : typeof eventId === "string"
        ? parseTaskEventId(eventId) ?? metadata.fallbackSequence ?? null
        : metadata.fallbackSequence ?? null;

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

export function parseTaskEventMessage(
  message: RawSseMessage,
  logger: TaskEventParserLogger,
  transientSequence: number,
) {
  try {
    const rawPayload = parseJsonText(message.data);
    const rawRecord = isRecord(rawPayload) ? rawPayload : null;
    const rawEventId =
      message.eventId ??
      (typeof rawRecord?.id === "string" ? rawRecord.id : null);
    const rawSequence =
      typeof rawRecord?.sequence === "number"
        ? rawRecord.sequence
        : typeof rawEventId === "string"
          ? parseTaskEventId(rawEventId)
          : null;
    const rawEventName = message.eventName ?? rawRecord?.event;
    const rawTaskId =
      typeof rawRecord?.taskId === "string" ? rawRecord.taskId : null;

    const shouldUseTransientIdentity =
      isTransientTaskEventName(rawEventName) &&
      rawTaskId !== null &&
      (typeof rawEventId !== "string" || rawSequence === null);

    const normalizedMessage: RawSseMessage = shouldUseTransientIdentity
      ? {
          ...message,
          fallbackId: buildTransientTaskEventId(
            rawTaskId,
            rawEventName,
            transientSequence,
          ),
          fallbackSequence: transientSequence,
        }
      : message;

    return {
      event: normalizeTaskEventPayload(rawPayload, normalizedMessage, logger),
      usedTransientIdentity: shouldUseTransientIdentity,
    };
  } catch (error) {
    warnParseIssue(
      logger,
      `Ignoring invalid task SSE JSON payload: ${String(error)}`,
      message.data,
    );
    return {
      event: null,
      usedTransientIdentity: false,
    };
  }
}

/**
 * 使用 `eventsource-parser` 按 SSE 协议拆分原始文本为消息数组。
 *
 * @param rawBody - 原始 SSE 文本。
 * @param logger - 解析日志输出器。
 * @returns 解析后的 SSE 消息数组。
 */
export function parseSseMessages(
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
  let transientSequence = 0;

  return parseSseMessages(rawBody, logger).flatMap((message) => {
    const parsed = parseTaskEventMessage(
      message,
      logger,
      transientSequence + 1,
    );

    if (parsed.usedTransientIdentity) {
      transientSequence += 1;
    }

    return parsed.event ? [parsed.event] : [];
  });
}

/**
 * 流式解析任务事件响应，逐步 yield 事件。
 */
export async function* streamTaskEventResponse(
  response: Response,
  logger: TaskEventParserLogger = console,
): AsyncIterable<TaskStreamEventPayload> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json") || response.body === null) {
    for (const event of await parseTaskEventResponse(response, logger)) {
      yield event;
    }
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const messages: RawSseMessage[] = [];
  let transientSequence = 0;
  let streamCompleted = false;
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
        error.line ?? error.value ?? "[stream-chunk]",
      );
    },
  });

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        streamCompleted = true;
        break;
      }

      parser.feed(decoder.decode(value, { stream: true }));

      while (messages.length > 0) {
        const parsed = parseTaskEventMessage(
          messages.shift()!,
          logger,
          transientSequence + 1,
        );

        if (parsed.usedTransientIdentity) {
          transientSequence += 1;
        }

        if (parsed.event) {
          yield parsed.event;
        }
      }
    }

    parser.feed(`${decoder.decode()}\n\n`);

    while (messages.length > 0) {
      const parsed = parseTaskEventMessage(
        messages.shift()!,
        logger,
        transientSequence + 1,
      );

      if (parsed.usedTransientIdentity) {
        transientSequence += 1;
      }

      if (parsed.event) {
        yield parsed.event;
      }
    }
  } finally {
    if (!streamCompleted) {
      await reader.cancel().catch(() => undefined);
    }

    reader.releaseLock();
  }
}
