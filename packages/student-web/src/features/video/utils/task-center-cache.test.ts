import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetDismissedVideoWorkspaceTasks } from '@/services/api/adapters/video-workspace-task-adapter';

import {
	cacheCancelledVideoTask,
	clearVideoTaskDetailQueries,
	pruneVideoWorkspaceTaskFromCache,
	VIDEO_WORKSPACE_ACTIVE_TASKS_QUERY_KEY,
} from './task-center-cache';

describe('task-center-cache', () => {
	beforeEach(() => {
		resetDismissedVideoWorkspaceTasks();
	});

	it('prunes cancelled tasks from the workspace cache and caches the cancelled snapshot', () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(VIDEO_WORKSPACE_ACTIVE_TASKS_QUERY_KEY, {
			items: [
				{
					taskId: 'vtask_cancelled_001',
					title: '导数题讲解',
					lifecycleStatus: 'pending',
					progress: 0,
					stageLabel: null,
					currentStage: null,
					updatedAt: '2026-04-19T06:00:00Z',
					message: '等待进入队列',
				},
				{
					taskId: 'vtask_processing_002',
					title: '积分题讲解',
					lifecycleStatus: 'processing',
					progress: 58,
					stageLabel: 'video.stages.render',
					currentStage: 'render',
					updatedAt: '2026-04-19T06:01:00Z',
					message: '渲染第 2 段中',
				},
			],
			total: 2,
		});

		cacheCancelledVideoTask(queryClient, {
			taskId: 'vtask_cancelled_001',
			requestId: 'req_cancelled_001',
			taskType: 'video',
			status: 'cancelled',
			progress: 0,
			message: '任务已取消',
			timestamp: '2026-04-19T06:02:00Z',
			currentStage: null,
			stageLabel: null,
			errorCode: 'TASK_CANCELLED',
		});

		expect(
			queryClient.getQueryData(VIDEO_WORKSPACE_ACTIVE_TASKS_QUERY_KEY),
		).toMatchObject({
			total: 1,
			items: [{ taskId: 'vtask_processing_002' }],
		});
		expect(
			queryClient.getQueryData(['video', 'task-status', 'vtask_cancelled_001']),
		).toMatchObject({
			status: 'cancelled',
			taskId: 'vtask_cancelled_001',
		});
	});

	it('removes deleted task detail queries from the cache', () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(['video', 'task-status', 'vtask_deleted_001'], {
			taskId: 'vtask_deleted_001',
		});
		queryClient.setQueryData(['video', 'task-preview', 'vtask_deleted_001'], {
			taskId: 'vtask_deleted_001',
		});
		queryClient.setQueryData(['video', 'result', 'vtask_deleted_001'], {
			taskId: 'vtask_deleted_001',
		});
		queryClient.setQueryData(VIDEO_WORKSPACE_ACTIVE_TASKS_QUERY_KEY, {
			items: [
				{
					taskId: 'vtask_deleted_001',
					title: '已完成任务',
					lifecycleStatus: 'completed',
					progress: 100,
					stageLabel: null,
					currentStage: null,
					updatedAt: '2026-04-19T06:03:00Z',
					message: '已完成',
				},
			],
			total: 1,
		});

		pruneVideoWorkspaceTaskFromCache(queryClient, 'vtask_deleted_001');
		clearVideoTaskDetailQueries(queryClient, 'vtask_deleted_001');

		expect(
			queryClient.getQueryData(VIDEO_WORKSPACE_ACTIVE_TASKS_QUERY_KEY),
		).toMatchObject({
			items: [],
			total: 0,
		});
		expect(
			queryClient.getQueryData(['video', 'task-status', 'vtask_deleted_001']),
		).toBeUndefined();
		expect(
			queryClient.getQueryData(['video', 'task-preview', 'vtask_deleted_001']),
		).toBeUndefined();
		expect(
			queryClient.getQueryData(['video', 'result', 'vtask_deleted_001']),
		).toBeUndefined();
	});
});
