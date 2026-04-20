/**
 * Companion 智能侧栏 MSW handlers。
 * Story 6.2：拦截 bootstrap 和 ask 请求，消费 mock fixtures。
 */
import { http, HttpResponse } from 'msw';

import { getCompanionAskFixture, getCompanionBootstrapFixture } from '@/services/mock/fixtures/companion';
import { isCompanionMockScenario } from '@/types/companion';
import type { CompanionAskRequest } from '@/types/companion';

function readMockScenario(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get('scenario');
}

export const companionHandlers = [
  http.get('*/api/v1/companion/bootstrap', ({ request }) => {
    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId') ?? 'task_mock';
    const fixture = getCompanionBootstrapFixture(taskId);

    return HttpResponse.json(
      { code: 200, msg: 'ok', data: fixture },
      { status: 200 },
    );
  }),

  http.post('*/api/v1/companion/ask', async ({ request }) => {
    const scenarioParam = readMockScenario(request);
    const scenario = isCompanionMockScenario(scenarioParam)
      ? scenarioParam
      : 'first_ask';

    try {
      const body = (await request.json()) as CompanionAskRequest;

      if (!body?.questionText?.trim()) {
        return HttpResponse.json(
          {
            code: 422,
            msg: 'questionText 不能为空',
            data: null,
          },
          { status: 422 },
        );
      }

      if (!body?.anchor?.taskId) {
        return HttpResponse.json(
          {
            code: 422,
            msg: 'anchor.taskId 不能为空',
            data: null,
          },
          { status: 422 },
        );
      }

      if (scenario === 'service_error') {
        return HttpResponse.json(
          {
            code: 500,
            msg: 'Companion 服务暂时不可用',
            data: null,
          },
          { status: 500 },
        );
      }

      const fixture = getCompanionAskFixture(scenario, body);

      return HttpResponse.json(
        { code: 200, msg: 'ok', data: fixture },
        { status: 200 },
      );
    } catch {
      return HttpResponse.json(
        { code: 500, msg: '请求解析失败', data: null },
        { status: 500 },
      );
    }
  }),
];
