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

  it('keeps real adapter aligned with the current FastAPI recovery endpoints', async () => {
    const request = vi
      .fn()
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

    await expect(adapter.listTasks()).rejects.toMatchObject({
      status: 501,
      code: 'TASK_OPERATION_UNSUPPORTED'
    });
    await expect(adapter.getTask('task_mock_completed')).rejects.toMatchObject({
      status: 501,
      code: 'TASK_OPERATION_UNSUPPORTED'
    });
    await adapter.getTaskSnapshot('task_mock_processing');

    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toMatchObject({
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

  it('supports module-scoped snapshot endpoints for video recovery', async () => {
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
          errorCode: null,
          stage: 'render'
        }
      }
    });
    const adapter = createRealTaskAdapter({
      client: {
        request
      } as never,
      module: 'video'
    });

    await adapter.getTaskSnapshot('task_mock_processing');

    expect(request.mock.calls[0]?.[0]).toMatchObject({
      url: '/api/v1/video/tasks/task_mock_processing/status',
      method: 'get'
    });
  });
});
