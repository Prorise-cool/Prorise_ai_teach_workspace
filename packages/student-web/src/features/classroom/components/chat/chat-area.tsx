/**
 * 聊天面板（右侧边栏）—— 1:1 移植自 OpenMAIC `components/chat/chat-area.tsx`。
 *
 * 视觉要点：
 *   - 左侧 1.5px 拖拽手柄（默认 340 / 范围 240-560）
 *   - 顶部双 Tab：讲稿笔记 / 互动答疑（带 amber 未读小圆点）
 *   - 玻璃感背景 + backdrop-blur + 阴影
 *   - 折叠按钮在右上
 *
 * 行为要点：
 *   - chat-panel 的旧消息列表 + 输入框被这里取代；采用 LectureNotesView + MessageList
 *   - 由父级注入 messages / notes / onSendMessage / isStreaming / 折叠态
 *
 * 颜色全部走 token；OpenMAIC 用的 purple/violet 高亮 → primary。
 */
import {
  ArrowUp,
  BookOpen,
  MessageSquare,
  PanelRightClose,
} from 'lucide-react';
import {
  useCallback,
  useRef,
  useState,
  type FC,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';

import type { ChatMessage, LectureNoteEntry } from '../../types/chat';
import { LectureNotesView } from './lecture-notes-view';
import { MessageList } from './message-list';

interface ChatAreaProps {
  messages: ChatMessage[];
  notes: LectureNoteEntry[];
  isStreaming: boolean;
  currentSceneId?: string | null;
  onSendMessage: (text: string) => Promise<void>;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  width?: number;
  onWidthChange?: (width: number) => void;
  className?: string;
}

const DEFAULT_WIDTH = 340;
const MIN_WIDTH = 240;
const MAX_WIDTH = 560;

type ChatTab = 'lecture' | 'chat';

export const ChatArea: FC<ChatAreaProps> = ({
  messages,
  notes,
  isStreaming,
  currentSceneId,
  onSendMessage,
  collapsed = false,
  onCollapseChange,
  width,
  onWidthChange,
  className,
}) => {
  const { t } = useAppTranslation();
  const [internalWidth, setInternalWidth] = useState(width ?? DEFAULT_WIDTH);
  const currentWidth = width ?? internalWidth;
  const [activeTab, setActiveTab] = useState<ChatTab>('lecture');
  const [inputValue, setInputValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const setWidth = useCallback(
    (next: number) => {
      if (onWidthChange) onWidthChange(next);
      else setInternalWidth(next);
    },
    [onWidthChange],
  );

  // 左侧手柄向左拖：delta = startX - currentX
  const handleDragStart = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      isDraggingRef.current = true;
      setIsDragging(true);
      const startX = e.clientX;
      const startWidth = currentWidth;

      const handleMouseMove = (me: MouseEvent) => {
        const delta = startX - me.clientX;
        const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
        setWidth(next);
      };
      const handleMouseUp = () => {
        isDraggingRef.current = false;
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [currentWidth, setWidth],
  );

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    setInputValue('');
    await onSendMessage(text);
    setActiveTab('chat');
  }, [inputValue, isStreaming, onSendMessage]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  // 互动答疑 tab 在 lecture 视图下有未读时，显示 amber pulse
  const hasUnreadChat =
    activeTab === 'lecture' && messages.some((m) => m.role === 'assistant');

  const displayWidth = collapsed ? 0 : currentWidth;

  return (
    <div
      style={{
        width: displayWidth,
        transition: isDragging ? 'none' : 'width 0.3s ease',
      }}
      className={cn(
        'bg-card/80 backdrop-blur-xl border-l border-border shadow-[-2px_0_24px_rgba(0,0,0,0.02)] flex flex-col shrink-0 z-20 relative overflow-visible',
        className,
      )}
    >
      {/* 左侧拖拽手柄 */}
      {!collapsed && (
        <div
          onMouseDown={handleDragStart}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-50 group hover:bg-primary/30 active:bg-primary/40 transition-colors"
        >
          <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-border group-hover:bg-primary transition-colors" />
        </div>
      )}

      <div className={cn('flex flex-col w-full h-full overflow-hidden', collapsed && 'hidden')}>
        {/* Tab 头 */}
        <div className="h-10 flex items-center gap-1 shrink-0 mt-3 mb-1 px-3">
          <div className="flex-1 flex items-center gap-1 rounded-lg bg-muted/60 p-0.5">
            <TabButton
              active={activeTab === 'lecture'}
              onClick={() => setActiveTab('lecture')}
              icon={<BookOpen className="w-3.5 h-3.5" />}
              label={t('classroom.chat.tabLecture')}
            />
            <TabButton
              active={activeTab === 'chat'}
              onClick={() => setActiveTab('chat')}
              icon={<MessageSquare className="w-3.5 h-3.5" />}
              label={t('classroom.chat.tabQa')}
              badge={hasUnreadChat}
            />
          </div>

          {onCollapseChange && (
            <button
              type="button"
              onClick={() => onCollapseChange(true)}
              className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center bg-muted text-muted-foreground ring-1 ring-border/40 hover:bg-accent hover:text-foreground active:scale-90 transition-all duration-200"
              aria-label={t('classroom.chat.ariaCollapsePanel')}
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 内容 */}
        {activeTab === 'lecture' ? (
          <LectureNotesView notes={notes} currentSceneId={currentSceneId} />
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
            <MessageList messages={messages} />
          </div>
        )}

        {/* 输入框 —— 仅在 chat tab 时高亮；lecture tab 下也允许提问，发送后自动切到 chat */}
        <div className="shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('openmaic.classroom.askPlaceholder')}
              disabled={isStreaming}
              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!inputValue.trim() || isStreaming}
              aria-label={t('classroom.chat.ariaSend')}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-opacity disabled:opacity-40"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TabButton: FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: boolean;
}> = ({ active, onClick, icon, label, badge }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'relative flex-1 flex items-center justify-center gap-1 h-8 rounded-md text-xs font-medium transition-colors',
      active
        ? 'bg-card text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground',
    )}
  >
    {icon}
    {label}
    {badge && (
      <span className="absolute top-1 right-2 flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
    )}
  </button>
);
