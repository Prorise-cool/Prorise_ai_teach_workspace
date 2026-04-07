/**
 * 文件说明：封装视频输入页公开视频发现区的查询 hook。
 */
import { useQuery } from '@tanstack/react-query';

import { resolveVideoPublicAdapter } from '@/services/api/adapters/video-public-adapter';
import type { VideoPublicListQuery } from '@/types/video';

const DEFAULT_PUBLIC_VIDEO_QUERY: VideoPublicListQuery = {
  page: 1,
  pageSize: 12,
  sort: 'latest',
};

/**
 * 查询公开视频列表。
 *
 * @param query - 分页和排序参数。
 * @returns react-query 查询结果。
 */
export function usePublicVideos(
  query: Partial<VideoPublicListQuery> = DEFAULT_PUBLIC_VIDEO_QUERY,
) {
  const adapter = resolveVideoPublicAdapter();
  const resolvedQuery = {
    ...DEFAULT_PUBLIC_VIDEO_QUERY,
    ...query,
  } satisfies VideoPublicListQuery;

  return useQuery({
    queryKey: [
      'video',
      'public-feed',
      resolvedQuery.page,
      resolvedQuery.pageSize,
      resolvedQuery.sort,
    ],
    queryFn: () => adapter.fetchPublicVideos(resolvedQuery),
    staleTime: 5 * 60 * 1000,
  });
}
