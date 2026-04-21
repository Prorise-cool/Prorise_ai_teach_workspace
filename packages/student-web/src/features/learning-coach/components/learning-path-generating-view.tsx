import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';

export function LearningPathGeneratingView(props: {
  active: boolean;
  progressPercent: number;
  tipText: string;
  tipVisible: boolean;
}) {
  const { active, progressPercent, tipText, tipVisible } = props;

  return (
    <div
      id="view-generating"
      className={[
        'view-enter flex-1 flex flex-col items-center justify-center min-h-[60vh] w-full max-w-2xl mx-auto pt-6',
        active ? '' : 'view-hidden',
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
            {tipText}
          </div>
        </div>
      </div>
    </div>
  );
}

