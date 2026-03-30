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
});
