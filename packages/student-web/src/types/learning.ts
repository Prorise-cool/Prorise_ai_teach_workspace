/**
 * 文件说明：Learning Coach / Learning Center 领域类型（Epic 8/9）。
 * Epic 8 先覆盖 Learning Coach：entry、checkpoint、quiz、path。
 */

export const LEARNING_COACH_SOURCE_TYPE_VALUES = [
  'video',
  'classroom',
  'companion',
  'quiz',
  'knowledge',
  'learning',
  'manual',
] as const;

export type LearningCoachSourceType =
  (typeof LEARNING_COACH_SOURCE_TYPE_VALUES)[number];

export interface LearningCoachSource {
  sourceType: LearningCoachSourceType;
  sourceSessionId: string;
  sourceTaskId?: string | null;
  sourceResultId?: string | null;
  returnTo?: string | null;
  topicHint?: string | null;
}

export interface LearningCoachCapabilities {
  checkpoint: { enabled: boolean; questionCount: number };
  quiz: { enabled: boolean; questionCount: number };
  path: { enabled: boolean };
}

export interface LearningCoachEntryPayload {
  source: LearningCoachSource;
  capabilities: LearningCoachCapabilities;
  knowledgePoints: string[];
}

export interface LearningCoachOption {
  optionId: string;
  label: string;
  text: string;
}

export interface LearningCoachQuestion {
  questionId: string;
  questionType: 'single_choice';
  tag?: string | null;
  stem: string;
  options: LearningCoachOption[];
}

export interface LearningCoachAnswer {
  questionId: string;
  optionId: string;
}

export type LearningCoachGenerationSource = 'llm' | 'fallback';

export interface CoachAskMessage {
  role: 'user' | 'coach';
  content: string;
}

export interface CoachAskRequest {
  quizId?: string | null;
  checkpointId?: string | null;
  questionId: string;
  questionStem: string;
  questionOptions: string[];
  userMessage: string;
  history: CoachAskMessage[];
}

export interface CoachAskPayload {
  reply: string;
  generationSource: LearningCoachGenerationSource;
}

export interface CheckpointGeneratePayload {
  checkpointId: string;
  source: LearningCoachSource;
  questionTotal: number;
  questions: LearningCoachQuestion[];
  expiresInSeconds: number;
  generationSource?: LearningCoachGenerationSource;
}

export interface LearningCoachJudgeItem {
  questionId: string;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  explanation: string;
}

export interface CheckpointSubmitPayload {
  checkpointId: string;
  questionTotal: number;
  correctTotal: number;
  passed: boolean;
  items: LearningCoachJudgeItem[];
}

export interface QuizGeneratePayload {
  quizId: string;
  source: LearningCoachSource;
  questionTotal: number;
  questions: LearningCoachQuestion[];
  expiresInSeconds: number;
  generationSource?: LearningCoachGenerationSource;
}

export interface QuizSubmitPayload {
  quizId: string;
  questionTotal: number;
  correctTotal: number;
  score: number;
  summary: string;
  items: LearningCoachJudgeItem[];
  persisted: boolean;
}

export interface QuizHistoryItem {
  questionId: string;
  stem: string;
  options: LearningCoachOption[];
  selectedOptionId?: string | null;
  correctOptionId?: string | null;
  isCorrect: boolean;
  explanation?: string | null;
}

export interface QuizHistoryPayload {
  quizId: string;
  source?: LearningCoachSourceType | null;
  questionTotal: number;
  correctTotal: number;
  score: number;
  summary?: string | null;
  items: QuizHistoryItem[];
  occurredAt?: string | null;
}

export interface LearningPathStep {
  title: string;
  action: string;
  estimatedMinutes?: number | null;
}

export interface LearningPathStage {
  title: string;
  goal: string;
  steps: LearningPathStep[];
}

export interface LearningPathPlanPayload {
  pathId: string;
  source: LearningCoachSource;
  pathTitle: string;
  pathSummary: string;
  versionNo: number;
  stages: LearningPathStage[];
  generationSource?: LearningCoachGenerationSource;
}

export interface LearningPathPlanRequest {
  source: LearningCoachSource;
  goal: string;
  cycleDays: number;
}

export interface LearningPathSavePayload {
  pathId: string;
  versionNo: number;
  persisted: boolean;
  persistedAt?: string | null;
}
