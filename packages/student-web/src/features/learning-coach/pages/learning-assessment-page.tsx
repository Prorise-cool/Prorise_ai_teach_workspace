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
 * 视觉基准：Ux/.../10-Checkpoint 与 Quiz 页/03-quiz.html（checkpoint 复用同一视觉骨架）。
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  BookmarkPlus,
  ClipboardCheck,
  HelpCircle,
  Lightbulb,
  PanelRight,
  PlayCircle,
  Send,
  Check,
  X,
  Zap,
} from 'lucide-react';

import { AppBrand } from '@/components/brand/app-brand';
import { UserAvatarMenu } from '@/components/navigation/user-avatar-menu';
import { RichBlock, RichInline } from '@/components/rich-content';
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

import { buildLearningCoachSource, buildLearningCoachSourceSearchParams } from '../utils/source';
import { FallbackBanner } from './fallback-banner';

type AssessmentMode = 'checkpoint' | 'quiz';

type AssessmentState = {
  assessmentId: string;
  questionTotal: number;
  questions: LearningCoachQuestion[];
  source: LearningCoachSource;
  expiresAt?: number | null;
  generationSource?: LearningCoachGenerationSource;
};

type SubmitState = {
  questionTotal: number;
  correctTotal: number;
  passed?: boolean;
  score?: number;
  summary?: string;
  persisted?: boolean;
  items: LearningCoachJudgeItem[];
};

type PersistedAssessmentSnapshot = {
  assessment: AssessmentState;
  answers: Record<string, string>;
  currentIndex: number;
  submitState: SubmitState | null;
};

function readQuestionCount(mode: AssessmentMode, searchParams: URLSearchParams) {
  const raw = searchParams.get('questionCount');
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    if (mode === 'checkpoint') return Math.min(Math.max(parsed, 1), 3);
    return Math.min(Math.max(parsed, 1), 50);
  }
  return mode === 'checkpoint' ? 2 : 20;
}

