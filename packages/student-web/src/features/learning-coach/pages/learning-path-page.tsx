/**
 * 文件说明：Learning Coach 学习路径页（Epic 8）。
 * 视觉基准：Ux/.../11-学习路径页/01-path.html
 *
 * 说明：
 * - 高保真稿未包含显式“目标/周期”表单，本实现复用稿内“调整目标设定”按钮，通过 prompt 修改并触发重新规划；
 * - 规划成功后自动调用 save 接口并本地缓存，支持刷新恢复与再次打开态。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  LayoutTemplate,
  Leaf,
  Loader2,
  MapPin,
  Moon,
  PlaySquare,
  Sparkles,
  Sun,
} from 'lucide-react';

import { UserAvatarMenu } from '@/components/navigation/user-avatar-menu';
import { useFeedback } from '@/shared/feedback';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';
import { resolveLearningCoachAdapter } from '@/services/api/adapters/learning-coach-adapter';
import type { LearningCoachSource, LearningPathPlanPayload } from '@/types/learning';

import { buildLearningCoachSource, buildLearningCoachSourceSearchParams } from '../utils/source';

const DEFAULT_CYCLE_DAYS = 3;
const DEFAULT_GOAL = '微积分求导进阶攻坚';
const STORAGE_KEY_PREFIX = 'xm_learning_path_plan:';

const TIPS = [
  '小麦提示：学习路径生成基于您最近 3 次的学习反馈数据',
  '小麦可以精准定位您的薄弱环节并动态调整题目难度',
  '复杂的概念将自动生成交互式的专属课堂，请耐心等待',
];

function parseIntOrNull(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function readStoredPlan(pathId: string): LearningPathPlanPayload | null {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${pathId}`);
    if (!raw) return null;
    return JSON.parse(raw) as LearningPathPlanPayload;
  } catch {
    return null;
  }
}

function storePlan(plan: LearningPathPlanPayload) {
  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${plan.pathId}`, JSON.stringify(plan));
  } catch {
    // ignore
  }
}

function buildDefaultSource(searchParams: URLSearchParams): LearningCoachSource {
  const fallbackSessionId = searchParams.get('sourceSessionId') ?? 'manual_session';
  return buildLearningCoachSource({
    sessionId: fallbackSessionId,
    searchParams,
    fallbackSourceType: 'learning',
  });
}

export function LearningPathPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { notify } = useFeedback();
  const { themeMode, toggleThemeMode } = useThemeMode();
  const adapter = useMemo(() => resolveLearningCoachAdapter(), []);

  const source = useMemo(() => buildDefaultSource(searchParams), [searchParams]);
  const [activeView, setActiveView] = useState<'view-generating' | 'view-path'>('view-generating');
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<LearningPathPlanPayload | null>(null);

  const goal = useMemo(() => {
    const raw = searchParams.get('goal');
    return raw && raw.trim() ? raw.trim() : source.topicHint?.trim() || DEFAULT_GOAL;
  }, [searchParams, source.topicHint]);

  const cycleDays = useMemo(() => {
    const raw = parseIntOrNull(searchParams.get('cycleDays'));
    if (raw && raw > 0) return Math.min(raw, 365);
    return DEFAULT_CYCLE_DAYS;
  }, [searchParams]);

  const pathIdParam = searchParams.get('pathId')?.trim() || null;

  const [progressPercent, setProgressPercent] = useState(65);
  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);

  // Path 学习进度：LearningPathPlanPayload 当前 schema 不包含已完成步骤字段，
  // 刚生成的 path 统一展示 0%，第一阶段为 next，其余 locked。
  // 后续 Story 补齐 completedStepCount / completedStageCount 字段后，只需替换下列变量来源。
  const completedStageCount = 0;
  const totalStageCount = plan?.stages.length ?? 0;
  const pathCompletionPercent =
    totalStageCount > 0
      ? Math.round((completedStageCount / totalStageCount) * 100)
      : 0;

  const deriveMilestoneStatus = (index: number): 'completed' | 'next' | 'locked' => {
    if (index < completedStageCount) return 'completed';
    if (index === completedStageCount) return 'next';
    return 'locked';
  };

  const saveAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTipVisible(false);
      window.setTimeout(() => {
        setTipIndex((current) => (current + 1) % TIPS.length);
        setTipVisible(true);
      }, 520);
    }, 6000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!planning) return;

    setProgressPercent(65);
    const id = window.setInterval(() => {
      setProgressPercent((current) => {
        if (current >= 92) return current;
        return Math.min(92, current + 1);
      });
    }, 280);

    return () => window.clearInterval(id);
  }, [planning]);

  useEffect(() => {
    saveAttemptedRef.current = null;
  }, [goal, cycleDays, source.sourceSessionId]);

  useEffect(() => {
    let cancelled = false;

    const restoreOrPlan = async () => {
      if (typeof window === 'undefined') return;

      if (pathIdParam) {
        const stored = readStoredPlan(pathIdParam);
        if (stored && !cancelled) {
          setPlan(stored);
          setActiveView('view-path');
          return;
        }
      }

      setPlanning(true);
      setActiveView('view-generating');

      try {
        const payload = await adapter.planPath({
          source,
          goal,
          cycleDays,
        });

        if (cancelled) return;

        setPlan(payload);
        storePlan(payload);
        setActiveView('view-path');
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          next.set('goal', goal);
          next.set('cycleDays', String(cycleDays));
          next.set('pathId', payload.pathId);
          const sourceParams = buildLearningCoachSourceSearchParams(source);
          for (const [key, value] of sourceParams.entries()) {
            next.set(key, value);
          }
          return next;
        });
      } catch {
        if (!cancelled) {
          notify({ tone: 'error', title: '学习路径生成失败' });
        }
      } finally {
        if (!cancelled) {
          setPlanning(false);
          setProgressPercent(100);
        }
      }
    };

    void restoreOrPlan();

    return () => {
      cancelled = true;
    };
  }, [adapter, cycleDays, goal, notify, pathIdParam, setSearchParams, source]);

  useEffect(() => {
    if (!plan) return;
    if (saveAttemptedRef.current === plan.pathId) return;
    saveAttemptedRef.current = plan.pathId;

    void adapter
      .savePath({ path: plan })
      .then((result) => {
        if (result.persisted) {
          notify({ tone: 'success', title: '学习路径已保存' });
        } else {
          notify({ tone: 'error', title: '学习路径保存失败' });
        }
      })
      .catch(() => {
        notify({ tone: 'error', title: '学习路径保存失败' });
      });
  }, [adapter, notify, plan]);

  const adjustGoal = () => {
    if (typeof window === 'undefined') return;
    const nextGoal = window.prompt('请输入学习目标', goal) ?? '';
    if (!nextGoal.trim()) return;
    const nextCycleRaw = window.prompt('请输入周期（天）', String(cycleDays)) ?? '';
    const nextCycle = Number.parseInt(nextCycleRaw, 10);
    const normalizedCycle = Number.isFinite(nextCycle) && nextCycle > 0 ? Math.min(nextCycle, 365) : cycleDays;

    const next = new URLSearchParams(searchParams);
    next.set('goal', nextGoal.trim());
    next.set('cycleDays', String(normalizedCycle));
    next.delete('pathId');
    setSearchParams(next);
  };

  const enterLearningCenter = () => void navigate('/learning');

  return (
    <div className="min-h-screen flex flex-col relative overflow-y-auto custom-scroll overflow-x-hidden">
      {/* ==================== 0. 全局背景层 ==================== */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-100" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1200px] h-[400px] rounded-[100%] bg-brand/10 dark:bg-brand/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      </div>

      {/* ==================== 1. 悬浮全局导航 ==================== */}
      <header className="w-[94%] max-w-5xl mx-auto mt-6 sticky top-6 z-50 rounded-full flex justify-between items-center p-3 px-4 glass-nav border border-bordercolor-light dark:border-bordercolor-dark shadow-sm">
        <Link to="/" className="font-bold text-lg flex items-center gap-3">
          <div className="w-8 h-8 bg-text-primary dark:bg-text-primary-dark rounded-md flex items-center justify-center shadow-sm">
            <Leaf className="w-4 h-4 text-bg-light dark:text-bg-dark" />
          </div>
          <span className="tracking-tight text-text-primary dark:text-text-primary-dark hidden sm:block">XiaoMai</span>
        </Link>

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
          <Link
            to="/learning"
            className="flex items-center gap-1.5 px-6 py-1.5 text-sm font-bold rounded-full bg-surface-light text-text-primary dark:text-text-primary-dark shadow-sm btn-transition"
          >
            <BookOpen className="w-4 h-4" /> 学习中心
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          {import.meta.env.DEV ? (
            <>
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
            </>
          ) : null}

          <button
            id="themeToggle"
            type="button"
            onClick={toggleThemeMode}
            className="p-2 rounded-full border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:bg-surface-light dark:hover:bg-surface-dark btn-transition"
          >
            {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <UserAvatarMenu />
        </div>
      </header>

      <main className="w-full max-w-4xl mx-auto mt-8 md:mt-12 px-4 pb-24 relative z-10 flex-1 flex flex-col">
        {/* ==================== 视图 1：高级 Loading 态 ==================== */}
        <div
          id="view-generating"
          className={[
            'view-enter flex-1 flex flex-col items-center justify-center min-h-[60vh] w-full max-w-2xl mx-auto pt-6',
            activeView === 'view-generating' ? '' : 'view-hidden',
          ].join(' ')}
        >
          <div className="mb-12 mt-4 scale-75 md:scale-100">
            <div className="loader-wrapper" aria-label="Generating">
              <span className="loader-letter">G</span>
              <span className="loader-letter">E</span>
              <span className="loader-letter">N</span>
              <span className="loader-letter">E</span>
              <span className="loader-letter">R</span>
              <span className="loader-letter">A</span>
              <span className="loader-letter">T</span>
              <span className="loader-letter">I</span>
              <span className="loader-letter">N</span>
              <span className="loader-letter">G</span>
              <div className="loader" />
            </div>
          </div>

          <div className="w-full mb-10 px-4 md:px-0">
            <div className="flex justify-between items-end mb-4 px-1">
              <div className="flex flex-col">
                <span className="text-xl font-bold mb-1 transition-colors text-text-primary dark:text-text-primary-dark">
                  正在编排专属学习路径
                </span>
                <span className="text-sm text-text-secondary dark:text-text-secondary-dark opacity-80">
                  多智能体协同规划中，预计还需要 5 秒
                </span>
              </div>
              <span className="text-4xl font-black font-mono tracking-tighter drop-shadow-sm text-text-primary dark:text-text-primary-dark">
                {progressPercent}%
              </span>
            </div>

            <div className="h-3 w-full bg-bordercolor-light/50 dark:border-bordercolor-dark/50 rounded-full shadow-inner-soft overflow-hidden p-0.5 backdrop-blur-sm">
              <div className="progress-fill shadow-sm" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="w-full glass-panel rounded-2xl font-mono text-[13px] relative shadow-glass overflow-hidden flex flex-col h-48">
            <div className="custom-scroll flex-1 overflow-y-auto p-6 space-y-4 relative">
              <div className="space-y-4">
                <div className="log-item flex items-start gap-3 text-text-secondary dark:text-text-secondary-dark opacity-60">
                  <CheckCircle2 className="text-success mt-0.5 w-4 h-4 shrink-0" />
                  <span className="leading-relaxed">
                    读取历史测验与互动记录{' '}
                    <span className="text-[10px] ml-1.5 border border-bordercolor-light dark:border-bordercolor-dark px-1.5 py-0.5 rounded opacity-70">
                      Data Fetch
                    </span>
                  </span>
                </div>
                <div
                  className="log-item flex items-start gap-3 text-text-secondary dark:text-text-secondary-dark opacity-60"
                  style={{ animationDelay: '0.1s' }}
                >
                  <CheckCircle2 className="text-success mt-0.5 w-4 h-4 shrink-0" />
                  <span className="leading-relaxed">
                    锁定知识薄弱点：隐函数求导、链式法则{' '}
                    <span className="text-[10px] ml-1.5 border border-bordercolor-light dark:border-bordercolor-dark px-1.5 py-0.5 rounded opacity-70">
                      Analysis
                    </span>
                  </span>
                </div>
                <div
                  className="log-item flex items-start gap-3 font-medium text-text-primary dark:text-text-primary-dark"
                  style={{ animationDelay: '0.2s' }}
                >
                  <Loader2 className="animate-spin text-brand mt-0.5 w-4 h-4 shrink-0" />
                  <span className="leading-relaxed">
                    调度跨引擎资源：匹配视频与课堂任务<span className="cursor-blink" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 max-w-lg w-full">
            <Sparkles className="text-brand animate-pulse w-4 h-4 shrink-0" />
            <div className="text-sm text-text-secondary dark:text-text-secondary-dark opacity-80 font-medium overflow-hidden h-5 w-full relative">
              <div
                id="tip-text"
                className={[
                  'absolute w-full tip-transition truncate text-center',
                  tipVisible ? 'tip-visible' : 'tip-hidden',
                ].join(' ')}
              >
                {TIPS[tipIndex]}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== 视图 2：路径展示与执行态 ==================== */}
        <div
          id="view-path"
          className={['w-full flex flex-col gap-6 md:gap-8', activeView === 'view-path' ? '' : 'view-hidden'].join(' ')}
        >
          <div className="view-enter stagger-1 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center text-[10px] font-bold bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-2 py-1 rounded uppercase tracking-widest">
                    Target Path
                  </span>
                  <span className="text-xs font-bold text-text-secondary dark:text-text-secondary-dark">
                    预计完成周期：{cycleDays} 天
                  </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight mb-4 text-text-primary dark:text-text-primary-dark">
                  {plan?.pathTitle ?? goal}
                </h1>
                <p className="text-[14px] text-text-secondary dark:text-text-secondary-dark leading-relaxed max-w-2xl font-medium">
                  {plan?.pathSummary ??
                    '系统将基于你的学习反馈生成阶段性计划，并提供可执行的行动项与复盘建议。'}
                </p>
              </div>

              <div className="w-full md:w-[240px] bg-secondary/30 dark:bg-bg-dark/50 border border-bordercolor-light dark:border-bordercolor-dark rounded-xl p-5 shrink-0 flex flex-col justify-center">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-xs font-bold text-text-secondary dark:text-text-secondary-dark">总体进度</span>
                  <span className="text-lg font-black text-text-primary dark:text-text-primary-dark tracking-tight">{pathCompletionPercent}%</span>
                </div>
                <div className="w-full h-2 bg-surface-light dark:bg-surface-dark rounded-full overflow-hidden border border-bordercolor-light dark:border-bordercolor-dark shadow-inner mb-5">
                  <div className="h-full bg-text-primary dark:bg-text-primary-dark rounded-full transition-all" style={{ width: `${pathCompletionPercent}%` }} />
                </div>
                <button
                  type="button"
                  onClick={() => void adjustGoal()}
                  className="w-full bg-surface-light border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark text-[12px] font-bold py-2 rounded-lg hover:bg-secondary dark:hover:bg-bordercolor-dark hover:text-text-primary dark:hover:text-text-primary-dark btn-transition flex justify-center items-center shadow-sm"
                >
                  调整目标设定
                </button>
              </div>
            </div>
          </div>

          <div className="view-enter stagger-2 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 md:p-10 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-text-secondary dark:text-text-secondary-dark mb-8">
              Milestones
            </h3>

            <div className="flex flex-col">
              {(plan?.stages ?? []).map((stage, idx, all) => {
                const status = deriveMilestoneStatus(idx);
                const hasConnector = idx < all.length - 1;

                if (status === 'completed') {
                  return (
                    <div key={stage.title} className="flex gap-4 md:gap-6 relative">
                      <div className="flex flex-col items-center relative z-10 w-10 shrink-0">
                        <div className="w-8 h-8 rounded-full bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark flex items-center justify-center border-2 border-surface-light dark:border-surface-dark shrink-0">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                        {hasConnector ? (
                          <div className="w-[2px] flex-1 bg-text-primary dark:bg-text-primary-dark mt-1 rounded-full opacity-30" />
                        ) : null}
                      </div>

                      <div className="flex-1 pb-10">
                        <div className="opacity-60 hover:opacity-100 btn-transition">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold border border-bordercolor-light dark:border-bordercolor-dark px-1.5 py-0.5 rounded text-text-secondary dark:text-text-secondary-dark">
                              阶段 {idx + 1}
                            </span>
                            <h3 className="text-[15px] font-bold text-text-secondary dark:text-text-secondary-dark line-through decoration-text-secondary/50">
                              {stage.title}
                            </h3>
                          </div>
                          <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark mb-3 leading-relaxed max-w-2xl">
                            {stage.goal}
                          </p>
                          <a
                            href="#"
                            className="text-[12px] font-bold text-text-primary dark:text-text-primary-dark hover:underline"
                          >
                            回看记录 &rarr;
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (status === 'next') {
                  return (
                    <div key={stage.title} className="flex gap-4 md:gap-6 relative">
                      <div className="flex flex-col items-center relative z-10 w-10 shrink-0">
                        <div className="w-8 h-8 rounded-full bg-brand text-primary-foreground flex items-center justify-center border-2 border-surface-light dark:border-surface-dark shrink-0 z-10">
                          <MapPin className="w-4 h-4 fill-primary-foreground/20 stroke-[2.5]" />
                        </div>
                        {hasConnector ? (
                          <div className="w-[2px] flex-1 mt-1 timeline-dash text-bordercolor-light dark:text-bordercolor-dark opacity-80" />
                        ) : null}
                      </div>

                      <div className="flex-1 pb-10">
                        <div className="bg-secondary/40 dark:bg-secondary/40 border-2 border-brand/50 rounded-xl p-5 relative">
                          <div className="absolute top-4 right-5 text-[10px] font-black text-brand-dark dark:text-brand uppercase tracking-widest">
                            Next Action
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-bold bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-1.5 py-0.5 rounded">
                              阶段 {idx + 1}
                            </span>
                            <h3 className="text-[16px] font-black text-text-primary dark:text-text-primary-dark">
                              {stage.title}
                            </h3>
                          </div>
                          <p className="text-[14px] text-text-secondary dark:text-text-secondary-dark mb-5 leading-relaxed max-w-2xl font-medium">
                            {stage.goal}
                          </p>

                          <button
                            type="button"
                            onClick={() => void navigate('/classroom/input')}
                            className="bg-text-primary dark:bg-text-primary-dark text-bg-light dark:text-bg-dark rounded-lg px-6 py-2.5 font-bold text-[13px] hover:opacity-80 btn-transition flex items-center gap-2"
                          >
                            开始学习 <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={stage.title} className="flex gap-4 md:gap-6 relative">
                    <div className="flex flex-col items-center relative z-10 w-10 shrink-0">
                      <div className="w-8 h-8 rounded-full bg-surface-light dark:bg-surface-dark border-2 border-bordercolor-light dark:border-bordercolor-dark text-text-secondary/50 flex items-center justify-center shrink-0">
                        <div className="w-2 h-2 rounded-full bg-bordercolor-light dark:bg-bordercolor-dark" />
                      </div>
                      {hasConnector ? (
                        <div className="w-[2px] flex-1 mt-1 timeline-dash text-bordercolor-light dark:text-bordercolor-dark opacity-80" />
                      ) : null}
                    </div>

                    <div className={hasConnector ? 'flex-1 pb-10' : 'flex-1'}>
                      <div className="opacity-50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold border border-bordercolor-light dark:border-bordercolor-dark px-1.5 py-0.5 rounded text-text-secondary dark:text-text-secondary-dark">
                            阶段 {idx + 1}
                          </span>
                          <h3 className="text-[15px] font-bold text-text-secondary dark:text-text-secondary-dark">
                            {stage.title}
                          </h3>
                        </div>
                        <p className="text-[13px] text-text-secondary/80 dark:text-text-secondary-dark/80 max-w-2xl">
                          {stage.goal}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
