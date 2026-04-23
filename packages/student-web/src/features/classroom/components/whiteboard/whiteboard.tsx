/**
 * SVG 白板组件。
 * 两类驱动：
 *   1. 手绘：工具栏切换工具，pointer 事件添加到 paths
 *   2. Agent：通过 ref 命令式 API 渲染 wb_draw_* action（Patch 3 接入）
 *
 * 坐标统一走 SVG viewBox 1000x562，与 wb_draw_* action 的 x/y 语义一致。
 * 数据模型：WhiteboardPath 单一 interface 用 `type` 做 discriminator，按需使用可选字段，
 *          避免为 agent shape 单建联合类型。
 */
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

import { DrawingTools } from './drawing-tools';
import type { DrawingTool } from './drawing-tools';
import { renderPath } from './whiteboard-shape';

interface Point {
  x: number;
  y: number;
}

/** 白板元素 — 所有 path/shape/text/latex 共用此接口，按 type 消费对应字段。 */
export interface WhiteboardPath {
  id: string;
  /** rect/circle/triangle/latex 由 agent 产生；pen/line/text 可由手绘或 agent 产生。 */
  type: 'pen' | 'line' | 'rect' | 'circle' | 'triangle' | 'text' | 'latex';
  color: string;
  strokeWidth: number;
  /** pen 笔画点序列 */
  points?: Point[];
  /** line 两端 */
  start?: Point;
  end?: Point;
  /** rect / triangle 左上角 + 宽高；circle 同此（cx = x + w/2, rx = w/2）以便统一 */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /** text 文本内容；latex 原 LaTeX 字符串 */
  text?: string;
  fontSize?: number;
  /** 样式扩展（agent action 透传） */
  fillColor?: string;
  lineStyle?: 'solid' | 'dashed';
  arrowStart?: boolean;
  arrowEnd?: boolean;
}

interface WhiteboardProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * use-action-player 通过此接口驱动白板 —— 每个方法映射一个 wb_* action。
 */
export interface WhiteboardHandle {
  drawShape(
    shape: 'rectangle' | 'circle' | 'triangle',
    params: {
      elementId?: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fillColor?: string;
      strokeColor?: string;
    },
  ): void;
  drawText(params: {
    elementId?: string;
    content: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    fontSize?: number;
    color?: string;
  }): void;
  drawLatex(params: {
    elementId?: string;
    latex: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    color?: string;
  }): void;
  drawLine(params: {
    elementId?: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color?: string;
    width?: number;
    style?: 'solid' | 'dashed';
    arrowStart?: boolean;
    arrowEnd?: boolean;
  }): void;
  clear(): void;
  deleteElement(elementId: string): void;
}

const DEFAULT_COLOR = '#1f2937';
const DEFAULT_STROKE = 3;
const UNDO_LIMIT = 64;

