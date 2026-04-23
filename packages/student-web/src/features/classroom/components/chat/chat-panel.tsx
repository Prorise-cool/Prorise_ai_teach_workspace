/**
 * 聊天面板组件（右侧边栏）。
 * 包含笔记标签和 Q&A 互动标签。
 */
import { ArrowUp, MessageSquare, PlayCircle, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { FC, KeyboardEvent } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

import type { LectureNoteEntry } from '../../types/chat';
import type { AgentProfile } from '../../types/agent';
import type { ChatMessage } from '../../types/chat';
import { MessageList } from './message-list';
import { InlineActionTag } from './inline-action-tag';

interface ChatPanelProps {
  classroomId: string;
  agents?: AgentProfile[];
  messages: ChatMessage[];
  isStreaming: boolean;
  notes: LectureNoteEntry[];
  onSendMessage: (text: string) => Promise<void>;
  onClose?: () => void;
}

type PanelTab = 'notes' | 'qa';

export const ChatPanel: FC<ChatPanelProps> = ({
  messages,
  isStreaming,
  notes,
  onSendMessage,
  onClose,
}) => {
  const { t } = useAppTranslation();
  const [activeTab, setActiveTab] = useState<PanelTab>('notes');
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    setInputValue('');
    await onSendMessage(text);
    // 切换到 Q&A 标签展示回复
    setActiveTab('qa');
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

  const unreadCount = messages.filter((m) => m.role === 'assistant').length;

  return (
    <div className="flex h-full flex-col">
      {/* 面板头部 */}
      <div className="shrink-0 border-b border-border px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-[15px] font-bold text-foreground">{t('classroom.chat.companionTitle')}</span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Tab 切换器 */}
        <div className="mt-3 flex rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'notes'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('openmaic.classroom.notes')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qa')}
            className={`relative flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'qa'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('openmaic.classroom.qa')}
            {unreadCount > 0 && activeTab !== 'qa' && (
              <span className="absolute right-1.5 top-1 h-1.5 w-1.5 animate-ping rounded-full bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'notes' ? (
          <NotesList notes={notes} />
        ) : (
          <MessageList messages={messages} />
        )}
      </div>

      {/* 输入框 */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
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
            className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-opacity disabled:opacity-40"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

/** 笔记列表子组件 */
const NotesList: FC<{ notes: LectureNoteEntry[] }> = ({ notes }) => {
  const { t } = useAppTranslation();
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-xs text-muted-foreground">{t('classroom.chat.notesEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {notes.map((note) => (
        <div
          key={`${note.sceneId}-${note.completedAt}`}
          className="rounded-xl border border-border bg-card p-3 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <PlayCircle className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground">{note.sceneTitle}</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {new Date(note.completedAt).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {note.items.slice(0, 3).map((item, i) =>
              item.kind === 'speech' ? (
                <div key={i} className="text-[12px] leading-relaxed text-muted-foreground">
                  {item.text}
                </div>
              ) : (
                <div key={i} className="text-[12px]">
                  <InlineActionTag actionName={item.type} state="completed" />
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
