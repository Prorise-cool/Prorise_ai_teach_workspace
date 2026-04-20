/**
 * Companion 智能侧栏状态管理 hook。
 * Story 6.2：管理对话轮次、提问、白板动作等交互状态。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { resolveCompanionAdapter } from '@/services/api/adapters/companion-adapter';
import type { VideoPlayerHandle } from '../components/video-player';
import type {
  CompanionAnchor,
  CompanionAskResponse,
  CompanionBootstrapResponse,
  CompanionInteractionState,
  CompanionTurn,
} from '@/types/companion';

/** 用 Canvas 从 Video.js player 截取当前帧，返回 JPEG base64。 */
function captureVideoFrame(playerRef: React.RefObject<VideoPlayerHandle | null> | undefined): string | null {
  const player = playerRef?.current?.getPlayer();
  if (!player) return null;
  const videoEl = player.el()?.querySelector('video') as HTMLVideoElement | null;
  if (!videoEl || !videoEl.videoWidth) return null;
  try {
    const canvas = document.createElement('canvas');
    const scale = 720 / videoEl.videoWidth;
    canvas.width = Math.min(videoEl.videoWidth, 720);
    canvas.height = Math.round(videoEl.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7).split(',')[1] ?? null;
  } catch {
    return null;
  }
}

export interface UseCompanionOptions {
  /** 视频 task ID。 */
  taskId: string;
  /** 当前播放秒数（由外部视频播放器同步）。 */
  currentTimeSeconds: number;
  /** 当前活跃 section 标题。 */
  activeSectionTitle?: string;
  /** Video.js 播放器 ref，用于截取当前帧。 */
  playerRef?: React.RefObject<VideoPlayerHandle | null>;
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
  /** 最近一次错误信息。 */
  lastError: string | null;
}

function computeInteractionState(
  turns: CompanionTurn[],
  isAsking: boolean,
  _lastResponse: CompanionAskResponse | null,
): CompanionInteractionState {
  if (isAsking) return 'asking';
  if (turns.length === 0) return 'empty';

  const latest = turns[turns.length - 1];

  if (latest.whiteboardActions.length > 0) return 'whiteboard_success';
  if (latest.persistenceStatus === 'whiteboard_degraded')
    return 'whiteboard_degraded';
  if (latest.persistenceStatus === 'overall_failure')
    return 'service_unavailable';
  if (latest.persistenceStatus === 'reference_missing')
    return 'service_unavailable';
  if (turns.length > 1) return 'follow_up';
  return 'first_ask';
}

export function useCompanion({
  taskId,
  currentTimeSeconds,
  activeSectionTitle,
  playerRef,
}: UseCompanionOptions): UseCompanionReturn {
  const adapterRef = useRef<ReturnType<typeof resolveCompanionAdapter> | null>(null);
  if (adapterRef.current === null) {
    adapterRef.current = resolveCompanionAdapter();
  }
  const adapter = adapterRef.current;
  const [turns, setTurns] = useState<CompanionTurn[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [bootstrap, setBootstrap] = useState<CompanionBootstrapResponse | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const lastResponseRef = useRef<CompanionAskResponse | null>(null);

  // mount 时 bootstrap 获取真实 sessionId（只在 taskId 变化时触发）
  useEffect(() => {
    let cancelled = false;
    adapter.bootstrap(taskId).then((data) => {
      if (!cancelled) setBootstrap(data);
    }).catch(() => {
      // bootstrap 失败不阻塞使用，sessionId 会在 ask 时 fallback
    });
    return () => { cancelled = true; };
  }, [adapter, taskId]);

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
      setLastError(null);

      // 截取当前视频帧
      const frameBase64 = captureVideoFrame(playerRef);

      try {
        const response = await adapter.ask({
          sessionId: bootstrap?.sessionId ?? `comp_sess_${taskId}`,
          anchor: currentAnchor,
          questionText,
          parentTurnId: turns.length > 0 ? turns[turns.length - 1].turnId : null,
          frameBase64,
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
      } catch (err) {
        lastResponseRef.current = null;
        const message = err instanceof Error ? err.message : '提问失败，请稍后再试';
        setLastError(message);
      } finally {
        setIsAsking(false);
      }
    },
    [adapter, bootstrap?.sessionId, currentAnchor, isAsking, taskId, turns],
  );

  const clearTurns = useCallback(() => {
    setTurns([]);
    lastResponseRef.current = null;
    setLastError(null);
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
    lastError,
  };
}