export const Whiteboard = forwardRef<WhiteboardHandle, WhiteboardProps>(function Whiteboard(
  { isOpen, onClose, className = '' },
  ref,
) {
  const { t } = useAppTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>('pen');
  const [paths, setPaths] = useState<WhiteboardPath[]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardPath[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<WhiteboardPath | null>(null);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE);

  const pushPath = useCallback((p: WhiteboardPath) => {
    setPaths((prev) => {
      const next = [...prev, p];
      return next.length > UNDO_LIMIT ? next.slice(next.length - UNDO_LIMIT) : next;
    });
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    setPaths((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, [last]]);
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const back = r[r.length - 1];
      setPaths((prev) => [...prev, ...back]);
      return r.slice(0, -1);
    });
  }, []);

  const getSvgPoint = useCallback((event: React.MouseEvent<SVGSVGElement>): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1000,
      y: ((event.clientY - rect.top) / rect.height) * 562,
    };
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (activeTool === 'select' || activeTool === 'eraser') return;
      const pt = getSvgPoint(event);
      const id = `path-${Date.now()}`;

      if (activeTool === 'pen') {
        setCurrentPath({ id, type: 'pen', points: [pt], color, strokeWidth });
      } else if (activeTool === 'line') {
        setCurrentPath({ id, type: 'line', start: pt, end: pt, color, strokeWidth });
      } else if (activeTool === 'rect') {
        setCurrentPath({ id, type: 'rect', x: pt.x, y: pt.y, width: 0, height: 0, color, strokeWidth });
      } else if (activeTool === 'circle') {
        setCurrentPath({ id, type: 'circle', x: pt.x, y: pt.y, width: 0, height: 0, color, strokeWidth });
      } else if (activeTool === 'text') {
        const content = window.prompt(t('classroom.whiteboard.textPrompt')) ?? '';
        if (!content.trim()) return;
        pushPath({
          id,
          type: 'text',
          color,
          strokeWidth,
          x: pt.x,
          y: pt.y,
          text: content,
          fontSize: Math.max(18, strokeWidth * 8),
        });
        return;
      }
      setIsDrawing(true);
    },
    [activeTool, color, strokeWidth, getSvgPoint, pushPath, t],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!isDrawing || !currentPath) return;
      const pt = getSvgPoint(event);

      if (currentPath.type === 'pen') {
        setCurrentPath((prev) =>
          prev ? { ...prev, points: [...(prev.points ?? []), pt] } : null,
        );
      } else if (currentPath.type === 'line') {
        setCurrentPath((prev) => (prev ? { ...prev, end: pt } : null));
      } else if (currentPath.type === 'rect' || currentPath.type === 'circle') {
        setCurrentPath((prev) => {
          if (!prev || prev.x == null || prev.y == null) return prev;
          return { ...prev, width: pt.x - prev.x, height: pt.y - prev.y };
        });
      }
    },
    [isDrawing, currentPath, getSvgPoint],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentPath) return;
    const finalized = normalizeDraft(currentPath);
    if (finalized) pushPath(finalized);
    setCurrentPath(null);
    setIsDrawing(false);
  }, [isDrawing, currentPath, pushPath]);

  const handleClear = useCallback(() => {
    setPaths((prev) => {
      if (prev.length === 0) return prev;
      setRedoStack((r) => [...r, prev]);
      return [];
    });
    setCurrentPath(null);
  }, []);

  /* ---------- Agent 命令式 API（use-action-player 通过 ref 调用） ---------- */

  const addAgentPath = useCallback((p: WhiteboardPath) => {
    setPaths((prev) => [...prev, p]);
    setRedoStack([]);
  }, []);

  useImperativeHandle(
    ref,
    (): WhiteboardHandle => ({
      drawShape(shape, p) {
        const id = p.elementId ?? `wb-agent-${shape}-${Date.now()}`;
        const strokeColor = p.strokeColor ?? p.fillColor ?? '#3b82f6';
        const pathType: WhiteboardPath['type'] =
          shape === 'rectangle' ? 'rect' : shape === 'circle' ? 'circle' : 'triangle';
        addAgentPath({
          id,
          type: pathType,
          color: strokeColor,
          strokeWidth: 3,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          fillColor: p.fillColor,
        });
      },
      drawText(p) {
        addAgentPath({
          id: p.elementId ?? `wb-agent-text-${Date.now()}`,
          type: 'text',
          color: p.color ?? '#1f2937',
          strokeWidth: 1,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          text: p.content,
          fontSize: p.fontSize ?? 28,
        });
      },
      drawLatex(p) {
        addAgentPath({
          id: p.elementId ?? `wb-agent-latex-${Date.now()}`,
          type: 'latex',
          color: p.color ?? '#1f2937',
          strokeWidth: 1,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          text: p.latex,
        });
      },
      drawLine(p) {
        addAgentPath({
          id: p.elementId ?? `wb-agent-line-${Date.now()}`,
          type: 'line',
          color: p.color ?? '#1f2937',
          strokeWidth: p.width ?? 3,
          start: { x: p.startX, y: p.startY },
          end: { x: p.endX, y: p.endY },
          lineStyle: p.style ?? 'solid',
          arrowStart: p.arrowStart ?? false,
          arrowEnd: p.arrowEnd ?? false,
        });
      },
      clear() {
        setPaths([]);
        setRedoStack([]);
      },
      deleteElement(elementId) {
        setPaths((prev) => prev.filter((e) => e.id !== elementId));
      },
    }),
    [addAgentPath],
  );

  if (!isOpen) return null;

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-lg border border-border bg-white/90 shadow-lg backdrop-blur-sm ${className}`}
    >
      {/* 工具栏 */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <DrawingTools
          activeTool={activeTool}
          onToolChange={setActiveTool}
          color={color}
          onColorChange={setColor}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={setStrokeWidth}
          canUndo={paths.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
        />
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
        >
          {t('classroom.whiteboard.close')}
        </button>
      </div>

      {/* SVG 画布 */}
      <svg
        ref={svgRef}
        viewBox="0 0 1000 562"
        className="flex-1 touch-none"
        style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <marker
            id="wb-arrow-end"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
          <marker
            id="wb-arrow-start"
            viewBox="0 0 10 10"
            refX="1"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 10 0 L 0 5 L 10 10 z" fill="currentColor" />
          </marker>
        </defs>
        {paths.map((p) => renderPath(p))}
        {currentPath && renderPath(currentPath)}
      </svg>
    </div>
  );
});

/** 手绘 draft 定稿：rect/circle 宽高归一为正值（允许反向拖拽）；零面积视为无效。 */
function normalizeDraft(draft: WhiteboardPath): WhiteboardPath | null {
  if (draft.type === 'rect' || draft.type === 'circle') {
    if (draft.x == null || draft.y == null || draft.width == null || draft.height == null) return null;
    const x = draft.width < 0 ? draft.x + draft.width : draft.x;
    const y = draft.height < 0 ? draft.y + draft.height : draft.y;
    const width = Math.abs(draft.width);
    const height = Math.abs(draft.height);
    if (width < 3 || height < 3) return null;
    return { ...draft, x, y, width, height };
  }
  if (draft.type === 'pen' && (!draft.points || draft.points.length < 2)) return null;
  if (draft.type === 'line' && draft.start && draft.end) {
    if (draft.start.x === draft.end.x && draft.start.y === draft.end.y) return null;
  }
  return draft;
}
