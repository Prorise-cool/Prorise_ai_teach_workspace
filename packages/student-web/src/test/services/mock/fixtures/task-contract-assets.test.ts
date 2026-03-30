import {
  TASK_ERROR_CODE_VALUES,
  TASK_STATUS_VALUES,
  type TaskEventPayload,
  type TaskSnapshot
} from '@/types/task';

import cancelled from '../../../../../../../mocks/tasks/task-lifecycle.cancelled.json';
import failed from '../../../../../../../mocks/tasks/task-lifecycle.failed.json';
import providerSwitch from '../../../../../../../mocks/tasks/task-lifecycle.provider-switch.json';
import snapshot from '../../../../../../../mocks/tasks/task-lifecycle.snapshot.json';
import success from '../../../../../../../mocks/tasks/task-lifecycle.success.json';

describe('shared task contract assets', () => {
  it('allows frontend tests to consume the same lifecycle payloads as backend contract tests', () => {
    const successPayload = success as TaskSnapshot;
    const failedPayload = failed as TaskSnapshot;
    const cancelledPayload = cancelled as TaskSnapshot;
    const snapshotPayload = snapshot as TaskSnapshot;
    const providerSwitchPayload = providerSwitch as TaskEventPayload;

    expect(TASK_STATUS_VALUES).toContain(successPayload.status);
    expect(TASK_STATUS_VALUES).toContain(failedPayload.status);
    expect(TASK_STATUS_VALUES).toContain(cancelledPayload.status);
    expect(TASK_STATUS_VALUES).toContain(snapshotPayload.status);
    expect(failedPayload.errorCode && TASK_ERROR_CODE_VALUES.includes(failedPayload.errorCode)).toBe(true);
    expect(cancelledPayload.errorCode && TASK_ERROR_CODE_VALUES.includes(cancelledPayload.errorCode)).toBe(true);
    expect(providerSwitchPayload.event).toBe('provider_switch');
    expect(
      providerSwitchPayload.errorCode &&
      TASK_ERROR_CODE_VALUES.includes(providerSwitchPayload.errorCode)
    ).toBe(true);
    expect(providerSwitchPayload.context?.providerSwitch).toMatchObject({
      from: 'volcengine-tts',
      to: 'azure-tts'
    });
  });
});
