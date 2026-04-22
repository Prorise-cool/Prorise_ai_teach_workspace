/**
 * 文件说明：社区作品展示区（参考 OpenMAIC 首页 "Recent classrooms" 卡片风格）。
 *
 * 业务上没有"分类"概念，所以这里只做单列 grid；
 * 卡片无边框无阴影、信息放在缩略图外面、hover 仅轻微放大；
 * 颜色严格使用全局设计 token（bg-secondary / bg-primary/10 ...）。
 */
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Clock3, Eye, Loader2, PlayCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { CommunityFeedProps } from './community-feed-types';

export function CommunityFeed({
  title,
  description,
  cards,
  loadMoreLabel,
  loadingLabel,
  className,
  isLoading = false,
  skeletonCount = 6,
  errorState,
  emptyState,
  renderCardActions,
  onCardPlay,
}: CommunityFeedProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [displayedCards, setDisplayedCards] = useState(cards);

  useEffect(() => {
    setDisplayedCards(cards);
  }, [cards]);

  const hasCards = displayedCards.length > 0;
  const showLoadingState = isLoading && !hasCards;
  const showErrorState = !showLoadingState && Boolean(errorState) && !hasCards;
  const showEmptyState =
    !showLoadingState && !showErrorState && !hasCards && Boolean(emptyState);

  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setIsLoadingMore(false);
      setDisplayedCards((prev) => [
        ...prev,
        ...cards.slice(0, 4).map((c, i) => ({
          ...c,
          id: `${c.id}-more-${Date.now()}-${i}`,
        })),
      ]);
    }, 1000);
  }, [cards]);

  return (
    <section className={cn('w-full max-w-6xl mx-auto px-4 flex flex-col gap-8', className)}>
      <div className="text-center">
        <h2 className="text-2xl md:text-[28px] font-black tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>

      {showLoadingState ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={`community-feed-skeleton-${i}`} className="animate-pulse">
              <div className="w-full aspect-[16/9] rounded-2xl bg-secondary/60" />
              <div className="mt-2.5 px-1 flex items-center gap-2">
                <div className="h-4 w-16 rounded-full bg-secondary/60" />
                <div className="h-4 flex-1 rounded-md bg-secondary/60" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {showErrorState ? <div>{errorState}</div> : null}
      {showEmptyState ? <div>{emptyState}</div> : null}

      {hasCards ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
          <AnimatePresence mode="popLayout">
            {displayedCards.map((card, i) => (
              <motion.article
                key={card.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i % 8) * 0.04, duration: 0.35, ease: 'easeOut' }}
                className="group"
              >
                <div className="relative w-full aspect-[16/9] rounded-2xl bg-secondary/60 overflow-hidden transition-transform duration-200 group-hover:scale-[1.02]">
                  {card.coverUrl ? (
                    <img
                      src={card.coverUrl}
                      alt={card.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 p-4 flex items-center justify-center">
                      <p className="text-center text-xs font-medium text-muted-foreground line-clamp-4">
                        {card.description || card.title}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label="播放"
                    onClick={() => onCardPlay?.(card)}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <PlayCircle className="size-12 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
                  </button>
                </div>

                <div className="mt-2.5 px-1 flex items-center gap-2 min-w-0">
                  <span className="shrink-0 inline-flex items-center rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {card.tag}
                  </span>
                  <p className="font-medium text-[15px] truncate text-foreground/90 min-w-0">
                    {card.title}
                  </p>
                </div>

                <div className="mt-1 px-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  {card.authorName ? (
                    <span className="inline-flex items-center gap-1 truncate">
                      {card.authorAvatar ? (
                        <img
                          src={card.authorAvatar}
                          alt={card.authorName}
                          className="size-4 rounded-full object-cover"
                        />
                      ) : null}
                      {card.authorName}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Eye className="size-3" />
                    {card.viewCount}
                  </span>
                  {card.durationLabel ? (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock3 className="size-3" />
                      {card.durationLabel}
                    </span>
                  ) : null}
                </div>

                {renderCardActions ? (
                  <div className="mt-2 px-1 flex flex-wrap gap-2">
                    {renderCardActions(card)}
                  </div>
                ) : null}
              </motion.article>
            ))}
            {isLoadingMore
              ? Array.from({ length: 4 }).map((_, i) => (
                  <motion.div
                    key={`community-feed-skeleton-more-${i}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="animate-pulse"
                  >
                    <div className="w-full aspect-[16/9] rounded-2xl bg-secondary/60" />
                    <div className="mt-2.5 px-1 flex items-center gap-2">
                      <div className="h-4 w-16 rounded-full bg-secondary/60" />
                      <div className="h-4 flex-1 rounded-md bg-secondary/60" />
                    </div>
                  </motion.div>
                ))
              : null}
          </AnimatePresence>
        </div>
      ) : null}

      {loadMoreLabel && hasCards && !showErrorState && !showEmptyState ? (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={isLoadingMore}
            onClick={handleLoadMore}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-border/60 bg-background/70 text-[13px] font-semibold text-muted-foreground transition hover:border-border hover:text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>{loadingLabel ?? '...'}</span>
              </>
            ) : (
              <>
                <span>{loadMoreLabel}</span>
                <ChevronDown className="size-4" />
              </>
            )}
          </button>
        </div>
      ) : null}
    </section>
  );
}
