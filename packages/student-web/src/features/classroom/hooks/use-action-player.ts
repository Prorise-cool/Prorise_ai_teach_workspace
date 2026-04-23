/**
 * Action 播放器 Hook。
 *
 * 按序执行当前场景的 action 队列，驱动：
 *   - spotlight/laser: 设置 currentSpotlightId（由 SlideRenderer 消费做高亮）
 *   - speech:          设置 currentSpeech 并通过 `speechSynthesis` 朗读
 *   - 白板动作:        P1：仅打日志（占位）
 *   - discussion:      P1：占位（未来接 Team C director graph）
 *
 * 生命周期：
 *   - 当 playbackStatus 从 idle → playing 切换，从 currentActionIndex 或 0 开始
 *   - 切换场景时 resetPlayback，播放状态保持
 *   - pause/stop 取消 speechSynthesis
 */
import { useEffect, useRef } from 'react';

import { useClassroomStore } from '../stores/classroom-store';
import type { Action, SpotlightAction, LaserAction, SpeechAction } from '../types/action';
import type { Scene } from '../types/scene';

const SPOTLIGHT_DURATION_MS = 1600;
const LASER_DURATION_MS = 900;
const SPEECH_FALLBACK_MS_PER_CHAR = 80; // 没有语音合成时的停留节奏

export function useActionPlayer(currentScene: Scene | null): void {
  const playbackStatus = useClassroomStore((s) => s.playbackStatus);
  const setCurrentSpotlightId = useClassroomStore((s) => s.setCurrentSpotlightId);
  const setCurrentSpeech = useClassroomStore((s) => s.setCurrentSpeech);
  const setCurrentActionIndex = useClassroomStore((s) => s.setCurrentActionIndex);
  const setPlaybackStatus = useClassroomStore((s) => s.setPlaybackStatus);
  const resetPlayback = useClassroomStore((s) => s.resetPlayback);

  // Active run identifier so effect teardown can signal cancellation without
  // touching DOM APIs synchronously (React strict-mode double-invoke friendly).
  const runIdRef = useRef(0);

  // 切场景时重置
  useEffect(() => {
    resetPlayback();
    stopSpeech();
  }, [currentScene?.id, resetPlayback]);

  useEffect(() => {
    const actions: Action[] = currentScene?.actions ?? [];
    if (!currentScene || !actions.length) return;
    if (playbackStatus !== 'playing') {
      stopSpeech();
      return;
    }

    runIdRef.current += 1;
    const myRunId = runIdRef.current;
    let cancelled = false;

    const run = async () => {
      for (let i = 0; i < actions.length; i++) {
        if (cancelled || runIdRef.current !== myRunId) return;
        setCurrentActionIndex(i);
        const action = actions[i];
        await executeAction(action, () => cancelled || runIdRef.current !== myRunId, {
          setSpotlightId: setCurrentSpotlightId,
          setSpeech: setCurrentSpeech,
        });
      }
      if (cancelled || runIdRef.current !== myRunId) return;
      // 播放到尾：清理并标记暂停（保留最后场景）
      setCurrentSpotlightId(null);
      setCurrentSpeech(null);
      setPlaybackStatus('paused');
    };

    void run();

    return () => {
      cancelled = true;
      stopSpeech();
    };
  }, [
    currentScene,
    playbackStatus,
    setCurrentActionIndex,
    setCurrentSpotlightId,
    setCurrentSpeech,
    setPlaybackStatus,
  ]);
}

interface Setters {
  setSpotlightId: (id: string | null) => void;
  setSpeech: (speech: { agentId: string | null; text: string } | null) => void;
}

async function executeAction(
  action: Action,
  isCancelled: () => boolean,
  { setSpotlightId, setSpeech }: Setters,
): Promise<void> {
  if (isCancelled()) return;

  switch (action.type) {
    case 'spotlight':
      setSpotlightId((action as SpotlightAction).elementId);
      await sleep(SPOTLIGHT_DURATION_MS, isCancelled);
      setSpotlightId(null);
      return;

    case 'laser':
      setSpotlightId((action as LaserAction).elementId);
      await sleep(LASER_DURATION_MS, isCancelled);
      setSpotlightId(null);
      return;

    case 'speech': {
      const a = action as SpeechAction;
      setSpeech({ agentId: null, text: a.text });
      await speakText(a.text, a.speed ?? 1.0, isCancelled);
      if (!isCancelled()) setSpeech(null);
      return;
    }

    case 'wb_open':
    case 'wb_close':
    case 'wb_clear':
    case 'wb_delete':
    case 'wb_draw_text':
    case 'wb_draw_shape':
    case 'wb_draw_latex':
    case 'wb_draw_line':
      // P1：占位 —— 白板渲染待补
      await sleep(200, isCancelled);
      return;

    case 'discussion':
      // P1：占位 —— 未来接 Team C director graph
      await sleep(300, isCancelled);
      return;

    default:
      return;
  }
}

function sleep(ms: number, isCancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (isCancelled()) return resolve();
      const elapsed = Date.now() - start;
      if (elapsed >= ms) return resolve();
      window.setTimeout(tick, Math.min(ms - elapsed, 100));
    };
    tick();
  });
}

function speakText(text: string, rate: number, isCancelled: () => boolean): Promise<void> {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  if (!synth) {
    // 无 SpeechSynthesis：按字节数停留一段时间，保持节奏
    return sleep(text.length * SPEECH_FALLBACK_MS_PER_CHAR, isCancelled);
  }

  return new Promise((resolve) => {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-CN';
      utter.rate = Math.max(0.5, Math.min(2.0, rate));
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      // 若用户暂停则取消
      const cancelCheck = window.setInterval(() => {
        if (isCancelled()) {
          synth.cancel();
          window.clearInterval(cancelCheck);
          resolve();
        }
      }, 200);
      utter.onend = () => {
        window.clearInterval(cancelCheck);
        resolve();
      };
      synth.speak(utter);
    } catch {
      // fallback
      resolve();
    }
  });
}

function stopSpeech(): void {
  if (typeof window === 'undefined') return;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // noop
  }
}
