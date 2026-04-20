/**
 * Companion 侧栏 — 基于 @assistant-ui/react primitives 的聊天组件。
 * 使用 LocalRuntime + 自定义 ChatModelAdapter 调用后端 /companion/ask API。
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  type ChatModelAdapter,
  type ChatModelRunResult,
} from '@assistant-ui/react';
import {
  AlertCircle,
  Bot,
  HelpCircle,
  Link,
  Moon,
  Rocket,
  Send,
  Sun,
  X,
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';
import type { VideoPlayerHandle } from '../components/video-player';
import type { CompanionAnchor } from '@/types/companion';
import { resolveCompanionAdapter } from '@/services/api/adapters/companion-adapter';

/* ---------- Props ---------- */

export interface CompanionSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  taskId: string;
  currentAnchor: CompanionAnchor;
  playerRef?: React.RefObject<VideoPlayerHandle | null>;
  className?: string;
}

/* ---------- 帧截取 ---------- */

function captureFrame(playerRef?: React.RefObject<VideoPlayerHandle | null>): string | null {
  const player = playerRef?.current?.getPlayer();
  if (!player) return null;
  const el = player.el()?.querySelector('video') as HTMLVideoElement | null;
  if (!el || !el.videoWidth) return null;
  try {
    const c = document.createElement('canvas');
    const s = 720 / el.videoWidth;
    c.width = Math.min(el.videoWidth, 720);
    c.height = Math.round(el.videoHeight * s);
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(el, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.7).split(',')[1] ?? null;
  } catch { return null; }
}

/* ---------- 自定义 ChatModelAdapter ---------- */

function createCompanionAdapter(
  anchor: CompanionAnchor,
  playerRef?: React.RefObject<VideoPlayerHandle | null>,
  sessionId?: string,
): ChatModelAdapter {
  const apiAdapter = resolveCompanionAdapter();

  return {
    async *run({ messages, abortSignal }) {
      const lastUser = messages[messages.length - 1];
      const questionText = Array.isArray(lastUser.content)
        ? lastUser.content.filter((p): p is { type: 'text'; text: string } => p.type === 'text').map(p => p.text).join('')
        : String(lastUser.content ?? '');

      const frameBase64 = captureFrame(playerRef);

      const response = await apiAdapter.ask(
        {
          sessionId: sessionId ?? `comp_sess_${anchor.taskId}`,
          anchor,
          questionText,
          frameBase64,
        },
        { signal: abortSignal },
      );

      const result: ChatModelRunResult = {
        content: [{ type: 'text', text: response.answerText }],
      };
      yield result;
    },
  };
}

/* ---------- 内部 Runtime Provider ---------- */

