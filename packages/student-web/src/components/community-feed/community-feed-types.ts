/**
 * 文件说明：社区瀑布流组件的公共类型定义。
 * 同时服务视频与课堂输入页的社区内容卡片。
 */

import type { ReactNode } from 'react';

/** 社区作品卡片数据。 */
export type CommunityWorkCard = {
  /** 作品 ID。 */
  id: string;
  /** 作品标题。 */
  title: string;
  /** 作品描述（可选）。 */
  description?: string;
  /** 封面图 URL（可选，无封面则显示文本摘要）。 */
  coverUrl?: string;
  /** 作品类型标签，如 "互动课堂"、"视频讲解"。 */
  tag: string;
  /** 浏览量。 */
  viewCount: number;
  /** 作者昵称。 */
  authorName: string;
  /** 作者头像 URL（可选）。 */
  authorAvatar?: string;
  /** 作品时长标签（可选）。 */
  durationLabel?: string;
  /** 复用原文（可选，仅视频发现区使用）。 */
  sourceText?: string;
  /** 目标路由（可选）。 */
  routeTo?: string;
};

/** CommunityFeed 属性。 */
export type CommunityFeedProps = {
  /** 瀑布流标题。 */
  title: string;
  /** 瀑布流副标题。 */
  description: string;
  /** 作品卡片数据。 */
  cards: CommunityWorkCard[];
  /** "加载更多"按钮文案（不传则不显示按钮）。 */
  loadMoreLabel?: string;
  /** "加载更多"加载中文案。 */
  loadingLabel?: string;
  /** 外层容器自定义类名。 */
  className?: string;
  /** 首次加载骨架屏。 */
  isLoading?: boolean;
  /** 骨架卡片数量。 */
  skeletonCount?: number;
  /** 错态节点。 */
  errorState?: ReactNode;
  /** 空态节点。 */
  emptyState?: ReactNode;
  /** 自定义卡片动作区。 */
  renderCardActions?: (card: CommunityWorkCard) => ReactNode;
  /** 点击封面播放按钮时的回调。 */
  onCardPlay?: (card: CommunityWorkCard) => void;
};
