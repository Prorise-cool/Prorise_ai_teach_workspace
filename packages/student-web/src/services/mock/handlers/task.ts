/**
 * 文件说明：提供任务列表、详情、状态快照的 MSW handlers。
 */
import { http, HttpResponse } from 'msw';

import {
  getMockTaskDetailEnvelope,
  getMockTaskListEnvelope,
  getMockTaskSnapshotEnvelope,
  normalizeMockTaskError
} from '@/services/mock/fixtures/task';
import type { TaskMockScenario } from '@/types/task';

function readScenario(request: Request) {
  const url = new URL(request.url);

  return url.searchParams.get('scenario') as TaskMockScenario | null;
}

function toHttpErrorResponse(error: unknown) {
  const taskError = normalizeMockTaskError(error);

  return HttpResponse.json(
    {
      code: taskError.status,
      msg: taskError.message,
      data: null
    },
    { status: taskError.status }
  );
}

export const taskHandlers = [
  http.get('*/tasks', ({ request }) => {
    try {
      const scenario = readScenario(request) ?? 'default';

      return HttpResponse.json(getMockTaskListEnvelope(scenario), { status: 200 });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  }),
  http.get('*/tasks/:taskId', ({ params, request }) => {
    try {
      const scenario = readScenario(request) ?? undefined;
      const taskId = String(params.taskId);

      return HttpResponse.json(getMockTaskDetailEnvelope(taskId, scenario), { status: 200 });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  }),
  http.get('*/tasks/:taskId/snapshot', ({ params, request }) => {
    try {
      const scenario = readScenario(request) ?? undefined;
      const taskId = String(params.taskId);

      return HttpResponse.json(getMockTaskSnapshotEnvelope(taskId, scenario), {
        status: 200
      });
    } catch (error) {
      return toHttpErrorResponse(error);
    }
  })
];
