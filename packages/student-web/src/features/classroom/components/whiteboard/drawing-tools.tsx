/**
 * 白板绘图工具栏。
 * 提供基本工具选择：选择、画笔、直线、文字、清除。
 */
import { Eraser, MousePointer, Minus, Pencil, Type } from 'lucide-react';
import type { FC } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

export type DrawingTool = 'select' | 'pen' | 'line' | 'text' | 'eraser';

interface DrawingToolsProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onClear: () => void;
}

const TOOLS: { id: DrawingTool; icon: FC<{ className?: string }>; labelKey: string }[] = [
  { id: 'select', icon: MousePointer, labelKey: 'toolSelect' },
  { id: 'pen', icon: Pencil, labelKey: 'toolPen' },
  { id: 'line', icon: Minus, labelKey: 'toolLine' },
  { id: 'text', icon: Type, labelKey: 'toolText' },
  { id: 'eraser', icon: Eraser, labelKey: 'toolEraser' },
];

export const DrawingTools: FC<DrawingToolsProps> = ({ activeTool, onToolChange, onClear }) => {
  const { t } = useAppTranslation();
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
      {TOOLS.map(({ id, icon: Icon, labelKey }) => (
        <button
          key={id}
          type="button"
          title={t(`classroom.whiteboard.${labelKey}`)}
          onClick={() => onToolChange(id)}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
            activeTool === id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
      <div className="mx-1 h-5 w-px bg-border" />
      <button
        type="button"
        title={t('classroom.whiteboard.clear')}
        onClick={onClear}
        className="flex h-8 w-8 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
      >
        <Eraser className="h-4 w-4" />
      </button>
    </div>
  );
};
