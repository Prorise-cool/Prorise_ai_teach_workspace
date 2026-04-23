/**
 * 白板绘图工具栏。
 * 提供基本工具选择：选择、画笔、直线、文字、清除。
 */
import { Eraser, MousePointer, Minus, Pencil, Type } from 'lucide-react';
import type { FC } from 'react';

export type DrawingTool = 'select' | 'pen' | 'line' | 'text' | 'eraser';

interface DrawingToolsProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onClear: () => void;
}

const TOOLS: { id: DrawingTool; icon: FC<{ className?: string }>; label: string }[] = [
  { id: 'select', icon: MousePointer, label: '选择' },
  { id: 'pen', icon: Pencil, label: '画笔' },
  { id: 'line', icon: Minus, label: '直线' },
  { id: 'text', icon: Type, label: '文字' },
  { id: 'eraser', icon: Eraser, label: '橡皮' },
];

export const DrawingTools: FC<DrawingToolsProps> = ({ activeTool, onToolChange, onClear }) => {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
      {TOOLS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          title={label}
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
        title="清除"
        onClick={onClear}
        className="flex h-8 w-8 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
      >
        <Eraser className="h-4 w-4" />
      </button>
    </div>
  );
};