function CompanionRuntimeProvider({
  anchor,
  playerRef,
  sessionId,
  children,
}: {
  anchor: CompanionAnchor;
  playerRef?: React.RefObject<VideoPlayerHandle | null>;
  sessionId?: string;
  children: React.ReactNode;
}) {
  const adapter = useMemo(
    () => createCompanionAdapter(anchor, playerRef, sessionId),
    // anchor changes per second, only re-create on meaningful changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anchor.taskId, anchor.seconds, sessionId],
  );
  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

/* ---------- Chat UI using primitives ---------- */

function CompanionChat({ onQuickAsk }: { onQuickAsk: (text: string) => void }) {
  const { t } = useAppTranslation();

  return (
    <>
      {/* Messages area */}
      <ThreadPrimitive.Viewport className="xm-companion__chat">
        <ThreadPrimitive.Empty>
          <div className="xm-companion__empty">
            <p className="xm-companion__empty-text">
              {t('video.companion.emptyHint')}
            </p>
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages
          components={{
            Message: CompanionMessage,
          }}
        />

        <ThreadPrimitive.ViewportFooter />
      </ThreadPrimitive.Viewport>

      {/* Quick tags */}
      <div className="xm-companion__quick-tags-bar">
        <button type="button" className="xm-companion__quick-tag" onClick={() => onQuickAsk(t('video.companion.quickNotUnderstandText'))}>
          <HelpCircle className="w-3 h-3" />
          {t('video.companion.quickNotUnderstand')}
        </button>
        <button type="button" className="xm-companion__quick-tag" onClick={() => onQuickAsk(t('video.companion.quickExampleText'))}>
          <AlertCircle className="w-3 h-3" />
          {t('video.companion.quickExample')}
        </button>
        <button type="button" className="xm-companion__quick-tag" onClick={() => onQuickAsk(t('video.companion.quickWhiteboardText'))}>
          <Rocket className="w-3 h-3" />
          {t('video.companion.quickWhiteboard')}
        </button>
      </div>

      {/* Composer */}
      <div className="xm-companion__input-area">
        <ComposerPrimitive.Root className="xm-companion__input-box">
          <ComposerPrimitive.Input
            className="xm-companion__textarea"
            placeholder={t('video.companion.inputPlaceholder')}
            rows={1}
          />
          <div className="xm-companion__input-tools">
            <span className="xm-companion__input-count">
              <ComposerPrimitive.Send className="xm-companion__send-btn">
                <Send className="w-4 h-4" />
              </ComposerPrimitive.Send>
            </span>
          </div>
        </ComposerPrimitive.Root>
      </div>
    </>
  );
}

function CompanionMessage() {
  return (
    <div className="xm-companion__turn">
      <MessagePrimitive.Root>
        <MessagePrimitive.If user>
          <div className="bubble-user">
            <MessagePrimitive.Content />
          </div>
        </MessagePrimitive.If>
        <MessagePrimitive.If assistant>
          <div className="xm-companion__message-group">
            <div className="xm-companion__message-meta">
              <div className="xm-companion__message-avatar">
                <Sparkles className="w-3 h-3" />
              </div>
              <span className="xm-companion__message-name">XiaoMai</span>
            </div>
            <div className="bubble-ai">
              <MessagePrimitive.Content />
            </div>
          </div>
        </MessagePrimitive.If>
      </MessagePrimitive.Root>
    </div>
  );
}

function Sparkles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

/* ---------- 侧栏主体 ---------- */

export function CompanionSidebar({
  isOpen,
  onClose,
  taskId,
  currentAnchor,
  playerRef,
  className,
}: CompanionSidebarProps) {
  const { t } = useAppTranslation();
  const { themeMode, toggleThemeMode } = useThemeMode();
  const isDark = themeMode === 'dark';
  const [sessionId, setSessionId] = useState<string | undefined>();

  const bootstrapped = useRef(false);
  if (!bootstrapped.current && taskId) {
    bootstrapped.current = true;
    const api = resolveCompanionAdapter();
    api.bootstrap(taskId).then((data) => setSessionId(data.sessionId)).catch(() => {});
  }

  const anchorLabel = useMemo(() => {
    const mins = Math.floor(currentAnchor.seconds / 60);
    const secs = Math.floor(currentAnchor.seconds % 60);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const parts = [`T=${timeStr}`];
    if (currentAnchor.sectionTitle) parts.push(currentAnchor.sectionTitle);
    return parts.join(' / ');
  }, [currentAnchor.seconds, currentAnchor.sectionTitle]);

  return (
    <CompanionRuntimeProvider
      anchor={currentAnchor}
      playerRef={playerRef}
      sessionId={sessionId}
    >
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
              {onClose && (
                <button
                  type="button"
                  className="xm-companion__header-circle"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </header>

          <div className="xm-companion__anchor">
            <Link className="w-3.5 h-3.5 shrink-0" />
            <span className="xm-companion__anchor-text">{anchorLabel}</span>
          </div>

          <CompanionChat
            onQuickAsk={(text) => {
              // Quick tags: submit via hidden form by setting input and triggering send
              const textarea = document.querySelector<HTMLTextAreaElement>('.xm-companion__textarea');
              if (textarea) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
                nativeInputValueSetter?.call(textarea, text);
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                setTimeout(() => {
                  const form = textarea.closest('form');
                  form?.requestSubmit();
                }, 50);
              }
            }}
          />
        </div>
      </aside>
    </CompanionRuntimeProvider>
  );
}
