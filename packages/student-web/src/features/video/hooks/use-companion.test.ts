import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCompanion } from './use-companion';

vi.mock('@/services/api/adapters/companion-adapter', () => ({
  resolveCompanionAdapter: () => ({
    ask: vi.fn().mockImplementation((req: { questionText: string; anchor: { taskId: string; seconds: number } }) =>
      Promise.resolve({
        turnId: `turn_${Date.now()}`,
        answerText: `回答: ${req.questionText}`,
        anchor: req.anchor,
        whiteboardActions: [],
        sourceRefs: [],
        persistenceStatus: 'complete_success',
        contextSourceHit: 'redis',
      }),
    ),
    bootstrap: vi.fn().mockResolvedValue({
      taskId: 'task_1',
      sessionId: 'sess_1',
      contextSource: 'redis',
      knowledgePoints: ['导数'],
      topicSummary: 'test',
    }),
  }),
}));

describe('useCompanion', () => {
  it('starts in empty state', () => {
    const { result } = renderHook(() =>
      useCompanion({
        taskId: 'task_1',
        currentTimeSeconds: 0,
      }),
    );

    expect(result.current.interactionState).toBe('empty');
    expect(result.current.turns).toEqual([]);
    expect(result.current.isAsking).toBe(false);
  });

  it('computes anchor from props', () => {
    const { result } = renderHook(() =>
      useCompanion({
        taskId: 'task_1',
        currentTimeSeconds: 120,
        activeSectionTitle: '积分概念',
      }),
    );

    expect(result.current.currentAnchor).toEqual({
      taskId: 'task_1',
      seconds: 120,
      sectionTitle: '积分概念',
    });
  });

  it('transitions through asking → first_ask after ask', async () => {
    const { result } = renderHook(() =>
      useCompanion({
        taskId: 'task_1',
        currentTimeSeconds: 60,
      }),
    );

    expect(result.current.interactionState).toBe('empty');

    await act(async () => {
      await result.current.ask('什么是导数？');
    });

    expect(result.current.turns.length).toBe(1);
    expect(result.current.turns[0].questionText).toBe('什么是导数？');
    expect(result.current.interactionState).toBe('first_ask');
  });

  it('transitions to follow_up on second ask', async () => {
    const { result } = renderHook(() =>
      useCompanion({
        taskId: 'task_1',
        currentTimeSeconds: 60,
      }),
    );

    await act(async () => {
      await result.current.ask('问题1');
    });

    await act(async () => {
      await result.current.ask('问题2');
    });

    expect(result.current.turns.length).toBe(2);
    expect(result.current.interactionState).toBe('follow_up');
  });

  it('clears turns on clearTurns', async () => {
    const { result } = renderHook(() =>
      useCompanion({
        taskId: 'task_1',
        currentTimeSeconds: 0,
      }),
    );

    await act(async () => {
      await result.current.ask('问题');
    });

    expect(result.current.turns.length).toBe(1);

    act(() => {
      result.current.clearTurns();
    });

    expect(result.current.turns).toEqual([]);
    expect(result.current.interactionState).toBe('empty');
  });
});
