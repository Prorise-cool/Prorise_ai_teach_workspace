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
  },
  path: {
    planSuccess: pathPlanSuccess as TaskDataEnvelope<LearningPathPlanPayload>,
    saveSuccess: pathSaveSuccess as TaskDataEnvelope<LearningPathSavePayload>,
  },
} as const;

