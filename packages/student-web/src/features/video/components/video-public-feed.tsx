/**
 * 文件说明：视频输入页视频浏览区。
 * 通过 tabs 在“我的题目（私有）”与“公开题目”之间切换浏览。
 */
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Clock3, Eye, Globe2, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { VideoWorkspaceTaskItem } from '@/features/video/components/video-workspace-task-shared';
import { usePublicVideos } from '@/features/video/hooks/use-public-videos';
import { cn } from '@/lib/utils';
import { resolveVideoResultAdapter } from '@/services/api/adapters/video-result-adapter';
import type { VideoPublicCard } from '@/types/video';

const MAX_PRIVATE_CARDS = 4;
const PRIVATE_SECTION_SKELETON_COUNT = 4;
const PUBLIC_SECTION_SKELETON_COUNT = 6;
type DiscoveryTab = 'private' | 'public';

type VideoPublicFeedProps = {
  title: string;
  description: string;
  categories: string[];
  privateTitle: string;
  privateDescription: string;
  privateEmptyTitle: string;
  privateEmptyDescription: string;
  publicTitle: string;
  publicDescription: string;
  emptyTitle: string;
  emptyDescription: string;
  errorTitle: string;
  errorDescription: string;
  privateVisibilityLabel: string;
  publicVisibilityLabel: string;
  publishedBadgeLabel: string;
  privateViewActionLabel: string;
  viewActionLabel: string;
  reuseActionLabel: string;
  workspaceTasks: VideoWorkspaceTaskItem[];
  onReuseSourceText: (card: VideoPublicCard) => void;
};

type DiscoveryCard = {
  id: string;
  title: string;
  coverUrl: string | null;
  routeTo: string;
  visibilityLabel: string;
  updatedAtLabel: string;
  durationLabel: string | null;
  viewCount?: number;
  authorName?: string;
  published?: boolean;
};

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `${parsed.getFullYear()}.${String(parsed.getMonth() + 1).padStart(2, '0')}.${String(parsed.getDate()).padStart(2, '0')}`;
}

function formatDurationLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const normalizedSeconds = Math.floor(seconds);
  const minutes = Math.floor(normalizedSeconds / 60);
  const remainingSeconds = normalizedSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function buildPublicDiscoveryCard(
  card: VideoPublicCard,
  visibilityLabel: string,
): DiscoveryCard {
  const routeId = card.resultId ?? card.videoId;

  return {
    id: routeId,
    title: card.title,
    coverUrl: card.thumbnail,
    routeTo: `/video/public/${routeId}`,
    visibilityLabel,
    updatedAtLabel: formatDateLabel(card.createdAt),
    durationLabel: card.duration,
    viewCount: card.viewCount,
    authorName: card.authorName,
  };
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className="xm-video-discovery__state xm-video-discovery__state--empty"
      role="status"
    >
      <p className="xm-video-discovery__state-title">{title}</p>
      <p className="xm-video-discovery__state-description">{description}</p>
    </div>
  );
}

function ErrorState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className="xm-video-discovery__state xm-video-discovery__state--error"
      role="status"
    >
      <p className="xm-video-discovery__state-title">{title}</p>
      <p className="xm-video-discovery__state-description">{description}</p>
    </div>
  );
}

function DiscoverySkeletonGrid({ count }: { count: number }) {
  return (
    <div className="xm-video-discovery__grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <article
          key={`video-discovery-skeleton-${index}`}
          className="xm-video-discovery__card xm-video-discovery__card--skeleton"
        >
          <div className="xm-video-discovery__card-media" />
          <div className="xm-video-discovery__card-body">
            <div className="xm-video-discovery__card-line xm-video-discovery__card-line--short" />
            <div className="xm-video-discovery__card-line" />
            <div className="xm-video-discovery__card-line xm-video-discovery__card-line--muted" />
          </div>
        </article>
      ))}
    </div>
  );
}

