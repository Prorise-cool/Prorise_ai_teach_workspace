/**
 * 共享 Companion 侧栏 —— 视频、课堂通用。
 *
 * Phase 4：从 `features/video/components/companion-sidebar-v2.tsx` 抽离，
 * 去掉 `@assistant-ui/react` runtime 依赖（简化为本地 state + async iterable
 * adapter），去掉 VideoPlayer 耦合（改为 `getContextSnapshot` 回调），
 * 新增 theme / quickActions / onElementReference / sessionKey 可选项。
 *
 * 视觉规范：保留原 xm-companion BEM 类，主题通过 CSS 变量 hook 方式叠加。
 * 左侧 1.5px 拖拽手柄、glass 背景、折叠态 0 宽度 —— 所有既有视频页
 * 回归体验零变化。
 */
import { Bot, Link as LinkIcon, Moon, SendHorizonal, Sun, X } from 'lucide-react';
import type { FC, KeyboardEvent, ReactNode } from 'react';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { nanoid } from 'nanoid';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';

import { CompanionMessageRenderer } from './companion-message-renderer';
import type {
  CompanionDataAdapter,
  CompanionContextSnapshot,
  CompanionQuickAction,
  CompanionTheme,
} from './types';

import './companion-sidebar.scss';

/* ---------- 内部消息结构（不向外暴露） ---------- */

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  errored?: boolean;
}

/* ---------- Props ---------- */

export interface CompanionSidebarProps {
  /** 侧栏是否展开。 */
  isOpen: boolean;
  /** 关闭按钮回调。 */
  onClose?: () => void;
  /** 数据 adapter：把 ask 请求变成事件流。 */
  adapter: CompanionDataAdapter;
  /** 每次 ask 前即时拼装上下文快照。 */
  getContextSnapshot: () => CompanionContextSnapshot;
  /** 头部 anchor 区域显示的文案（如视频"T=01:23 / Intro"；课堂可传场景标题）。 */
  anchorLabel?: string | null;
  /** 可选的快捷 prompt 列表（显示在输入框上方）。 */
  quickActions?: CompanionQuickAction[];
  /** 点击消息里的 `[elem:xxx]` 药丸时触发。 */
  onElementReference?: (elementId: string) => void;
  /** 视觉主题。`amber` 为视频侧默认。 */
  theme?: CompanionTheme;
  /**
   * 会话键：当它变化时本地消息历史清零。
   * 视频侧可用 taskId，课堂侧用 classroomId（切换课堂时自然清空）。
   */
  sessionKey?: string;
  /** Header 标题（默认 "XiaoMai AI"）。 */
  title?: string;
  /** Header 副标题（默认读 i18n `video.companion.headerSubtitle`）。 */
  subtitle?: string;
  /** Header 左上图标位置的额外 badge（如 logo 替换），默认 <Bot />。 */
  avatarIcon?: ReactNode;
  /** 空态文案（默认读 i18n `video.companion.emptyHint`）。 */
  emptyHint?: string;
  /** 输入框占位符（默认读 i18n `video.companion.inputPlaceholder`）。 */
  inputPlaceholder?: string;
  /** 额外 className。 */
  className?: string;
}

const DEFAULT_MAX_INPUT = 300;

/* ---------- 主组件 ---------- */

