import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { resolveLearningCoachAdapter } from '@/services/api/adapters/learning-coach-adapter';
import type { LearningCoachJudgeItem, LearningCoachSource } from '@/types/learning';

import {
  type AssessmentMode,
  type AssessmentState,
  type SubmitState,
  buildAssessmentStorageKey,
  clearPersistedAssessmentSnapshot,
  readAssessmentQuestionCount,
  readPersistedAssessmentSnapshot,
  writePersistedAssessmentSnapshot,
} from '../utils/assessment-snapshot';
import { buildLearningCoachSource, buildLearningCoachSourceSearchParams } from '../utils/source';

function resolveJudgeByQuestionId(items: LearningCoachJudgeItem[]) {
  const map = new Map<string, LearningCoachJudgeItem>();
  for (const item of items) map.set(item.questionId, item);
  return map;
}

function normalizeReturnTo(value: LearningCoachSource['returnTo']) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function useLearningAssessment({ mode }: { mode: AssessmentMode }) {
  const navigate = useNavigate();
  const params = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = params.sessionId ?? '';

  const source = useMemo(
    () => buildLearningCoachSource({ sessionId, searchParams, fallbackSourceType: 'video' }),
    [searchParams, sessionId],
  );
  const adapter = useMemo(() => resolveLearningCoachAdapter(), []);
  const questionCount = useMemo(() => readAssessmentQuestionCount(mode, searchParams), [mode, searchParams]);
  const storageKey = useMemo(
    () => buildAssessmentStorageKey({ mode, sessionId, questionCount, source }),
    [mode, questionCount, sessionId, source],
  );

  const [sidebarCollapsedDesktop, setSidebarCollapsedDesktop] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const [assessment, setAssessment] = useState<AssessmentState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState | null>(null);

  const toggleSidebar = () => {
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1280;
    if (isDesktop) {
      setSidebarCollapsedDesktop((current) => !current);
      return;
    }
    setSidebarMobileOpen((current) => !current);
  };

  useEffect(() => {
    const handler = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth >= 1280) {
        setSidebarMobileOpen(false);
        setSidebarCollapsedDesktop(false);
      }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAssessment(null);
    setSubmitState(null);
    setAnswers({});
    setCurrentIndex(0);

    const run = async () => {
      if (!sessionId) return;

      const restored = readPersistedAssessmentSnapshot(storageKey);
      if (restored?.assessment?.assessmentId) {
        const expiredAt = restored.assessment.expiresAt ?? null;
        if (!expiredAt || Date.now() <= expiredAt) {
          if (!cancelled) {
            setAssessment(restored.assessment);
            setAnswers(restored.answers ?? {});
            setCurrentIndex(restored.currentIndex ?? 0);
            setSubmitState(restored.submitState ?? null);
          }
          return;
        }
      }

      clearPersistedAssessmentSnapshot(storageKey);

      if (mode === 'checkpoint') {
        const payload = await adapter.generateCheckpoint({
          source,
          questionCount,
        });
        if (!cancelled) {
          setAssessment({
            assessmentId: payload.checkpointId,
            questionTotal: payload.questionTotal,
            questions: payload.questions,
            source: payload.source,
            expiresAt: Date.now() + payload.expiresInSeconds * 1000,
          });
        }
        return;
      }

      const payload = await adapter.generateQuiz({
        source,
        questionCount,
      });
      if (!cancelled) {
        setAssessment({
          assessmentId: payload.quizId,
          questionTotal: payload.questionTotal,
          questions: payload.questions,
          source: payload.source,
          expiresAt: Date.now() + payload.expiresInSeconds * 1000,
        });
      }
    };

    void run().catch(() => {
      if (!cancelled) setAssessment(null);
    });

    return () => {
      cancelled = true;
    };
  }, [adapter, mode, questionCount, sessionId, source, storageKey]);

  useEffect(() => {
    if (!assessment) return;

    writePersistedAssessmentSnapshot(storageKey, {
      assessment,
      answers,
      currentIndex,
      submitState,
    });
  }, [answers, assessment, currentIndex, storageKey, submitState]);

  const judgeByQuestionId = useMemo(
    () => resolveJudgeByQuestionId(submitState?.items ?? []),
    [submitState?.items],
  );

  const currentQuestion = assessment?.questions?.[currentIndex] ?? null;
  const answeredCount = Object.keys(answers).length;
  const totalCount = assessment?.questionTotal ?? 0;

  const exitTo = useMemo(() => {
    const params = buildLearningCoachSourceSearchParams(source);
    return `/coach/${encodeURIComponent(sessionId)}?${params.toString()}`;
  }, [sessionId, source]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = async () => {
    if (!assessment || submitting) return;
    setSubmitting(true);
    try {
      const answerList = assessment.questions
        .map((q) => {
          const optionId = answers[q.questionId];
          return optionId ? { questionId: q.questionId, optionId } : null;
        })
        .filter(Boolean) as { questionId: string; optionId: string }[];

      if (mode === 'checkpoint') {
        const payload = await adapter.submitCheckpoint({
          checkpointId: assessment.assessmentId,
          answers: answerList,
        });
        setSubmitState({
          questionTotal: payload.questionTotal,
          correctTotal: payload.correctTotal,
          passed: payload.passed,
          items: payload.items,
        });
        return;
      }

      const payload = await adapter.submitQuiz({
        quizId: assessment.assessmentId,
        answers: answerList,
      });
      setSubmitState({
        questionTotal: payload.questionTotal,
        correctTotal: payload.correctTotal,
        score: payload.score,
        summary: payload.summary,
        persisted: payload.persisted,
        items: payload.items,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const goPrev = () => setCurrentIndex((idx) => Math.max(0, idx - 1));
  const goNext = () => setCurrentIndex((idx) => Math.min((assessment?.questions?.length ?? 1) - 1, idx + 1));

  const overlayClassName = `fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] xl:hidden transition-opacity ${sidebarMobileOpen ? '' : 'hidden'}`;
  const sidebarWrapperClassName = [
    'absolute right-0 max-xl:fixed max-xl:inset-y-0 z-[60] w-[320px] sm:w-[380px] translate-x-full xl:translate-x-0 xl:relative xl:z-20 xl:w-[380px] xl:opacity-100 transition-all duration-300 ease-in-out shrink-0 overflow-hidden h-full',
    sidebarMobileOpen ? 'translate-x-0' : '',
    sidebarCollapsedDesktop ? 'xl:w-0 xl:ml-0 xl:opacity-0' : 'xl:ml-6',
  ]
    .filter(Boolean)
    .join(' ');

  const clearSnapshot = () => clearPersistedAssessmentSnapshot(storageKey);

  const handleReturn = () => {
    clearSnapshot();
    const backTo = normalizeReturnTo(source.returnTo);
    void navigate(backTo || '/video/input');
  };

  const handleEnterQuiz = () => {
    clearSnapshot();
    const next = buildLearningCoachSourceSearchParams(source);
    void navigate(`/quiz/${encodeURIComponent(sessionId)}?${next.toString()}`);
  };

  return {
    mode,
    sessionId,
    source,
    questionCount,
    assessment,
    currentIndex,
    setCurrentIndex,
    answers,
    submitting,
    submitState,
    judgeByQuestionId,
    currentQuestion,
    answeredCount,
    totalCount,
    exitTo,
    handleSelectOption,
    handleSubmit,
    goPrev,
    goNext,
    clearSnapshot,
    handleReturn,
    handleEnterQuiz,
    toggleSidebar,
    overlayClassName,
    sidebarWrapperClassName,
  };
}

