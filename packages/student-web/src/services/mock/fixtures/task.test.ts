import {
  TASK_ERROR_CODE_VALUES,
  TASK_EVENT_NAME_VALUES,
  TASK_STATUS_VALUES,
  type TaskEventPayload
} from '@/types/task';

import completedEvent from '../../../../../../mocks/tasks/sse.completed.json';
import cancelledEvent from '../../../../../../mocks/tasks/sse.cancelled.json';
import failedEvent from '../../../../../../mocks/tasks/sse.failed.json';
import providerSwitchEvent from '../../../../../../mocks/tasks/sse.provider-switch.json';
import snapshotEvent from '../../../../../../mocks/tasks/sse.snapshot.json';
import cancelledSequence from '../../../../../../mocks/tasks/sse.sequence.cancelled.json';
import failedSequence from '../../../../../../mocks/tasks/sse.sequence.failed.json';
import pollingSnapshot from '../../../../../../mocks/tasks/task-status.polling.json';

describe('shared task contract assets', () => {
  it('allows frontend tests to consume the same SSE payloads as backend contract tests', () => {
    const completedPayload = completedEvent as TaskEventPayload;
    const cancelledPayload = cancelledEvent as TaskEventPayload;
    const failedPayload = failedEvent as TaskEventPayload;
    const providerSwitchPayload = providerSwitchEvent as TaskEventPayload;
    const snapshotPayload = snapshotEvent as TaskEventPayload;
    const cancelledSequencePayload = cancelledSequence as TaskEventPayload[];
    const failedSequencePayload = failedSequence as TaskEventPayload[];

    for (const payload of [
      completedPayload,
      cancelledPayload,
      failedPayload,
      providerSwitchPayload,
      snapshotPayload,
      ...cancelledSequencePayload,
      ...failedSequencePayload
    ]) {
      expect(TASK_EVENT_NAME_VALUES).toContain(payload.event);
      expect(TASK_STATUS_VALUES).toContain(payload.status);
      expect(payload.id).toContain(':evt:');
      expect(payload.sequence).toBeGreaterThan(0);
    }

    expect(failedPayload.errorCode && TASK_ERROR_CODE_VALUES.includes(failedPayload.errorCode)).toBe(true);
    expect(cancelledPayload).toMatchObject({
      event: 'cancelled',
      errorCode: 'TASK_CANCELLED'
    });
    expect(providerSwitchPayload).toMatchObject({
      event: 'provider_switch',
      from: 'gemini-2_5-flash',
      to: 'claude-3_7-sonnet',
      reason: 'primary provider unavailable'
    });
    expect(snapshotPayload.resumeFrom).toBe('task_mock_snapshot:evt:000002');
    expect(pollingSnapshot).toMatchObject({
      taskId: 'task_mock_snapshot',
      status: 'processing',
      lastEventId: 'task_mock_snapshot:evt:000003',
      resumeFrom: 'task_mock_snapshot:evt:000002'
    });
    expect(cancelledSequencePayload.map(payload => payload.sequence)).toEqual([1, 2, 3]);
    expect(failedSequencePayload.map(payload => payload.sequence)).toEqual([1, 2, 3, 4, 5]);
  });
});
