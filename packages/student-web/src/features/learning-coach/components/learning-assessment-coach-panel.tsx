/**
 * 文件说明：Learning Coach 测评右侧辅导 AI 侧栏（从 learning-assessment-page 拆分，wave-1.5 polish）。
 */
import { ArrowRight, Bot, HelpCircle, PlayCircle, X } from 'lucide-react';
import type { FC } from 'react';

import { RichBlock } from '@/components/rich-content';
import type { CoachAskMessage } from '@/types/learning';

type AssessmentMode = 'checkpoint' | 'quiz';

type AssessmentCoachPanelProps = {
  mode: AssessmentMode;
  wrapperClassName: string;
  overlayClassName: string;
  coachMessages: readonly CoachAskMessage[];
  coachAsking: boolean;
  coachDraft: string;
  hasCurrentQuestion: boolean;
  onToggleSidebar: () => void;
  onSendCoach: (message: string) => void;
  onDraftChange: (value: string) => void;
  onRequestStepDown: () => void;
  onReplayVideo: () => void;
};

export const LearningAssessmentCoachPanel: FC<AssessmentCoachPanelProps> = ({
  mode,
  wrapperClassName,
  overlayClassName,
  coachMessages,
  coachAsking,
  coachDraft,
  hasCurrentQuestion,
  onToggleSidebar,
  onSendCoach,
  onDraftChange,
  onRequestStepDown,
  onReplayVideo,
}) => {
  return (
    <>
      <div id="mobile-overlay" className={overlayClassName} onClick={onToggleSidebar} />

      <aside id="companion-wrapper" className={wrapperClassName}>
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
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />{' '}
                  {mode === 'checkpoint' ? '热身辅导中' : '测验辅导中'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-2 rounded-lg text-text-secondary hover:bg-secondary dark:hover:bg-secondary xl:hidden btn-transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-4 bg-secondary/20 dark:bg-bg-dark/20">
            {coachMessages.map((msg, idx) =>
              msg.role === 'coach' ? (
                <div key={idx} className="flex flex-col items-start w-full">
                  <div className="flex items-center gap-2 mb-1.5 ml-1">
                    <span className="text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark">
                      Coach
                    </span>
                  </div>
                  <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-[14px] text-text-primary dark:text-text-primary-dark px-4 py-3.5 rounded-[4px_20px_20px_20px] max-w-[92%] leading-relaxed shadow-sm font-medium">
                    <RichBlock content={msg.content} placeholder="" />
                  </div>
                </div>
              ) : (
                <div key={idx} className="flex flex-col items-end w-full">
                  <div className="flex items-center gap-2 mb-1.5 mr-1">
                    <span className="text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark">
                      You
                    </span>
                  </div>
                  <div className="bg-brand/90 dark:bg-brand text-surface-light text-[14px] px-4 py-3.5 rounded-[20px_4px_20px_20px] max-w-[92%] leading-relaxed shadow-sm font-medium whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              ),
            )}
            {coachAsking ? (
              <div className="flex flex-col items-start w-full">
                <div className="flex items-center gap-2 mb-1.5 ml-1">
                  <span className="text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark">
                    Coach
                  </span>
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
                disabled={coachAsking || !hasCurrentQuestion}
                onClick={onRequestStepDown}
                className="text-[12px] font-bold bg-secondary/50 dark:bg-secondary/50 border border-bordercolor-light dark:border-bordercolor-dark px-3 py-2.5 rounded-xl text-left hover:border-brand text-text-primary dark:text-text-primary-dark transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <HelpCircle className="w-4 h-4 text-brand" /> 先给我拆题思路
              </button>
              <button
                type="button"
                onClick={onReplayVideo}
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
                onChange={(e) => onDraftChange(e.target.value.slice(0, 300))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSendCoach(coachDraft);
                  }
                }}
              />
              <div className="flex justify-between items-center px-3 pb-2 pt-1">
                <span className="text-[11px] font-medium text-text-secondary/50 font-mono">
                  {coachDraft.length} / 300
                </span>
                <button
                  type="button"
                  disabled={coachAsking || !coachDraft.trim()}
                  onClick={() => onSendCoach(coachDraft)}
                  className="w-8 h-8 rounded-full bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark flex items-center justify-center hover:bg-brand active:scale-95 transition-all shadow-md btn-hover-scale disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-4 h-4 rotate-[-90deg]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
