import { describe, expect, it, vi } from 'vitest';

import {
  CompanionAdapterError,
  createMockCompanionAdapter,
} from './companion-adapter';

describe('companion adapter', () => {
  describe('mock adapter', () => {
    it('returns bootstrap fixture for a normal task', async () => {
      const adapter = createMockCompanionAdapter();
      const result = await adapter.bootstrap('task_123');

      expect(result.taskId).toBe('task_123');
      expect(result.sessionId).toContain('task_123');
      expect(result.contextSource).toBe('redis');
      expect(result.knowledgePoints.length).toBeGreaterThan(0);
    });

    it('returns degraded bootstrap for degraded task id', async () => {
      const adapter = createMockCompanionAdapter();
      const result = await adapter.bootstrap('task_degraded');

      expect(result.contextSource).toBe('degraded');
    });

    it('returns first_ask fixture by default', async () => {
      const adapter = createMockCompanionAdapter();
      const result = await adapter.ask({
        sessionId: 'sess_1',
        anchor: { taskId: 'task_1', seconds: 60 },
        questionText: '什么是导数？',
      });

      expect(result.turnId).toContain('turn_');
      expect(result.answerText.length).toBeGreaterThan(0);
      expect(result.persistenceStatus).toBe('complete_success');
    });

    it('returns whiteboard_success fixture when requested', async () => {
      const adapter = createMockCompanionAdapter();
      const result = await adapter.ask(
        {
          sessionId: 'sess_1',
          anchor: { taskId: 'task_1', seconds: 60 },
          questionText: '用画板演示',
        },
        { scenario: 'whiteboard_success' },
      );

      expect(result.whiteboardActions.length).toBeGreaterThan(0);
      expect(result.whiteboardActions[0].actionType).toBe('draw_function');
    });

    it('returns whiteboard_degraded fixture', async () => {
      const adapter = createMockCompanionAdapter();
      const result = await adapter.ask(
        {
          sessionId: 'sess_1',
          anchor: { taskId: 'task_1', seconds: 60 },
          questionText: '解释一下',
        },
        { scenario: 'whiteboard_degraded' },
      );

      expect(result.persistenceStatus).toBe('whiteboard_degraded');
      expect(result.whiteboardActions).toEqual([]);
    });
  });

  describe('CompanionAdapterError', () => {
    it('carries status, code, and message', () => {
      const err = new CompanionAdapterError(500, 'TEST', 'test error');
      expect(err.status).toBe(500);
      expect(err.code).toBe('TEST');
      expect(err.message).toBe('test error');
      expect(err.name).toBe('CompanionAdapterError');
    });
  });
});
