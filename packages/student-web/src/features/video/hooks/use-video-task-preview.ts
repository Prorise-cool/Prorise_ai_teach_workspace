/**
 * 文件说明：封装视频等待页 preview 查询 hook。
 * 页面 mount 时读取 `/preview`，并在 previewVersion 推进时由页面层触发 refetch。
 */
import { useQuery } from '@tanstack/react-query';

import { resolveVideoPreviewAdapter } from '@/services/api/adapters/video-preview-adapter';
import type { VideoTaskPreview } from '@/types/video';

export interface VideoTaskPreviewResult {
  preview: VideoTaskPreview | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useVideoTaskPreview(
  taskId: string | undefined,
  options?: { enabled?: boolean },
): VideoTaskPreviewResult {
  const adapter = resolveVideoPreviewAdapter();
  const query = useQuery({
    queryKey: ['video', 'task-preview', taskId],
    queryFn: () => adapter.getPreview(taskId!),
    enabled: !!taskId && (options?.enabled ?? true),
    staleTime: 0,
    retry: 1,
  });

  return {
    preview: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
    refetch: query.refetch,
  };
}
