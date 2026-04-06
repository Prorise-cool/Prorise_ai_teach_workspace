/**
 * 文件说明：视频任务创建的 mock fixture 基线。
 * 提供 POST /api/v1/video/tasks 的 mock 成功与失败响应。
 */
import type {
  CreateVideoTaskEnvelope,
  CreateVideoTaskResult,
} from '@/types/video';

const FIXTURE_TIMESTAMP = '2026-04-06T10:00:00Z';

/**
 * 构建视频任务创建成功的 mock 响应数据。
 *
 * @param taskId - 生成的任务 ID。
 * @returns 创建结果。
 */
function buildCreateVideoTaskResult(
  taskId = 'video_task_mock_001'
): CreateVideoTaskResult {
  return {
    taskId,
    requestId: `req_${taskId}`,
    status: 'pending',
    createdAt: FIXTURE_TIMESTAMP,
  };
}

/**
 * 构建视频任务创建的标准成功信封。
 *
 * @param taskId - 生成的任务 ID。
 * @returns 创建成功信封。
 */
function buildCreateVideoTaskEnvelope(
  taskId?: string
): CreateVideoTaskEnvelope {
  return {
    code: 200,
    msg: '视频任务创建成功',
    data: buildCreateVideoTaskResult(taskId),
  };
}

export const videoMockFixtures = {
  createSuccess: buildCreateVideoTaskEnvelope(),
  errors: {
    invalidInput: {
      status: 400,
      code: 'TASK_INVALID_INPUT',
      message: '输入内容不符合要求，请检查后重试',
    },
    unauthorized: {
      status: 401,
      code: '401',
      message: '当前会话已失效，请重新登录',
    },
    forbidden: {
      status: 403,
      code: '403',
      message: '当前账号暂无视频创建权限',
    },
  },
} as const;

/**
 * 获取视频任务创建的 mock 成功信封。
 *
 * @returns 创建成功响应信封。
 */
export function getMockCreateVideoTaskEnvelope(): CreateVideoTaskEnvelope {
  return buildCreateVideoTaskEnvelope(
    `video_task_mock_${Date.now().toString(36)}`
  );
}
