/**
 * 文件说明：提供任务列表、详情、状态快照的 MSW handlers。
 */
import { http, HttpResponse } from "msw";

import {
  getMockTaskDetailEnvelope,
  getMockTaskEventSequence,
  getMockTaskListEnvelope,
  getMockTaskSnapshotEnvelope,
  normalizeMockTaskError,
} from "@/services/mock/fixtures/task";
import { isTaskMockScenario } from "@/types/task";

function readScenario(request: Request) {
  const url = new URL(request.url);
  const scenario = url.searchParams.get("scenario");

  return isTaskMockScenario(scenario) ? scenario : null;
}

function toHttpErrorResponse(error: unknown) {
  const taskError = normalizeMockTaskError(error);

  return HttpResponse.json(
    {
      code: taskError.status,
      msg: taskError.message,
      data: null,
    },
    { status: taskError.status },
  );
}

export const taskHandlers = [
  http.get("*/api/v1/tasks", ({ request }) => {
    try {
      const scenario = readScenario(request) ?? "default";

      return HttpResponse.json(getMockTaskListEnvelope(scenario), {
        status: 200,
      });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  }),
  http.get("*/api/v1/tasks/:taskId", ({ params, request }) => {
    try {
      const scenario = readScenario(request) ?? undefined;
      const taskId = String(params.taskId);

      return HttpResponse.json(getMockTaskDetailEnvelope(taskId, scenario), {
        status: 200,
      });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  }),
  http.get("*/api/v1/tasks/:taskId/snapshot", ({ params, request }) => {
    try {
      const scenario = readScenario(request) ?? undefined;
      const taskId = String(params.taskId);

      return HttpResponse.json(getMockTaskSnapshotEnvelope(taskId, scenario), {
        status: 200,
      });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  }),
  http.get("*/api/v1/tasks/:taskId/events", ({ params, request }) => {
    try {
      const scenario = readScenario(request) ?? undefined;
      const taskId = String(params.taskId);
      const body = getMockTaskEventSequence(taskId, scenario)
        .map(
          (event) =>
            `event: ${event.event}\ndata: ${JSON.stringify(event)}\n\n`,
        )
        .join("");

      return new HttpResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
        },
      });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  }),
];
