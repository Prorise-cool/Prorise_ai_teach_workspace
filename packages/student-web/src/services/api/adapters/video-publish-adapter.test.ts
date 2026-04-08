/**
 * 文件说明：验证视频公开 adapter 的路径与返回映射。
 */
import { describe, expect, it, vi } from 'vitest';

import {
  createMockVideoPublishAdapter,
  createRealVideoPublishAdapter,
} from '@/services/api/adapters/video-publish-adapter';

describe('video publish adapter', () => {
  it('real adapter targets the publish endpoint for publish and unpublish', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        data: {
          code: 200,
          msg: '公开发布成功',
          data: {
            taskId: 'vtask_publish_ready',
            published: true,
          },
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          code: 200,
          msg: '取消公开成功',
          data: {
            taskId: 'vtask_publish_ready',
            published: false,
          },
        },
      });
    const adapter = createRealVideoPublishAdapter({
      client: {
        request,
      } as never,
    });

    await adapter.publish('vtask_publish_ready');
    await adapter.unpublish('vtask_publish_ready');

    expect(request.mock.calls[0]?.[0]).toMatchObject({
      url: '/api/v1/video/tasks/vtask_publish_ready/publish',
      method: 'post',
    });
    expect(request.mock.calls[1]?.[0]).toMatchObject({
      url: '/api/v1/video/tasks/vtask_publish_ready/publish',
      method: 'delete',
    });
  });

  it('mock adapter returns stable publish state flags', async () => {
    const adapter = createMockVideoPublishAdapter();

    await expect(adapter.publish('vtask_publish_ready')).resolves.toMatchObject({
      taskId: 'vtask_publish_ready',
      published: true,
    });
    await expect(adapter.unpublish('vtask_publish_ready')).resolves.toMatchObject({
      taskId: 'vtask_publish_ready',
      published: false,
    });
  });
});
