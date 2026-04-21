/**
 * 文件说明：Learning Coach Checkpoint / Quiz 页面刷新恢复快照（Epic 8）。
 * - 使用 sessionStorage：只保证当前浏览器会话内刷新恢复，不作为长期承接。
 */
import type { LearningCoachJudgeItem, LearningCoachQuestion, LearningCoachSource } from '@/types/learning';

export type AssessmentMode = 'checkpoint' | 'quiz';

export type AssessmentState = {
  assessmentId: string;
  questionTotal: number;
  questions: LearningCoachQuestion[];
  source: LearningCoachSource;
  expiresAt?: number | null;
};

export type SubmitState = {
  questionTotal: number;
  correctTotal: number;
  passed?: boolean;
  score?: number;
  summary?: string;
  persisted?: boolean;
  items: LearningCoachJudgeItem[];
};

export type PersistedAssessmentSnapshot = {
  assessment: AssessmentState;
  answers: Record<string, string>;
  currentIndex: number;
  submitState: SubmitState | null;
};

export function readAssessmentQuestionCount(mode: AssessmentMode, searchParams: URLSearchParams) {
  const raw = searchParams.get('questionCount');
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    if (mode === 'checkpoint') return Math.min(Math.max(parsed, 1), 3);
    return Math.min(Math.max(parsed, 1), 50);
  }
  return mode === 'checkpoint' ? 2 : 20;
}

export function buildAssessmentStorageKey(params: {
  mode: AssessmentMode;
  sessionId: string;
  questionCount: number;
  source: LearningCoachSource;
}) {
  const safeSessionId = encodeURIComponent(params.sessionId);
  const safeTopicHint = encodeURIComponent(params.source.topicHint ?? '');

  return `xm-learning-assessment:${params.mode}:${safeSessionId}:${params.source.sourceType}:q${params.questionCount}:${safeTopicHint}`;
}

export function readPersistedAssessmentSnapshot(storageKey: string) {
  if (typeof window === 'undefined') return null;

  const rawValue = window.sessionStorage.getItem(storageKey);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as PersistedAssessmentSnapshot;
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

export function writePersistedAssessmentSnapshot(storageKey: string, snapshot: PersistedAssessmentSnapshot) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    // 忽略存储失败（浏览器禁用存储/容量不足等）。
  }
}

export function clearPersistedAssessmentSnapshot(storageKey: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(storageKey);
}

