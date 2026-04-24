/**
 * 文件说明：验证 useSyntheticLogs 阶段切换追加日志与终态收尾行为。
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSyntheticLogs } from './use-synthetic-logs';

describe('useSyntheticLogs', () => {
  it('appends a pending log when stageLabel changes and marks previous as success', () => {
    const { result, rerender } = renderHook(
      ({ stage, progress }: { stage: string; progress: number }) =>
        useSyntheticLogs(stage, progress, { status: 'processing' }),
      { initialProps: { stage: 'Outline', progress: 10 } },
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ status: 'pending', text: 'Outline' });

    rerender({ stage: 'Scenes', progress: 50 });
    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toMatchObject({ status: 'success', text: 'Outline' });
    expect(result.current[1]).toMatchObject({ status: 'pending', text: 'Scenes' });
  });

  it('does not duplicate logs when stageLabel is unchanged across rerenders', () => {
    const { result, rerender } = renderHook(
      ({ stage, progress }: { stage: string; progress: number }) =>
        useSyntheticLogs(stage, progress, { status: 'processing' }),
      { initialProps: { stage: 'Outline', progress: 10 } },
    );

    rerender({ stage: 'Outline', progress: 20 });
    rerender({ stage: 'Outline', progress: 30 });
    expect(result.current).toHaveLength(1);
  });

  it('marks last pending as success and appends completedLabel on completed status', () => {
    const { result, rerender } = renderHook(
      ({ stage, status }: { stage: string; status: 'processing' | 'completed' }) =>
        useSyntheticLogs(stage, 90, { status, completedLabel: 'All done' }),
      { initialProps: { stage: 'Scenes', status: 'processing' } },
    );

    expect(result.current.at(-1)?.status).toBe('pending');

    act(() => {
      rerender({ stage: 'Scenes', status: 'completed' });
    });

    const logs = result.current;
    expect(logs.at(-1)).toMatchObject({ status: 'success', text: 'All done' });
    expect(logs.some((item) => item.status === 'pending')).toBe(false);
  });

  it('marks pending log as error and appends failedLabel on failed status', () => {
    const { result, rerender } = renderHook(
      ({ stage, status }: { stage: string; status: 'processing' | 'failed' }) =>
        useSyntheticLogs(stage, 40, { status, failedLabel: 'Pipeline failed' }),
      { initialProps: { stage: 'Scenes', status: 'processing' } },
    );

    act(() => {
      rerender({ stage: 'Scenes', status: 'failed' });
    });

    const logs = result.current;
    expect(logs.at(-1)).toMatchObject({ status: 'error', text: 'Pipeline failed' });
  });
});
