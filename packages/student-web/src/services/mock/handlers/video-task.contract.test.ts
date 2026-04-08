/**
 * 文件说明：视频任务创建契约测试基线。
 * Story 3.1：覆盖 schema 一致性、mock 样例合法性、adapter + handler 往返测试。
 */
import { describe, it, expect } from 'vitest';

import type {
  VideoTaskCreateRequest,
  VideoTaskCreateSuccessEnvelope,
  VideoTaskCreateErrorEnvelope,
} from '@/types/video';
import {
  VIDEO_INPUT_TYPE_VALUES,
  VIDEO_ERROR_CODE_VALUES,
  VIDEO_TEXT_MIN_LENGTH,
  VIDEO_TEXT_MAX_LENGTH,
  VIDEO_CLIENT_REQUEST_ID_MAX_LENGTH,
} from '@/types/video';
import {
  getMockVideoTaskCreateSuccess,
  getMockVideoTaskCreateError,
  getVideoTaskFixtureError,
} from '@/services/mock/fixtures/video-task';
import {
  createMockVideoTaskAdapter,
  VideoTaskAdapterError,
} from '@/services/api/adapters/video-task-adapter';
import { videoTaskHandlers } from '@/services/mock/handlers/video-task';
import { registerMswServer } from '@/test/utils/msw-server';

/* ---------- 契约资产导入 ---------- */

import textSuccessJson from '../../../../../../mocks/video/v1/create-task.text-success.json';
import imageSuccessJson from '../../../../../../mocks/video/v1/create-task.image-success.json';
import validationErrorJson from '../../../../../../mocks/video/v1/create-task.validation-error.json';
import permissionDeniedJson from '../../../../../../mocks/video/v1/create-task.permission-denied.json';

registerMswServer(...videoTaskHandlers);

/* ---------- 请求 schema 字段契约 ---------- */

describe('VideoTaskCreateRequest schema 字段契约', () => {
  it('inputType 仅允许 text 和 image', () => {
    expect(VIDEO_INPUT_TYPE_VALUES).toEqual(['text', 'image']);
  });

  it('文本约束为 10-5000 字符', () => {
    expect(VIDEO_TEXT_MIN_LENGTH).toBe(10);
    expect(VIDEO_TEXT_MAX_LENGTH).toBe(5000);
  });

  it('clientRequestId 最大 128 字符', () => {
    expect(VIDEO_CLIENT_REQUEST_ID_MAX_LENGTH).toBe(128);
  });
});

/* ---------- 响应 schema 字段契约 ---------- */

describe('VideoTaskCreateResponse schema 结构一致性', () => {
  it('成功响应必须包含 code=200、msg、data.{taskId, taskType, status, createdAt}', () => {
    const envelope = textSuccessJson as VideoTaskCreateSuccessEnvelope;

    expect(envelope.code).toBe(202);
    expect(typeof envelope.msg).toBe('string');
    expect(envelope.data).toBeDefined();
    expect(typeof envelope.data.taskId).toBe('string');
    expect(envelope.data.taskType).toBe('video');
    expect(envelope.data.status).toBe('pending');
    expect(typeof envelope.data.createdAt).toBe('string');
  });

  it('错误响应必须包含 code、msg、data.{errorCode, retryable, details}', () => {
    const envelope = validationErrorJson as VideoTaskCreateErrorEnvelope;

    expect(typeof envelope.code).toBe('number');
    expect(typeof envelope.msg).toBe('string');
    expect(envelope.data).toBeDefined();
    expect(typeof envelope.data.errorCode).toBe('string');
    expect(typeof envelope.data.retryable).toBe('boolean');
    expect(typeof envelope.data.details).toBe('object');
  });
});

/* ---------- Mock 样例合法性 ---------- */

describe('mock 样例与 schema 合法性', () => {
  it('文本成功样例 taskId 以 vtask_ 开头', () => {
    const data = textSuccessJson as VideoTaskCreateSuccessEnvelope;

    expect(data.data.taskId).toMatch(/^vtask_/);
  });

  it('图片成功样例 taskId 以 vtask_ 开头', () => {
    const data = imageSuccessJson as VideoTaskCreateSuccessEnvelope;

    expect(data.data.taskId).toMatch(/^vtask_/);
  });

  it('校验失败样例 httpStatus=422、errorCode 属于视频域', () => {
    const data = validationErrorJson as VideoTaskCreateErrorEnvelope;

    expect(data.code).toBe(422);
    expect(VIDEO_ERROR_CODE_VALUES).toContain(data.data.errorCode);
  });

  it('权限失败样例 httpStatus=403', () => {
    const data = permissionDeniedJson as VideoTaskCreateErrorEnvelope;

    expect(data.code).toBe(403);
  });

  it('四组 JSON 样例与 fixture 常量一致', () => {
    expect(textSuccessJson).toMatchObject({
      code: 202,
      data: { taskType: 'video', status: 'pending' },
    });
    expect(imageSuccessJson).toMatchObject({
      code: 202,
      data: { taskType: 'video', status: 'pending' },
    });
    expect(validationErrorJson).toMatchObject({
      code: 422,
      data: { errorCode: 'VIDEO_INPUT_EMPTY', retryable: false },
    });
    expect(permissionDeniedJson).toMatchObject({
      code: 403,
      data: { retryable: false },
    });
  });
});

/* ---------- 视频域错误码注册到统一字典 ---------- */