function buildAnswerGridButtonClass(params: {
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

function resolveJudgeByQuestionId(items: LearningCoachJudgeItem[]) {
  const map = new Map<string, LearningCoachJudgeItem>();
  for (const item of items) map.set(item.questionId, item);
  return map;
}

function buildAssessmentStorageKey(params: {
  mode: AssessmentMode;
  sessionId: string;
  questionCount: number;
  source: LearningCoachSource;
}) {
  const safeSessionId = encodeURIComponent(params.sessionId);
  const safeTopicHint = encodeURIComponent(params.source.topicHint ?? '');

  return `xm-learning-assessment:${params.mode}:${safeSessionId}:${params.source.sourceType}:q${params.questionCount}:${safeTopicHint}`;
}

function readPersistedAssessmentSnapshot(storageKey: string) {
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

function writePersistedAssessmentSnapshot(storageKey: string, snapshot: PersistedAssessmentSnapshot) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    // 忽略存储失败（浏览器禁用存储/容量不足等）。
  }
}

function clearPersistedAssessmentSnapshot(storageKey: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(storageKey);
}

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
        history: coachMessages,  // 不含刚加的这条 user 消息，后端 prompt 里再拼上
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
  const goNext = () => setCurrentIndex((idx) => Math.min((assessment?.questions?.length ?? 1) - 1, idx + 1));

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
        {/* 左侧答题卡 */}
        <aside className="hidden lg:flex flex-col w-[260px] h-full shrink-0 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-[24px] shadow-sm p-5 transition-all">
          <div className="flex justify-between items-center mb-5 shrink-0">
            <h3 className="font-black text-[16px] text-text-primary dark:text-text-primary-dark tracking-tight">答题卡</h3>
            <span className="text-[12px] font-bold text-text-secondary dark:text-text-secondary-dark bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark px-2.5 py-1 rounded-md shadow-sm">
              {Math.min(currentIndex + 1, totalCount)} / {totalCount || '--'}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-5 text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark border-b border-bordercolor-light dark:border-bordercolor-dark pb-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-success shadow-sm" />
              正确
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-error shadow-sm" />
              错误
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark" />
              未答
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll pr-2 mb-4">
            <div className="grid grid-cols-5 gap-2">
              {(assessment?.questions ?? []).map((question, idx) => {
                const judge = judgeByQuestionId.get(question.questionId);
                const selected = answers[question.questionId];
                const status: 'unanswered' | 'correct' | 'wrong' =
                  submitState && judge
                    ? judge.isCorrect
                      ? 'correct'
                      : 'wrong'
                    : selected
                      ? 'unanswered'
                      : 'unanswered';

                return (
                  <button
                    key={question.questionId}
                    type="button"
                    className={buildAnswerGridButtonClass({
                      status,
                      active: idx === currentIndex,
                    })}
                    onClick={() => setCurrentIndex(idx)}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!assessment || submitting || answeredCount === 0}
            className="w-full shrink-0 bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark font-bold text-[13px] py-3 rounded-xl hover:opacity-90 btn-transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" /> {submitting ? '提交中...' : mode === 'checkpoint' ? '提交热身' : '提交答卷'}
          </button>
        </aside>

        {/* 中间答题区 */}
        <main className="flex-1 h-full overflow-y-auto custom-scroll flex flex-col relative px-1 md:px-2">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark uppercase tracking-widest shadow-sm">
                {pageTitle}
              </div>
              <span className="lg:hidden px-3 py-1.5 rounded-lg bg-brand/10 dark:bg-brand/5 border border-brand/20 dark:border-brand/10 text-[11px] font-bold text-text-primary dark:text-brand shadow-sm">
                第 {Math.min(currentIndex + 1, totalCount)} / {totalCount || '--'} 题
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={exitTo}
                onClick={() => clearPersistedAssessmentSnapshot(storageKey)}
                className="px-3 py-1.5 rounded-lg border border-bordercolor-light dark:border-bordercolor-dark bg-surface-light dark:bg-surface-dark text-[12px] font-bold text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark btn-transition shadow-sm"
              >
                退出测验
              </Link>
            </div>
          </div>

          {submitState ? (
            <div className="mb-4 rounded-2xl border border-bordercolor-light dark:border-bordercolor-dark bg-secondary/30 dark:bg-bg-dark/60 px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[13px] font-bold text-text-primary dark:text-text-primary-dark">
                  {mode === 'checkpoint'
                    ? submitState.passed
                      ? `热身通过：${submitState.correctTotal}/${submitState.questionTotal}`
                      : `需要补强：${submitState.correctTotal}/${submitState.questionTotal}`
                    : `得分：${submitState.score ?? 0}（${submitState.correctTotal}/${submitState.questionTotal}）`}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearPersistedAssessmentSnapshot(storageKey);
                      const backTo = source.returnTo?.trim();
                      if (backTo) {
                        void navigate(backTo);
                        return;
                      }
                      void navigate('/learning');
                    }}
                    className="px-3 py-1.5 rounded-full border border-bordercolor-light dark:border-bordercolor-dark bg-surface-light dark:bg-surface-dark text-[12px] font-bold text-text-primary dark:text-text-primary-dark hover:bg-secondary dark:hover:bg-secondary transition-colors"
                  >
                    返回
                  </button>
                  {mode === 'checkpoint' ? (
                    <button
                      type="button"
                      onClick={() => {
                        clearPersistedAssessmentSnapshot(storageKey);
                        const next = buildLearningCoachSourceSearchParams(source);
                        void navigate(`/quiz/${encodeURIComponent(sessionId)}?${next.toString()}`);
                      }}
                      className="px-3 py-1.5 rounded-full bg-text-primary dark:bg-text-primary-dark text-[12px] font-bold text-bg-light dark:text-bg-dark hover:opacity-90 transition-opacity"
                    >
                      进入正式 Quiz
                    </button>
                  ) : null}
                </div>
              </div>
              {mode === 'quiz' && submitState.summary ? (
                <p className="mt-2 text-[12px] leading-relaxed text-text-secondary dark:text-text-secondary-dark">
                  {submitState.summary}
                </p>
              ) : null}
            </div>
          ) : null}

          {assessment?.generationSource === 'fallback' ? <FallbackBanner mode={mode} /> : null}

          <div
            id="question-content-container"
            className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-[24px] shadow-sm flex flex-col w-full question-transition relative overflow-hidden shrink-0"
          >
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-brand/5 rounded-full blur-[60px] pointer-events-none" />

            <div className="p-6 md:p-8 lg:p-10 relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-2.5 py-1.5 rounded-md shadow-sm uppercase tracking-wider">
                    单选题
                  </span>
                  <span className="text-[12px] font-bold text-text-secondary dark:text-text-secondary-dark">
                    考点：{currentQuestion?.tag ?? '—'}
                  </span>
                </div>
                <span className="text-[12px] font-bold text-brand-dark dark:text-brand bg-brand/10 dark:bg-brand/5 px-2.5 py-1 rounded-md">
                  已作答 {answeredCount} / {totalCount || '--'}
                </span>
              </div>

              <div className="text-[17px] md:text-[19px] font-bold mb-8 leading-relaxed text-text-primary dark:text-text-primary-dark">
                <RichBlock content={currentQuestion?.stem ?? ''} placeholder="题目加载中..." />
              </div>

              <div className="flex flex-col gap-3 md:gap-4 mb-10">
                {(currentQuestion?.options ?? []).map((opt) => {
                  const selectedId = currentQuestion ? answers[currentQuestion.questionId] : undefined;
                  const judge = currentQuestion ? judgeByQuestionId.get(currentQuestion.questionId) : undefined;
                  const submitted = Boolean(submitState && judge);
                  const isSelected = selectedId === opt.optionId;
                  const isCorrect = submitted && judge?.correctOptionId === opt.optionId;
                  const isWrongSelected = submitted && isSelected && !isCorrect;

                  if (isWrongSelected) {
                    return (
                      <button
                        key={opt.optionId}
                        type="button"
                        className="p-4 md:p-5 rounded-[16px] border border-error/30 dark:border-error/20 bg-error/10 dark:bg-error/20 flex items-center justify-between shadow-sm transition-all cursor-pointer"
                        onClick={() => handleSelectOption(currentQuestion!.questionId, opt.optionId)}
                      >
                        <div className="flex items-center gap-4 text-error">
                          <span className="w-8 h-8 rounded-lg bg-white dark:bg-secondary border border-error/30 dark:border-error/20 flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                            {opt.label}
                          </span>
                          <RichInline content={opt.text} className="font-mono text-[15px] md:text-[16px] font-bold" />
                        </div>
                        <X className="w-5 h-5 text-error shrink-0" />
                      </button>
                    );
                  }

                  if (isCorrect) {
                    return (
                      <button
                        key={opt.optionId}
                        type="button"
                        className="p-4 md:p-5 rounded-[16px] border-2 border-success bg-success/10 dark:bg-success/20 flex items-center justify-between shadow-sm transition-all cursor-pointer"
                        onClick={() => handleSelectOption(currentQuestion!.questionId, opt.optionId)}
                      >
                        <div className="flex items-center gap-4 text-success">
                          <span className="w-8 h-8 rounded-lg bg-success text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                            {opt.label}
                          </span>
                          <RichInline content={opt.text} className="font-mono text-[15px] md:text-[16px] font-bold" />
                        </div>
                        <Check className="w-6 h-6 text-success stroke-[3] shrink-0" />
                      </button>
                    );
                  }

                  return (
                    <button
                      key={opt.optionId}
                      type="button"
                      className={[
                        'p-4 md:p-5 rounded-[16px] border border-bordercolor-light dark:border-bordercolor-dark bg-secondary/30 dark:bg-bg-dark/50 flex items-center gap-4 text-text-secondary dark:text-text-secondary-dark transition-all cursor-pointer',
                        submitted ? 'opacity-70 hover:opacity-100 hover:border-text-primary dark:hover:border-text-primary-dark' : '',
                        !submitted && isSelected ? 'border-text-primary dark:border-text-primary-dark text-text-primary dark:text-text-primary-dark' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        if (currentQuestion) handleSelectOption(currentQuestion.questionId, opt.optionId);
                      }}
                    >
                      <span className="w-8 h-8 rounded-lg bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                        {opt.label}
                      </span>
                      <RichInline content={opt.text} className="font-mono text-[15px] md:text-[16px]" />
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[20px] border border-bordercolor-light dark:border-bordercolor-dark bg-secondary/60 dark:bg-bg-dark p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-black flex items-center gap-2 text-[15px] text-text-primary dark:text-text-primary-dark">
                    <div className="w-7 h-7 rounded-full bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center shadow-sm">
                      <Lightbulb className="w-4 h-4 text-brand-dark dark:text-brand" />
                    </div>
                    智能解析
                  </h4>
                  <button
                    type="button"
                    className="text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark border border-bordercolor-light dark:border-bordercolor-dark bg-surface-light dark:bg-surface-dark px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:text-text-primary dark:hover:text-text-primary-dark btn-transition shadow-sm"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" /> 收入错题本
                  </button>
                </div>
                <div className="text-[14px] text-text-primary/90 dark:text-text-primary-dark/90 leading-relaxed font-medium">
                  {submitState && currentQuestion ? (
                    <RichBlock
                      content={judgeByQuestionId.get(currentQuestion.questionId)?.explanation ?? '暂无解析'}
                      placeholder=""
                      className="leading-relaxed"
                    />
                  ) : (
                    <p className="leading-relaxed text-text-secondary dark:text-text-secondary-dark">
                      完成作答并提交后，将展示逐题解析与总结建议。
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-bordercolor-light dark:border-bordercolor-dark flex justify-between items-center">
                <button
                  type="button"
                  onClick={goPrev}
                  className="px-4 py-2.5 rounded-xl border border-bordercolor-light dark:border-bordercolor-dark bg-secondary dark:bg-bg-dark text-[13px] font-bold text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark btn-transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  disabled={currentIndex <= 0}
                >
                  <ArrowLeft className="w-4 h-4" /> 上一题
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark rounded-xl px-6 py-2.5 font-bold text-[14px] hover:opacity-90 flex items-center gap-2 btn-transition shadow-md btn-hover-scale disabled:opacity-50"
                  disabled={!assessment || currentIndex >= (assessment.questions.length ?? 1) - 1}
                >
                  下一题 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="h-6 shrink-0" />
        </main>

        <div id="mobile-overlay" className={overlayClassName} onClick={toggleSidebar} />

        <aside id="companion-wrapper" className={sidebarWrapperClassName}>
          <div className="w-[320px] sm:w-[380px] h-full bg-surface-light dark:bg-surface-dark border-l xl:border border-bordercolor-light dark:border-bordercolor-dark xl:rounded-[28px] shadow-2xl xl:shadow-sm flex flex-col relative">
            <div className="px-5 py-4 border-b border-bordercolor-light/50 dark:border-bordercolor-dark/50 flex justify-between items-center bg-transparent shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand/20 dark:bg-brand/10 flex items-center justify-center bot-breath">
                  <Bot className="w-5 h-5 text-brand-dark dark:text-brand" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-[15px] text-text-primary dark:text-text-primary-dark leading-tight">
                    Learning Coach
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary dark:text-text-secondary-dark">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" /> {mode === 'checkpoint' ? '热身辅导中' : '测验辅导中'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-2 rounded-lg text-text-secondary hover:bg-secondary dark:hover:bg-secondary xl:hidden btn-transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-4 bg-secondary/20 dark:bg-bg-dark/20">
              {coachMessages.map((msg, idx) => (
                msg.role === 'coach' ? (
                  <div key={idx} className="flex flex-col items-start w-full">
                    <div className="flex items-center gap-2 mb-1.5 ml-1">
                      <span className="text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark">Coach</span>
                    </div>
                    <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-[14px] text-text-primary dark:text-text-primary-dark px-4 py-3.5 rounded-[4px_20px_20px_20px] max-w-[92%] leading-relaxed shadow-sm font-medium">
                      <RichBlock content={msg.content} placeholder="" />
                    </div>
                  </div>
                ) : (
                  <div key={idx} className="flex flex-col items-end w-full">
                    <div className="flex items-center gap-2 mb-1.5 mr-1">
                      <span className="text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark">You</span>
                    </div>
                    <div className="bg-brand/90 dark:bg-brand text-surface-light text-[14px] px-4 py-3.5 rounded-[20px_4px_20px_20px] max-w-[92%] leading-relaxed shadow-sm font-medium whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                )
              ))}
              {coachAsking ? (
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center gap-2 mb-1.5 ml-1">
                    <span className="text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark">Coach</span>
                  </div>
                  <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-[13px] text-text-secondary dark:text-text-secondary-dark px-4 py-3 rounded-[4px_20px_20px_20px] leading-relaxed shadow-sm italic">
                    思考中...
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-4 bg-surface-light dark:bg-surface-dark border-t border-bordercolor-light/50 dark:border-bordercolor-dark/50 shrink-0">
              <div className="flex flex-col gap-2 mb-3">
                <button
                  type="button"
                  disabled={coachAsking || !currentQuestion}
                  onClick={() => void sendCoach('帮我逐步拆解这道题的解题思路，但不要直接给出答案。')}
                  className="text-[12px] font-bold bg-secondary/50 dark:bg-secondary/50 border border-bordercolor-light dark:border-bordercolor-dark px-3 py-2.5 rounded-xl text-left hover:border-brand text-text-primary dark:text-text-primary-dark transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <HelpCircle className="w-4 h-4 text-brand" /> 先给我拆题思路
                </button>
                <button
                  type="button"
                  onClick={handleReplayVideo}
                  className="text-[12px] font-bold bg-secondary/50 dark:bg-secondary/50 border border-bordercolor-light dark:border-bordercolor-dark px-3 py-2.5 rounded-xl text-left hover:border-brand text-text-primary dark:text-text-primary-dark transition-colors flex items-center gap-2 shadow-sm"
                >
                  <PlayCircle className="w-4 h-4 text-agent-efficient" /> 回看相关视频片段
                </button>
              </div>

              <div className="bg-secondary/40 dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-xl focus-within:ring-2 focus-within:ring-brand/50 focus-within:border-brand transition-all relative shadow-sm">
                <textarea
                  className="w-full resize-none bg-transparent outline-none p-3 text-[14px] text-text-primary dark:text-text-primary-dark placeholder:text-text-secondary/50 dark:placeholder:text-text-secondary-dark/50 leading-relaxed custom-scroll disabled:opacity-60"
                  rows={2}
                  placeholder="或者直接问我问题..."
                  value={coachDraft}
                  maxLength={300}
                  disabled={coachAsking}
                  onChange={(e) => setCoachDraft(e.target.value.slice(0, 300))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendCoach(coachDraft);
                    }
                  }}
                />
                <div className="flex justify-between items-center px-3 pb-2 pt-1">
                  <span className="text-[11px] font-medium text-text-secondary/50 font-mono">{coachDraft.length} / 300</span>
                  <button
                    type="button"
                    disabled={coachAsking || !coachDraft.trim()}
                    onClick={() => void sendCoach(coachDraft)}
                    className="w-8 h-8 rounded-full bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark flex items-center justify-center hover:bg-brand active:scale-95 transition-all shadow-md btn-hover-scale disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ArrowRight className="w-4 h-4 rotate-[-90deg]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <SurfaceDock activeTooltip={dockTooltip} activeIcon={DockIcon} />
    </div>
  );
}

