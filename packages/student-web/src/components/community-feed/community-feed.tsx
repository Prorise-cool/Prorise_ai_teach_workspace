/**
 * 文件说明：社区瀑布流组件。
 * 使用 CSS column-count 实现响应式瀑布流布局，
 * 在视频输入页与课堂输入页底部展示社区公开作品卡片。
 */
import { useState } from 'react';

import { Eye, Play } from 'lucide-react';

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
  className
}: CommunityFeedProps) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <section className={cn('xm-community-feed', className)}>
      {/* 标题区 */}
      <div className="xm-community-feed__header">
        <h2 className="xm-community-feed__title">{title}</h2>
        <p className="xm-community-feed__desc">{description}</p>
      </div>

      {/* 分类标签 */}
      <div className="xm-community-feed__categories">
        {categories.map((cat, i) => (
          <button
            key={cat}
            type="button"
            className={cn(
              'xm-community-feed__category',
              i === activeCategory && 'xm-community-feed__category--active'
            )}
            onClick={() => setActiveCategory(i)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 瀑布流 */}
      <div className="xm-community-feed__grid">
        {cards.map((card) => (
          <article key={card.id} className="xm-community-feed__card">
            {/* 封面区 */}
            {card.coverUrl ? (
              <div className="xm-community-feed__card-cover">
                <img src={card.coverUrl} alt={card.title} />
                <button
                  type="button"
                  className="xm-community-feed__card-play"
                  aria-label="播放"
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
              <div className="xm-community-feed__card-meta">
                <span className="xm-community-feed__card-tag">{card.tag}</span>
                <span className="xm-community-feed__card-views">
                  <Eye className="h-3 w-3" />
                  {card.viewCount}
                </span>
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
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