function VideoDiscoveryCard({
  card,
  visibilityTone,
  actionLabel,
  onReuse,
  reuseLabel,
  publishedBadgeLabel,
}: {
  card: DiscoveryCard;
  visibilityTone: 'private' | 'public';
  actionLabel: string;
  onReuse?: () => void;
  reuseLabel?: string;
  publishedBadgeLabel?: string;
}) {
  return (
    <article
      className={cn(
        'xm-video-discovery__card',
        visibilityTone === 'private' && 'xm-video-discovery__card--private',
      )}
    >
      <Link
        className="xm-video-discovery__card-link"
        to={card.routeTo}
        aria-label={`${actionLabel}：${card.title}`}
      >
        <div className="xm-video-discovery__card-media">
          {card.coverUrl ? (
            <img src={card.coverUrl} alt={card.title} loading="lazy" />
          ) : (
            <div className="xm-video-discovery__card-fallback">
              <span>{card.title}</span>
            </div>
          )}
          {card.published && publishedBadgeLabel ? (
            <Badge
              variant="secondary"
              className="xm-video-discovery__card-published"
            >
              {publishedBadgeLabel}
            </Badge>
          ) : null}
        </div>
      </Link>

      <div className="xm-video-discovery__card-body">
        <div className="xm-video-discovery__card-badges">
          <Badge variant="outline" className="xm-video-discovery__card-visibility">
            {card.visibilityLabel}
          </Badge>
        </div>

        <Link className="xm-video-discovery__card-link" to={card.routeTo}>
          <h3 className="xm-video-discovery__card-title">{card.title}</h3>
        </Link>

        <div className="xm-video-discovery__card-meta">
          <span>{card.updatedAtLabel}</span>
          {card.durationLabel ? (
            <span>
              <Clock3 className="h-3.5 w-3.5" />
              {card.durationLabel}
            </span>
          ) : null}
          {typeof card.viewCount === 'number' ? (
            <span>
              <Eye className="h-3.5 w-3.5" />
              {card.viewCount}
            </span>
          ) : null}
        </div>

        {card.authorName ? (
          <p className="xm-video-discovery__card-author">{card.authorName}</p>
        ) : null}

        <div className="xm-video-discovery__card-actions">
          <Button asChild variant="outline" size="sm">
            <Link to={card.routeTo}>{actionLabel}</Link>
          </Button>
          {onReuse && reuseLabel ? (
            <Button type="button" variant="ghost" size="sm" onClick={onReuse}>
              {reuseLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  count,
  trailing,
}: {
  icon: 'private' | 'public';
  title: string;
  description: string;
  count: number;
  trailing?: ReactNode;
}) {
  const Icon = icon === 'private' ? LockKeyhole : Globe2;

  return (
    <div className="xm-video-discovery__section-header">
      <div className="xm-video-discovery__section-copy">
        <div className="xm-video-discovery__section-kicker">
          <Icon className="h-3.5 w-3.5" />
          <span>{title}</span>
          <span className="xm-video-discovery__section-count">{count}</span>
        </div>
        <p className="xm-video-discovery__section-description">{description}</p>
      </div>
      {trailing ? (
        <div className="xm-video-discovery__section-trailing">{trailing}</div>
      ) : null}
    </div>
  );
}

export function VideoPublicFeed({
  title,
  description,
  categories,
  privateTitle,
  privateDescription,
  privateEmptyTitle,
  privateEmptyDescription,
  publicTitle,
  publicDescription,
  emptyTitle,
  emptyDescription,
  errorTitle,
  errorDescription,
  privateVisibilityLabel,
  publicVisibilityLabel,
  publishedBadgeLabel,
  privateViewActionLabel,
  viewActionLabel,
  reuseActionLabel,
  workspaceTasks,
  onReuseSourceText,
}: VideoPublicFeedProps) {
  const publicVideosQuery = usePublicVideos({ pageSize: PUBLIC_SECTION_SKELETON_COUNT });
  const resultAdapter = useMemo(() => resolveVideoResultAdapter(), []);
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('public');
  const [hasManualTabSelection, setHasManualTabSelection] = useState(false);

  const privateTasks = useMemo(
    () =>
      workspaceTasks
        .filter((item) => item.lifecycleStatus === 'completed')
        .slice(0, MAX_PRIVATE_CARDS),
    [workspaceTasks],
  );

  const privateResultQueries = useQueries({
    queries: privateTasks.map((task) => ({
      queryKey: ['video', 'result', task.taskId],
      queryFn: () => resultAdapter.getResult(task.taskId),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const privateCards = useMemo(
    () =>
      privateTasks.flatMap((task, index) => {
        const result = privateResultQueries[index]?.data?.result;
        if (!result) {
          return [];
        }

        return [
          {
            id: task.taskId,
            title: result.title.trim() || task.title,
            coverUrl: result.coverUrl || null,
            routeTo: `/video/${task.taskId}`,
            visibilityLabel: privateVisibilityLabel,
            updatedAtLabel: formatDateLabel(result.completedAt || task.updatedAt),
            durationLabel: formatDurationLabel(result.duration),
            published: result.published,
          } satisfies DiscoveryCard,
        ];
      }),
    [privateResultQueries, privateTasks, privateVisibilityLabel],
  );

  const publicSourceCards = publicVideosQuery.data?.items ?? [];
  const publicCards = useMemo(
    () =>
      publicSourceCards.map((card) =>
        buildPublicDiscoveryCard(card, publicVisibilityLabel),
      ),
    [publicSourceCards, publicVisibilityLabel],
  );

  const isPrivateLoading =
    privateTasks.length > 0 &&
    privateCards.length === 0 &&
    privateResultQueries.some((query) => query.isLoading);
  const preferredTab: DiscoveryTab = privateTasks.length > 0 ? 'private' : 'public';

  useEffect(() => {
    if (hasManualTabSelection) {
      return;
    }

    setActiveTab(preferredTab);
  }, [hasManualTabSelection, preferredTab]);

  return (
    <section className="xm-video-discovery">
      <div className="xm-video-discovery__intro">
        <h2 className="xm-video-discovery__title">{title}</h2>
        <p className="xm-video-discovery__description">{description}</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setHasManualTabSelection(true);
          setActiveTab(value as DiscoveryTab);
        }}
        className="xm-video-discovery__tabs"
      >
        <TabsList className="xm-video-discovery__tabs-list">
          <TabsTrigger
            value="private"
            className="xm-video-discovery__tabs-trigger after:hidden"
          >
            <LockKeyhole className="h-3.5 w-3.5" />
            <span>{privateTitle}</span>
            <span className="xm-video-discovery__tabs-count">{privateTasks.length}</span>
          </TabsTrigger>
          <TabsTrigger
            value="public"
            className="xm-video-discovery__tabs-trigger after:hidden"
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span>{publicTitle}</span>
            <span className="xm-video-discovery__tabs-count">{publicCards.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="private" className="xm-video-discovery__tabs-content">
          <div className="xm-video-discovery__section">
            <SectionHeader
              icon="private"
              title={privateTitle}
              description={privateDescription}
              count={privateTasks.length}
            />

            {isPrivateLoading ? (
              <DiscoverySkeletonGrid count={PRIVATE_SECTION_SKELETON_COUNT} />
            ) : null}

            {!isPrivateLoading && privateCards.length === 0 ? (
              <EmptyState
                title={privateEmptyTitle}
                description={privateEmptyDescription}
              />
            ) : null}

            {!isPrivateLoading && privateCards.length > 0 ? (
              <div className="xm-video-discovery__grid">
                {privateCards.map((card) => (
                  <VideoDiscoveryCard
                    key={card.id}
                    card={card}
                    visibilityTone="private"
                    actionLabel={privateViewActionLabel}
                    publishedBadgeLabel={publishedBadgeLabel}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="public" className="xm-video-discovery__tabs-content">
          <div className="xm-video-discovery__section xm-video-discovery__section--public">
            <SectionHeader
              icon="public"
              title={publicTitle}
              description={publicDescription}
              count={publicCards.length}
              trailing={
                categories.length > 0 ? (
                  <div className="xm-video-discovery__chips">
                    {categories.map((category) => (
                      <span
                        key={category}
                        className="xm-video-discovery__chip"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                ) : null
              }
            />

            {publicVideosQuery.isLoading ? (
              <DiscoverySkeletonGrid count={PUBLIC_SECTION_SKELETON_COUNT} />
            ) : null}

            {!publicVideosQuery.isLoading && publicVideosQuery.isError ? (
              <ErrorState title={errorTitle} description={errorDescription} />
            ) : null}

            {!publicVideosQuery.isLoading &&
            !publicVideosQuery.isError &&
            publicCards.length === 0 ? (
              <EmptyState title={emptyTitle} description={emptyDescription} />
            ) : null}

            {!publicVideosQuery.isLoading &&
            !publicVideosQuery.isError &&
            publicCards.length > 0 ? (
              <div className="xm-video-discovery__grid">
                {publicCards.map((card, index) => (
                  <VideoDiscoveryCard
                    key={card.id}
                    card={card}
                    visibilityTone="public"
                    actionLabel={viewActionLabel}
                    reuseLabel={reuseActionLabel}
                    onReuse={() => onReuseSourceText(publicSourceCards[index])}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
