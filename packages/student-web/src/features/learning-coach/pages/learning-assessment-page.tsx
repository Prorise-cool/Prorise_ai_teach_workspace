/**
 * 文件说明：Learning Coach 测评视图组件（Epic 8，内部复用单元）。
 *
 * Story 8.2 要求 `/checkpoint/:sessionId` 与 `/quiz/:sessionId` 有独立的
 * 页面骨架入口。实际的 page 文件位于同目录下的 `learning-checkpoint-page.tsx`
 * 与 `learning-quiz-page.tsx`；它们各自 export 独立 Component，路由分别
 * 挂载，互不共享顶层 React 组件身份。
 *
 * 本文件只再导出共享视图 `LearningAssessmentPage`：提供 mode 参数化的
 * 题目列表 / 提交 / 回看 UI，两个 page 文件通过 `mode="checkpoint"` /
 * `mode="quiz"` 调用；后续 Story 若要让两条路径的 UI 骨架进一步分化，
 * 可以把本文件拆成独立视图，不影响路由层。
 *
 * Wave 1.5 polish：UI 分成三个 sub-components
 *   - components/learning-assessment-question-list.tsx（左侧答题卡）
 *   - components/learning-assessment-question-view.tsx（中间答题区）
 *   - components/learning-assessment-coach-panel.tsx（右侧 AI 辅导侧栏）
 *
 * 视觉基准：Ux/.../10-Checkpoint 与 Quiz 页/03-quiz.html（checkpoint 复用同一视觉骨架）。
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, PanelRight, Zap } from 'lucide-react';

import { AppBrand } from '@/components/brand/app-brand';
import { UserAvatarMenu } from '@/components/navigation/user-avatar-menu';
import { SurfaceDock } from '@/components/surface/surface-dock';
import { resolveLearningCoachAdapter } from '@/services/api/adapters/learning-coach-adapter';
import { useFeedback } from '@/shared/feedback';
import type { CoachAskMessage } from '@/types/learning';
import type {
  LearningCoachGenerationSource,
  LearningCoachJudgeItem,
  LearningCoachQuestion,
  LearningCoachSource,
} from '@/types/learning';

import { LearningAssessmentCoachPanel } from '../components/learning-assessment-coach-panel';
import { LearningAssessmentQuestionList } from '../components/learning-assessment-question-list';
import { LearningAssessmentQuestionView } from '../components/learning-assessment-question-view';
import {
  buildAnswerGridButtonClass,
  buildAssessmentStorageKey,
  clearPersistedAssessmentSnapshot,
  readPersistedAssessmentSnapshot,
  readQuestionCount,
  resolveJudgeByQuestionId,
  writePersistedAssessmentSnapshot,
  type AssessmentMode,
  type AssessmentState,
  type AssessmentSubmitState,
} from '../utils/assessment-helpers';
import { buildLearningCoachSource, buildLearningCoachSourceSearchParams } from '../utils/source';

type SubmitState = AssessmentSubmitState;

export function LearningAssessmentPage({ mode }: { mode: AssessmentMode }) {
  const navigate = useNavigate();
  const params = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = params.sessionId ?? '';

  const source = useMemo(
    () => buildLearningCoachSource({ sessionId, searchParams, fallbackSourceType: 'video' }),
    [searchParams, sessionId],
  );
  const adapter = useMemo(() => resolveLearningCoachAdapter(), []);
  const questionCount = useMemo(() => readQuestionCount(mode, searchParams), [mode, searchParams]);
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

  // Coach 对话（侧栏 AI 辅导）：消息历史、输入草稿、请求中状态
  const { notify } = useFeedback();
  const [coachMessages, setCoachMessages] = useState<CoachAskMessage[]>([]);
  const [coachDraft, setCoachDraft] = useState('');
  const [coachAsking, setCoachAsking] = useState(false);

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
            generationSource: payload.generationSource,
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
          generationSource: payload.generationSource,
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

  // 题目切换：用一条基于考点的开场白重置对话历史
  useEffect(() => {
    if (!currentQuestion) {
      setCoachMessages([]);
      return;
    }
    const opener = currentQuestion.tag
      ? `这道题考的是「${currentQuestion.tag}」。遇到思路卡住可以问我，我可以帮你拆解、给提示或回看相关知识。`
      : '遇到思路卡住可以问我。我可以帮你拆解题目、指出关键条件或回看相关知识点。';
    setCoachMessages([{ role: 'coach', content: opener }]);
    setCoachDraft('');
  }, [currentQuestion?.questionId]);

  const sendCoach = async (rawMessage: string) => {
    const userMessage = rawMessage.trim();
    if (!userMessage || !currentQuestion || coachAsking) return;
    // 先把用户消息加入界面
    const nextHistory: CoachAskMessage[] = [
      ...coachMessages,
      { role: 'user', content: userMessage },
    ];
    setCoachMessages(nextHistory);
    setCoachDraft('');
    setCoachAsking(true);
    try {
      const { reply } = await adapter.coachAsk({
        quizId: mode === 'quiz' ? assessment?.assessmentId ?? null : null,
        checkpointId: mode === 'checkpoint' ? assessment?.assessmentId ?? null : null,
        questionId: currentQuestion.questionId,
        questionStem: currentQuestion.stem,
        questionOptions: currentQuestion.options.map((o) => `${o.label}: ${o.text}`),
        userMessage,
        history: coachMessages, // 不含刚加的这条 user 消息，后端 prompt 里再拼上
      });
      setCoachMessages((prev) => [...prev, { role: 'coach', content: reply }]);
    } catch (error) {
      setCoachMessages((prev) => [
        ...prev,
        { role: 'coach', content: '抱歉刚刚出了点问题，可以换个问法再试一次？' },
      ]);
    } finally {
      setCoachAsking(false);
    }
  };

  const handleReplayVideo = () => {
    const sid = assessment?.source?.sourceSessionId || source.sourceSessionId;
    if (sid) {
      void navigate(`/video/${encodeURIComponent(sid)}`);
    } else {
      notify({ tone: 'info', title: '暂无关联视频片段' });
    }
  };

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
  const goNext = () =>
    setCurrentIndex((idx) => Math.min((assessment?.questions?.length ?? 1) - 1, idx + 1));

  const overlayClassName = `fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] xl:hidden transition-opacity ${sidebarMobileOpen ? '' : 'hidden'}`;
  const sidebarWrapperClassName = [
    'absolute right-0 max-xl:fixed max-xl:inset-y-0 z-[60] w-[320px] sm:w-[380px] translate-x-full xl:translate-x-0 xl:relative xl:z-20 xl:w-[380px] xl:opacity-100 transition-all duration-300 ease-in-out shrink-0 overflow-hidden h-full',
    sidebarMobileOpen ? 'translate-x-0' : '',
    sidebarCollapsedDesktop ? 'xl:w-0 xl:ml-0 xl:opacity-0' : 'xl:ml-6',
  ]
    .filter(Boolean)
    .join(' ');

  const pageTitle = mode === 'checkpoint' ? 'Checkpoint' : '正式 Quiz';
  const dockTooltip = mode === 'checkpoint' ? '快速热身' : '正式测验';
  const DockIcon = mode === 'checkpoint' ? Zap : ClipboardCheck;

  const handleReviewBack = () => {
    clearPersistedAssessmentSnapshot(storageKey);
    const backTo = source.returnTo?.trim();
    if (backTo) {
      void navigate(backTo);
      return;
    }
    void navigate('/learning');
  };

  const handleEnterQuiz = () => {
    clearPersistedAssessmentSnapshot(storageKey);
    const next = buildLearningCoachSourceSearchParams(source);
    void navigate(`/quiz/${encodeURIComponent(sessionId)}?${next.toString()}`);
  };

  const handleRequestStepDown = () =>
    void sendCoach('帮我逐步拆解这道题的解题思路，但不要直接给出答案。');

  return (
    <div className="h-screen w-screen overflow-hidden relative selection:bg-brand/30 selection:text-text-primary flex flex-col">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-100" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1200px] h-[400px] rounded-[100%] bg-brand/15 dark:bg-brand/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      </div>

      <header className="relative z-20 w-full max-w-[1500px] mx-auto h-[72px] px-6 flex justify-between items-center shrink-0">
        <AppBrand to="/" size="md" hideTextOnMobile />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl border border-bordercolor-light dark:border-bordercolor-dark bg-surface-light dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark shadow-sm btn-transition"
          >
            <PanelRight className="w-5 h-5" />
            <span className="text-[13px] font-bold hidden sm:block">辅导助手</span>
          </button>
          <UserAvatarMenu />
        </div>
      </header>

      <div className="relative z-20 flex-1 w-full max-w-[1500px] mx-auto flex flex-row items-stretch px-4 pb-[90px] overflow-hidden gap-6">
        <LearningAssessmentQuestionList
          mode={mode}
          questions={assessment?.questions ?? []}
          judgeByQuestionId={judgeByQuestionId}
          submitState={submitState}
          answers={answers}
          currentIndex={currentIndex}
          totalCount={totalCount}
          answeredCount={answeredCount}
          submitting={submitting}
          disabled={!assessment}
          onSelectIndex={setCurrentIndex}
          onSubmit={() => void handleSubmit()}
          buildAnswerGridButtonClass={buildAnswerGridButtonClass}
        />

        <LearningAssessmentQuestionView
          mode={mode}
          pageTitle={pageTitle}
          exitTo={exitTo}
          currentQuestion={currentQuestion}
          currentIndex={currentIndex}
          totalCount={totalCount}
          answers={answers}
          answeredCount={answeredCount}
          submitState={submitState}
          judgeByQuestionId={judgeByQuestionId}
          generationSource={assessment?.generationSource}
          canGoPrev={currentIndex > 0}
          canGoNext={!!assessment && currentIndex < (assessment.questions.length ?? 1) - 1}
          onClearPersisted={() => clearPersistedAssessmentSnapshot(storageKey)}
          onSelectOption={handleSelectOption}
          onGoPrev={goPrev}
          onGoNext={goNext}
          onReviewBack={handleReviewBack}
          onEnterQuiz={handleEnterQuiz}
        />

        <LearningAssessmentCoachPanel
          mode={mode}
          wrapperClassName={sidebarWrapperClassName}
          overlayClassName={overlayClassName}
          coachMessages={coachMessages}
          coachAsking={coachAsking}
          coachDraft={coachDraft}
          hasCurrentQuestion={!!currentQuestion}
          onToggleSidebar={toggleSidebar}
          onSendCoach={(msg) => void sendCoach(msg)}
          onDraftChange={setCoachDraft}
          onRequestStepDown={handleRequestStepDown}
          onReplayVideo={handleReplayVideo}
        />
      </div>

      <SurfaceDock activeTooltip={dockTooltip} activeIcon={DockIcon} />
    </div>
  );
}
