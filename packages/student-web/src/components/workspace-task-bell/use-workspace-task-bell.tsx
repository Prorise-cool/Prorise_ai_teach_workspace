/**
 * 文件说明：工作区任务铃铛共享 hook。
 *
 * 把 home / video-input / classroom-input 三个页面共用的"进行中任务"铃铛
 * 装配逻辑（query + cancel/delete mutation + items + popover slot）封装在一起。
 *
 * 数据源当前仅指向视频任务（`useVideoWorkspaceTasks` → `xm_video_task`）。
 * 后续若加入课堂任务到任务中心，只需扩展这一个 hook，三处调用站点零改动。
 *
 * 用法：
 * ```tsx
 * const { slot } = useWorkspaceTaskBell({ gateOnAuth: true });
 * <WorkspaceInputShell workspaceUtilitySlot={slot} ... />
 * ```
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { VideoTaskCenter } from '@/features/video/components/video-task-center';
import {
	readDraftVideoTaskTitle,
	type VideoWorkspaceTaskItem,
} from '@/features/video/components/video-workspace-task-shared';
import { useVideoWorkspaceTasks } from '@/features/video/hooks/use-video-workspace-tasks';
import {
	cacheCancelledVideoTask,
	clearVideoTaskDetailQueries,
	pruneVideoWorkspaceTaskFromCache,
	VIDEO_WORKSPACE_ACTIVE_TASKS_QUERY_KEY,
} from '@/features/video/utils/task-center-cache';
import { resolveVideoTaskAdapter } from '@/services/api/adapters/video-task-adapter';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';

type UseWorkspaceTaskBellOptions = {
	/**
	 * 当为 true 时，未登录则返回 slot=null（不渲染铃铛）。home 落地页用 true，
	 * 已登录的工作区输入页用 false（始终渲染）。默认 false。
	 */
	gateOnAuth?: boolean;
	/**
	 * mutationKey 命名空间，避免 React Query 在多页同时渲染时因相同 key 互相打架。
	 * 默认 `'workspace'`，home 页传 `'home-workspace'` 以与 input 页区分。
	 */
	mutationScope?: string;
};

type UseWorkspaceTaskBellResult = {
	slot: ReactElement | null;
	items: VideoWorkspaceTaskItem[];
};

export function useWorkspaceTaskBell(
	options: UseWorkspaceTaskBellOptions = {},
): UseWorkspaceTaskBellResult {
	const { gateOnAuth = false, mutationScope = 'workspace' } = options;
	const { t } = useAppTranslation();
	const { notify } = useFeedback();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const session = useAuthSessionStore((state) => state.session);
	const videoTaskAdapter = useMemo(() => resolveVideoTaskAdapter(), []);

	const isAuthed = Boolean(session?.accessToken);
	const queryEnabled = gateOnAuth ? isAuthed : true;

	const workspaceTasksQuery = useVideoWorkspaceTasks({
		enabled: queryEnabled,
	});

	const cancelTaskMutation = useMutation({
		mutationKey: ['video', mutationScope, 'cancel-task'],
		mutationFn: (taskId: string) => videoTaskAdapter.cancelTask(taskId),
		onSuccess: async (snapshot, taskId) => {
			cacheCancelledVideoTask(queryClient, snapshot);
			await Promise.allSettled([
				queryClient.invalidateQueries({
					queryKey: VIDEO_WORKSPACE_ACTIVE_TASKS_QUERY_KEY,
				}),
				queryClient.invalidateQueries({
					queryKey: ['video', 'task-preview', taskId],
				}),
				queryClient.invalidateQueries({
					queryKey: ['video', 'result', taskId],
				}),
			]);
			notify({
				title: t('video.generating.cancelTaskSuccess'),
				tone: 'success',
			});
		},
		onError: (error) => {
			notify({
				title: t('video.generating.cancelTaskFailed'),
				description:
					error instanceof Error
						? error.message
						: t('video.generating.cancelTaskFailed'),
				tone: 'error',
			});
		},
	});

	const deleteTaskMutation = useMutation({
		mutationKey: ['video', mutationScope, 'delete-task'],
		mutationFn: (taskId: string) => videoTaskAdapter.deleteTask(taskId),
		onSuccess: async (_result, taskId) => {
			pruneVideoWorkspaceTaskFromCache(queryClient, taskId);
			clearVideoTaskDetailQueries(queryClient, taskId);
			await Promise.allSettled([
				queryClient.invalidateQueries({
					queryKey: VIDEO_WORKSPACE_ACTIVE_TASKS_QUERY_KEY,
				}),
			]);
			notify({
				title: t('entryNav.taskCenter.deleteSuccess'),
				tone: 'success',
			});
		},
		onError: (error) => {
			notify({
				title: t('entryNav.taskCenter.deleteFailed'),
				description:
					error instanceof Error
						? error.message
						: t('entryNav.taskCenter.deleteFailed'),
				tone: 'error',
			});
		},
	});

	const workspaceTaskItems = useMemo<VideoWorkspaceTaskItem[]>(
		() =>
			workspaceTasksQuery.data?.items.map((item) => ({
				...item,
				title: readDraftVideoTaskTitle(
					item.taskId,
					item.title || t('entryNav.taskCenter.fallbackTitle'),
				),
			})) ?? [],
		[workspaceTasksQuery.data?.items, t],
	);

	const slot: ReactElement | null = gateOnAuth && !isAuthed ? null : (
		<VideoTaskCenter
			items={workspaceTaskItems}
			total={workspaceTaskItems.length}
			isCancellingTaskId={
				cancelTaskMutation.isPending ? cancelTaskMutation.variables ?? null : null
			}
			onCancel={(taskId) => cancelTaskMutation.mutate(taskId)}
			onDeleteTask={(taskId) => deleteTaskMutation.mutate(taskId)}
			onEnterTask={(taskId) => {
				const item = workspaceTaskItems.find((entry) => entry.taskId === taskId);
				void navigate(
					item?.lifecycleStatus === 'completed'
						? `/video/${taskId}`
						: `/video/${taskId}/generating`,
				);
			}}
		/>
	);

	return { slot, items: workspaceTaskItems };
}
