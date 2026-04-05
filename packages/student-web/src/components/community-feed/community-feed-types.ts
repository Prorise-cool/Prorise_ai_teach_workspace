/**
 * 文件说明：社区瀑布流组件的公共类型定义。
 * 同时服务视频与课堂输入页的社区内容卡片。
 */

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
};

/** CommunityFeed 属性。 */
export type CommunityFeedProps = {
  /** 瀑布流标题。 */
  title: string;
  /** 瀑布流副标题。 */
  description: string;
  /** 分类标签列表。 */
  categories: string[];
  /** 作品卡片数据。 */
  cards: CommunityWorkCard[];
  /** 外层容器自定义类名。 */
  className?: string;
};
