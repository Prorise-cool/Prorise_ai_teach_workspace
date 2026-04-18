/**
 * 文件说明：封装视频输入页任务中心活跃任务查询。
 */
import { useQuery } from '@tanstack/react-query';

import { resolveVideoWorkspaceTaskAdapter } from '@/services/api/adapters/video-workspace-task-adapter';

type UseVideoWorkspaceTasksOptions = {
	enabled?: boolean;
};

export function useVideoWorkspaceTasks(
	options: UseVideoWorkspaceTasksOptions = {},
) {
	const adapter = resolveVideoWorkspaceTaskAdapter();

	return useQuery({
		queryKey: ['video', 'workspace', 'active-tasks'],
		queryFn: () => adapter.listActiveTasks(),
		enabled: options.enabled ?? true,
		staleTime: 5_000,
		refetchInterval: 10_000,
	});
}
