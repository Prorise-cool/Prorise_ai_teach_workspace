import { cn } from '@/lib/utils';

import { FeedbackGlyph } from './feedback-primitives';
import type { FeedbackTone } from './feedback-types';

type FeedbackStateCardProps = {
  tone: FeedbackTone;
  title: string;
  description?: string;
  loading?: boolean;
  className?: string;
};

export function FeedbackStateCard({
  tone,
  title,
  description,
  loading = false,
  className
}: FeedbackStateCardProps) {
  return (
    <section className={cn('xm-feedback-state-card', `is-${tone}`, className)}>
      <div className="xm-feedback-state-orb" aria-hidden="true">
        <div className="xm-feedback-state-orb-ring" />
        <FeedbackGlyph
          tone={tone}
          loading={loading}
          className="xm-feedback-state-glyph"
        />
      </div>

      <div className="xm-feedback-state-copy">
        <h2 className="xm-feedback-state-title">{title}</h2>

        {description ? (
          <p className="xm-feedback-state-description">{description}</p>
        ) : null}

        {loading ? (
          <div className="xm-feedback-state-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : null}
      </div>
    </section>
  );
}
