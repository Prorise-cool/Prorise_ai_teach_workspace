/**
 * 文件说明：视频工作区任务中心与当前任务卡共享的类型和状态解析工具。
 */
import type { TaskLifecycleStatus } from '@/types/task';

import { normalizeVideoTaskTitle } from '../utils/video-task-title';

export type VideoWorkspaceTaskItem = {
	taskId: string;
	title: string;
	lifecycleStatus: TaskLifecycleStatus;
	progress: number;
	stageLabel: string | null;
	currentStage: string | null;
	message: string;
	updatedAt: string;
};

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const VIDEO_TASK_DRAFT_CACHE_PREFIX = 'video-task-draft:';

export function readDraftVideoTaskTitle(taskId: string, fallback: string) {
	try {
		const cached = window.sessionStorage.getItem(`${VIDEO_TASK_DRAFT_CACHE_PREFIX}${taskId}`) || '';
		const normalized = cached ? normalizeVideoTaskTitle(cached) : '';

		return normalized || fallback;
	} catch {
		return fallback;
	}
}

export function clampVideoTaskProgress(progress: number) {
	return Math.max(0, Math.min(100, Math.round(progress)));
}

export function resolveVideoWorkspaceTaskStatusLabel(
	lifecycleStatus: TaskLifecycleStatus,
	currentStage: string | null,
	stageLabel: string | null,
	t: TranslateFn,
) {
	if (lifecycleStatus === 'processing') {
		if (currentStage) {
			const shortStageLabel = t(`entryNav.taskCenter.stage.${currentStage}`);

			if (shortStageLabel !== `entryNav.taskCenter.stage.${currentStage}`) {
				return shortStageLabel;
			}
		}

		if (stageLabel) {
			return t(stageLabel);
		}
	}

	switch (lifecycleStatus) {
		case 'pending':
			return t('entryNav.taskCenter.statusPending');
		case 'completed':
			return t('entryNav.taskCenter.statusCompleted');
		case 'failed':
			return t('entryNav.taskCenter.statusFailed');
		case 'cancelled':
			return t('entryNav.taskCenter.statusCancelled');
		default:
			return t('entryNav.taskCenter.statusProcessing');
	}
}
