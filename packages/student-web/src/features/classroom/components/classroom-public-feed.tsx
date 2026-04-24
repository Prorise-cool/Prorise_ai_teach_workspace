/**
 * 文件说明：课堂输入页底部公开发现区。
 *
 * 数据来源：`GET /api/v1/classroom/published`（RuoYi xm_user_work 表 work_type=classroom）
 * 样式参考视频侧 VideoPublicFeed，但简化：暂无 private tab（课堂没有"我的草稿"
 * 概念），仅展示公开课堂网格 + 空态 / 错误态 / 骨架屏。
 */
import { Clock3, Globe2, PlayCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { usePublicClassrooms } from '@/features/classroom/hooks/use-public-classrooms';
import type { ClassroomPublicCard } from '@/services/api/adapters/classroom-public-adapter';

const SKELETON_COUNT = 6;

function formatDate(value?: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${parsed.getFullYear()}.${String(parsed.getMonth() + 1).padStart(2, '0')}.${String(parsed.getDate()).padStart(2, '0')}`;
}

type FeedLabels = {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  errorTitle: string;
  errorDescription: string;
  viewActionLabel: string;
  publicBadgeLabel: string;
};

type ClassroomPublicFeedProps = {
  labels: FeedLabels;
  className?: string;
};

export function ClassroomPublicFeed({ labels, className }: ClassroomPublicFeedProps) {
  const query = usePublicClassrooms({ pageNum: 1, pageSize: 12 });
  const { t } = useAppTranslation();

  const cards: ClassroomPublicCard[] = useMemo(
    () => query.data?.rows ?? [],
    [query.data?.rows],
  );

  return (
    <section className={cn('w-full max-w-7xl mx-auto px-4 py-8', className)}>
      <header className="mb-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Sparkles className="h-5 w-5 text-primary" />
          {labels.title}
        </div>
        <p className="text-sm text-muted-foreground">{labels.description}</p>
      </header>

      {query.isLoading ? (
        <SkeletonGrid />
      ) : query.isError ? (
        <EmptyState
          title={labels.errorTitle}
          description={labels.errorDescription}
          tone="error"
        />
      ) : cards.length === 0 ? (
        <EmptyState title={labels.emptyTitle} description={labels.emptyDescription} />
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <li key={card.taskId}>
              <ClassroomCard
                card={card}
                viewLabel={labels.viewActionLabel}
                publicBadgeLabel={labels.publicBadgeLabel}
                fallbackSummaryLabel={t('classroom.chat.qaEmpty')}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ClassroomCard({
  card,
  viewLabel,
  publicBadgeLabel,
  fallbackSummaryLabel,
}: {
  card: ClassroomPublicCard;
  viewLabel: string;
  publicBadgeLabel: string;
  fallbackSummaryLabel: string;
}) {
  const summary =
    card.description && card.description.trim().length > 0
      ? card.description
      : card.title || fallbackSummaryLabel;
  return (
    <Link
      to={`/classroom/play/${encodeURIComponent(card.taskId)}`}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card/50 p-4 transition-all hover:border-primary/40 hover:bg-card/70 hover:shadow-lg"
    >
      <div className="flex aspect-video items-center justify-center rounded-xl bg-primary/5 ring-1 ring-border/40">
        {card.coverUrl ? (
          <img
            src={card.coverUrl}
            alt=""
            className="h-full w-full rounded-xl object-cover"
            loading="lazy"
          />
        ) : (
          <PlayCircle className="h-10 w-10 text-primary/70" aria-hidden="true" />
        )}
      </div>
      <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
          <Globe2 className="h-3 w-3" aria-hidden="true" />
          {publicBadgeLabel}
        </span>
        {card.publishedAt && (
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" aria-hidden="true" />
            {formatDate(card.publishedAt)}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="line-clamp-2 text-base font-semibold text-foreground">
          {card.title || '未命名课堂'}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{summary}</p>
      </div>
      <div className="mt-auto flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
        {viewLabel}
      </div>
    </Link>
  );
}

function EmptyState({
  title,
  description,
  tone = 'neutral',
}: {
  title: string;
  description: string;
  tone?: 'neutral' | 'error';
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center',
        tone === 'error'
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-border bg-card/30',
      )}
    >
      <div className="text-base font-semibold text-foreground">{title}</div>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
        <li key={idx}>
          <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/30 p-4">
            <div className="aspect-video animate-pulse rounded-xl bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
