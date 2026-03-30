import { getMockTaskEventSequence } from '@/services/mock/fixtures/task';
import type {
  TaskEventPayload,
  TaskMockScenario
} from '@/types/task';

import { resolveRuntimeMode } from '@/services/api/adapters/base-adapter';

type TaskEventStreamOptions = {
  scenario?: TaskMockScenario;
  signal?: AbortSignal;
  useMock?: boolean;
};

export interface TaskEventStream {
  streamTaskEvents(
    taskId: string,
    options?: TaskEventStreamOptions
  ): AsyncIterable<TaskEventPayload>;
}

async function parseRealEventResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return (await response.json()) as TaskEventPayload[];
  }

  const rawBody = await response.text();
  const chunks = rawBody
    .split('\n\n')
    .map(chunk => chunk.trim())
    .filter(Boolean);

  return chunks.flatMap(chunk => {
    const dataLine = chunk
      .split('\n')
      .find(line => line.startsWith('data:'));

    if (!dataLine) {
      return [];
    }

    return [JSON.parse(dataLine.slice('data:'.length).trim()) as TaskEventPayload];
  });
}

export function createMockTaskEventStream(): TaskEventStream {
  return {
    async *streamTaskEvents(taskId, options) {
      for (const event of getMockTaskEventSequence(taskId, options?.scenario)) {
        await Promise.resolve();
        yield event;
      }
    }
  };
}

export function createRealTaskEventStream(): TaskEventStream {
  return {
    async *streamTaskEvents(taskId, options) {
      const response = await fetch(
        `${import.meta.env.VITE_FASTAPI_BASE_URL}/api/v1/tasks/${taskId}/events`,
        {
          headers: {
            Accept: 'text/event-stream, application/json'
          },
          signal: options?.signal
        }
      );

      if (!response.ok) {
        throw new Error(`任务事件流初始化失败：${response.status}`);
      }

      const events = await parseRealEventResponse(response);

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
  iterable: AsyncIterable<TaskEventPayload>
) {
  const events: TaskEventPayload[] = [];

  for await (const event of iterable) {
    events.push(event);
  }

  return events;
}
