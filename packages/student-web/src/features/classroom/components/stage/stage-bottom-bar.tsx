/**
 * 舞台底部栏 —— 对应 OpenMAIC `components/roundtable/index.tsx` 的
 * 中央交互区视觉语言（精简：单老师，无 listeners/语音录入/ProactiveCard）。
 *
 * 布局：[教师头像] [中央语音泡 rounded-2xl bg-card shadow-lg]
 *       下方：[继续探索 pills] + [圆底输入条 + 圆形 primary 发送按钮]
 *
 * Props 接口保留 listeners 字段以减少父级改动，但**不再渲染**学生头像组。
 */
import { ChevronRight } from 'lucide-react';
import { useCallback, useState, type FC, type KeyboardEvent } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';

import type { AgentProfile } from '../../types/agent';
import type { Scene } from '../../types/scene';
import type { ChatMessage } from '../../types/chat';
import { AgentAvatar } from '../agent/agent-avatar';

interface StageBottomBarProps {
  readonly teacher: AgentProfile | null;
  readonly listeners: AgentProfile[];
  readonly scene: Scene | null;
  readonly currentSpeechText?: string | null;
  readonly isPlaying: boolean;
  readonly isStreaming?: boolean;
  readonly onAskQuestion?: (text: string) => Promise<void> | void;
  /** 可选：流式回复时显示在气泡右上角 */
  readonly streamingMessage?: ChatMessage | null;
}

export const StageBottomBar: FC<StageBottomBarProps> = ({
  teacher,
  scene,
  currentSpeechText,
  isPlaying,
  isStreaming,
  onAskQuestion,
}) => {
  const { t } = useAppTranslation();
  const [questionInput, setQuestionInput] = useState('');

  const handleSubmit = useCallback(async () => {
    const text = questionInput.trim();
    if (!text || !onAskQuestion) return;
    setQuestionInput('');
    await onAskQuestion(text);
  }, [questionInput, onAskQuestion]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  // 气泡只承载真实讲解文本（currentSpeechText）——
  // 不再在切换场景时塞"正在播放 xx 场景"/"点击播放开始讲解"提示，
  // 避免文字进出造成底部高度抖动，并符合产品体验要求：无缝切换。
  const bubbleText = currentSpeechText ?? null;

  return (
    <div className="h-full flex flex-col border-t border-border bg-card/60 backdrop-blur-md">
      {/* ── 主交互条：[教师头像] [中央语音泡]  —— flex-1 占满除输入条外的剩余高度 */}
      <div className="flex-1 min-h-0 flex items-stretch gap-1.5 px-3 py-2">
        {/* 左：教师头像 */}
        {teacher && (
          <div className="shrink-0 flex flex-col items-center justify-center gap-1 w-16 select-none">
            <div className="transition-transform duration-200 hover:scale-110">
              <AgentAvatar
                name={teacher.name}
                color={teacher.color}
                avatar={teacher.avatar}
                size="md"
                showOnlineIndicator
              />
            </div>
            <span
              className="max-w-full truncate px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-border shadow-sm bg-card"
              style={{ color: teacher.color }}
            >
              {teacher.name}
            </span>
          </div>
        )}

        {/* 中：语音泡 —— 去掉 max-h-36 约束，改由父容器 flex 分配 */}
        <div
          className={cn(
            'relative flex-1 min-w-0 rounded-2xl bg-card shadow-lg border border-border overflow-hidden',
            isPlaying && !!currentSpeechText && 'ring-1 ring-primary/40',
          )}
        >
          {/* 气泡永远保留 h-full 的容器；有 speech 时渲染文字，没有时保留空白，
              从而切换场景时气泡自身尺寸不再变化，canvas 宽度完全恒定。 */}
          <div className="overflow-y-auto scrollbar-hide flex flex-col gap-2 p-3 h-full text-sm leading-relaxed text-foreground">
            {bubbleText && <p className="whitespace-pre-wrap break-words">{bubbleText}</p>}
            {isPlaying && !!currentSpeechText && (
              <span className="inline-flex items-center gap-0.5 self-start">
                <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.16s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.32s]" />
              </span>
            )}
          </div>
        </div>

        {/* 听众头像组已删除 —— 单老师模式 */}
      </div>

      {/* ── 输入条：发送老师问题（对齐 OpenMAIC composer） ── */}
      {onAskQuestion && (
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-t border-border">
          <input
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('openmaic.classroom.askPlaceholder')}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!questionInput.trim() || isStreaming}
            aria-label={t('classroom.chat.ariaAskSend')}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all',
              'hover:opacity-90 active:scale-90',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
