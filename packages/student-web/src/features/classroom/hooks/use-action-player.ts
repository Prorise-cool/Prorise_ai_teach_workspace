/**
 * Action 播放器 Hook。
 *
 * 按序执行当前场景的 action 队列，驱动：
 *   - spotlight: setSpotlight + 1.6s 后 clearSpotlight（黑屏聚光，由 SpotlightOverlay 消费）
 *   - laser:     旧字段兼容（不触发 SpotlightOverlay）
 *   - speech:    设置 currentSpeech 并通过 `speechSynthesis` 朗读
 *   - discussion: P1 占位
 *
 * 已删除：白板（wb_*）所有动作分支与 WhiteboardHandle 依赖。
 * 旧数据中残留的 wb_* / laser_pointer 动作会落到 default 分支被静默忽略。
 *
 * 生命周期：
 *   - 当 playbackStatus 从 idle → playing 切换，从 currentActionIndex 或 0 开始
 *   - 切换场景时 resetPlayback，播放状态保持
 *   - pause/stop 取消 speechSynthesis
 */
import { useEffect, useRef } from 'react';

import { useClassroomStore } from '../stores/classroom-store';
import type {
  Action,
  LaserAction,
  SpeechAction,
  SpotlightAction,
} from '../types/action';
import type { Scene } from '../types/scene';

type ActionPlayerOptions = Record<string, never>;

const SPOTLIGHT_DURATION_MS = 1600;
const LASER_DURATION_MS = 900;
const SPEECH_FALLBACK_MS_PER_CHAR = 80; // 没有语音合成时的停留节奏

export function useActionPlayer(
  currentScene: Scene | null,
  _options: ActionPlayerOptions = {},
): void {
  const playbackStatus = useClassroomStore((s) => s.playbackStatus);
  const setCurrentSpotlightId = useClassroomStore((s) => s.setCurrentSpotlightId);
  const setSpotlight = useClassroomStore((s) => s.setSpotlight);
  const clearSpotlight = useClassroomStore((s) => s.clearSpotlight);
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
          setSpotlight,
          clearSpotlight,
          setSpeech: setCurrentSpeech,
        });
      }
      if (cancelled || runIdRef.current !== myRunId) return;
      // 播放到尾：清理并标记暂停（保留最后场景）
      clearSpotlight();
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
    setSpotlight,
    clearSpotlight,
    setCurrentSpeech,
    setPlaybackStatus,
  ]);
}

interface Setters {
  /** 通用高亮（laser 复用）：只设 currentSpotlightId 不设 spotlightOptions，不触发 SpotlightOverlay。 */
  setSpotlightId: (id: string | null) => void;
  /** Spotlight 全量效果（与 OpenMAIC setSpotlight 对齐，附带 options 触发压暗 overlay）。 */
  setSpotlight: (elementId: string, options?: { dimness?: number }) => void;
  /** 清除 Spotlight（elementId + options 同时清）。 */
  clearSpotlight: () => void;
  setSpeech: (speech: { agentId: string | null; text: string } | null) => void;
}

async function executeAction(
  action: Action,
  isCancelled: () => boolean,
  setters: Setters,
): Promise<void> {
  const { setSpotlightId, setSpotlight, clearSpotlight, setSpeech } = setters;
  if (isCancelled()) return;

  switch (action.type) {
    case 'spotlight': {
      // 对齐 OpenMAIC lib/action/engine.ts::executeSpotlight：
      //   setSpotlight(action.elementId, { dimness: action.dimOpacity ?? 0.5 });
      //   scheduleEffectClear()  // 我们在此直接 sleep 等效
      const a = action as SpotlightAction;
      setSpotlight(a.elementId, { dimness: a.dimOpacity ?? 0.5 });
      await sleep(SPOTLIGHT_DURATION_MS, isCancelled);
      clearSpotlight();
      return;
    }

    case 'laser':
      setSpotlightId((action as LaserAction).elementId);
      await sleep(LASER_DURATION_MS, isCancelled);
      setSpotlightId(null);
      return;

    case 'speech': {
      const a = action as SpeechAction;
      setSpeech({ agentId: null, text: a.text });
      // 优先播放后端预合成的 audio_url（Edge TTS）。
      // 失败或为空时降级到浏览器 SpeechSynthesis —— Chrome 的 autoplay policy
      // 对 speechSynthesis 态度不稳定，有时静默 drop，所以 audio_url 才是主路径。
      let played = false;
      if (a.audioUrl) {
        played = await playAudioUrl(a.audioUrl, a.speed ?? 1.0, isCancelled);
      }
      if (!played && !isCancelled()) {
        await speakText(a.text, a.speed ?? 1.0, isCancelled);
      }
      if (!isCancelled()) setSpeech(null);
      return;
    }

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

/**
 * 播放后端预合成的音频文件（通常是 Edge TTS 生成的 mp3）。
 * 返回 true 表示播放成功（或自然播完）；false 表示 URL 加载失败/被浏览器拦截
 *   —— 调用方应降级到 speechSynthesis。
 */
function playAudioUrl(
  url: string,
  rate: number,
  isCancelled: () => boolean,
): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      try { audio.pause(); } catch { /* noop */ }
      window.clearInterval(cancelCheck);
      resolve(ok);
    };
    audio.addEventListener('ended', () => done(true));
    audio.addEventListener('error', () => done(false));
    // 取消轮询：stop 时让 promise 直接 resolve(true)，跳过降级。
    const cancelCheck = window.setInterval(() => {
      if (isCancelled()) done(true);
    }, 200);
    audio.play().catch(() => done(false));
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