export function CompanionSidebar({
  isOpen,
  onClose,
  adapter,
  getContextSnapshot,
  anchorLabel,
  quickActions,
  onElementReference,
  theme = 'amber',
  sessionKey,
  title,
  subtitle,
  avatarIcon,
  emptyHint,
  inputPlaceholder,
  className,
}: CompanionSidebarProps) {
  const { t } = useAppTranslation();
  const { themeMode, toggleThemeMode } = useThemeMode();
  const isDark = themeMode === 'dark';

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // sessionKey 变化 → 清空历史 + 取消 inflight
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setInput('');
    setIsStreaming(false);
  }, [sessionKey]);

  // 卸载时中止 inflight
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  // 自动滚到底 —— 显式 `inline: 'nearest'` 避免触发水平滚动
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
      inline: 'nearest',
    });
  }, [messages]);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || isStreaming) return;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const userMsg: LocalMessage = {
        id: nanoid(),
        role: 'user',
        content: text,
      };
      const assistantId = nanoid();
      const assistantMsg: LocalMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      try {
        const snapshot = getContextSnapshot();
        const stream = adapter.ask({
          questionText: text,
          contextSnapshot: snapshot,
          abortSignal: ac.signal,
        });

        let acc = '';
        for await (const event of stream) {
          if (ac.signal.aborted) break;
          if (event.type === 'text') {
            acc += event.content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: acc } : m,
              ),
            );
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m,
          ),
        );
      } catch (err) {
        if (ac.signal.aborted) {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          return;
        }
        const msg = err instanceof Error ? err.message : '未知错误';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: msg, isStreaming: false, errored: true }
              : m,
          ),
        );
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
        setIsStreaming(false);
      }
    },
    [adapter, getContextSnapshot, isStreaming],
  );

  const handleSubmit = useCallback(() => {
    void sendMessage(input);
    setInput('');
  }, [input, sendMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const themeClass = useMemo(
    () => (theme === 'indigo' ? 'xm-companion--indigo' : 'xm-companion--amber'),
    [theme],
  );

  const resolvedSubtitle =
    subtitle ?? t('video.companion.headerSubtitle');
  const resolvedTitle = title ?? 'XiaoMai AI';
  const resolvedEmpty = emptyHint ?? t('video.companion.emptyHint');
  const resolvedPlaceholder =
    inputPlaceholder ?? t('video.companion.inputPlaceholder');

  return (
    <aside
      className={cn(
        'xm-companion',
        themeClass,
        !isOpen && 'xm-companion--collapsed',
        className,
      )}
    >
      <div className="xm-companion__drag-handle" />
      <div className="xm-companion__inner">
        <header className="xm-companion__header">
          <div className="xm-companion__header-brand">
            <div className="xm-companion__avatar">
              {avatarIcon ?? <Bot className="w-4 h-4" />}
            </div>
            <div className="xm-companion__header-copy">
              <span className="xm-companion__header-title">{resolvedTitle}</span>
              <span className="xm-companion__header-subtitle">
                {resolvedSubtitle}
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
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
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

        {anchorLabel ? (
          <div className="xm-companion__anchor">
            <LinkIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="xm-companion__anchor-text">{anchorLabel}</span>
          </div>
        ) : null}

        {/* Messages */}
        <div className="xm-companion__chat">
          {messages.length === 0 ? (
            <div className="xm-companion__empty">
              <p className="xm-companion__empty-text">{resolvedEmpty}</p>
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-3 px-3 py-3">
              {messages.map((msg) => (
                <CompanionBubble
                  key={msg.id}
                  message={msg}
                  onElementReference={onElementReference}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Quick actions */}
        {quickActions && quickActions.length > 0 && (
          <div className="xm-companion__quick-tags-bar">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                type="button"
                className="xm-companion__quick-tag"
                onClick={() => void sendMessage(qa.prompt)}
                disabled={isStreaming}
              >
                {qa.icon}
                {qa.label}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <div className="xm-companion__input-area">
          <div className="xm-companion__input-box">
            <textarea
              className="xm-companion__textarea"
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, DEFAULT_MAX_INPUT))}
              onKeyDown={handleKeyDown}
              placeholder={resolvedPlaceholder}
              rows={1}
              disabled={isStreaming}
            />
            <div className="xm-companion__input-tools">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() || isStreaming}
                aria-label={t('classroom.chat.ariaSend')}
                className="xm-companion__send-btn"
              >
                <SendHorizonal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ---------- 气泡 ---------- */

const CompanionBubble: FC<{
  message: LocalMessage;
  onElementReference?: (id: string) => void;
}> = memo(({ message, onElementReference }) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex flex-col max-w-[85%]">
        <div
          className={cn(
            'rounded-2xl rounded-bl-sm border bg-card px-3 py-2 text-sm text-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere]',
            message.errored
              ? 'border-destructive/40 text-destructive'
              : 'border-border',
          )}
        >
          {message.content ? (
            <CompanionMessageRenderer
              content={message.content}
              onElementReference={onElementReference}
            />
          ) : (
            <span className="inline-flex gap-0.5">
              <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0s]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.16s]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.32s]" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

CompanionBubble.displayName = 'CompanionBubble';
