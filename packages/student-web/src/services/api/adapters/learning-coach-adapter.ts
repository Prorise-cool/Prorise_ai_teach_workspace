/**
 * 文件说明：Learning Coach mock / real adapter（Epic 8）。
 * 对齐 FastAPI `/api/v1/learning-coach/*` 端点，与冻结的 mocks/learning/v1 保持一致。
 */
import type { ApiClient } from '@/services/api/client';
import { fastapiClient } from '@/services/api/fastapi-client';
import { learningCoachMockFixtures } from '@/services/mock/fixtures/learning-coach';
import type { TaskDataEnvelope } from '@/types/task';
import type {
  CheckpointGeneratePayload,
  CheckpointSubmitPayload,
  CoachAskPayload,
  CoachAskRequest,
  LearningCoachEntryPayload,
  LearningCoachSource,
  LearningPathPlanPayload,
  LearningPathPlanRequest,
  LearningPathSavePayload,
  QuizGeneratePayload,
  QuizHistoryPayload,
  QuizSubmitPayload,
} from '@/types/learning';

import { pickAdapterImplementation } from './base-adapter';

type ResolveLearningCoachAdapterOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

type LearningCoachEntryQuery = {
  source: LearningCoachSource;
};

type CheckpointGenerateRequest = {
  source: LearningCoachSource;
  questionCount: number;
};

type CheckpointSubmitRequest = {
  checkpointId: string;
  answers: { questionId: string; optionId: string }[];
};

type QuizGenerateRequest = {
  source: LearningCoachSource;
  questionCount: number;
};

type QuizSubmitRequest = {
  quizId: string;
  answers: { questionId: string; optionId: string }[];
};

type QuizHistoryQuery = {
  quizId: string;
};

type LearningPathSaveRequest = {
  path: LearningPathPlanPayload;
};

export interface LearningCoachAdapter {
  getEntry(query: LearningCoachEntryQuery): Promise<LearningCoachEntryPayload>;
  generateCheckpoint(request: CheckpointGenerateRequest): Promise<CheckpointGeneratePayload>;
  submitCheckpoint(request: CheckpointSubmitRequest): Promise<CheckpointSubmitPayload>;
  generateQuiz(request: QuizGenerateRequest): Promise<QuizGeneratePayload>;
  submitQuiz(request: QuizSubmitRequest): Promise<QuizSubmitPayload>;
  getQuizHistory(query: QuizHistoryQuery): Promise<QuizHistoryPayload>;
  planPath(request: LearningPathPlanRequest): Promise<LearningPathPlanPayload>;
  savePath(request: LearningPathSaveRequest): Promise<LearningPathSavePayload>;
  coachAsk(request: CoachAskRequest): Promise<CoachAskPayload>;
}

function toQueryString(source: LearningCoachSource) {
  const url = new URL('http://xiaomai.local');
  url.searchParams.set('source_type', source.sourceType);
  url.searchParams.set('source_session_id', source.sourceSessionId);
  if (source.sourceTaskId) url.searchParams.set('source_task_id', String(source.sourceTaskId));
  if (source.sourceResultId) url.searchParams.set('source_result_id', String(source.sourceResultId));
  if (source.returnTo) url.searchParams.set('return_to', String(source.returnTo));
  if (source.topicHint) url.searchParams.set('topic_hint', String(source.topicHint));
  return url.search;
}

export function createRealLearningCoachAdapter(
  { client = fastapiClient }: { client?: ApiClient } = {},
): LearningCoachAdapter {
  return {
    async getEntry({ source }) {
      const response = await client.request<TaskDataEnvelope<LearningCoachEntryPayload>>({
        url: `/api/v1/learning-coach/entry${toQueryString(source)}`,
        method: 'get',
      });
      return response.data.data;
    },
    async generateCheckpoint(request) {
      const response = await client.request<TaskDataEnvelope<CheckpointGeneratePayload>>({
        url: '/api/v1/learning-coach/checkpoint/generate',
        method: 'post',
        data: request,
      });
      return response.data.data;
    },
    async submitCheckpoint(request) {
      const response = await client.request<TaskDataEnvelope<CheckpointSubmitPayload>>({
        url: '/api/v1/learning-coach/checkpoint/submit',
        method: 'post',
        data: request,
      });
      return response.data.data;
    },
    async generateQuiz(request) {
      const response = await client.request<TaskDataEnvelope<QuizGeneratePayload>>({
        url: '/api/v1/learning-coach/quiz/generate',
        method: 'post',
        data: request,
      });
      return response.data.data;
    },
    async submitQuiz(request) {
      const response = await client.request<TaskDataEnvelope<QuizSubmitPayload>>({
        url: '/api/v1/learning-coach/quiz/submit',
        method: 'post',
        data: request,
      });
      return response.data.data;
    },
    async getQuizHistory({ quizId }) {
      const response = await client.request<TaskDataEnvelope<QuizHistoryPayload>>({
        url: `/api/v1/learning-coach/quiz/history/${encodeURIComponent(quizId)}`,
        method: 'get',
      });
      return response.data.data;
    },
    async planPath(request) {
      const response = await client.request<TaskDataEnvelope<LearningPathPlanPayload>>({
        url: '/api/v1/learning-coach/path/plan',
        method: 'post',
        data: request,
      });
      return response.data.data;
    },
    async savePath(request) {
      const response = await client.request<TaskDataEnvelope<LearningPathSavePayload>>({
        url: '/api/v1/learning-coach/path/save',
        method: 'post',
        data: request,
      });
      return response.data.data;
    },
    async coachAsk(request) {
      const response = await client.request<TaskDataEnvelope<CoachAskPayload>>({
        url: '/api/v1/learning-coach/coach-ask',
        method: 'post',
        data: request,
      });
      return response.data.data;
    },
  };
}

export function createMockLearningCoachAdapter(): LearningCoachAdapter {
  return {
    getEntry() {
      return Promise.resolve(learningCoachMockFixtures.entry.video.data);
    },
    generateCheckpoint() {
      return Promise.resolve(learningCoachMockFixtures.checkpoint.generateSuccess.data);
    },
    submitCheckpoint() {
      return Promise.resolve(learningCoachMockFixtures.checkpoint.submitSuccess.data);
    },
    generateQuiz() {
      return Promise.resolve(learningCoachMockFixtures.quiz.generateSuccess.data);
    },
    submitQuiz() {
      return Promise.resolve(learningCoachMockFixtures.quiz.submitSuccess.data);
    },
    getQuizHistory({ quizId }) {
      return Promise.resolve(learningCoachMockFixtures.quiz.historySuccess({ quizId }));
    },
    planPath() {
      return Promise.resolve(learningCoachMockFixtures.path.planSuccess.data);
    },
    savePath() {
      return Promise.resolve(learningCoachMockFixtures.path.saveSuccess.data);
    },
    coachAsk(request) {
      // mock：简单回复包含题目 id，便于前端调试切换
      return Promise.resolve({
        reply: `（Mock）收到「${request.userMessage}」。题目 ${request.questionId} 的解题思路：先看已知条件，再匹配选项。`,
        generationSource: 'fallback' as const,
      });
    },
  };
}

export function resolveLearningCoachAdapter(
  options: ResolveLearningCoachAdapterOptions = {},
): LearningCoachAdapter {
  const real = createRealLearningCoachAdapter({ client: options.client });
  const mock = createMockLearningCoachAdapter();

  return pickAdapterImplementation(
    {
      real,
      mock,
    },
    options,
  );
}
