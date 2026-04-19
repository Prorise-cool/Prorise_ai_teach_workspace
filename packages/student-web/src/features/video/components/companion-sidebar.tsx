/**
 * Companion 智能侧栏组件。
 * Story 6.2：接入真实数据，支持 6 种交互状态。
 */
import { useCallback, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Download,
  HelpCircle,
  Image as ImageIcon,
  Link,
  Moon,
  MoreHorizontal,
  Paperclip,
  Rocket,
  Send,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';
import type {
  CompanionAnchor,
  CompanionInteractionState,
  CompanionTurn,
} from '@/types/companion';

export interface CompanionSidebarProps {
  /** 侧栏是否展开。 */
  isOpen: boolean;
  /** 关闭侧栏。 */
  onClose?: () => void;
  /** 对话轮次。 */
  turns: CompanionTurn[];
  /** 当前交互状态。 */
  interactionState: CompanionInteractionState;
  /** 是否正在提问。 */
  isAsking: boolean;
  /** 当前锚点。 */
  currentAnchor: CompanionAnchor;
  /** 发起提问。 */
  onAsk: (questionText: string) => Promise<void>;
  /** 清空对话。 */
  onClearTurns: () => void;
  /** 额外 className。 */
  className?: string;
}

function formatAnchorLabel(anchor: CompanionAnchor): string {
  const mins = Math.floor(anchor.seconds / 60);
  const secs = Math.floor(anchor.seconds % 60);
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const parts = [`T=${timeStr}`];
  if (anchor.sectionTitle) parts.push(anchor.sectionTitle);
  return parts.join(' / ');
}

function renderAnswerContent(
  turn: CompanionTurn,
  t: (key: string, params?: Record<string, unknown>) => string,
) {
  if (turn.persistenceStatus === 'reference_missing') {
    return (
      <div className="bubble-ai xm-markdown">
        <p className="opacity-60">
          {t('video.companion.contextUnavailable')}
        </p>
      </div>
    );
  }

  return (
    <div className="bubble-ai xm-markdown">
      <p>{turn.answerText}</p>
      {turn.whiteboardActions.length > 0 && (
        <div className="xm-companion__whiteboard-preview">
          <ImageIcon className="w-3 h-3" />
          <span>{t('video.companion.whiteboardPreview')}</span>
        </div>
      )}
    </div>
  );
}

export function CompanionSidebar({
  isOpen,
  onClose,
  turns,
  interactionState,
  isAsking,
  currentAnchor,
  onAsk,
  onClearTurns,
  className,
}: CompanionSidebarProps) {
  const { t } = useAppTranslation();
  const { themeMode, toggleThemeMode } = useThemeMode();
  const isDark = themeMode === 'dark';
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!inputText.trim() || isAsking) return;
    const text = inputText.trim();
    setInputText('');
    void onAsk(text);
  }, [inputText, isAsking, onAsk]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <aside
      className={cn(
        'xm-companion',
        !isOpen && 'xm-companion--collapsed',
        className,
      )}
    >
      <div className="xm-companion__drag-handle" />
      <div className="xm-companion__inner">
        <header className="xm-companion__header">
          <div className="xm-companion__header-brand">
            <div className="xm-companion__avatar">
              <Bot className="w-4 h-4" />
            </div>
            <div className="xm-companion__header-copy">
              <span className="xm-companion__header-title">XiaoMai AI</span>
              <span className="xm-companion__header-subtitle">
                {t('video.companion.headerSubtitle')}
              </span>
            </div>
          </div>

          <div className="xm-companion__header-actions">
            <button
              type="button"
              className="xm-companion__header-circle"
              onClick={toggleThemeMode}
              aria-label={t('video.generating.toggleTheme')}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="dropdown-trigger">
              <button
                type="button"
                className="xm-companion__header-circle"
                aria-label={t('video.result.settings')}
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              <div className="dropdown-menu">
                <button type="button" className="dropdown-item">
                  <Paperclip className="w-4 h-4 opacity-70" />
                  {t('video.companion.evidenceTitle')}
                </button>
                <button type="button" className="dropdown-item">
                  <Download className="w-4 h-4 opacity-70" />
                  {t('video.companion.exportBoard')}
                </button>
                <div className="xm-companion__dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item dropdown-item--danger"
                  onClick={onClearTurns}
                >
                  <Trash2 className="w-4 h-4 opacity-70" />
                  {t('video.companion.clearHistory')}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="xm-companion__anchor">
          <Link className="w-3.5 h-3.5 shrink-0" />
          <span className="xm-companion__anchor-text">
            {formatAnchorLabel(currentAnchor)}
          </span>
        </div>

        <div className="xm-companion__chat">
          {interactionState === 'empty' && (
            <div className="xm-companion__empty">
              <p className="xm-companion__empty-text">
                {t('video.companion.emptyHint')}
              </p>
            </div>
          )}

          {isAsking && (
            <div className="bubble-user">{inputText || '...'}</div>
          )}

          {turns.map((turn) => (
            <div key={turn.turnId} className="xm-companion__turn">
              <div className="bubble-user">{turn.questionText}</div>
              <div className="xm-companion__message-group">
                <div className="xm-companion__message-meta">
                  <div className="xm-companion__message-avatar">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <span className="xm-companion__message-name">XiaoMai</span>
                </div>
                {renderAnswerContent(turn, t)}
              </div>
            </div>
          ))}
        </div>

        <div className="xm-companion__input-area">
          <div className="xm-companion__quick-tags">
            <button
              type="button"
              className="xm-companion__quick-tag"
              onClick={() => void onAsk(t('video.companion.quickNotUnderstandText'))}
            >
              <HelpCircle className="w-3 h-3" />
              {t('video.companion.quickNotUnderstand')}
            </button>
            <button
              type="button"
              className="xm-companion__quick-tag"
              onClick={() => void onAsk(t('video.companion.quickExampleText'))}
            >
              <AlertCircle className="w-3 h-3" />
              {t('video.companion.quickExample')}
            </button>
            <button
              type="button"
              className="xm-companion__quick-tag"
              onClick={() => void onAsk(t('video.companion.quickWhiteboardText'))}
            >
              <Rocket className="w-3 h-3" />
              {t('video.companion.quickWhiteboard')}
            </button>
          </div>

          <div className="xm-companion__input-box">
            <textarea
              ref={textareaRef}
              className="xm-companion__textarea"
              placeholder={t('video.companion.inputPlaceholder')}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAsking}
            />

            <div className="xm-companion__input-tools">
              <div className="xm-companion__tools-left">
                <button
                  type="button"
                  className="xm-companion__tool-btn"
                  title={t('video.companion.insertImage')}
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="xm-companion__tool-btn"
                  title={t('video.companion.uploadFile')}
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <span className="xm-companion__input-count">
                  {t('video.companion.charCount', { count: inputText.length })}
                </span>
              </div>

              <button
                type="button"
                className={cn(
                  'xm-companion__send-btn',
                  (!inputText.trim() || isAsking) && 'xm-companion__send-btn--disabled',
                )}
                onClick={handleSend}
                disabled={!inputText.trim() || isAsking}
                aria-label={t('video.common.continueLearning')}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
