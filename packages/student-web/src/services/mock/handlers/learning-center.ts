/**
 * 文件说明：学习中心聚合与记录操作 MSW handlers（Epic 9）。
 */
import { http, HttpResponse } from 'msw';

import { learningCenterMockFixtures } from '@/services/mock/fixtures/learning-center';

export const learningCenterHandlers = [
  http.get('*/xiaomai/learning-center/learning', () => {
    return HttpResponse.json(learningCenterMockFixtures.learning.success, {
      status: 200,
    });
  }),
  http.get('*/xiaomai/learning-center/history', () => {
    return HttpResponse.json(learningCenterMockFixtures.history.success, {
      status: 200,
    });
  }),
  http.get('*/xiaomai/learning-center/favorites', () => {
    return HttpResponse.json(learningCenterMockFixtures.favorites.success, {
      status: 200,
    });
  }),
  http.post('*/xiaomai/learning-center/favorite', () => {
    return HttpResponse.json(
      { code: 200, msg: '操作成功', data: null },
      { status: 200 },
    );
  }),
  http.post('*/xiaomai/learning-center/favorite/cancel', () => {
    return HttpResponse.json(
      { code: 200, msg: '操作成功', data: null },
      { status: 200 },
    );
  }),
  http.post('*/xiaomai/learning-center/history/remove', () => {
    return HttpResponse.json(
      { code: 200, msg: '操作成功', data: null },
      { status: 200 },
    );
  }),
];

