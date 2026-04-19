/**
 * 文件说明：验证视频结果 adapter 的路径与响应映射。
 */
import { describe, expect, it, vi } from 'vitest';

import {
  createMockVideoResultAdapter,
  createRealVideoResultAdapter,
} from '@/services/api/adapters/video-result-adapter';

describe('video result adapter', () => {
  it('real adapter requests the result detail endpoint and reads top-level sections data', async () => {
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
          sections: [
            {
              sectionId: 'section_1',
              sectionIndex: 0,
              title: '洛必达前提',
              summary: '为什么 0/0 需要比较变化率',
              subtitleText: '第一段真实字幕',
            },
          ],
          timeline: [
            {
              sectionId: 'section_1',
              sectionIndex: 0,
              title: '洛必达前提',
              startTime: 0,
              endTime: 12,
            },
          ],
          narration: [
            {
              sectionId: 'section_1',
              sectionIndex: 0,
              text: '第一段 TTS 讲解',
            },
          ],
          publicUrl: 'https://api.prorise.test/api/v1/video/public/video_result_ready',
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
    expect(result.result?.publicUrl).toBe(
      'https://api.prorise.test/api/v1/video/public/video_result_ready',
    );
    expect(result.result?.sections?.[0]).toMatchObject({
      sectionId: 'section_1',
      subtitleText: '第一段真实字幕',
      startSeconds: 0,
      endSeconds: 12,
      narrationText: '第一段 TTS 讲解',
    });
  });

  it('public adapter requests the anonymous public detail endpoint', async () => {
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
            resultId: 'vr-vtask_result_ready',
            completedAt: '2026-04-08T10:00:00Z',
            aiContentFlag: true,
            title: '证明勾股定理',
          },
          sections: [],
          failure: null,
          publicUrl: 'https://api.prorise.test/api/v1/video/public/vr-vtask_result_ready',
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

    const result = await adapter.getPublicResult('vr-vtask_result_ready');

    expect(request.mock.calls[0]?.[0]).toMatchObject({
      url: '/api/v1/video/public/vr-vtask_result_ready',
      method: 'get',
    });
    expect(result.result?.resultId).toBe('vr-vtask_result_ready');
    expect(result.result?.published).toBe(true);
  });

  it('mock adapter returns failure payloads for failed task ids', async () => {
    const adapter = createMockVideoResultAdapter();
    const result = await adapter.getResult('vtask_fail_demo');

    expect(result.status).toBe('failed');
    expect(result.result).toBeNull();
    expect(result.failure?.taskId).toBe('vtask_fail_demo');
  });

  it('mock public adapter preserves the requested public result id', async () => {
    const adapter = createMockVideoResultAdapter();
    const result = await adapter.getPublicResult('video_public_lhopital');

    expect(result.result?.resultId).toBe('video_public_lhopital');
    expect(result.result?.publicUrl).toBe(
      'https://app.prorise.test/video/public/video_public_lhopital',
    );
    expect(result.result?.published).toBe(true);
  });
});
