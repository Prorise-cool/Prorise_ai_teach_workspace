/**
 * 文件说明：视频输入页公开视频发现区的契约与 adapter 测试。
 * 覆盖 Story 3.6 当前 public 形态，以及对 Epic 4 published 形态的兼容。
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { ApiClientError, createApiClient } from '@/services/api/client';
import {
  createMockVideoPublicAdapter,
  createRealVideoPublicAdapter,
  VideoPublicAdapterError,
} from '@/services/api/adapters/video-public-adapter';
import {
  videoPublicMockFixtures,
} from '@/services/mock/fixtures/video-public';
import { videoTaskHandlers } from '@/services/mock/handlers/video-task';

import publicVideosJson from '../../../../../../mocks/video/v1/public-videos.json';
import publicVideosEmptyJson from '../../../../../../mocks/video/v1/public-videos.empty.json';
import publishedListJson from '../../../../../../mocks/video/v1/published-list.json';

const server = setupServer(...videoTaskHandlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('video public contract assets', () => {
  it('success fixture matches the shared JSON asset', () => {
    expect(publicVideosJson).toEqual(videoPublicMockFixtures.success.default);
  });

  it('empty fixture matches the shared JSON asset', () => {
    expect(publicVideosEmptyJson).toEqual(videoPublicMockFixtures.success.empty);
  });

  it('public list item contains the required minimal card fields', () => {
    const envelope = publicVideosJson;
    const firstItem = envelope.data.items[0];

    expect(envelope.code).toBe(200);
    expect(firstItem.videoId).toBe('video_public_lhopital');
    expect(typeof firstItem.sourceText).toBe('string');
    expect(typeof firstItem.duration).toBe('string');
    expect(typeof firstItem.viewCount).toBe('number');
  });
});

describe('video public adapters', () => {
  it('mock adapter returns the normalized default public list', async () => {
    const adapter = createMockVideoPublicAdapter();
    const result = await adapter.fetchPublicVideos({ page: 1, pageSize: 12, sort: 'latest' });

    expect(result.total).toBe(6);
    expect(result.items[0].videoId).toBe('video_public_lhopital');
    expect(result.items[0].sourceText).toContain('洛必达法则');
  });

  it('mock adapter empty scenario returns zero items', async () => {
    const adapter = createMockVideoPublicAdapter();
    const result = await adapter.fetchPublicVideos(
      { page: 1, pageSize: 12, sort: 'latest' },
      { scenario: 'empty' },
    );

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('mock adapter error scenario throws VideoPublicAdapterError', async () => {
    const adapter = createMockVideoPublicAdapter();

    await expect(
      adapter.fetchPublicVideos(
        { page: 1, pageSize: 12, sort: 'latest' },
        { scenario: 'error' },
      ),
    ).rejects.toBeInstanceOf(VideoPublicAdapterError);
  });

  it('real adapter consumes /api/v1/video/public through MSW', async () => {
    const adapter = createRealVideoPublicAdapter({
      client: createApiClient({ baseURL: 'http://127.0.0.1:4173' }),
    });
    const result = await adapter.fetchPublicVideos({ page: 1, pageSize: 12, sort: 'popular' });

    expect(result.items[0].videoId).toBe('video_public_fourier');
    expect(result.items[0].viewCount).toBeGreaterThan(result.items[1].viewCount);
  });

  it('real adapter falls back to /api/v1/video/published when /public is missing', async () => {
    server.use(
      http.get('*/api/v1/video/public', () =>
        HttpResponse.json(
          {
            code: 404,
            msg: 'not found',
            data: {},
          },
          { status: 404 },
        )),
    );

    const adapter = createRealVideoPublicAdapter({
      client: createApiClient({ baseURL: 'http://127.0.0.1:4173' }),
    });
    const result = await adapter.fetchPublicVideos({ page: 1, pageSize: 12, sort: 'latest' });

    expect(result.items[0].videoId).toBe('video_public_lhopital');
    expect(result.items[0].sourceText).toContain('洛必达法则');
    expect(result.items[0].summary).toContain('柯西中值定理');
  });

  it('normalizes published rows payloads with numeric duration labels', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiClientError(
          404,
          'not found',
          {
            code: 404,
            msg: 'not found',
            data: {},
          },
          {
            status: 404,
            data: {
              code: 404,
              msg: 'not found',
              data: {},
            },
            headers: new Headers(),
          },
        ),
      )
      .mockResolvedValueOnce({
        status: 200,
        data: publishedListJson,
      });
    const adapter = createRealVideoPublicAdapter({
      client: {
        request,
      } as never,
    });
    const result = await adapter.fetchPublicVideos({ page: 1, pageSize: 12, sort: 'latest' });

    expect(result.items[0]).toMatchObject({
      videoId: 'video_result_video_pipeline_api_001',
      resultId: 'video_result_video_pipeline_api_001',
      duration: '2:00',
      authorName: 'student_demo',
    });
    expect(result.total).toBe(1);
  });
});
