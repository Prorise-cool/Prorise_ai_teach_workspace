/**
 * 文件说明：验证视频工作区任务中心 adapter 能组合任务元数据列表与状态快照。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiClient, ApiClientResponse, ApiRequestConfig } from '@/services/api/client';
import type { TaskSnapshot } from '@/types/task';

import {
  createRealVideoWorkspaceTaskAdapter,
  resetDismissedVideoWorkspaceTasks,
} from './video-workspace-task-adapter';

const getTaskSnapshotMock = vi.fn<(taskId: string) => Promise<TaskSnapshot>>();

vi.mock('@/services/api/adapters/task-adapter', () => ({
  resolveTaskAdapter: () => ({
    getTaskSnapshot: getTaskSnapshotMock,
  }),
}));

function createClientResponse<T>(data: T): ApiClientResponse<T> {
  return {
    status: 200,
    data,
    headers: new Headers(),
  };
}

describe('video-workspace-task-adapter', () => {
  beforeEach(() => {
    getTaskSnapshotMock.mockReset();
    resetDismissedVideoWorkspaceTasks();
  });

  it('skips stale active rows when a task snapshot returns 404 and suppresses repeated refetches for that task', async () => {
    async function requestMock<T>(config: ApiRequestConfig): Promise<ApiClientResponse<T>> {
      if (config.url === '/api/v1/video/tasks?status=pending&pageNum=1&pageSize=10') {
        return createClientResponse({
          rows: [
            {
              task_id: 'vtask_stale_404',
              user_id: 'student_001',
              task_type: 'video',
              table_name: 'xm_video_task',
              status: 'pending',
              summary: '旧任务残留',
              updated_at: '2026-04-18 10:06:00',
              created_at: '2026-04-18 10:05:00',
            },
          ],
          total: 1,
        } as T);
      }

      if (config.url === '/api/v1/video/tasks?status=processing&pageNum=1&pageSize=10') {
        return createClientResponse({
          rows: [
            {
              task_id: 'vtask_processing_002',
              user_id: 'student_001',
              task_type: 'video',
              table_name: 'xm_video_task',
              status: 'processing',
              summary: '积分题讲解',
              updated_at: '2026-04-18 10:07:00',
              created_at: '2026-04-18 10:04:00',
            },
          ],
          total: 1,
        } as T);
      }

      if (config.url === '/api/v1/video/tasks?status=completed&pageNum=1&pageSize=10') {
        return createClientResponse({
          rows: [],
          total: 0,
        } as T);
      }

      throw new Error(`unexpected request: ${config.url}`);
    }
    const client: ApiClient = { request: requestMock };

    getTaskSnapshotMock.mockImplementation(async (taskId) => {
      if (taskId === 'vtask_stale_404') {
        const notFoundError = Object.assign(new Error('未找到对应任务'), {
          status: 404,
          code: '404',
        });

        throw notFoundError;
      }

      return {
        taskId,
        requestId: 'req_processing_002',
        taskType: 'video',
        status: 'processing',
        progress: 58,
        message: '渲染第 2 段中',
        timestamp: '2026-04-18T10:07:30Z',
        currentStage: 'render',
        stageLabel: 'video.stages.render',
      };
    });

    const adapter = createRealVideoWorkspaceTaskAdapter({ client });
    const firstResult = await adapter.listActiveTasks();
    const secondResult = await adapter.listActiveTasks();

    expect(firstResult.total).toBe(1);
    expect(firstResult.items).toHaveLength(1);
    expect(firstResult.items[0]).toMatchObject({
      taskId: 'vtask_processing_002',
      title: '积分题讲解',
      lifecycleStatus: 'processing',
      progress: 58,
    });
    expect(secondResult.total).toBe(1);
    expect(secondResult.items).toHaveLength(1);
    expect(secondResult.items[0]).toMatchObject({
      taskId: 'vtask_processing_002',
      title: '积分题讲解',
      lifecycleStatus: 'processing',
      progress: 58,
    });
    expect(
      getTaskSnapshotMock.mock.calls.filter(([taskId]) => taskId === 'vtask_stale_404'),
    ).toHaveLength(1);
  });

  it('merges pending, processing and completed video tasks with per-task status snapshots', async () => {
    async function requestMock<T>(config: ApiRequestConfig): Promise<ApiClientResponse<T>> {
      if (config.url === '/api/v1/video/tasks?status=pending&pageNum=1&pageSize=10') {
        return createClientResponse({
          rows: [
            {
              task_id: 'vtask_pending_001',
              user_id: 'student_001',
              task_type: 'video',
              table_name: 'xm_video_task',
              status: 'pending',
              summary: '导数题讲解',
              updated_at: '2026-04-17 10:00:00',
              created_at: '2026-04-17 09:58:00',
            },
          ],
          total: 1,
        } as T);
      }

      if (config.url === '/api/v1/video/tasks?status=processing&pageNum=1&pageSize=10') {
        return createClientResponse({
          rows: [
            {
              task_id: 'vtask_processing_002',
              user_id: 'student_001',
              task_type: 'video',
              table_name: 'xm_video_task',
              status: 'processing',
              summary: '积分题讲解',
              updated_at: '2026-04-17 10:05:00',
              created_at: '2026-04-17 09:55:00',
            },
          ],
          total: 1,
        } as T);
      }

      if (config.url === '/api/v1/video/tasks?status=completed&pageNum=1&pageSize=10') {
        return createClientResponse({
          rows: [
            {
              task_id: 'vtask_completed_003',
              user_id: 'student_001',
              task_type: 'video',
              table_name: 'xm_video_task',
              status: 'completed',
              summary: '已完成任务',
              updated_at: '2026-04-17 10:06:00',
              created_at: '2026-04-17 09:54:00',
            },
          ],
          total: 1,
        } as T);
      }

      throw new Error(`unexpected request: ${config.url}`);
    }
    const client: ApiClient = { request: requestMock };

    getTaskSnapshotMock.mockImplementation(async (taskId) => {
      if (taskId === 'vtask_processing_002') {
        return {
          taskId,
          requestId: 'req_processing_002',
          taskType: 'video',
          status: 'processing',
          progress: 58,
          message: '渲染第 2 段中',
          timestamp: '2026-04-17T10:05:30Z',
          currentStage: 'render',
          stageLabel: 'video.stages.render',
        };
      }

      if (taskId === 'vtask_completed_003') {
        return {
          taskId,
          requestId: 'req_completed_003',
          taskType: 'video',
          status: 'completed',
          progress: 100,
          message: '视频已生成完成',
          timestamp: '2026-04-17T10:06:30Z',
          currentStage: 'completed',
          stageLabel: 'video.stages.completed',
        };
      }

      return {
        taskId,
        requestId: 'req_pending_001',
        taskType: 'video',
        status: 'pending',
        progress: 0,
        message: '等待进入队列',
        timestamp: '2026-04-17T10:00:10Z',
        currentStage: null,
        stageLabel: null,
      };
    });

    const adapter = createRealVideoWorkspaceTaskAdapter({ client });
    const result = await adapter.listActiveTasks();

    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({
      taskId: 'vtask_completed_003',
      title: '已完成任务',
      lifecycleStatus: 'completed',
      progress: 100,
      stageLabel: 'video.stages.completed',
      message: '视频已生成完成',
    });
    expect(result.items[1]).toMatchObject({
      taskId: 'vtask_processing_002',
      title: '积分题讲解',
      lifecycleStatus: 'processing',
      progress: 58,
      stageLabel: 'video.stages.render',
      message: '渲染第 2 段中',
    });
    expect(result.items[2]).toMatchObject({
      taskId: 'vtask_pending_001',
      title: '导数题讲解',
      lifecycleStatus: 'pending',
      progress: 0,
      stageLabel: null,
      message: '等待进入队列',
    });
    expect(getTaskSnapshotMock).toHaveBeenCalledTimes(3);
    expect(getTaskSnapshotMock).toHaveBeenNthCalledWith(1, 'vtask_completed_003');
    expect(getTaskSnapshotMock).toHaveBeenNthCalledWith(2, 'vtask_processing_002');
    expect(getTaskSnapshotMock).toHaveBeenNthCalledWith(3, 'vtask_pending_001');
  });
});
