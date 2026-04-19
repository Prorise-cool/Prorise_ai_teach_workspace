/**
 * 文件说明：封装视频输入页任务中心活跃任务查询。
 */
import { useQuery } from '@tanstack/react-query';

import { VIDEO_WORKSPACE_ACTIVE_TASKS_QUERY_KEY } from '@/features/video/utils/task-center-cache';
import { resolveVideoWorkspaceTaskAdapter } from '@/services/api/adapters/video-workspace-task-adapter';

type UseVideoWorkspaceTasksOptions = {
	enabled?: boolean;
};

export function useVideoWorkspaceTasks(
	options: UseVideoWorkspaceTasksOptions = {},
) {
	const adapter = resolveVideoWorkspaceTaskAdapter();

	return useQuery({
		queryKey: VIDEO_WORKSPACE_ACTIVE_TASKS_QUERY_KEY,
		queryFn: () => adapter.listActiveTasks(),
		enabled: options.enabled ?? true,
		staleTime: 5_000,
		refetchInterval: 10_000,
	});
}
