/**
 * 文件说明：Learning Coach MSW handlers（Epic 8）。
 */
import { http, HttpResponse } from 'msw';

import { learningCoachMockFixtures } from '@/services/mock/fixtures/learning-coach';

export const learningCoachHandlers = [
  http.get('*/api/v1/learning-coach/entry', () =>
    HttpResponse.json(learningCoachMockFixtures.entry.video, { status: 200 })
  ),
  http.post('*/api/v1/learning-coach/checkpoint/generate', () =>
    HttpResponse.json(learningCoachMockFixtures.checkpoint.generateSuccess, { status: 200 })
  ),
  http.post('*/api/v1/learning-coach/checkpoint/submit', () =>
    HttpResponse.json(learningCoachMockFixtures.checkpoint.submitSuccess, { status: 200 })
  ),
  http.post('*/api/v1/learning-coach/quiz/generate', () =>
    HttpResponse.json(learningCoachMockFixtures.quiz.generateSuccess, { status: 200 })
  ),
  http.post('*/api/v1/learning-coach/quiz/submit', () =>
    HttpResponse.json(learningCoachMockFixtures.quiz.submitSuccess, { status: 200 })
  ),
  http.post('*/api/v1/learning-coach/path/plan', () =>
    HttpResponse.json(learningCoachMockFixtures.path.planSuccess, { status: 200 })
  ),
  http.post('*/api/v1/learning-coach/path/save', () =>
    HttpResponse.json(learningCoachMockFixtures.path.saveSuccess, { status: 200 })
  ),
];

