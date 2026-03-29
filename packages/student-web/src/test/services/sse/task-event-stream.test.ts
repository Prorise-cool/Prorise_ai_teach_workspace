import {
  collectTaskEvents,
  resolveTaskEventStream
} from '@/services/sse';

describe('task event stream', () => {
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
    expect(events.at(-1)).toMatchObject({
      status: 'completed',
      progress: 100
    });
  });

  it('replays failure semantics for failed scenarios', async () => {
    const stream = resolveTaskEventStream({ useMock: true });
    const events = await collectTaskEvents(
      stream.streamTaskEvents('task_mock_failed', {
        scenario: 'failed'
      })
    );

    expect(events.at(-1)).toMatchObject({
      event: 'failed',
      errorCode: 'TASK_PROVIDER_TIMEOUT'
    });
  });
});
