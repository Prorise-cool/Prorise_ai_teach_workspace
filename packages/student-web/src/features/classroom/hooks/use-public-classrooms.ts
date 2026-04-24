/**
 * 文件说明：课堂输入页公开课堂发现区的 react-query 查询 hook。
 * 镜像 video 侧的 usePublicVideos。
 */
import { useQuery } from '@tanstack/react-query';

import {
  DEFAULT_CLASSROOM_PUBLIC_QUERY,
  resolveClassroomPublicAdapter,
  type ClassroomPublicListQuery,
} from '@/services/api/adapters/classroom-public-adapter';

export function usePublicClassrooms(
  query: Partial<ClassroomPublicListQuery> = DEFAULT_CLASSROOM_PUBLIC_QUERY,
) {
  const adapter = resolveClassroomPublicAdapter();
  const resolved = {
    ...DEFAULT_CLASSROOM_PUBLIC_QUERY,
    ...query,
  } satisfies ClassroomPublicListQuery;

  return useQuery({
    queryKey: ['classroom', 'public-feed', resolved.pageNum, resolved.pageSize],
    queryFn: ({ signal }) => adapter.listPublic(resolved, { signal }),
    staleTime: 5 * 60 * 1000,
  });
}
