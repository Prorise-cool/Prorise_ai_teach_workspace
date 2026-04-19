/**
 * Companion 智能侧栏状态管理 hook。
 * Story 6.2：管理对话轮次、提问、白板动作等交互状态。
 */
import { useCallback, useMemo, useRef, useState } from 'react';

import { resolveCompanionAdapter } from '@/services/api/adapters/companion-adapter';
import type {
  CompanionAnchor,
  CompanionAskResponse,
  CompanionBootstrapResponse,
  CompanionInteractionState,
  CompanionTurn,
} from '@/types/companion';

export interface UseCompanionOptions {
  /** 视频 task ID。 */
  taskId: string;
  /** 当前播放秒数（由外部视频播放器同步）。 */
  currentTimeSeconds: number;
  /** 当前活跃 section 标题。 */
  activeSectionTitle?: string;
}

export interface UseCompanionReturn {
  /** 对话轮次列表。 */
  turns: CompanionTurn[];
  /** 当前交互状态。 */
  interactionState: CompanionInteractionState;
  /** 是否正在提问。 */
  isAsking: boolean;
  /** bootstrap 数据。 */
  bootstrap: CompanionBootstrapResponse | null;
  /** 发起提问。 */
  ask: (questionText: string) => Promise<void>;
  /** 清空对话。 */
  clearTurns: () => void;
  /** 当前锚点。 */
  currentAnchor: CompanionAnchor;
}

function computeInteractionState(
  turns: CompanionTurn[],
  isAsking: boolean,
  lastResponse: CompanionAskResponse | null,
): CompanionInteractionState {
  if (isAsking) return 'asking';
  if (turns.length === 0) return 'empty';

  const latest = turns[turns.length - 1];

  if (latest.whiteboardActions.length > 0) return 'whiteboard_success';
  if (latest.persistenceStatus === 'whiteboard_degraded')
    return 'whiteboard_degraded';
  if (latest.persistenceStatus === 'reference_missing')
    return 'service_unavailable';
  if (turns.length > 1) return 'follow_up';
  return 'first_ask';
}

export function useCompanion({
  taskId,
  currentTimeSeconds,
  activeSectionTitle,
}: UseCompanionOptions): UseCompanionReturn {
  const adapter = resolveCompanionAdapter();
  const [turns, setTurns] = useState<CompanionTurn[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [bootstrap, setBootstrap] = useState<CompanionBootstrapResponse | null>(null);
  const lastResponseRef = useRef<CompanionAskResponse | null>(null);

  const currentAnchor = useMemo<CompanionAnchor>(
    () => ({
      taskId,
      seconds: currentTimeSeconds,
      sectionTitle: activeSectionTitle,
    }),
    [taskId, currentTimeSeconds, activeSectionTitle],
  );

  const ask = useCallback(
    async (questionText: string) => {
      if (!questionText.trim() || isAsking) return;

      setIsAsking(true);

      try {
        const response = await adapter.ask({
          sessionId: bootstrap?.sessionId ?? `comp_sess_${taskId}`,
          anchor: currentAnchor,
          questionText,
          parentTurnId: turns.length > 0 ? turns[turns.length - 1].turnId : null,
        });

        lastResponseRef.current = response;

        const turn: CompanionTurn = {
          turnId: response.turnId,
          questionText,
          answerText: response.answerText,
          anchor: response.anchor,
          whiteboardActions: response.whiteboardActions,
          persistenceStatus: response.persistenceStatus,
          timestamp: Date.now(),
        };

        setTurns((prev) => [...prev, turn]);
      } catch {
        lastResponseRef.current = null;
      } finally {
        setIsAsking(false);
      }
    },
    [adapter, bootstrap?.sessionId, currentAnchor, isAsking, taskId, turns],
  );

  const clearTurns = useCallback(() => {
    setTurns([]);
    lastResponseRef.current = null;
  }, []);

  const interactionState = useMemo(
    () => computeInteractionState(turns, isAsking, lastResponseRef.current),
    [turns, isAsking],
  );

  return {
    turns,
    interactionState,
    isAsking,
    bootstrap,
    ask,
    clearTurns,
    currentAnchor,
  };
}
