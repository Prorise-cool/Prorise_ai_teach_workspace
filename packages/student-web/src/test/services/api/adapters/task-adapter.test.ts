import {
  createRealTaskAdapter,
  resolveTaskAdapter
} from '@/services/api/adapters';

describe('task adapter', () => {
  it('returns stable list, detail and snapshot domain objects in mock mode', async () => {
    const adapter = resolveTaskAdapter({ useMock: true });

    const list = await adapter.listTasks();
    const detail = await adapter.getTask('task_mock_completed');
    const snapshot = await adapter.getTaskSnapshot('task_mock_processing');

    expect(list.total).toBe(3);
    expect(list.items.map(item => item.status)).toEqual([
      'processing',
      'completed',
      'failed'
    ]);
    expect(detail.resultUrl).toBe('https://static.prorise.test/results/task_mock_completed.mp4');
    expect(snapshot.status).toBe('processing');
  });

  it('maps real adapter responses with the FastAPI task endpoints', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        data: {
          code: 200,
          msg: '获取任务列表成功',
          requestId: 'req_task_list_default',
          rows: [],
          total: 0
        }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          code: 200,
          msg: '获取任务详情成功',
          data: {
            id: 'task_mock_completed',
            taskId: 'task_mock_completed',
            requestId: 'req_task_completed',
            title: '任务 task_mock_completed',
            taskType: 'video',
            status: 'completed',
            progress: 100,
            message: '任务执行完成',
            timestamp: '2026-03-30T13:05:00Z',
            description: '任务 task_mock_completed 的 mock 详情',
            resultUrl: 'https://static.prorise.test/results/task_mock_completed.mp4',
            errorCode: null
          }
        }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          code: 200,
          msg: '获取任务快照成功',
          data: {
            taskId: 'task_mock_processing',
            requestId: 'req_task_processing',
            taskType: 'video',
            status: 'processing',
            progress: 42,
            message: '任务处理中状态已同步',
            timestamp: '2026-03-30T13:05:00Z',
            errorCode: null
          }
        }
      });

    const adapter = createRealTaskAdapter({
      client: {
        request
      } as never
    });

    await adapter.listTasks();
    await adapter.getTask('task_mock_completed');
    await adapter.getTaskSnapshot('task_mock_processing');

    expect(request.mock.calls[0]?.[0]).toMatchObject({
      url: '/api/v1/tasks',
      method: 'get'
    });
    expect(request.mock.calls[1]?.[0]).toMatchObject({
      url: '/api/v1/tasks/task_mock_completed',
      method: 'get'
    });
    expect(request.mock.calls[2]?.[0]).toMatchObject({
      url: '/api/v1/tasks/task_mock_processing/status',
      method: 'get'
    });
  });

  it('forwards abort signals to the status endpoint', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      status: 200,
      data: {
        code: 200,
        msg: '获取任务快照成功',
        data: {
          taskId: 'task_mock_processing',
          requestId: 'req_task_processing',
          taskType: 'video',
          status: 'processing',
          progress: 42,
          message: '任务处理中状态已同步',
          timestamp: '2026-03-30T13:05:00Z',
          errorCode: null
        }
      }
    });
    const controller = new AbortController();

    const adapter = createRealTaskAdapter({
      client: {
        request
      } as never
    });

    await adapter.getTaskSnapshot('task_mock_processing', {
      signal: controller.signal
    });

    expect(request.mock.calls[0]?.[0]).toMatchObject({
      url: '/api/v1/tasks/task_mock_processing/status',
      method: 'get',
      signal: controller.signal
    });
  });
});
