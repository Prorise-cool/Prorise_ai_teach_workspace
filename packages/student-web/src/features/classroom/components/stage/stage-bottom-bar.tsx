/**
 * 舞台底部栏 —— 从 stage.tsx 抽出的子组件，负责:
 *  - 后续探索操作胶囊（Checkpoint / Quiz 等）
 *  - 教师 AgentBubble（朗读态展示真实讲稿）
 *  - 主问答输入（向老师提问/打断）
 *
 * 独立出来是为了让 stage.tsx 在 1:1 对标 OpenMAIC
 * `components/stage.tsx` 的三段式布局（sidebar | canvas | chat）时
 * 保持单文件 ≤ 500 行。视觉样式与 OpenMAIC `components/stage.tsx`
 * 底部 Roundtable + Composer 呼应；颜色全部走 token。
 */
import { ChevronRight } from 'lucide-react';
import { useCallback, useState, type FC, type KeyboardEvent } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

import type { AgentProfile } from '../../types/agent';
import type { Scene } from '../../types/scene';
import type { ChatMessage } from '../../types/chat';
import { AgentBubble } from '../agent/agent-bubble';

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
  listeners,
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

  return (
    <div className="shrink-0 py-3">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        {/* 后续探索操作胶囊 */}
        {!isPlaying && scene && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-border bg-card/50 px-4 py-3">
            <span className="text-xs text-muted-foreground">{t('classroom.chat.continueExplore')}</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground hover:bg-muted transition-colors"
              >
                {t('classroom.chat.sources')}
              </button>
              <button
                type="button"
                className="rounded-full border border-border bg-foreground px-3 py-1 text-[11px] text-background transition-colors hover:opacity-90"
              >
                {t('classroom.chat.checkpoint')}
              </button>
              <button
                type="button"
                className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground hover:bg-muted transition-colors"
              >
                {t('classroom.chat.formalQuiz')}
              </button>
            </div>
          </div>
        )}

        {/* 教师气泡 —— 朗读时显示真实讲稿，否则提示点击播放 */}
        {teacher && scene && (
          <AgentBubble
            agent={teacher}
            text={
              currentSpeechText ??
              (isPlaying
                ? t('classroom.chat.nowPlayingScene', { title: scene.title })
                : t('classroom.chat.sceneHint', { title: scene.title }))
            }
            listeners={listeners}
            isStreaming={isPlaying && !!currentSpeechText}
          />
        )}

        {/* 问题输入 */}
        {onAskQuestion && (
          <div className="mt-3 flex h-9 items-center gap-2 rounded-full border border-border bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all md:h-10">
            <input
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('openmaic.classroom.askPlaceholder')}
              disabled={isStreaming}
              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!questionInput.trim() || isStreaming}
              aria-label={t('classroom.chat.ariaAskSend')}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-opacity disabled:opacity-40"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
