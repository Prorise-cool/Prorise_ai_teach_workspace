/**
 * 文件说明：反馈系统视口。
 * 负责统一渲染 toast 列表与页面级 spotlight。
 */
import { resolveFeedbackLiveRole } from './feedback-live-role';
import { FeedbackGlyph } from './feedback-primitives';
import { FeedbackStateCard } from './feedback-state-card';
import type {
  FeedbackNotice,
  FeedbackSpotlight
} from './feedback-types';

type FeedbackViewportProps = {
  notices: ReadonlyArray<FeedbackNotice>;
  spotlight: FeedbackSpotlight | null;
};

/**
 * 渲染反馈视口。
 *
 * @param props - 视口参数。
 * @returns toast 与 spotlight 容器节点。
 */
export function FeedbackViewport({
  notices,
  spotlight
}: FeedbackViewportProps) {
  return (
    <>
      <div className="xm-feedback-toast-stack" aria-atomic="true" aria-live="polite">
        {notices.map(notice => (
          <article
            key={notice.id}
            className={`xm-feedback-toast is-${notice.tone}${
              notice.phase === 'leaving' ? ' is-leaving' : ''
            }`}
            role={resolveFeedbackLiveRole(notice.tone)}
          >
            <FeedbackGlyph tone={notice.tone} loading={notice.loading} />

            <div className="xm-feedback-toast-copy">
              <strong className="xm-feedback-toast-title">{notice.title}</strong>

              {notice.description ? (
                <p className="xm-feedback-toast-description">
                  {notice.description}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {spotlight ? (
        <div
          className="xm-feedback-spotlight"
          aria-live="polite"
          role={resolveFeedbackLiveRole(spotlight.tone)}
        >
          <FeedbackStateCard
            tone={spotlight.tone}
            title={spotlight.title}
            description={spotlight.description}
            loading={spotlight.loading}
          />
        </div>
      ) : null}
    </>
  );
}
