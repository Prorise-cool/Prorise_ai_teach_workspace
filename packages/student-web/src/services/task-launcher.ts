/**
 * 文件说明：封装视频 / 课堂输入壳的任务创建预览请求。
 */
import { nanoid } from 'nanoid';

import type { AgentConfigPayload } from '@/features/agent/agent-config';
import { createApiClient, isApiClientError } from '@/services/api/client';

const fastapiClient = createApiClient({
  baseURL: import.meta.env.VITE_FASTAPI_BASE_URL
});

export type TaskLaunchMode = 'video' | 'classroom';

export type TaskLaunchRequest = {
  task_id: string;
  user_id: string;
  summary: string;
  detail_ref: string;
  agent_config: AgentConfigPayload;
};

export type TaskLaunchPreviewResponse = {
  table_name: string;
  task: {
    task_id: string;
    user_id: string;
    task_type: string;
    summary: string;
  };
  ruoyi_payload: Record<string, unknown>;
};

function buildTaskPrefix(mode: TaskLaunchMode) {
  return mode === 'video' ? 'video' : 'classroom';
}

/** 生成当前会话创建请求。 */
export function createTaskLaunchRequest(
  mode: TaskLaunchMode,
  userId: string,
  summary: string,
  detailRef: string,
  agentConfig: AgentConfigPayload
): TaskLaunchRequest {
  return {
    task_id: `${buildTaskPrefix(mode)}_${nanoid(10)}`,
    user_id: userId,
    summary,
    detail_ref: detailRef,
    agent_config: agentConfig
  };
}

/** 调用 FastAPI / mock 任务创建预览接口。 */
export async function createTaskPreview(
  mode: TaskLaunchMode,
  payload: TaskLaunchRequest
) {
  const route = mode === 'video' ? '/api/v1/video/tasks' : '/api/v1/classroom/tasks';

  try {
    const response = await fastapiClient.request<TaskLaunchPreviewResponse>({
      url: route,
      method: 'post',
      data: payload
    });

    return response.data;
  } catch (error) {
    if (isApiClientError(error)) {
      throw error;
    }

    throw new Error(error instanceof Error ? error.message : '任务创建失败');
  }
}
