/**
 * 文件说明：视频输入页的作品展示区。
 *
 * 布局：
 *   - 顶部标题/简介。
 *   - 一条 Tabs：我的题目 / 公开题目（默认进入「公开」，若有历史私有视频自动切到「我的」）。
 *   - 卡片风格参考 OpenMAIC 首页 "Recent classrooms"：
 *       · 纯缩略图容器，无边框无阴影
 *       · 16:9 圆角 rounded-2xl，hover 时 scale-[1.02]
 *       · 信息放在缩略图外面（胶囊徽章 + 标题 + 次级元信息）
 *   - 配色严格使用全局 token：bg-secondary / bg-primary/10 / text-primary ...
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useQueries } from '@tanstack/react-query';
import { Clock3, Eye, Globe2, LockKeyhole, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  if (Number.isNaN(parsed.getTime())) return value;
  return `${parsed.getFullYear()}.${String(parsed.getMonth() + 1).padStart(2, '0')}.${String(parsed.getDate()).padStart(2, '0')}`;
}

function formatDurationLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
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

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
      {children}
    </div>
  );
}

function DiscoveryCardItem({
  card,
  actionLabel,
  onReuse,
  reuseLabel,
  publishedBadgeLabel,
  tone,
}: {
  card: DiscoveryCard;
  actionLabel: string;
  onReuse?: () => void;
  reuseLabel?: string;
  publishedBadgeLabel?: string;
  tone: 'public' | 'private';
}) {
  return (
    <article className="group">
      <Link to={card.routeTo} aria-label={actionLabel} className="block">
        <div className="relative w-full aspect-[16/9] rounded-2xl bg-secondary/60 overflow-hidden transition-transform duration-200 group-hover:scale-[1.02]">
          {card.coverUrl ? (
            <img
              src={card.coverUrl}
              alt={card.title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <span className="text-center text-xs font-medium text-muted-foreground line-clamp-4">
                {card.title}
              </span>
            </div>
          )}

          {card.published && publishedBadgeLabel ? (
            <span className="absolute bottom-2 left-2 inline-flex items-center rounded-full bg-[color:var(--xm-color-success)]/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              {publishedBadgeLabel}
            </span>
          ) : null}

          {onReuse && reuseLabel ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReuse();
              }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-background/85 hover:bg-primary text-foreground hover:text-primary-foreground border border-border/60 backdrop-blur-sm text-[11px] font-medium px-2.5 py-1"
            >
              {reuseLabel}
            </button>
          ) : null}

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <PlayCircle className="size-12 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
          </div>
        </div>
      </Link>

      <div className="mt-2.5 px-1 flex items-center gap-2 min-w-0">
        <span
          className={cn(
            'shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
            tone === 'public'
              ? 'bg-primary/12 text-primary'
              : 'bg-secondary text-muted-foreground',
          )}
        >
          {card.updatedAtLabel}
          {card.durationLabel ? ` · ${card.durationLabel}` : ''}
        </span>
        <Link
          to={card.routeTo}
          className="font-medium text-[15px] truncate text-foreground/90 hover:text-foreground min-w-0"
        >
          {card.title}
        </Link>
      </div>

      {card.authorName || typeof card.viewCount === 'number' ? (
        <div className="mt-1 px-1 flex items-center gap-3 text-[11px] text-muted-foreground">
          {card.authorName ? <span className="truncate">{card.authorName}</span> : null}
          {typeof card.viewCount === 'number' ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Eye className="size-3" />
              {card.viewCount}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <CardGrid>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`video-discovery-skeleton-${i}`}
          data-testid="video-feed-skeleton"
          className="animate-pulse"
        >
          <div className="w-full aspect-[16/9] rounded-2xl bg-secondary/60" />
          <div className="mt-2.5 px-1 flex items-center gap-2">
            <div className="h-4 w-16 rounded-full bg-secondary/60" />
            <div className="h-4 flex-1 rounded-md bg-secondary/60" />
          </div>
        </div>
      ))}
    </CardGrid>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm font-semibold text-foreground/80">{title}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm font-semibold text-destructive">{title}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function VideoPublicFeed({
  title,
  description,
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

  const privateCards = useMemo<DiscoveryCard[]>(
    () =>
      privateTasks.flatMap((task, index) => {
        const result = privateResultQueries[index]?.data?.result;
        if (!result) return [];
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
          },
        ];
      }),
    [privateResultQueries, privateTasks, privateVisibilityLabel],
  );

  const publicSourceCards = publicVideosQuery.data?.items ?? [];
  const publicCards = useMemo(
    () => publicSourceCards.map((card) => buildPublicDiscoveryCard(card, publicVisibilityLabel)),
    [publicSourceCards, publicVisibilityLabel],
  );

  const isPrivateLoading =
    privateTasks.length > 0 &&
    privateCards.length === 0 &&
    privateResultQueries.some((query) => query.isLoading);
  const preferredTab: DiscoveryTab = privateTasks.length > 0 ? 'private' : 'public';

  useEffect(() => {
    if (hasManualTabSelection) return;
    setActiveTab(preferredTab);
  }, [hasManualTabSelection, preferredTab]);

  return (
    <section className="relative z-10 w-full max-w-6xl mx-auto px-4 flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl md:text-[28px] font-black tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setHasManualTabSelection(true);
          setActiveTab(value as DiscoveryTab);
        }}
        className="w-full"
      >
        <div className="flex justify-center">
          {/* 极轻量切换：纯文本 + 斜杠分隔，激活项用 brand 色加下划线，没有胶囊/盒子 */}
          <TabsList className="h-auto inline-flex items-center gap-2 bg-transparent p-0 text-[13px]">
            <TabsTrigger
              value="private"
              className="group inline-flex items-center gap-1.5 rounded-none px-0 py-1 font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:text-primary data-[state=active]:font-semibold"
            >
              <LockKeyhole className="size-3.5" />
              <span>{privateTitle}</span>
              <span className="text-[11px] tabular-nums opacity-60 group-data-[state=active]:opacity-90">
                {privateTasks.length}
              </span>
            </TabsTrigger>
            <span aria-hidden="true" className="select-none text-muted-foreground/40">/</span>
            <TabsTrigger
              value="public"
              className="group inline-flex items-center gap-1.5 rounded-none px-0 py-1 font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:text-primary data-[state=active]:font-semibold"
            >
              <Globe2 className="size-3.5" />
              <span>{publicTitle}</span>
              <span className="text-[11px] tabular-nums opacity-60 group-data-[state=active]:opacity-90">
                {publicCards.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="private" className="mt-8">
          <p className="text-center text-xs text-muted-foreground mb-6">{privateDescription}</p>
          {isPrivateLoading ? (
            <SkeletonGrid count={PRIVATE_SECTION_SKELETON_COUNT} />
          ) : privateCards.length === 0 ? (
            <EmptyState title={privateEmptyTitle} description={privateEmptyDescription} />
          ) : (
            <CardGrid>
              {privateCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.35, ease: 'easeOut' }}
                >
                  <DiscoveryCardItem
                    card={card}
                    tone="private"
                    actionLabel={privateViewActionLabel}
                    publishedBadgeLabel={publishedBadgeLabel}
                  />
                </motion.div>
              ))}
            </CardGrid>
          )}
        </TabsContent>

        <TabsContent value="public" className="mt-8">
          <p className="text-center text-xs text-muted-foreground mb-6">{publicDescription}</p>
          {publicVideosQuery.isLoading ? (
            <SkeletonGrid count={PUBLIC_SECTION_SKELETON_COUNT} />
          ) : publicVideosQuery.isError ? (
            <ErrorState title={errorTitle} description={errorDescription} />
          ) : publicCards.length === 0 ? (
            <EmptyState title={emptyTitle} description={emptyDescription} />
          ) : (
            <CardGrid>
              {publicCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.35, ease: 'easeOut' }}
                >
                  <DiscoveryCardItem
                    card={card}
                    tone="public"
                    actionLabel={viewActionLabel}
                    reuseLabel={reuseActionLabel}
                    onReuse={() => onReuseSourceText(publicSourceCards[index])}
                  />
                </motion.div>
              ))}
            </CardGrid>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
