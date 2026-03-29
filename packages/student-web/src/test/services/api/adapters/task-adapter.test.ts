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
    expect(snapshot.task?.status).toBe('processing');
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
            updatedAt: '2026-03-29T16:30:00+08:00',
            description: '任务 task_mock_completed 的 mock 详情',
            resultUrl: 'https://static.prorise.test/results/task_mock_completed.mp4',
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

    expect(request.mock.calls[0]?.[0]).toMatchObject({
      url: '/api/v1/tasks',
      method: 'get'
    });
    expect(request.mock.calls[1]?.[0]).toMatchObject({
      url: '/api/v1/tasks/task_mock_completed',
      method: 'get'
    });
  });
});
