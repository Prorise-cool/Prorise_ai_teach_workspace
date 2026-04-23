/**
 * 白板绘图工具栏：工具切换 + 颜色选择 + 线宽 + 撤销/重做 + 清空。
 *
 * 色盘 palette 以功能态色板形式写死（墨黑/红/橙/黄/绿/蓝/紫/白），
 * 这是笔画颜色的默认预设，属于「功能色」而非 UI 主题色，故保留 hex。
 * 工具栏自身的背景、边框、激活态、文案全部走 tokens + i18n。
 */
import {
  Circle,
  Eraser,
  Minus,
  MousePointer,
  Pencil,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import type { FC } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

export type DrawingTool = 'select' | 'pen' | 'line' | 'rect' | 'circle' | 'text' | 'eraser';

/** 笔画颜色预设（功能色，非 UI 主题色）。 */
export const WB_COLOR_PALETTE: readonly string[] = [
  '#1f2937', // 墨黑
  '#ef4444', // 红
  '#f97316', // 橙
  '#f59e0b', // 黄
  '#10b981', // 绿
  '#3b82f6', // 蓝
  '#8b5cf6', // 紫
  '#ffffff', // 白
];

const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8];

interface DrawingToolsProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (w: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

const TOOLS: { id: DrawingTool; icon: FC<{ className?: string }>; labelKey: string }[] = [
  { id: 'select', icon: MousePointer, labelKey: 'toolSelect' },
  { id: 'pen', icon: Pencil, labelKey: 'toolPen' },
  { id: 'line', icon: Minus, labelKey: 'toolLine' },
  { id: 'rect', icon: Square, labelKey: 'toolRect' },
  { id: 'circle', icon: Circle, labelKey: 'toolCircle' },
  { id: 'text', icon: Type, labelKey: 'toolText' },
  { id: 'eraser', icon: Eraser, labelKey: 'toolEraser' },
];

export const DrawingTools: FC<DrawingToolsProps> = ({
  activeTool,
  onToolChange,
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
}) => {
  const { t } = useAppTranslation();
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
      {/* 工具组 */}
      {TOOLS.map(({ id, icon: Icon, labelKey }) => (
        <button
          key={id}
          type="button"
          title={t(`classroom.whiteboard.${labelKey}`)}
          onClick={() => onToolChange(id)}
          aria-pressed={activeTool === id}
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

      {/* 颜色选择 */}
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label={t('classroom.whiteboard.color')}
      >
        {WB_COLOR_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => onColorChange(c)}
            aria-pressed={color === c}
            className={`h-6 w-6 rounded-full border transition-transform ${
              color === c ? 'scale-110 ring-2 ring-ring' : 'border-border hover:scale-105'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* 线宽 */}
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label={t('classroom.whiteboard.strokeWidth')}
      >
        {STROKE_WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            title={`${w}px`}
            onClick={() => onStrokeWidthChange(w)}
            aria-pressed={strokeWidth === w}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              strokeWidth === w
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <span
              className="block rounded-full bg-current"
              style={{ width: Math.max(2, w), height: Math.max(2, w) }}
            />
          </button>
        ))}
      </div>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* 撤销 / 重做 / 清空 */}
      <button
        type="button"
        title={t('classroom.whiteboard.undo')}
        onClick={onUndo}
        disabled={!canUndo}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        title={t('classroom.whiteboard.redo')}
        onClick={onRedo}
        disabled={!canRedo}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Redo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        title={t('classroom.whiteboard.clear')}
        onClick={onClear}
        className="flex h-8 w-8 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};
