/**
 * 文件说明：提供视频任务创建的 mock fixture 基线。
 * Story 3.1：文本成功、图片成功、校验失败、权限失败四组样例。
 */
import type {
  VideoTaskCreateErrorEnvelope,
  VideoTaskCreateRequest,
  VideoTaskCreateSuccessEnvelope,
  VideoTaskMockScenario,
} from '@/types/video';
import { readNumber, readRecord, readString } from '@/lib/type-guards';
import { createVideoTaskAdapterError } from '@/services/api/adapters/video-task-error';

const FIXTURE_TIMESTAMP = '2026-04-06T10:30:00Z';

type VideoTaskFixtureError = {
  status: number;
  code: string;
  message: string;
};

/* ---------- 成功响应 ---------- */

/**
 * 生成带唯一后缀的 mock taskId，避免硬编码常量。
 *
 * @param suffix - taskId 后缀标识。
 * @returns vtask 格式的 mock ID。
 */
function buildMockVideoTaskId(suffix: string) {
  return `vtask_mock_${suffix}_${Date.now().toString(36)}`;
}

const textSuccessFixture: VideoTaskCreateSuccessEnvelope = {
  code: 202,
  msg: '视频任务创建成功',
  data: {
    taskId: 'vtask_01JA2B3C4D5E6F7G8H9J0KLM',
    taskType: 'video',
    status: 'pending',
    createdAt: FIXTURE_TIMESTAMP,
  },
};

const imageSuccessFixture: VideoTaskCreateSuccessEnvelope = {
  code: 202,
  msg: '视频任务创建成功',
  data: {
    taskId: 'vtask_01JA2B3C4D5E6F7G8H9JIMG1',
    taskType: 'video',
    status: 'pending',
    createdAt: FIXTURE_TIMESTAMP,
  },
};

/* ---------- 错误响应 ---------- */

const validationErrorFixture: VideoTaskCreateErrorEnvelope = {
  code: 422,
  msg: '输入内容为空，请填写后重新提交',
  data: {
    errorCode: 'VIDEO_INPUT_EMPTY',
    retryable: false,
    requestId: null,
    taskId: null,
    details: {
      field: 'sourcePayload.text',
      constraint: 'minLength',
      expected: 10,
    },
  },
};

const permissionDeniedFixture: VideoTaskCreateErrorEnvelope = {
  code: 403,
  msg: '当前账号暂无视频任务创建权限',
  data: {
    errorCode: 'AUTH_PERMISSION_DENIED',
    retryable: false,
    requestId: 'req_mock_permission_denied',
    taskId: null,
    details: {},
  },
};

/* ---------- 对外导出 ---------- */

/** 视频任务 mock fixture 集合。 */
export const videoTaskMockFixtures = {
  success: {
    text: textSuccessFixture,
    image: imageSuccessFixture,
  },
  errors: {
    validationError: {
      status: 422,
      code: 'VIDEO_INPUT_EMPTY',
      message: validationErrorFixture.msg,
    } satisfies VideoTaskFixtureError,
    permissionDenied: {
      status: 403,
      code: 'AUTH_PERMISSION_DENIED',
      message: permissionDeniedFixture.msg,
    } satisfies VideoTaskFixtureError,
  },
} as const;

/**
 * 根据 mock 场景返回创建成功的响应包。
 *
 * @param scenario - mock 场景标识。
 * @param request - 创建请求体（用于动态生成 taskId）。
 * @returns 成功响应包。
 */
export function getMockVideoTaskCreateSuccess(
  scenario: 'text-success' | 'image-success' = 'text-success',
  request?: VideoTaskCreateRequest,
): VideoTaskCreateSuccessEnvelope {
  const base =
    scenario === 'image-success'
      ? imageSuccessFixture
      : textSuccessFixture;

  if (request) {
    return {
      ...base,
      data: {
        ...base.data,
        taskId: buildMockVideoTaskId(request.inputType),
        createdAt: new Date().toISOString(),
      },
    };
  }

  return base;
}

/**
 * 根据 mock 场景返回创建失败的响应包。
 *
 * @param scenario - mock 场景标识。
 * @returns 错误响应包。
 */
export function getMockVideoTaskCreateError(
  scenario: 'validation-error' | 'permission-denied',
): VideoTaskCreateErrorEnvelope {
  if (scenario === 'permission-denied') {
    return permissionDeniedFixture;
  }

  return validationErrorFixture;
}

/**
 * 根据场景标识获取 fixture 错误信息。
 *
 * @param scenario - mock 场景。
 * @returns fixture 错误对象或 null。
 */
export function getVideoTaskFixtureError(
  scenario: VideoTaskMockScenario | undefined,
): VideoTaskFixtureError | null {
  if (scenario === 'validation-error') {
    return videoTaskMockFixtures.errors.validationError;
  }

  if (scenario === 'permission-denied') {
    return videoTaskMockFixtures.errors.permissionDenied;
  }

  return null;
}

/**
 * 将 fixture 错误对象抛出为 Error 类型。
 *
 * @param error - fixture 错误对象。
 */
export function throwVideoTaskFixtureError(
  error: VideoTaskFixtureError,
): never {
  throw createVideoTaskAdapterError(error.status, error.code, error.message);
}

/**
 * 规范化视频任务 mock 错误对象。
 *
 * @param error - 原始错误。
 * @returns 规范化后的 fixture 错误。
 */
export function normalizeMockVideoTaskError(
  error: unknown,
): VideoTaskFixtureError {
  const candidate = readRecord(error);

  if (candidate) {
    const status = readNumber(candidate.status);
    const code = readString(candidate.code);
    const message = readString(candidate.message);

    if (
      status !== undefined &&
      code !== undefined &&
      message !== undefined
    ) {
      return { status, code, message };
    }
  }

  return {
    status: 500,
    code: '500',
    message:
      error instanceof Error ? error.message : '未知视频任务 mock 错误',
  };
}
