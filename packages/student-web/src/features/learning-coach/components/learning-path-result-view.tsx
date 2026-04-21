import { ArrowRight, Check, MapPin } from 'lucide-react';

import type { LearningPathPlanPayload } from '@/types/learning';

export function LearningPathResultView(props: {
  active: boolean;
  goal: string;
  cycleDays: number;
  plan: LearningPathPlanPayload | null;
  onAdjustGoal: () => void;
  onStartLearning: () => void;
}) {
  const { active, goal, cycleDays, plan, onAdjustGoal, onStartLearning } = props;

  return (
    <div
      id="view-path"
      className={['w-full flex flex-col gap-6 md:gap-8', active ? '' : 'view-hidden'].join(' ')}
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
              {plan?.pathSummary ?? '系统将基于你的学习反馈生成阶段性计划，并提供可执行的行动项与复盘建议。'}
            </p>
          </div>

          <div className="w-full md:w-[240px] bg-secondary/30 dark:bg-bg-dark/50 border border-bordercolor-light dark:border-bordercolor-dark rounded-xl p-5 shrink-0 flex flex-col justify-center">
            <div className="flex justify-between items-end mb-3">
              <span className="text-xs font-bold text-text-secondary dark:text-text-secondary-dark">总体进度</span>
              <span className="text-lg font-black text-text-primary dark:text-text-primary-dark tracking-tight">25%</span>
            </div>
            <div className="w-full h-2 bg-surface-light dark:bg-surface-dark rounded-full overflow-hidden border border-bordercolor-light dark:border-bordercolor-dark shadow-inner mb-5">
              <div className="h-full bg-text-primary dark:bg-text-primary-dark rounded-full w-[25%]" />
            </div>
            <button
              type="button"
              onClick={onAdjustGoal}
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
            const status = idx === 0 ? 'completed' : idx === 1 ? 'next' : 'locked';
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
                        onClick={onStartLearning}
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
  );
}

