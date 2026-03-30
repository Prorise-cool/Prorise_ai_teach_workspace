import {
  TASK_ERROR_CODE_VALUES,
  TASK_EVENT_NAME_VALUES,
  TASK_STATUS_VALUES,
  type TaskEventPayload
} from '@/types/task';

import completedEvent from '../../../../../../../mocks/tasks/sse.completed.json';
import failedEvent from '../../../../../../../mocks/tasks/sse.failed.json';
import providerSwitchEvent from '../../../../../../../mocks/tasks/sse.provider-switch.json';
import snapshotEvent from '../../../../../../../mocks/tasks/sse.snapshot.json';
import failedSequence from '../../../../../../../mocks/tasks/sse.sequence.failed.json';

describe('shared task contract assets', () => {
  it('allows frontend tests to consume the same SSE payloads as backend contract tests', () => {
    const completedPayload = completedEvent as TaskEventPayload;
    const failedPayload = failedEvent as TaskEventPayload;
    const providerSwitchPayload = providerSwitchEvent as TaskEventPayload;
    const snapshotPayload = snapshotEvent as TaskEventPayload;
    const failedSequencePayload = failedSequence as TaskEventPayload[];

    for (const payload of [
      completedPayload,
      failedPayload,
      providerSwitchPayload,
      snapshotPayload,
      ...failedSequencePayload
    ]) {
      expect(TASK_EVENT_NAME_VALUES).toContain(payload.event);
      expect(TASK_STATUS_VALUES).toContain(payload.status);
      expect(payload.id).toContain(':evt:');
      expect(payload.sequence).toBeGreaterThan(0);
    }

    expect(failedPayload.errorCode && TASK_ERROR_CODE_VALUES.includes(failedPayload.errorCode)).toBe(true);
    expect(providerSwitchPayload).toMatchObject({
      event: 'provider_switch',
      from: 'gemini-2_5-flash',
      to: 'claude-3_7-sonnet',
      reason: 'primary provider unavailable'
    });
    expect(snapshotPayload.resumeFrom).toBe('task_mock_snapshot:evt:000002');
    expect(failedSequencePayload.map(payload => payload.sequence)).toEqual([1, 2, 3, 4, 5]);
  });
});
