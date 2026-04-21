/**
 * 文件说明：Learning Coach 学习路径页（Epic 8）。
 * 视觉基准：Ux/.../11-学习路径页/01-path.html
 *
 * 说明：
 * - 高保真稿未包含显式“目标/周期”表单，本实现复用稿内“调整目标设定”按钮，通过 prompt 修改并触发重新规划；
 * - 规划成功后自动调用 save 接口并本地缓存，支持刷新恢复与再次打开态。
 */
import { Link } from 'react-router-dom';
import { BookOpen, LayoutTemplate, Leaf, Moon, PlaySquare, Sun } from 'lucide-react';

import { LearningPathGeneratingView } from '../components/learning-path-generating-view';
import { LearningPathResultView } from '../components/learning-path-result-view';
import { useLearningPathPage } from '../hooks/use-learning-path-page';

export function LearningPathPage() {
  const {
    activeView,
    setActiveView,
    themeMode,
    toggleThemeMode,
    goal,
    cycleDays,
    plan,
    progressPercent,
    tipText,
    tipVisible,
    adjustGoal,
    enterLearningCenter,
    startLearning,
  } = useLearningPathPage();

  return (
    <div className="min-h-screen flex flex-col relative overflow-y-auto custom-scroll overflow-x-hidden">
      {/* ==================== 0. 全局背景层 ==================== */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-100" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1200px] h-[400px] rounded-[100%] bg-brand/10 dark:bg-brand/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      </div>

      {/* ==================== 1. 悬浮全局导航 ==================== */}
      <header className="w-[94%] max-w-5xl mx-auto mt-6 sticky top-6 z-50 rounded-full flex justify-between items-center p-3 px-4 glass-nav border border-bordercolor-light dark:border-bordercolor-dark shadow-sm">
        <a href="#" className="font-bold text-lg flex items-center gap-3">
          <div className="w-8 h-8 bg-text-primary dark:bg-text-primary-dark rounded-md flex items-center justify-center shadow-sm">
            <Leaf className="w-4 h-4 text-bg-light dark:text-bg-dark" />
          </div>
          <span className="tracking-tight text-text-primary dark:text-text-primary-dark hidden sm:block">XiaoMai</span>
        </a>

        <nav className="hidden md:flex gap-1 p-1 rounded-full bg-secondary/80 dark:bg-surface-dark/80 border border-bordercolor-light dark:border-bordercolor-dark">
          <Link
            to="/video/input"
            className="flex items-center gap-1.5 px-6 py-1.5 text-sm font-bold rounded-full text-text-secondary dark:text-text-secondary-dark hover:bg-surface-light/50 dark:hover:bg-surface-dark/50 btn-transition"
          >
            <PlaySquare className="w-4 h-4" /> 单题讲解
          </Link>
          <Link
            to="/classroom/input"
            className="flex items-center gap-1.5 px-6 py-1.5 text-sm font-bold rounded-full text-text-secondary dark:text-text-secondary-dark hover:bg-surface-light/50 dark:hover:bg-surface-dark/50 btn-transition"
          >
            <LayoutTemplate className="w-4 h-4" /> 主题课堂
          </Link>
          <button
            type="button"
            onClick={enterLearningCenter}
            className="flex items-center gap-1.5 px-6 py-1.5 text-sm font-bold rounded-full bg-surface-light text-text-primary dark:text-text-primary-dark shadow-sm btn-transition"
          >
            <BookOpen className="w-4 h-4" /> 学习中心
          </button>
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => setActiveView('view-generating')}
            className="hidden sm:block text-xs font-bold border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark px-3 py-1.5 rounded-full hover:bg-surface-light dark:hover:bg-surface-dark btn-transition"
          >
            预览：生成态
          </button>
          <button
            type="button"
            onClick={() => setActiveView('view-path')}
            className="hidden sm:block text-xs font-bold border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark px-3 py-1.5 rounded-full hover:bg-surface-light dark:hover:bg-surface-dark btn-transition"
          >
            预览：结果态
          </button>
          <div className="w-px h-5 bg-bordercolor-light dark:border-bordercolor-dark mx-1 hidden sm:block" />

          <button
            id="themeToggle"
            type="button"
            onClick={toggleThemeMode}
            className="p-2 rounded-full border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:bg-surface-light dark:hover:bg-surface-dark btn-transition"
          >
            {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            to="/settings"
            className="w-8 h-8 rounded-full border border-bordercolor-light dark:border-bordercolor-dark overflow-hidden hover:ring-2 hover:border-brand btn-transition shadow-sm shrink-0"
          >
            <img src="https://i.pravatar.cc/150?img=68" alt="User" className="w-full h-full object-cover" />
          </Link>
        </div>
      </header>

      <main className="w-full max-w-4xl mx-auto mt-8 md:mt-12 px-4 pb-24 relative z-10 flex-1 flex flex-col">
        <LearningPathGeneratingView
          active={activeView === 'view-generating'}
          progressPercent={progressPercent}
          tipText={tipText}
          tipVisible={tipVisible}
        />

        <LearningPathResultView
          active={activeView === 'view-path'}
          goal={goal}
          cycleDays={cycleDays}
          plan={plan}
          onAdjustGoal={() => void adjustGoal()}
          onStartLearning={startLearning}
        />
      </main>
    </div>
  );
}

