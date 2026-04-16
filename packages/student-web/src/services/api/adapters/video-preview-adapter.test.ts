/**
 * 文件说明：验证视频等待页 preview adapter 的路径与 mock 推断。
 */
import { describe, expect, it, vi } from 'vitest';

import {
	VideoPreviewAdapterError,
	createMockVideoPreviewAdapter,
	createRealVideoPreviewAdapter,
} from '@/services/api/adapters/video-preview-adapter';
import { ApiClientError } from '@/services/api/client';

describe('video preview adapter', () => {
  it('real adapter targets the preview endpoint', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      status: 200,
      data: {
        code: 200,
        msg: '查询成功',
        data: {
          taskId: 'vtask_preview_ready',
          status: 'processing',
          previewAvailable: true,
          previewVersion: 2,
          summary: '预览摘要',
          knowledgePoints: ['极限'],
          totalSections: 3,
          readySections: 1,
          failedSections: 0,
          sections: [],
          updatedAt: '2026-04-16T10:00:00Z',
        },
      },
    });
    const adapter = createRealVideoPreviewAdapter({
      client: {
        request,
      } as never,
    });
    const result = await adapter.getPreview('vtask_preview_ready');

    expect(request.mock.calls[0]?.[0]).toMatchObject({
      url: '/api/v1/video/tasks/vtask_preview_ready/preview',
      method: 'get',
    });
    expect(result.previewVersion).toBe(2);
  });

  it('mock adapter infers fix scenario from task id', async () => {
    const adapter = createMockVideoPreviewAdapter();
    const result = await adapter.getPreview('vtask_fix_preview_demo');

    expect(result.sections.some((section) => section.status === 'fixing')).toBe(true);
  });

  it('maps api client failures to adapter errors', async () => {
    const adapter = createRealVideoPreviewAdapter({
      client: {
        request: vi.fn().mockRejectedValue(
          new ApiClientError(500, 'request failed', {
            code: 'VIDEO_PREVIEW_DOWN',
            msg: 'preview unavailable',
          }),
        ),
      } as never,
    });

    await expect(adapter.getPreview('vtask_preview_failed')).rejects.toEqual(
      expect.objectContaining<Partial<VideoPreviewAdapterError>>({
        status: 500,
        code: 'VIDEO_PREVIEW_DOWN',
        message: 'preview unavailable',
      }),
    );
  });
});
