import { setupServer } from 'msw/node';

import { taskHandlers } from '@/services/mock/handlers/task';

const server = setupServer(...taskHandlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('task mock handlers', () => {
  it('returns an empty task list scenario', async () => {
    const response = await fetch('http://localhost/api/v1/tasks?scenario=empty');
    const payload = (await response.json()) as {
      code: number;
      total: number;
      rows: unknown[];
    };

    expect(response.status).toBe(200);
    expect(payload.code).toBe(200);
    expect(payload.total).toBe(0);
    expect(payload.rows).toEqual([]);
  });

  it('returns failed snapshot payloads for task state machines', async () => {
    const response = await fetch('http://localhost/api/v1/tasks/task_mock_failed/snapshot');
    const payload = (await response.json()) as {
      code: number;
      data: {
        status: string;
        errorCode: string | null;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe('failed');
    expect(payload.data.errorCode).toBe('TASK_PROVIDER_TIMEOUT');
  });

  it('returns a forbidden envelope when the scenario requires access denial', async () => {
    const response = await fetch('http://localhost/api/v1/tasks?scenario=forbidden');
    const payload = (await response.json()) as {
      code: number;
      msg: string;
      data: null;
    };

    expect(response.status).toBe(403);
    expect(payload.code).toBe(403);
    expect(payload.msg).toBe('当前账号暂无任务访问权限');
    expect(payload.data).toBeNull();
  });

  it('returns text/event-stream payloads for task event mocks', async () => {
    const response = await fetch('http://localhost/api/v1/tasks/task_mock_completed/events');
    const rawBody = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(rawBody).toContain('event: completed');
    expect(rawBody).toContain('"taskId":"task_mock_completed"');
  });
});
