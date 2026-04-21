/**
 * 文件说明：Learning Coach Checkpoint / Quiz 页面（Epic 8）。
 * 视觉基准：Ux/.../10-Checkpoint 与 Quiz 页/03-quiz.html（checkpoint 复用同一视觉骨架）。
 */
import { Link } from 'react-router-dom';
import { ClipboardCheck, Leaf, PanelRight, Zap } from 'lucide-react';

import { SurfaceDock } from '@/components/surface/surface-dock';

import { LearningAssessmentAnswerCard } from '../components/learning-assessment-answer-card';
import { LearningAssessmentCompanionSidebar } from '../components/learning-assessment-companion-sidebar';
import { LearningAssessmentQuestionPanel } from '../components/learning-assessment-question-panel';
import { useLearningAssessment } from '../hooks/use-learning-assessment';
import type { AssessmentMode } from '../utils/assessment-snapshot';

export function LearningAssessmentPage({ mode }: { mode: AssessmentMode }) {
  const {
    sessionId,
    source,
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
  } = useLearningAssessment({ mode });

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
        <Link to="/" className="font-bold text-lg flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 bg-text-primary dark:bg-text-primary-dark rounded-xl flex items-center justify-center shadow-sm">
            <Leaf className="w-4.5 h-4.5 text-bg-light dark:text-bg-dark" />
          </div>
          <span className="tracking-tight text-text-primary dark:text-text-primary-dark text-xl hidden sm:block">XiaoMai</span>
        </Link>

        <button
          type="button"
          onClick={toggleSidebar}
          className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl border border-bordercolor-light dark:border-bordercolor-dark bg-surface-light dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark shadow-sm btn-transition"
        >
          <PanelRight className="w-5 h-5" />
          <span className="text-[13px] font-bold hidden sm:block">辅导助手</span>
        </button>
      </header>

      <div className="relative z-20 flex-1 w-full max-w-[1500px] mx-auto flex flex-row items-stretch px-4 pb-[90px] overflow-hidden gap-6">
        <LearningAssessmentAnswerCard
          mode={mode}
          questions={assessment?.questions ?? []}
          judgeByQuestionId={judgeByQuestionId}
          answers={answers}
          submitState={submitState}
          currentIndex={currentIndex}
          totalCount={totalCount}
          answeredCount={answeredCount}
          submitting={submitting}
          onSelectIndex={setCurrentIndex}
          onSubmit={() => void handleSubmit()}
        />

        <LearningAssessmentQuestionPanel
          mode={mode}
          pageTitle={pageTitle}
          assessment={assessment}
          currentIndex={currentIndex}
          totalCount={totalCount}
          answeredCount={answeredCount}
          currentQuestion={currentQuestion}
          answers={answers}
          judgeByQuestionId={judgeByQuestionId}
          submitState={submitState}
          exitTo={exitTo}
          onExit={clearSnapshot}
          onSelectOption={handleSelectOption}
          onPrev={goPrev}
          onNext={goNext}
          onReturn={handleReturn}
          onEnterQuiz={handleEnterQuiz}
        />

        <LearningAssessmentCompanionSidebar
          mode={mode}
          overlayClassName={overlayClassName}
          sidebarWrapperClassName={sidebarWrapperClassName}
          onToggleSidebar={toggleSidebar}
        />
      </div>

      <SurfaceDock
        activeTooltip={dockTooltip}
        activeIcon={DockIcon}
        learningCenterTo={source.returnTo?.trim() || '/video/input'}
        settingsTo={null}
      />
    </div>
  );
}

export function LearningCheckpointPage() {
  return <LearningAssessmentPage mode="checkpoint" />;
}

export function LearningQuizPage() {
  return <LearningAssessmentPage mode="quiz" />;
}
