/**
 * 聊天面板（右侧边栏）—— 单 Tab 互动答疑版（笔记功能已删除）。
 *
 * 视觉要点（保留 OpenMAIC 1:1）：
 *   - 左侧 1.5px 拖拽手柄（默认 340 / 范围 240-560）
 *   - 玻璃感背景 + backdrop-blur + 阴影
 *   - 折叠按钮在右上
 *
 * 行为要点：
 *   - 仅"互动答疑"消息列表 + 输入框，无 Tab 切换
 *   - 由父级注入 messages / onSendMessage / isStreaming / 折叠态
 */
import { ArrowUp, MessageSquare, PanelRightClose } from 'lucide-react';
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

import type { ChatMessage } from '../../types/chat';
import { MessageList } from './message-list';

interface ChatAreaProps {
  messages: ChatMessage[];
  isStreaming: boolean;
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

export const ChatArea: FC<ChatAreaProps> = ({
  messages,
  isStreaming,
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

  const displayWidth = collapsed ? 0 : currentWidth;

  return (
    <div
      style={{
        width: displayWidth,
        transition: isDragging ? 'none' : 'width 0.3s ease',
      }}
      className={cn(
        // h-full 保证外层拿到父级 fixed h-full 的满高，
        // 否则作为非 flex 子项的块级元素只占内容高，下方会出现大片留白。
        'h-full bg-card/80 backdrop-blur-xl border-l border-border shadow-[-2px_0_24px_rgba(0,0,0,0.02)] flex flex-col shrink-0 z-20 relative overflow-visible',
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
        {/* 顶部标题栏 */}
        <div className="h-10 flex items-center justify-between shrink-0 mt-3 mb-1 px-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
            {t('classroom.chat.tabQa')}
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

        {/* 消息列表 —— 用 flex + min-h-0 让内部空状态能够正确撑满 */}
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto overflow-x-hidden scrollbar-hide">
          <MessageList messages={messages} />
        </div>

        {/* 输入框 */}
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
