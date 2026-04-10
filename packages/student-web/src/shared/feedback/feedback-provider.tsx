/**
 * 文件说明：应用级通用反馈 Provider。
 * 统一承接全局 Toast 与 Spotlight 状态管理，并向页面暴露反馈 API。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Toaster, toast } from 'sonner';

import { FeedbackContext } from './feedback-context';
import { resolveFeedbackLiveRole } from './feedback-live-role';
import { FeedbackGlyph } from './feedback-primitives';
import { FeedbackStateCard } from './feedback-state-card';
import type {
  FeedbackApi,
  FeedbackNoticeInput,
  FeedbackSpotlight,
  FeedbackSpotlightInput
} from './feedback-types';
import { useLoadingBar } from './use-loading-bar';

import './feedback.css';

const DEFAULT_NOTICE_DURATION_MS = 3200;
const DEFAULT_LOADING_NOTICE_DURATION_MS = 2200;
const DEFAULT_SPOTLIGHT_DURATION_MS = 1400;

let feedbackSequence = 0;

function createFeedbackId(prefix: string) {
  feedbackSequence += 1;

  return `${prefix}-${feedbackSequence}`;
}

function normalizeNotice(input: FeedbackNoticeInput) {
  return {
    id: createFeedbackId('feedback-notice'),
    tone: input.tone ?? 'info',
    title: input.title,
    description: input.description,
    durationMs:
      input.durationMs ??
      (input.loading ? DEFAULT_LOADING_NOTICE_DURATION_MS : DEFAULT_NOTICE_DURATION_MS),
    loading: input.loading ?? false
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
  const [spotlight, setSpotlight] = useState<FeedbackSpotlight | null>(null);
  const spotlightTimerRef = useRef<number | null>(null);

  const {
    loadingBarVisible,
    showLoadingBar,
    hideLoadingBar,
    clearLoadingBarTimers,
    resetLoadingBarState
  } = useLoadingBar();

  const dismissNotice = useCallback(
    (id: string) => {
      toast.dismiss(id);
    },
    []
  );

  const notify = useCallback(
    (input: FeedbackNoticeInput) => {
      const nextNotice = normalizeNotice(input);

      toast.custom(
        () => (
          <article
            className={`xm-feedback-toast is-${nextNotice.tone}`}
            role={resolveFeedbackLiveRole(nextNotice.tone)}
          >
            <span className="xm-feedback-toast-icon-shell" aria-hidden="true">
              <FeedbackGlyph
                tone={nextNotice.tone}
                loading={nextNotice.loading}
              />
            </span>

            <div className="xm-feedback-toast-copy">
              <strong className="xm-feedback-toast-title">
                {nextNotice.title}
              </strong>

              {nextNotice.description ? (
                <p className="xm-feedback-toast-description">
                  {nextNotice.description}
                </p>
              ) : null}
            </div>
          </article>
        ),
        {
          id: nextNotice.id,
          duration: nextNotice.durationMs
        }
      );

      return nextNotice.id;
    },
    []
  );

  const hideSpotlight = useCallback(() => {
    if (spotlightTimerRef.current !== null) {
      window.clearTimeout(spotlightTimerRef.current);
      spotlightTimerRef.current = null;
    }

    setSpotlight(null);
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
      hideSpotlight();
      clearLoadingBarTimers();
      resetLoadingBarState();
    };
  }, [clearLoadingBarTimers, hideSpotlight, resetLoadingBarState]);

  const feedbackApi = useMemo<FeedbackApi>(
    () => ({
      notify,
      dismissNotice,
      showSpotlight,
      hideSpotlight,
      showLoadingBar,
      hideLoadingBar
    }),
    [
      dismissNotice,
      hideLoadingBar,
      hideSpotlight,
      notify,
      showLoadingBar,
      showSpotlight
    ]
  );

  return (
    <FeedbackContext.Provider value={feedbackApi}>
      {children}
      {loadingBarVisible ? (
        <div
          className="xm-feedback-loading-bar"
          role="progressbar"
          aria-label="全局加载中"
          aria-valuetext="全局加载中"
        >
          <span className="xm-feedback-loading-bar-track" />
        </div>
      ) : null}
      <Toaster
        position="bottom-right"
        expand={false}
        closeButton={false}
        visibleToasts={4}
        toastOptions={{
          unstyled: true,
          className: 'xm-feedback-sonner-toast'
        }}
      />
      {spotlight ? (
        <div className="xm-feedback-spotlight" aria-live="polite">
          <FeedbackStateCard
            tone={spotlight.tone}
            title={spotlight.title}
            description={spotlight.description}
            loading={spotlight.loading}
          />
        </div>
      ) : null}
    </FeedbackContext.Provider>
  );
}
