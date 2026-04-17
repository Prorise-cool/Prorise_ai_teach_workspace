/**
 * 文件说明：封装视频等待页取消任务 mutation。
 * 统一处理取消请求、Toast 反馈、任务相关 query 失效与可选导航回输入页。
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { isApiClientError, type ApiClient } from '@/services/api/client';
import { resolveVideoTaskAdapter } from '@/services/api/adapters/video-task-adapter';
import { useFeedback } from '@/shared/feedback';
import type { TaskSnapshot } from '@/types/task';

type UseCancelVideoTaskOptions = {
	client?: ApiClient;
	navigateOnSuccess?: boolean;
	returnTo?: string;
	replace?: boolean;
};

type CancelVideoTaskResult = {
	cancelTask: () => void;
	cancelTaskAsync: () => Promise<TaskSnapshot>;
	isCancelling: boolean;
};

function resolveCancelErrorMessage(error: unknown, fallback: string) {
	if (isApiClientError(error)) {
		const payload = error.data as
			| {
					msg?: string;
			  }
			| undefined;

		return payload?.msg ?? error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return fallback;
}

export function useCancelVideoTask(
	taskId: string | undefined,
	options: UseCancelVideoTaskOptions = {},
): CancelVideoTaskResult {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { t } = useAppTranslation();
	const { notify } = useFeedback();
	const videoTaskAdapter = resolveVideoTaskAdapter({
		client: options.client,
	});

	const mutation = useMutation({
		mutationKey: ['video', 'cancel', taskId],
		mutationFn: async () => {
			if (!taskId) {
				throw new Error(t('video.generating.cancelTaskMissing'));
			}

			return videoTaskAdapter.cancelTask(taskId);
		},
		onSuccess: async () => {
			const invalidations = taskId
				? [
						queryClient.invalidateQueries({
							queryKey: ['video', 'task-status', taskId],
						}),
						queryClient.invalidateQueries({
							queryKey: ['video', 'task-preview', taskId],
						}),
						queryClient.invalidateQueries({
							queryKey: ['video', 'result', taskId],
						}),
						queryClient.invalidateQueries({
							queryKey: ['video', 'workspace', 'active-tasks'],
						}),
				  ]
				: [];

			if (invalidations.length > 0) {
				await Promise.allSettled(invalidations);
			}

			notify({
				tone: 'success',
				title: t('video.generating.cancelTaskSuccess'),
			});

			if (options.navigateOnSuccess) {
				void navigate(options.returnTo ?? '/video/input', {
					replace: options.replace ?? true,
				});
			}
		},
		onError: (error) => {
			notify({
				tone: 'error',
				title: t('video.generating.cancelTaskFailed'),
				description: resolveCancelErrorMessage(
					error,
					t('video.generating.cancelTaskFailed'),
				),
			});
		},
	});

	return {
		cancelTask: () => mutation.mutate(),
		cancelTaskAsync: () => mutation.mutateAsync(),
		isCancelling: mutation.isPending,
	};
}
