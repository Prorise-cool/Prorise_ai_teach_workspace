/**
 * 文件说明：提供视频输入页任务中心所需的活跃任务聚合 adapter。
 * 聚合 pending / processing 列表并按任务快照 enrich。
 */
import type { ApiClient } from '@/services/api/client';
import { fastapiClient } from '@/services/api/fastapi-client';
import { resolveTaskAdapter } from '@/services/api/adapters/task-adapter';
import type { TaskLifecycleStatus, TaskSnapshot } from '@/types/task';

import { pickAdapterImplementation } from './base-adapter';

const ACTIVE_VIDEO_TASK_STATUSES = ['pending', 'processing'] as const;
const WORKSPACE_TASK_PAGE_NUM = 1;
const WORKSPACE_TASK_PAGE_SIZE = 10;

type ActiveVideoTaskStatus = (typeof ACTIVE_VIDEO_TASK_STATUSES)[number];

type ResolveVideoWorkspaceTaskAdapterOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

type RealVideoWorkspaceTaskAdapterOptions = {
  client?: ApiClient;
};

type VideoTaskListRow = {
  task_id: string;
  status: TaskLifecycleStatus;
  summary: string;
  updated_at: string;
};

type VideoTaskRowsResponse = {
  rows: VideoTaskListRow[];
  total: number;
};

export interface VideoWorkspaceTaskItem {
  taskId: string;
  title: string;
  lifecycleStatus: TaskLifecycleStatus;
  progress: number;
  stageLabel: string | null;
  currentStage: string | null;
  updatedAt: string;
  message: string;
}

export interface VideoWorkspaceTaskListResult {
  items: VideoWorkspaceTaskItem[];
  total: number;
}

export interface VideoWorkspaceTaskAdapter {
  listActiveTasks(options?: { signal?: AbortSignal }): Promise<VideoWorkspaceTaskListResult>;
}

function buildVideoTaskListUrl(status: ActiveVideoTaskStatus) {
  return `/api/v1/video/tasks?status=${status}&pageNum=${WORKSPACE_TASK_PAGE_NUM}&pageSize=${WORKSPACE_TASK_PAGE_SIZE}`;
}

function isActiveTaskStatus(status: TaskLifecycleStatus) {
  return ACTIVE_VIDEO_TASK_STATUSES.some((activeStatus) => activeStatus === status);
}

function isTaskSnapshotNotFoundError(error: unknown) {
  return (
    error != null &&
    typeof error === 'object' &&
    'status' in error &&
    Number((error as { status: unknown }).status) === 404
  );
}

function mapWorkspaceTaskItem(
  row: VideoTaskListRow,
  snapshot: TaskSnapshot,
): VideoWorkspaceTaskItem {
  return {
    taskId: row.task_id,
    title: row.summary,
    lifecycleStatus: snapshot.status,
    progress: snapshot.progress,
    stageLabel: snapshot.stageLabel ?? null,
    currentStage: snapshot.currentStage ?? null,
    updatedAt: snapshot.timestamp,
    message: snapshot.message,
  };
}

export function createRealVideoWorkspaceTaskAdapter(
  { client = fastapiClient }: RealVideoWorkspaceTaskAdapterOptions = {},
): VideoWorkspaceTaskAdapter {
  return {
    async listActiveTasks(options) {
      const [pendingResponse, processingResponse] = await Promise.all([
        client.request<VideoTaskRowsResponse>({
          url: buildVideoTaskListUrl('pending'),
          method: 'get',
          signal: options?.signal,
        }),
        client.request<VideoTaskRowsResponse>({
          url: buildVideoTaskListUrl('processing'),
          method: 'get',
          signal: options?.signal,
        }),
      ]);
      const activeRows = [...pendingResponse.data.rows, ...processingResponse.data.rows]
        .filter((row) => isActiveTaskStatus(row.status))
        .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
      const taskAdapter = resolveTaskAdapter({ module: 'video' });
      const itemResults = await Promise.all(
        activeRows.map(async (row) => {
          try {
            const snapshot = await taskAdapter.getTaskSnapshot(row.task_id);

            return mapWorkspaceTaskItem(row, snapshot);
          } catch (error) {
            if (isTaskSnapshotNotFoundError(error)) {
              return null;
            }

            throw error;
          }
        }),
      );
      const items = itemResults.filter(
        (item): item is VideoWorkspaceTaskItem => item !== null,
      );

      return {
        items,
        total: items.length,
      };
    },
  };
}

export function createMockVideoWorkspaceTaskAdapter(
  { client = fastapiClient }: RealVideoWorkspaceTaskAdapterOptions = {},
): VideoWorkspaceTaskAdapter {
  return createRealVideoWorkspaceTaskAdapter({ client });
}

export function resolveVideoWorkspaceTaskAdapter(
  options: ResolveVideoWorkspaceTaskAdapterOptions = {},
): VideoWorkspaceTaskAdapter {
  return pickAdapterImplementation(
    {
      mock: createMockVideoWorkspaceTaskAdapter({
        client: options.client ?? fastapiClient,
      }),
      real: createRealVideoWorkspaceTaskAdapter({
        client: options.client ?? fastapiClient,
      }),
    },
    {
      useMock: options.useMock,
    },
  );
}