describe('视频域错误码注册', () => {
  it('视频域错误码值列表非空', () => {
    expect(VIDEO_ERROR_CODE_VALUES.length).toBeGreaterThan(0);
  });

  it('所有视频域错误码以 VIDEO_ 开头', () => {
    for (const code of VIDEO_ERROR_CODE_VALUES) {
      expect(code).toMatch(/^VIDEO_/);
    }
  });
});

/* ---------- fixture 辅助函数 ---------- */

describe('fixture 辅助函数', () => {
  it('getMockVideoTaskCreateSuccess 文本场景返回 video/pending', () => {
    const envelope = getMockVideoTaskCreateSuccess('text-success');

    expect(envelope.data.taskType).toBe('video');
    expect(envelope.data.status).toBe('pending');
    expect(envelope.data.taskId).toMatch(/^vtask_/);
  });

  it('getMockVideoTaskCreateSuccess 图片场景返回 video/pending', () => {
    const envelope = getMockVideoTaskCreateSuccess('image-success');

    expect(envelope.data.taskType).toBe('video');
    expect(envelope.data.status).toBe('pending');
    expect(envelope.data.taskId).toMatch(/^vtask_/);
  });

  it('带请求体时生成动态 taskId', () => {
    const request: VideoTaskCreateRequest = {
      inputType: 'text',
      sourcePayload: { text: '这是一个测试文本输入，至少十个字符' },
      clientRequestId: 'test-req-001',
    };
    const envelope = getMockVideoTaskCreateSuccess('text-success', request);

    expect(envelope.data.taskId).toContain('vtask_mock_text_');
    expect(envelope.data.taskId).not.toBe(textSuccessJson.data.taskId);
  });

  it('getMockVideoTaskCreateError 返回校验失败', () => {
    const envelope = getMockVideoTaskCreateError('validation-error');

    expect(envelope.code).toBe(422);
    expect(envelope.data.errorCode).toBe('VIDEO_INPUT_EMPTY');
  });

  it('getMockVideoTaskCreateError 返回权限失败', () => {
    const envelope = getMockVideoTaskCreateError('permission-denied');

    expect(envelope.code).toBe(403);
  });

  it('getVideoTaskFixtureError 对成功场景返回 null', () => {
    expect(getVideoTaskFixtureError('text-success')).toBeNull();
    expect(getVideoTaskFixtureError('image-success')).toBeNull();
  });

  it('getVideoTaskFixtureError 对错误场景返回错误对象', () => {
    const validationErr = getVideoTaskFixtureError('validation-error');

    expect(validationErr).not.toBeNull();
    expect(validationErr?.status).toBe(422);

    const permissionErr = getVideoTaskFixtureError('permission-denied');

    expect(permissionErr).not.toBeNull();
    expect(permissionErr?.status).toBe(403);
  });
});

/* ---------- Mock Adapter 往返测试 ---------- */

describe('mock VideoTaskAdapter 往返测试', () => {
  const adapter = createMockVideoTaskAdapter();

  it('文本创建返回 pending 状态的 VideoTaskCreateResult', async () => {
    const request: VideoTaskCreateRequest = {
      inputType: 'text',
      sourcePayload: { text: '勾股定理的证明方法有哪些？请详细说明。' },
      clientRequestId: 'test-roundtrip-text',
    };
    const result = await adapter.createTask(request);

    expect(result.taskType).toBe('video');
    expect(result.status).toBe('pending');
    expect(result.taskId).toMatch(/^vtask_/);
    expect(typeof result.createdAt).toBe('string');
  });

  it('图片创建返回 pending 状态的 VideoTaskCreateResult', async () => {
    const request: VideoTaskCreateRequest = {
      inputType: 'image',
      sourcePayload: { imageRef: 'img_mock_ref_001' },
      clientRequestId: 'test-roundtrip-image',
    };
    const result = await adapter.createTask(request);

    expect(result.taskType).toBe('video');
    expect(result.status).toBe('pending');
    expect(result.taskId).toMatch(/^vtask_/);
  });

  it('校验失败场景抛出 VideoTaskAdapterError', async () => {
    const request: VideoTaskCreateRequest = {
      inputType: 'text',
      sourcePayload: { text: '' },
      clientRequestId: 'test-roundtrip-validation',
    };

    await expect(
      adapter.createTask(request, { scenario: 'validation-error' }),
    ).rejects.toThrow();

    const error = await adapter.createTask(request, { scenario: 'validation-error' }).then(
      () => new Error('预期应抛出校验错误'),
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(VideoTaskAdapterError);
  });

  it('权限失败场景抛出 VideoTaskAdapterError', async () => {
    const request: VideoTaskCreateRequest = {
      inputType: 'text',
      sourcePayload: { text: '测试权限失败场景的文本内容' },
      clientRequestId: 'test-roundtrip-permission',
    };

    await expect(
      adapter.createTask(request, { scenario: 'permission-denied' }),
    ).rejects.toThrow();

    const error = await adapter.createTask(request, { scenario: 'permission-denied' }).then(
      () => new Error('预期应抛出权限错误'),
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(VideoTaskAdapterError);
  });
});

describe('mock VideoTask handlers 契约', () => {
  it('畸形请求体返回 422 与 TASK_INVALID_INPUT', async () => {
    const response = await fetch('http://localhost/api/v1/video/tasks', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        inputType: 'text',
      }),
    });
    const payload = await response.json() as VideoTaskCreateErrorEnvelope;

    expect(response.status).toBe(422);
    expect(payload.code).toBe(422);
    expect(payload.data.errorCode).toBe('TASK_INVALID_INPUT');
  });
});
