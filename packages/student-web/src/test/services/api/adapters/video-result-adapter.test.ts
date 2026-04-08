/**
 * 文件说明：验证视频结果 adapter 的路径与响应映射。
 */
import { describe, expect, it, vi } from 'vitest';

import {
  createMockVideoResultAdapter,
  createRealVideoResultAdapter,
} from '@/services/api/adapters/video-result-adapter';

describe('video result adapter', () => {
  it('real adapter requests the result detail endpoint and overlays publish state', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      status: 200,
      data: {
        code: 200,
        msg: '查询成功',
        data: {
          taskId: 'vtask_result_ready',
          status: 'completed',
          result: {
            taskId: 'vtask_result_ready',
            taskType: 'video',
            videoUrl: 'https://static.prorise.test/video.mp4',
            coverUrl: 'https://static.prorise.test/cover.jpg',
            duration: 120,
            summary: '结果摘要',
            knowledgePoints: ['勾股定理'],
            resultId: 'video_result_ready',
            completedAt: '2026-04-08T10:00:00Z',
            aiContentFlag: true,
            title: '证明勾股定理',
          },
          failure: null,
          publishState: {
            published: true,
          },
        },
      },
    });
    const adapter = createRealVideoResultAdapter({
      client: {
        request,
      } as never,
    });
    const result = await adapter.getResult('vtask_result_ready');

    expect(request.mock.calls[0]?.[0]).toMatchObject({
      url: '/api/v1/video/tasks/vtask_result_ready/result',
      method: 'get',
    });
    expect(result.result?.published).toBe(true);
  });

  it('mock adapter returns failure payloads for failed task ids', async () => {
    const adapter = createMockVideoResultAdapter();
    const result = await adapter.getResult('vtask_fail_demo');

    expect(result.status).toBe('failed');
    expect(result.result).toBeNull();
    expect(result.failure?.taskId).toBe('vtask_fail_demo');
  });
});
