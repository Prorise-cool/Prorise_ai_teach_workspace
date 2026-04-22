/**
 * 文件说明：Learning Coach mock fixtures（Epic 8）。
 * 读取 `_bmad-output` 冻结的 mocks/learning/v1 JSON，用于 adapter mock 与 MSW handlers。
 */
import type { TaskDataEnvelope } from '@/types/task';
import type {
  CheckpointGeneratePayload,
  CheckpointSubmitPayload,
  LearningCoachEntryPayload,
  LearningPathPlanPayload,
  LearningPathSavePayload,
  QuizGeneratePayload,
  QuizHistoryPayload,
  QuizSubmitPayload,
} from '@/types/learning';

import checkpointGenerateSuccess from '../../../../../../mocks/learning/v1/checkpoint.generate-success.json';
import checkpointSubmitSuccess from '../../../../../../mocks/learning/v1/checkpoint.submit-success.json';
import entryVideo from '../../../../../../mocks/learning/v1/entry.video.json';
import pathPlanSuccess from '../../../../../../mocks/learning/v1/path.plan-success.json';
import pathSaveSuccess from '../../../../../../mocks/learning/v1/path.save-success.json';
import quizGenerateSuccess from '../../../../../../mocks/learning/v1/quiz.generate-success.json';
import quizSubmitSuccess from '../../../../../../mocks/learning/v1/quiz.submit-success.json';

export const learningCoachMockFixtures = {
  entry: {
    video: entryVideo as TaskDataEnvelope<LearningCoachEntryPayload>,
  },
  checkpoint: {
    generateSuccess: checkpointGenerateSuccess as TaskDataEnvelope<CheckpointGeneratePayload>,
    submitSuccess: checkpointSubmitSuccess as TaskDataEnvelope<CheckpointSubmitPayload>,
  },
  quiz: {
    generateSuccess: quizGenerateSuccess as TaskDataEnvelope<QuizGeneratePayload>,
    submitSuccess: quizSubmitSuccess as TaskDataEnvelope<QuizSubmitPayload>,
    historySuccess: ({ quizId }: { quizId: string }): QuizHistoryPayload => ({
      quizId,
      source: 'video',
      questionTotal: 2,
      correctTotal: 1,
      score: 50,
      summary: '再巩固一下链式法则的外层求导步骤即可。',
      occurredAt: '2026-04-20T09:30:00Z',
      items: [
        {
          questionId: 'q-1',
          stem: '对 y = sin(3x) 求导，结果是？',
          options: [
            { optionId: 'A', label: 'A', text: 'cos(3x)' },
            { optionId: 'B', label: 'B', text: '3cos(3x)' },
            { optionId: 'C', label: 'C', text: '-3cos(3x)' },
            { optionId: 'D', label: 'D', text: 'sin(3x)' },
          ],
          selectedOptionId: 'B',
          correctOptionId: 'B',
          isCorrect: true,
          explanation: '链式法则：外层 cos，内层 3x 求导得 3，乘起来为 3cos(3x)。',
        },
        {
          questionId: 'q-2',
          stem: '对 y = (x^2 + 1)^3 求导，结果是？',
          options: [
            { optionId: 'A', label: 'A', text: '3(x^2 + 1)^2' },
            { optionId: 'B', label: 'B', text: '6x(x^2 + 1)^2' },
            { optionId: 'C', label: 'C', text: '2x(x^2 + 1)^3' },
            { optionId: 'D', label: 'D', text: '3(x^2 + 1)' },
          ],
          selectedOptionId: 'A',
          correctOptionId: 'B',
          isCorrect: false,
          explanation: '链式法则：外层 3(...)^2，内层 2x，乘起来为 6x(x^2+1)^2。',
        },
      ],
    }),
  },
  path: {
    planSuccess: pathPlanSuccess as TaskDataEnvelope<LearningPathPlanPayload>,
    saveSuccess: pathSaveSuccess as TaskDataEnvelope<LearningPathSavePayload>,
  },
} as const;

