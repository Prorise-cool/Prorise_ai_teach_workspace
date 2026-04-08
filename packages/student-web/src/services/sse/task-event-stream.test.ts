import {
  collectTaskEvents,
  createRealTaskEventStream,
  resolveTaskEventStream
} from '@/services/sse';

describe('task event stream', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('replays connected, progress, heartbeat and completed events in mock mode', async () => {
    const stream = resolveTaskEventStream({ useMock: true });
    const events = await collectTaskEvents(
      stream.streamTaskEvents('task_mock_completed', {
        scenario: 'completed'
      })
    );

    expect(events.map(event => event.event)).toEqual([
      'connected',
      'progress',
      'heartbeat',
      'completed'
    ]);
    expect(events.map(event => event.sequence)).toEqual([1, 2, 3, 4]);
    expect(events.map(event => event.id)).toEqual([
      'task_mock_completed:evt:000001',
      'task_mock_completed:evt:000002',
      'task_mock_completed:evt:000003',
      'task_mock_completed:evt:000004'
    ]);
    expect(events.at(-1)).toMatchObject({
      status: 'completed',
      progress: 100
    });
  });

  it('replays provider_switch and failed semantics from the shared mock sequence', async () => {
    const stream = resolveTaskEventStream({ useMock: true });
    const events = await collectTaskEvents(
      stream.streamTaskEvents('task_mock_failed', {
        scenario: 'failed'
      })
    );

    expect(events.map(event => event.event)).toEqual([
      'connected',
      'progress',
      'provider_switch',
      'heartbeat',
      'failed'
    ]);
    expect(events[2]).toMatchObject({
      event: 'provider_switch',
      from: 'gemini-2_5-flash',
      to: 'claude-3_7-sonnet',
      reason: 'primary provider unavailable'
    });
    expect(events.at(-1)).toMatchObject({
      event: 'failed',
      errorCode: 'TASK_PROVIDER_TIMEOUT'
    });
  });

  it('replays cancelled terminal semantics from the shared mock sequence', async () => {
    const stream = resolveTaskEventStream({ useMock: true });
    const events = await collectTaskEvents(
      stream.streamTaskEvents('task_mock_cancelled', {
        scenario: 'cancelled'
      })
    );

    expect(events.map(event => event.event)).toEqual([
      'connected',
      'progress',
      'cancelled'
    ]);
    expect(events.at(-1)).toMatchObject({
      event: 'cancelled',
      status: 'cancelled',
      errorCode: 'TASK_CANCELLED'
    });
  });

  it('parses real SSE payloads, forwards Last-Event-ID, and skips unknown events', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        [
          'id: task_real_001:evt:000001',
          'event: connected',
          'data: {"taskId":"task_real_001","taskType":"video","status":"pending","progress":0,"message":"connected","timestamp":"2026-03-30T13:05:00Z","requestId":"req_real","errorCode":null}',
          '',
          'id: task_real_001:evt:000002',
          'event: unknown_type',
          'data: {"taskId":"task_real_001","taskType":"video","status":"processing","progress":20,"message":"ignored","timestamp":"2026-03-30T13:05:05Z","requestId":"req_real","errorCode":null}',
          '',
          'id: task_real_001:evt:000003',
          'event: failed',
          'data: {"id":"task_real_001:evt:000003","sequence":3,"taskId":"task_real_001","taskType":"video","status":"failed","progress":20,"message":"failed","timestamp":"2026-03-30T13:05:08Z","requestId":"req_real","errorCode":"TASK_PROVIDER_TIMEOUT"}',
          ''
        ].join('\n'),
        {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream'
          }
        }
      )
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const stream = createRealTaskEventStream();
    const events = await collectTaskEvents(
      stream.streamTaskEvents('task_real_001', {
        lastEventId: 'task_real_001:evt:000001'
      })
    );

    const firstCall = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit | undefined] | undefined;
    const requestUrl = firstCall?.[0];
    const requestInit = firstCall?.[1];

    expect(
      requestUrl instanceof URL
        ? requestUrl.href
        : typeof requestUrl === 'string'
          ? requestUrl
          : ''
    ).toContain(
      '/api/v1/tasks/task_real_001/events'
    );
    expect(requestInit).toMatchObject({
      headers: {
        Accept: 'text/event-stream, application/json',
        'Last-Event-ID': 'task_real_001:evt:000001'
      }
    });
    expect(events.map(event => event.event)).toEqual(['connected', 'failed']);
    expect(events.at(-1)?.id).toBe('task_real_001:evt:000003');
    expect(warnSpy).toHaveBeenCalledWith(
      '[task-sse] Ignoring unknown task SSE event type',
      expect.any(Object)
    );
  });

  it('reconnects SSE with the latest event id after a transient disconnect', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          [
            'id: task_real_retry:evt:000001',
            'event: connected',
            'data: {"taskId":"task_real_retry","taskType":"video","status":"pending","progress":0,"message":"connected","timestamp":"2026-03-30T13:05:00Z","requestId":"req_real_retry","errorCode":null}',
            '',
            'id: task_real_retry:evt:000002',
            'event: progress',
            'data: {"taskId":"task_real_retry","taskType":"video","status":"processing","progress":30,"message":"working","timestamp":"2026-03-30T13:05:05Z","requestId":"req_real_retry","errorCode":null,"currentStage":"render","stageLabel":"video.stages.render","stageProgress":45}',
            ''
          ].join('\n'),
          {
            status: 200,
            headers: {
              'Content-Type': 'text/event-stream'
            }
          }
        )
      )
      .mockRejectedValueOnce(new Error('temporary network failure'))
      .mockResolvedValueOnce(
        new Response(
          [
            'id: task_real_retry:evt:000003',
            'event: completed',
            'data: {"taskId":"task_real_retry","taskType":"video","status":"completed","progress":100,"message":"done","timestamp":"2026-03-30T13:05:08Z","requestId":"req_real_retry","errorCode":null}',
            ''
          ].join('\n'),
          {
            status: 200,
            headers: {
              'Content-Type': 'text/event-stream'
            }
          }
        )
      );

    const stream = createRealTaskEventStream({
      reconnectAttempts: 2,
      reconnectDelayMs: 0
    });
    const events = await collectTaskEvents(stream.streamTaskEvents('task_real_retry'));

    expect(events.map(event => event.event)).toEqual([
      'connected',
      'progress',
      'completed'
    ]);
    expect(events[1]).toMatchObject({
      currentStage: 'render',
      stageLabel: 'video.stages.render',
      stageProgress: 45
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: {
        'Last-Event-ID': 'task_real_retry:evt:000002'
      }
    });
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      headers: {
        'Last-Event-ID': 'task_real_retry:evt:000002'
      }
    });
  });

  it('falls back to polling status snapshots after reconnect exhaustion', async () => {
    const adapter = {
      getTaskSnapshot: vi
        .fn()
        .mockResolvedValueOnce({
          taskId: 'task_real_polling',
          requestId: 'req_real_polling',
          taskType: 'video',
          status: 'processing',
          progress: 56,
          message: 'polling',
          timestamp: '2026-03-30T13:05:11Z',
          stage: 'rendering',
          currentStage: 'rendering',
          stageLabel: 'video.stages.rendering',
          stageProgress: 56,
          errorCode: null,
          lastEventId: 'task_real_polling:evt:000002'
        })
        .mockResolvedValueOnce({
          taskId: 'task_real_polling',
          requestId: 'req_real_polling',
          taskType: 'video',
          status: 'completed',
          progress: 100,
          message: 'done',
          timestamp: '2026-03-30T13:05:14Z',
          stage: 'done',
          errorCode: null,
          lastEventId: 'task_real_polling:evt:000003'
        })
    };

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('sse unavailable'));

    const stream = createRealTaskEventStream({
      adapter: adapter as never,
      reconnectAttempts: 0,
      reconnectDelayMs: 0,
      pollingIntervalMs: 0
    });
    const events = await collectTaskEvents(
      stream.streamTaskEvents('task_real_polling')
    );

    expect(events.map(event => event.event)).toEqual(['snapshot', 'snapshot']);
    expect(events.at(0)).toMatchObject({
      status: 'processing',
      progress: 56,
      currentStage: 'rendering',
      stageLabel: 'video.stages.rendering',
      stageProgress: 56,
      resumeFrom: 'task_real_polling:evt:000002'
    });
    expect(events.at(-1)).toMatchObject({
      status: 'completed',
      progress: 100,
      resumeFrom: 'task_real_polling:evt:000003'
    });
    expect(adapter.getTaskSnapshot).toHaveBeenCalledTimes(2);
  });

  it('falls back to polling immediately when the server requires snapshot recovery', async () => {
    const adapter = {
      getTaskSnapshot: vi
        .fn()
        .mockResolvedValueOnce({
          taskId: 'task_real_snapshot_required',
          requestId: 'req_real_snapshot_required',
          taskType: 'video',
          status: 'processing',
          progress: 64,
          message: 'restored from snapshot',
          timestamp: '2026-03-30T13:05:21Z',
          stage: 'rendering',
          currentStage: 'rendering',
          stageLabel: 'video.stages.rendering',
          stageProgress: 64,
          errorCode: null,
          lastEventId: 'task_real_snapshot_required:evt:000003'
        })
        .mockResolvedValueOnce({
          taskId: 'task_real_snapshot_required',
          requestId: 'req_real_snapshot_required',
          taskType: 'video',
          status: 'completed',
          progress: 100,
          message: 'done',
          timestamp: '2026-03-30T13:05:25Z',
          stage: 'done',
          errorCode: null,
          lastEventId: 'task_real_snapshot_required:evt:000004'
        })
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'X-Task-Recovery-Mode': 'snapshot-required',
          'X-Task-Last-Event-ID': 'task_real_snapshot_required:evt:000003'
        }
      })
    );

    const stream = createRealTaskEventStream({
      adapter: adapter as never,
      reconnectAttempts: 3,
      reconnectDelayMs: 0,
      pollingIntervalMs: 0
    });
    const events = await collectTaskEvents(
      stream.streamTaskEvents('task_real_snapshot_required')
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(events.map(event => event.event)).toEqual(['snapshot', 'snapshot']);
    expect(events.at(0)).toMatchObject({
      sequence: 4,
      status: 'processing',
      currentStage: 'rendering',
      stageLabel: 'video.stages.rendering',
      stageProgress: 64,
      resumeFrom: 'task_real_snapshot_required:evt:000003'
    });
    expect(events.at(-1)).toMatchObject({
      sequence: 5,
      status: 'completed',
      resumeFrom: 'task_real_snapshot_required:evt:000004'
    });
    expect(adapter.getTaskSnapshot).toHaveBeenCalledTimes(2);
  });

  it('stops polling when the abort signal is triggered', async () => {
    const controller = new AbortController();
    const adapter = {
      getTaskSnapshot: vi.fn().mockResolvedValue({
        taskId: 'task_real_abort',
        requestId: 'req_real_abort',
        taskType: 'video',
        status: 'processing',
        progress: 44,
        message: 'polling',
        timestamp: '2026-03-30T13:05:11Z',
        stage: 'rendering',
        errorCode: null,
        lastEventId: 'task_real_abort:evt:000002'
      })
    };

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('sse unavailable'));

    const stream = createRealTaskEventStream({
      adapter: adapter as never,
      reconnectAttempts: 0,
      reconnectDelayMs: 0,
      pollingIntervalMs: 1000
    });
    const iterator = stream.streamTaskEvents('task_real_abort', {
      signal: controller.signal
    })[Symbol.asyncIterator]();

    const firstResult = await iterator.next();

    expect(firstResult.done).toBe(false);
    if (firstResult.done) {
      return;
    }
    expect(firstResult.value).toMatchObject({
      event: 'snapshot',
      status: 'processing'
    });

    const nextPromise = iterator.next();
    controller.abort();

    await expect(nextPromise).rejects.toMatchObject({
      name: 'AbortError'
    });
    expect(adapter.getTaskSnapshot).toHaveBeenCalledTimes(1);
  });
});
