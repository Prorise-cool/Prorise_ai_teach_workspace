/**
 * 文件说明：社区瀑布流组件。
 * 使用 CSS column-count 实现响应式瀑布流布局，
 * 在视频输入页与课堂输入页底部展示社区公开作品卡片。
 * 分类使用下划线文本 Tab 切换，底部提供"加载更多"按钮。
 */
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { ChevronDown, Clock3, Eye, Loader2, Play } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { CommunityFeedProps } from './community-feed-types';

import './styles/community-feed.scss';

/**
 * 渲染社区作品瀑布流。
 *
 * @param props - 瀑布流参数。
 * @returns 瀑布流节点。
 */
export function CommunityFeed({
  title,
  description,
  categories,
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
  const [activeCategory, setActiveCategory] = useState(0);
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
    // Mock 阶段模拟 1s 延迟
    setTimeout(() => {
      setIsLoadingMore(false);
      setDisplayedCards((prev) => [
        ...prev,
        // Mock append 4 more items
        ...cards.slice(0, 4).map((c, i) => ({
          ...c,
          id: `${c.id}-more-${Date.now()}-${i}`
        }))
      ]);
    }, 1000);
  }, [cards]);

  return (
    <section className={cn('xm-community-feed', className)}>
      {/* 标题区 + 分类 Tab */}
      <div className="xm-community-feed__header">
        <div className="xm-community-feed__header-text">
          <h2 className="xm-community-feed__title">{title}</h2>
          <p className="xm-community-feed__desc">{description}</p>
        </div>

        <div className="xm-community-feed__tabs">
          {categories.map((cat, i) => (
            <button
              key={cat}
              type="button"
              className={cn(
                'xm-community-feed__tab',
                i === activeCategory && 'xm-community-feed__tab--active'
              )}
              onClick={() => setActiveCategory(i)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 瀑布流 */}
      <div className="xm-community-feed__grid">
        <AnimatePresence mode="popLayout">
          {showLoadingState
            ? Array.from({ length: skeletonCount }).map((_, i) => (
              <motion.article
                key={`skeleton-initial-${i}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="xm-community-feed__card xm-community-feed__card--skeleton"
              >
                <div
                  className="xm-community-feed__card-cover"
                  style={{ background: 'var(--xm-color-secondary)' }}
                ></div>
                <div className="xm-community-feed__card-body pb-6">
                  <div
                    className="animate-pulse"
                    style={{
                      width: '80%',
                      height: '1.2rem',
                      background: 'var(--xm-color-secondary)',
                      marginBottom: '0.75rem',
                      borderRadius: '4px',
                    }}
                  />
                  <div
                    className="animate-pulse"
                    style={{
                      width: '65%',
                      height: '0.875rem',
                      background: 'var(--xm-color-secondary)',
                      marginBottom: '0.75rem',
                      borderRadius: '4px',
                    }}
                  />
                  <div
                    className="animate-pulse"
                    style={{
                      width: '45%',
                      height: '0.875rem',
                      background: 'var(--xm-color-secondary)',
                      marginBottom: '1rem',
                      borderRadius: '4px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div
                      className="animate-pulse"
                      style={{
                        width: '1.5rem',
                        height: '1.5rem',
                        borderRadius: '50%',
                        background: 'var(--xm-color-secondary)',
                      }}
                    />
                    <div
                      className="animate-pulse"
                      style={{
                        width: '40%',
                        height: '0.875rem',
                        background: 'var(--xm-color-secondary)',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              </motion.article>
            ))
            : null}
          {showErrorState ? (
            <motion.div
              key="community-feed-error"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-full"
            >
              {errorState}
            </motion.div>
          ) : null}
          {showEmptyState ? (
            <motion.div
              key="community-feed-empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-full"
            >
              {emptyState}
            </motion.div>
          ) : null}
          {displayedCards.map((card, i) => (
            <motion.article 
              key={card.id} 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: (i % 4) * 0.05 }}
              className="xm-community-feed__card"
            >
              {/* 封面区 */}
              {card.coverUrl ? (
                <div className="xm-community-feed__card-cover">
                  <img src={card.coverUrl} alt={card.title} />
                  <button
                    type="button"
                    className="xm-community-feed__card-play"
                    aria-label="播放"
                    onClick={() => onCardPlay?.(card)}
                  >
                    <Play className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="xm-community-feed__card-text-cover">
                  <p>{card.description || card.title}</p>
                </div>
              )}

              {/* 信息区 */}
              <div className="xm-community-feed__card-body">
                <h3 className="xm-community-feed__card-title">{card.title}</h3>
                {card.description ? (
                  <p className="mb-3 text-xs leading-5 text-[color:var(--xm-color-text-secondary)]">
                    {card.description}
                  </p>
                ) : null}
                <div className="xm-community-feed__card-meta">
                  <span className="xm-community-feed__card-tag">{card.tag}</span>
                  <span className="xm-community-feed__card-views">
                    <Eye className="h-3 w-3" />
                    {card.viewCount}
                  </span>
                  {card.durationLabel ? (
                    <span className="xm-community-feed__card-views">
                      <Clock3 className="h-3 w-3" />
                      {card.durationLabel}
                    </span>
                  ) : null}
                </div>
                <div className="xm-community-feed__card-author">
                  {card.authorAvatar ? (
                    <img
                      src={card.authorAvatar}
                      alt={card.authorName}
                      className="xm-community-feed__card-avatar"
                    />
                  ) : (
                    <div className="xm-community-feed__card-avatar-placeholder">
                      {card.authorName.charAt(0)}
                    </div>
                  )}
                  <span className="xm-community-feed__card-author-name">
                    {card.authorName}
                  </span>
                </div>
                {renderCardActions ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {renderCardActions(card)}
                  </div>
                ) : null}
              </div>
            </motion.article>
          ))}
          {isLoadingMore && (
            Array.from({ length: 4 }).map((_, i) => (
              <motion.article
                key={`skeleton-${i}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="xm-community-feed__card xm-community-feed__card--skeleton"
              >
                <div className="xm-community-feed__card-cover" style={{ background: 'var(--xm-color-secondary)' }}></div>
                <div className="xm-community-feed__card-body pb-6">
                  <div className="animate-pulse" style={{ width: '80%', height: '1.2rem', background: 'var(--xm-color-secondary)', marginBottom: '0.75rem', borderRadius: '4px' }} />
                  <div className="animate-pulse" style={{ width: '50%', height: '0.875rem', background: 'var(--xm-color-secondary)', marginBottom: '1.25rem', borderRadius: '4px' }} />
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div className="animate-pulse" style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: 'var(--xm-color-secondary)' }} />
                    <div className="animate-pulse" style={{ width: '40%', height: '0.875rem', background: 'var(--xm-color-secondary)', borderRadius: '4px' }} />
                  </div>
                </div>
              </motion.article>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* 加载更多 */}
      {loadMoreLabel && hasCards && !showErrorState && !showEmptyState ? (
        <div className="xm-community-feed__load-more">
          <button
            type="button"
            className="xm-community-feed__load-more-btn"
            disabled={isLoadingMore}
            onClick={handleLoadMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{loadingLabel ?? '...'}</span>
              </>
            ) : (
              <>
                <span>{loadMoreLabel}</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      ) : null}
    </section>
  );
}
