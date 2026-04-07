/**
 * 文件说明：视频输入页公开视频发现区。
 * 负责消费 query 数据、渲染空态/错态，并向页面回传“复用题目”动作。
 */
import { Link } from 'react-router-dom';

import type { CommunityWorkCard } from '@/components/community-feed';
import { CommunityFeed } from '@/components/community-feed';
import { Button } from '@/components/ui/button';
import { usePublicVideos } from '@/features/video/hooks/use-public-videos';
import type { VideoPublicCard } from '@/types/video';

type VideoPublicFeedProps = {
  title: string;
  description: string;
  categories: string[];
  emptyTitle: string;
  emptyDescription: string;
  errorTitle: string;
  errorDescription: string;
  viewActionLabel: string;
  reuseActionLabel: string;
  onReuseSourceText: (card: VideoPublicCard) => void;
};

/**
 * 将视频域卡片映射为社区 feed 可消费的通用卡片。
 *
 * @param card - 视频域卡片。
 * @returns 通用社区卡片。
 */
function mapVideoCardToCommunityCard(card: VideoPublicCard): CommunityWorkCard {
  return {
    id: card.videoId,
    title: card.title,
    description: card.summary,
    coverUrl: card.thumbnail ?? undefined,
    tag: '视频讲解',
    viewCount: card.viewCount,
    authorName: card.authorName,
    authorAvatar: card.authorAvatar,
    durationLabel: card.duration,
    sourceText: card.sourceText,
    routeTo: `/video/${card.videoId}`,
  };
}

/**
 * 渲染视频输入页底部的公开视频发现区。
 *
 * @param props - 组件参数。
 * @returns 发现区节点。
 */
export function VideoPublicFeed({
  title,
  description,
  categories,
  emptyTitle,
  emptyDescription,
  errorTitle,
  errorDescription,
  viewActionLabel,
  reuseActionLabel,
  onReuseSourceText,
}: VideoPublicFeedProps) {
  const publicVideosQuery = usePublicVideos();
  const cards = (publicVideosQuery.data?.items ?? []).map(mapVideoCardToCommunityCard);

  return (
    <CommunityFeed
      title={title}
      description={description}
      categories={categories}
      cards={cards}
      isLoading={publicVideosQuery.isLoading}
      skeletonCount={6}
      emptyState={
        <div
          className="rounded-[2rem] border border-dashed border-border bg-background/72 px-6 py-10 text-center shadow-sm"
          role="status"
        >
          <p className="text-base font-semibold text-foreground">{emptyTitle}</p>
          <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      }
      errorState={publicVideosQuery.isError ? (
        <div
          className="rounded-[2rem] border border-border bg-background/72 px-6 py-10 text-center shadow-sm"
          role="status"
        >
          <p className="text-base font-semibold text-foreground">{errorTitle}</p>
          <p className="mt-2 text-sm text-muted-foreground">{errorDescription}</p>
        </div>
      ) : undefined}
      renderCardActions={(card) => {
        const sourceText = card.sourceText?.trim();
        const routeTo = card.routeTo ?? `/video/${card.id}`;

        return (
          <>
            <Button asChild variant="outline" size="sm">
              <Link to={routeTo}>{viewActionLabel}</Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!sourceText) {
                  return;
                }

                onReuseSourceText({
                  videoId: card.id,
                  title: card.title,
                  summary: card.description ?? card.title,
                  thumbnail: card.coverUrl ?? null,
                  duration: card.durationLabel ?? '',
                  viewCount: card.viewCount,
                  createdAt: new Date().toISOString(),
                  sourceText,
                  authorName: card.authorName,
                  authorAvatar: card.authorAvatar,
                });
              }}
              disabled={!sourceText}
            >
              {reuseActionLabel}
            </Button>
          </>
        );
      }}
    />
  );
}
