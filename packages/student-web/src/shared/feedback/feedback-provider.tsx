/**
 * 文件说明：应用级通用反馈 Provider。
 * 统一承接全局 Toast 与 Spotlight 状态管理，并向页面暴露反馈 API。
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from 'react';

import { FeedbackContext } from './feedback-context';
import { FeedbackViewport } from './feedback-viewport';
import type {
  FeedbackApi,
  FeedbackNotice,
  FeedbackNoticeInput,
  FeedbackSpotlight,
  FeedbackSpotlightInput
} from './feedback-types';

import './feedback.css';

const NOTICE_EXIT_DURATION_MS = 180;
const DEFAULT_NOTICE_DURATION_MS = 3200;
const DEFAULT_LOADING_NOTICE_DURATION_MS = 2200;
const DEFAULT_SPOTLIGHT_DURATION_MS = 1400;

let feedbackSequence = 0;

function createFeedbackId(prefix: string) {
  feedbackSequence += 1;

  return `${prefix}-${feedbackSequence}`;
}

function normalizeNotice(input: FeedbackNoticeInput): FeedbackNotice {
  return {
    id: createFeedbackId('feedback-notice'),
    tone: input.tone ?? 'info',
    title: input.title,
    description: input.description,
    durationMs:
      input.durationMs ??
      (input.loading ? DEFAULT_LOADING_NOTICE_DURATION_MS : DEFAULT_NOTICE_DURATION_MS),
    loading: input.loading ?? false,
    phase: 'entered'
  };
}

function normalizeSpotlight(input: FeedbackSpotlightInput): FeedbackSpotlight {
  return {
    id: createFeedbackId('feedback-spotlight'),
    tone: input.tone ?? 'info',
    title: input.title,
    description: input.description,
    durationMs: input.durationMs ?? DEFAULT_SPOTLIGHT_DURATION_MS,
    loading: input.loading ?? false
  };
}

/**
 * 应用级通用反馈 Provider。
 * 统一承接全局 Toast 与过渡态 Spotlight，优先给路由跳转、异步初始化和关键成功态使用。
 */
export function FeedbackProvider({ children }: PropsWithChildren) {
  const [notices, setNotices] = useState<FeedbackNotice[]>([]);
  const [spotlight, setSpotlight] = useState<FeedbackSpotlight | null>(null);
  const dismissTimersRef = useRef<Map<string, number>>(new Map());
  const removalTimersRef = useRef<Map<string, number>>(new Map());
  const spotlightTimerRef = useRef<number | null>(null);

  const clearNoticeTimer = useCallback(
    (timers: Map<string, number>, id: string) => {
      const timerId = timers.get(id);

      if (timerId === undefined) {
        return;
      }

      window.clearTimeout(timerId);
      timers.delete(id);
    },
    []
  );

  const removeNoticeImmediately = useCallback(
    (id: string) => {
      clearNoticeTimer(dismissTimersRef.current, id);
      clearNoticeTimer(removalTimersRef.current, id);
      setNotices(currentNotices =>
        currentNotices.filter(notice => notice.id !== id)
      );
    },
    [clearNoticeTimer]
  );

  const dismissNotice = useCallback(
    (id: string) => {
      clearNoticeTimer(dismissTimersRef.current, id);

      setNotices(currentNotices =>
        currentNotices.map(notice =>
          notice.id === id ? { ...notice, phase: 'leaving' } : notice
        )
      );

      if (removalTimersRef.current.has(id)) {
        return;
      }

      const removalTimer = window.setTimeout(() => {
        removeNoticeImmediately(id);
      }, NOTICE_EXIT_DURATION_MS);

      removalTimersRef.current.set(id, removalTimer);
    },
    [clearNoticeTimer, removeNoticeImmediately]
  );

  const notify = useCallback(
    (input: FeedbackNoticeInput) => {
      const nextNotice = normalizeNotice(input);

      setNotices(currentNotices => [...currentNotices, nextNotice]);

      if (nextNotice.durationMs > 0) {
        const dismissTimer = window.setTimeout(() => {
          dismissNotice(nextNotice.id);
        }, nextNotice.durationMs);

        dismissTimersRef.current.set(nextNotice.id, dismissTimer);
      }

      return nextNotice.id;
    },
    [dismissNotice]
  );

  const hideSpotlight = useCallback(() => {
    if (spotlightTimerRef.current !== null) {
      window.clearTimeout(spotlightTimerRef.current);
      spotlightTimerRef.current = null;
    }

    setSpotlight(null);
  }, []);

  const clearAllNoticeTimers = useCallback(() => {
    dismissTimersRef.current.forEach(timerId => {
      window.clearTimeout(timerId);
    });
    dismissTimersRef.current.clear();

    removalTimersRef.current.forEach(timerId => {
      window.clearTimeout(timerId);
    });
    removalTimersRef.current.clear();
  }, []);

  const showSpotlight = useCallback(
    (input: FeedbackSpotlightInput) => {
      const nextSpotlight = normalizeSpotlight(input);

      hideSpotlight();
      setSpotlight(nextSpotlight);

      if (nextSpotlight.durationMs > 0) {
        spotlightTimerRef.current = window.setTimeout(() => {
          spotlightTimerRef.current = null;
          setSpotlight(currentSpotlight =>
            currentSpotlight?.id === nextSpotlight.id ? null : currentSpotlight
          );
        }, nextSpotlight.durationMs);
      }

      return nextSpotlight.id;
    },
    [hideSpotlight]
  );

  useEffect(() => {
    return () => {
      clearAllNoticeTimers();
      hideSpotlight();
    };
  }, [clearAllNoticeTimers, hideSpotlight]);

  const feedbackApi = useMemo<FeedbackApi>(
    () => ({
      notify,
      dismissNotice,
      showSpotlight,
      hideSpotlight
    }),
    [dismissNotice, hideSpotlight, notify, showSpotlight]
  );

  return (
    <FeedbackContext.Provider value={feedbackApi}>
      {children}
      <FeedbackViewport notices={notices} spotlight={spotlight} />
    </FeedbackContext.Provider>
  );
}
