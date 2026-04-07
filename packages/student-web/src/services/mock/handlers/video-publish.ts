/**
 * 文件说明：提供视频公开发布/取消/列表的 MSW handlers（Story 4.10）。
 */
import { http, HttpResponse } from 'msw';

import publishSuccessJson from '../../../../../../mocks/video/v1/publish-success.json';
import unpublishSuccessJson from '../../../../../../mocks/video/v1/unpublish-success.json';
import publishedListJson from '../../../../../../mocks/video/v1/published-list.json';

/** 视频公开发布 mock handlers 列表。 */
export const videoPublishHandlers = [
  /* ── 公开发布 ── */
  http.post('*/api/v1/video/tasks/:taskId/publish', ({ params }) => {
    const taskId = String(params.taskId);
    const response = structuredClone(publishSuccessJson);

    (response.data as Record<string, unknown>).taskId = taskId;

    return HttpResponse.json(response, { status: 200 });
  }),

  /* ── 取消公开 ── */
  http.delete('*/api/v1/video/tasks/:taskId/publish', ({ params }) => {
    const taskId = String(params.taskId);
    const response = structuredClone(unpublishSuccessJson);

    (response.data as Record<string, unknown>).taskId = taskId;

    return HttpResponse.json(response, { status: 200 });
  }),

  /* ── 公开结果列表 ── */
  http.get('*/api/v1/video/published', () => {
    return HttpResponse.json(publishedListJson, { status: 200 });
  }),
];
