/**
 * 文件说明：Learning assessment 页面纯函数助手（wave-1.5 polish：从 page 文件拆出，降低主文件行数）。
 */
import type {
  LearningCoachJudgeItem,
  LearningCoachQuestion,
  LearningCoachSource,
} from '@/types/learning';

export type AssessmentMode = 'checkpoint' | 'quiz';

export type AssessmentState = {
  assessmentId: string;
  questionTotal: number;
  questions: LearningCoachQuestion[];
  source: LearningCoachSource;
  expiresAt?: number | null;
  generationSource?: import('@/types/learning').LearningCoachGenerationSource;
};

export type AssessmentSubmitState = {
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
  submitState: AssessmentSubmitState | null;
};

export function readQuestionCount(mode: AssessmentMode, searchParams: URLSearchParams) {
  const raw = searchParams.get('questionCount');
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    if (mode === 'checkpoint') return Math.min(Math.max(parsed, 1), 3);
    return Math.min(Math.max(parsed, 1), 50);
  }
  return mode === 'checkpoint' ? 2 : 20;
}

export function buildAnswerGridButtonClass(params: {
  status: 'unanswered' | 'correct' | 'wrong';
  active: boolean;
}) {
  const { status, active } = params;
  let classes =
    'w-full aspect-square rounded-lg font-bold text-[13px] flex items-center justify-center shadow-sm btn-hover-scale transition-all duration-300 ';

  if (status === 'correct') {
    classes += 'bg-success text-white';
  } else if (status === 'wrong') {
    classes += 'bg-error text-white';
  } else {
    classes +=
      'bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:border-text-primary dark:hover:border-text-primary-dark';
  }

  if (active) {
    classes +=
      ' ring-2 ring-text-primary dark:ring-text-primary-dark ring-offset-2 ring-offset-surface-light dark:ring-offset-surface-dark';
  }

  return classes.trim();
}

export function resolveJudgeByQuestionId(items: LearningCoachJudgeItem[]) {
  const map = new Map<string, LearningCoachJudgeItem>();
  for (const item of items) map.set(item.questionId, item);
  return map;
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

export function writePersistedAssessmentSnapshot(
  storageKey: string,
  snapshot: PersistedAssessmentSnapshot,
) {
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
