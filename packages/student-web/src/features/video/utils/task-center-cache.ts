import type { QueryClient } from '@tanstack/react-query';

import {
	dismissVideoWorkspaceTask,
	type VideoWorkspaceTaskListResult,
} from '@/services/api/adapters/video-workspace-task-adapter';
import type { TaskSnapshot } from '@/types/task';

export const VIDEO_WORKSPACE_ACTIVE_TASKS_QUERY_KEY = [
	'video',
	'workspace',
	'active-tasks',
] as const;

export function pruneVideoWorkspaceTaskFromCache(
	queryClient: QueryClient,
	taskId: string,
) {
	dismissVideoWorkspaceTask(taskId);
	queryClient.setQueryData<VideoWorkspaceTaskListResult>(
		VIDEO_WORKSPACE_ACTIVE_TASKS_QUERY_KEY,
		(current) => {
			if (!current) {
				return current;
			}

			const items = current.items.filter((item) => item.taskId !== taskId);
			return {
				...current,
				items,
				total: items.length,
			};
		},
	);
}

export function cacheCancelledVideoTask(
	queryClient: QueryClient,
	snapshot: TaskSnapshot,
) {
	queryClient.setQueryData(['video', 'task-status', snapshot.taskId], snapshot);
	pruneVideoWorkspaceTaskFromCache(queryClient, snapshot.taskId);
}

export function clearVideoTaskDetailQueries(
	queryClient: QueryClient,
	taskId: string,
) {
	queryClient.removeQueries({
		queryKey: ['video', 'task-status', taskId],
		exact: true,
	});
	queryClient.removeQueries({
		queryKey: ['video', 'task-preview', taskId],
		exact: true,
	});
	queryClient.removeQueries({
		queryKey: ['video', 'result', taskId],
		exact: true,
	});
}
