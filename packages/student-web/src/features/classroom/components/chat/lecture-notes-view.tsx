/**
 * 讲稿笔记视图 —— 1:1 移植自 OpenMAIC `components/chat/lecture-notes-view.tsx`。
 *
 * 视觉结构、时间线圆点、当前页徽章、内联动作图标、讨论卡片排版完全照抄。
 * 颜色改造：
 *   - purple/violet（主题高亮） → primary
 *   - gray-* （中性）          → muted / muted-foreground / foreground / border
 *   - yellow/red/amber（动作/讨论功能态） → 保留 OpenMAIC 原色，与 InlineActionTag
 *     一致（属于「功能性状态色」例外）。
 */
import { useEffect, useRef, type FC } from 'react';

import {
  BookOpen,
  Flashlight,
  MessageSquare,
  MousePointer2,
  Play,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { LectureNoteEntry } from '../../types/chat';

interface ActionIconCfg {
  Icon: LucideIcon;
  style: string;
}

const ACTION_ICON_ONLY: Record<string, ActionIconCfg> = {
  spotlight: {
    Icon: Flashlight,
    style:
      'bg-yellow-50 dark:bg-yellow-500/15 border-yellow-300/40 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-300',
  },
  laser: {
    Icon: MousePointer2,
    style:
      'bg-red-50 dark:bg-red-500/15 border-red-300/40 dark:border-red-500/30 text-red-600 dark:text-red-300',
  },
  play_video: {
    Icon: Play,
    style:
      'bg-yellow-50 dark:bg-yellow-500/15 border-yellow-300/40 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-300',
  },
};

interface LectureNotesViewProps {
  notes: LectureNoteEntry[];
  currentSceneId?: string | null;
}

export const LectureNotesView: FC<LectureNotesViewProps> = ({
  notes,
  currentSceneId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 当前场景节滚动到视野中心
  useEffect(() => {
    if (!currentSceneId || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-scene-id="${currentSceneId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentSceneId]);

  if (notes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-3 text-primary/70 ring-1 ring-primary/20">
          <BookOpen className="w-6 h-6" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">课堂笔记将在场景播放时自动生成</p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          可在右上角切回「互动答疑」继续提问
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 scrollbar-hide"
    >
      {notes.map((note, index) => {
        const isCurrent = note.sceneId === currentSceneId;
        const pageNum = index + 1;

        return (
          <div
            key={note.sceneId}
            data-scene-id={note.sceneId}
            data-testid="lecture-note-entry"
            className={cn(
              'relative mb-3 last:mb-0 rounded-lg px-3 py-2.5 transition-colors duration-200',
              isCurrent ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/50',
            )}
          >
            {/* 顶部：时间线圆点 + 页签 + 当前态 */}
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  isCurrent ? 'bg-primary shadow-sm shadow-primary/40' : 'bg-muted-foreground/40',
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-semibold tracking-wide',
                  isCurrent ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                第 {pageNum} 页
              </span>
              {isCurrent && (
                <span className="text-[9px] font-bold px-1.5 py-px rounded-full bg-primary/15 text-primary">
                  当前
                </span>
              )}
            </div>

            {/* 标题 */}
            <h4 className="text-[13px] font-bold text-foreground mb-1.5 leading-snug pl-4">
              {note.sceneTitle}
            </h4>

            {/* 内容：spotlight/laser 行内贴在下一句 speech 前缀，discussion 单独一块 */}
            <div className="pl-4 space-y-1">
              <NoteRows items={note.items} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Note 行渲染 —— 把内联 action 收集后贴到下一句 speech 前面，discussion 单独成块。 */
const NoteRows: FC<{ items: LectureNoteEntry['items'] }> = ({ items }) => {
  type Row =
    | { kind: 'speech'; inlineActions: string[]; text: string }
    | { kind: 'discussion'; label?: string }
    | { kind: 'trailing'; inlineActions: string[] };

  const rows: Row[] = [];
  let pendingInline: string[] = [];

  for (const item of items) {
    if (item.kind === 'action' && item.type === 'discussion') {
      if (pendingInline.length > 0) {
        rows.push({ kind: 'trailing', inlineActions: pendingInline });
        pendingInline = [];
      }
      rows.push({ kind: 'discussion', label: item.label });
    } else if (item.kind === 'action') {
      pendingInline.push(item.type);
    } else {
      rows.push({ kind: 'speech', inlineActions: pendingInline, text: item.text });
      pendingInline = [];
    }
  }
  if (pendingInline.length > 0) {
    rows.push({ kind: 'trailing', inlineActions: pendingInline });
  }

  return (
    <>
      {rows.map((row, i) => {
        if (row.kind === 'discussion') {
          return (
            <div
              key={i}
              className="my-1.5 flex items-start gap-1.5 rounded-md border border-amber-200/60 dark:border-amber-700/30 bg-amber-50/60 dark:bg-amber-900/10 px-2 py-1.5"
            >
              <MessageSquare className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              <span className="text-[11px] leading-snug text-amber-800 dark:text-amber-300">
                {row.label}
              </span>
            </div>
          );
        }
        return (
          <p key={i} className="text-[12px] leading-[1.8] text-muted-foreground">
            {row.inlineActions.map((a, j) => {
              const cfg = ACTION_ICON_ONLY[a];
              if (!cfg) return null;
              const { Icon, style } = cfg;
              return (
                <span
                  key={j}
                  className={cn(
                    'inline-flex items-center justify-center w-4 h-4 rounded-full border align-middle mr-0.5',
                    style,
                  )}
                >
                  <Icon className="w-2.5 h-2.5" />
                </span>
              );
            })}
            {row.kind === 'speech' ? row.text : null}
          </p>
        );
      })}
    </>
  );
};
