/**
 * 文件说明：Learning Coach 会话后入口页（Epic 8）。
 * 视觉基准：Ux/.../10-Checkpoint 与 Quiz 页/01-entry.html
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Leaf, PanelRight, Sparkles, Zap, ClipboardCheck, Target, Layers, Map, Bot, X, ArrowRight, LayoutTemplate } from 'lucide-react';

import { UserAvatarMenu } from '@/components/navigation/user-avatar-menu';
import { SurfaceDock } from '@/components/surface/surface-dock';
import { resolveLearningCoachAdapter } from '@/services/api/adapters/learning-coach-adapter';
import type { LearningCoachEntryPayload } from '@/types/learning';

import { buildLearningCoachSource, buildLearningCoachSourceSearchParams } from '../utils/source';

export function LearningCoachEntryPage() {
  const navigate = useNavigate();
  const params = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = params.sessionId ?? '';
  const source = useMemo(
    () => buildLearningCoachSource({ sessionId, searchParams, fallbackSourceType: 'video' }),
    [searchParams, sessionId],
  );
  const adapter = useMemo(() => resolveLearningCoachAdapter(), []);

  const [entry, setEntry] = useState<LearningCoachEntryPayload | null>(null);
  const [sidebarCollapsedDesktop, setSidebarCollapsedDesktop] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void adapter
      .getEntry({ source })
      .then((payload) => {
        if (!cancelled) setEntry(payload);
      })
      .catch(() => {
        if (!cancelled) setEntry(null);
      });
    return () => {
      cancelled = true;
    };
  }, [adapter, source]);

  const checkpointCount = entry?.capabilities?.checkpoint?.questionCount ?? 2;

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

  const goCheckpoint = () => {
    const nextParams = buildLearningCoachSourceSearchParams(source);
    void navigate(`/checkpoint/${encodeURIComponent(sessionId)}?${nextParams.toString()}`);
  };

  const goQuiz = () => {
    const nextParams = buildLearningCoachSourceSearchParams(source);
    void navigate(`/quiz/${encodeURIComponent(sessionId)}?${nextParams.toString()}`);
  };

  const overlayClassName = `fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] xl:hidden transition-opacity ${sidebarMobileOpen ? '' : 'hidden'}`;

  const sidebarWrapperClassName = [
    'absolute right-0 max-xl:fixed max-xl:inset-y-0 z-[60] w-[320px] sm:w-[380px] translate-x-full xl:translate-x-0 xl:relative xl:z-20 xl:w-[380px] xl:ml-6 xl:opacity-100 transition-all duration-300 ease-in-out shrink-0 overflow-hidden h-full',
    sidebarMobileOpen ? 'translate-x-0' : '',
    sidebarCollapsedDesktop ? 'xl:w-0 xl:ml-0 xl:opacity-0' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="h-screen w-screen overflow-hidden relative selection:bg-brand/30 selection:text-text-primary flex flex-col">
      {/* 全局背景 */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-100" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1200px] h-[400px] rounded-[100%] bg-brand/15 dark:bg-brand/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      </div>

      {/* 顶部导航栏 */}
      <header className="relative z-20 w-full max-w-[1400px] mx-auto h-[72px] px-6 flex justify-between items-center shrink-0">
        <Link to="/" className="font-bold text-lg flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 bg-text-primary dark:bg-text-primary-dark rounded-xl flex items-center justify-center shadow-sm">
            <Leaf className="w-4.5 h-4.5 text-bg-light dark:text-bg-dark" />
          </div>
          <span className="tracking-tight text-text-primary dark:text-text-primary-dark text-xl">XiaoMai</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl border border-bordercolor-light dark:border-bordercolor-dark bg-surface-light dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark shadow-sm btn-transition"
          >
            <PanelRight className="w-5 h-5" />
            <span className="text-[13px] font-bold hidden sm:block">陪练助手</span>
          </button>
          <UserAvatarMenu />
        </div>
      </header>

      <div className="relative z-20 flex-1 w-full max-w-[1400px] mx-auto flex flex-row items-stretch px-4 pb-[100px] overflow-hidden">
        <main className="flex-1 h-full overflow-y-auto custom-scroll flex flex-col justify-center transition-all duration-300">
          <section className="w-full max-w-4xl mx-auto py-8 px-2 md:px-8">
            <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-[28px] p-8 md:p-12 shadow-sm relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand/10 rounded-full blur-[60px] pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-[12px] font-bold text-text-secondary dark:text-text-secondary-dark shadow-sm mb-6">
                    <Sparkles className="w-4 h-4 text-brand-dark dark:text-brand" />
                    本节知识点已解锁
                  </div>

                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-text-primary dark:text-text-primary-dark tracking-tight leading-tight">
                    巩固记忆的<br />黄金时间到了
                  </h1>
                  <p className="mt-4 text-[15px] leading-7 text-text-secondary dark:text-text-secondary-dark max-w-xl font-medium">
                    刚学完的这几分钟，是形成长期记忆最有效的时候。通过简单的练习激活大脑，右侧的 Learning Coach 将全程陪伴你完成热身。
                  </p>

                  <div className="flex flex-wrap gap-2 mt-6">
                    <span className="px-3 py-1.5 rounded-md bg-secondary/70 dark:bg-secondary text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark">
                      智能判分解析
                    </span>
                    <span className="px-3 py-1.5 rounded-md bg-secondary/70 dark:bg-secondary text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark">
                      自动生成错题本
                    </span>
                    <span className="px-3 py-1.5 rounded-md bg-secondary/70 dark:bg-secondary text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark">
                      规划下一步路径
                    </span>
                  </div>
                </div>

                <div className="w-full md:w-[280px] shrink-0 grid gap-3">
                  <button
                    type="button"
                    onClick={goCheckpoint}
                    className="w-full bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark rounded-[16px] px-6 py-4 font-bold text-[15px] hover:opacity-90 flex justify-center items-center gap-2 shadow-sm btn-hover-scale relative overflow-hidden group"
                  >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                    <Zap className="w-4 h-4 text-brand" /> 先热身 {checkpointCount} 题
                  </button>
                  <button
                    type="button"
                    onClick={goQuiz}
                    className="w-full bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark rounded-[16px] px-6 py-4 font-bold text-[14px] hover:border-text-primary dark:hover:border-text-primary-dark flex justify-center items-center gap-2 btn-transition shadow-sm"
                  >
                    <ClipboardCheck className="w-4 h-4" /> 进入正式 Quiz
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-surface-light/60 dark:bg-surface-dark/60 backdrop-blur-md border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">
                <div className="w-8 h-8 rounded-full bg-secondary dark:bg-bg-dark flex items-center justify-center mb-4">
                  <Target className="w-4 h-4 text-text-secondary dark:text-text-secondary-dark" />
                </div>
                <div className="text-lg font-black text-text-primary dark:text-text-primary-dark">快速热身</div>
                <p className="mt-1 text-[13px] leading-relaxed text-text-secondary dark:text-text-secondary-dark font-medium">
                  检验关键概念是否进入短时记忆。
                </p>
              </div>
              <div className="bg-surface-light/60 dark:bg-surface-dark/60 backdrop-blur-md border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">
                <div className="w-8 h-8 rounded-full bg-secondary dark:bg-bg-dark flex items-center justify-center mb-4">
                  <Layers className="w-4 h-4 text-text-secondary dark:text-text-secondary-dark" />
                </div>
                <div className="text-lg font-black text-text-primary dark:text-text-primary-dark">完整测验</div>
                <p className="mt-1 text-[13px] leading-relaxed text-text-secondary dark:text-text-secondary-dark font-medium">
                  系统自动判分，沉淀薄弱点入错题本。
                </p>
              </div>
              <div className="bg-surface-light/60 dark:bg-surface-dark/60 backdrop-blur-md border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">
                <div className="w-8 h-8 rounded-full bg-secondary dark:bg-bg-dark flex items-center justify-center mb-4">
                  <Map className="w-4 h-4 text-text-secondary dark:text-text-secondary-dark" />
                </div>
                <div className="text-lg font-black text-text-primary dark:text-text-primary-dark">学习建议</div>
                <p className="mt-1 text-[13px] leading-relaxed text-text-secondary dark:text-text-secondary-dark font-medium">
                  根据你的作答表现，推荐下一步路径。
                </p>
              </div>
            </div>
          </section>
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
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-success-dark">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" /> Online
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

            <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-6 bg-secondary/20 dark:bg-bg-dark/20">
              <div className="flex flex-col items-start w-full">
                <div className="flex items-center gap-2 mb-1.5 ml-1">
                  <span className="text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark">Coach</span>
                </div>
                <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-[14px] text-text-primary dark:text-text-primary-dark px-4 py-3.5 rounded-[4px_20px_20px_20px] max-w-[92%] leading-relaxed shadow-sm font-medium">
                  你好！我看到你刚刚完成了上一节的学习。现在最适合趁热打铁 🔥
                  <br />
                  <br />
                  你想先来 2 道题简单热身找找感觉，还是直接进入完整的阶段测验？
                </div>
              </div>

              <div className="flex flex-col items-end w-full">
                <div className="flex items-center gap-2 mb-1.5 mr-1">
                  <span className="text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark">You</span>
                </div>
                <div className="bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark text-[14px] px-4 py-3.5 rounded-[20px_4px_20px_20px] max-w-[92%] leading-relaxed shadow-sm font-medium">
                  有什么区别吗？
                </div>
              </div>

              <div className="flex flex-col items-start w-full">
                <div className="flex items-center gap-2 mb-1.5 ml-1">
                  <span className="text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark">Coach</span>
                </div>
                <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-[14px] text-text-primary dark:text-text-primary-dark px-4 py-3.5 rounded-[4px_20px_20px_20px] max-w-[92%] leading-relaxed shadow-sm font-medium">
                  <b>热身 (Checkpoint)</b> 只有两题，不计入正式成绩，重点帮你回忆概念。
                  <br />
                  <br />
                  <b>测验 (Quiz)</b> 是完整的评估，我会为你生成错题记录和能力雷达图哦。
                </div>
              </div>
            </div>

            <div className="p-4 bg-surface-light dark:bg-surface-dark border-t border-bordercolor-light/50 dark:border-bordercolor-dark/50 shrink-0">
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={goCheckpoint}
                  className="text-[13px] font-bold bg-secondary/50 dark:bg-secondary/50 border border-bordercolor-light dark:border-bordercolor-dark px-4 py-3 rounded-xl hover:border-brand text-text-primary dark:text-text-primary-dark btn-transition text-left flex items-center justify-between group"
                >
                  <span>我想先热身</span>
                  <ArrowRight className="w-4 h-4 text-text-secondary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </button>
                <button
                  type="button"
                  onClick={goQuiz}
                  className="text-[13px] font-bold bg-secondary/50 dark:bg-secondary/50 border border-bordercolor-light dark:border-bordercolor-dark px-4 py-3 rounded-xl hover:border-brand text-text-primary dark:text-text-primary-dark btn-transition text-left flex items-center justify-between group"
                >
                  <span>直接开始完整测验</span>
                  <ArrowRight className="w-4 h-4 text-text-secondary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <SurfaceDock activeTooltip="当前环节" activeIcon={LayoutTemplate} />
    </div>
  );
}
