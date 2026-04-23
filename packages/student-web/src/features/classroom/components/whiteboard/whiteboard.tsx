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
import { useCallback, useRef, useState } from 'react';
import type { FC } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

import { DrawingTools } from './drawing-tools';
import type { DrawingTool } from './drawing-tools';

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

const DEFAULT_COLOR = '#1f2937';
const DEFAULT_STROKE = 3;
const UNDO_LIMIT = 64;

export const Whiteboard: FC<WhiteboardProps> = ({ isOpen, onClose, className = '' }) => {
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
      }
    },
    [isDrawing, currentPath, getSvgPoint],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentPath) return;
    pushPath(currentPath);
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
};

/** 渲染单个元素为 SVG 节点。 */
function renderPath(path: WhiteboardPath): React.ReactNode {
  switch (path.type) {
    case 'pen':
      if (!path.points || path.points.length < 2) return null;
      return (
        <path
          key={path.id}
          d={path.points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')}
          stroke={path.color}
          strokeWidth={path.strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'line':
      if (!path.start || !path.end) return null;
      return (
        <line
          key={path.id}
          x1={path.start.x}
          y1={path.start.y}
          x2={path.end.x}
          y2={path.end.y}
          stroke={path.color}
          strokeWidth={path.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={path.lineStyle === 'dashed' ? '8 6' : undefined}
          markerStart={path.arrowStart ? 'url(#wb-arrow-start)' : undefined}
          markerEnd={path.arrowEnd ? 'url(#wb-arrow-end)' : undefined}
        />
      );
    case 'rect':
      if (path.x == null || path.y == null || path.width == null || path.height == null) return null;
      return (
        <rect
          key={path.id}
          x={path.x}
          y={path.y}
          width={path.width}
          height={path.height}
          stroke={path.color}
          strokeWidth={path.strokeWidth}
          fill={path.fillColor ?? 'none'}
        />
      );
    case 'circle':
      if (path.x == null || path.y == null || path.width == null || path.height == null) return null;
      return (
        <ellipse
          key={path.id}
          cx={path.x + path.width / 2}
          cy={path.y + path.height / 2}
          rx={path.width / 2}
          ry={path.height / 2}
          stroke={path.color}
          strokeWidth={path.strokeWidth}
          fill={path.fillColor ?? 'none'}
        />
      );
    case 'triangle': {
      if (path.x == null || path.y == null || path.width == null || path.height == null) return null;
      const pts = `${path.x + path.width / 2},${path.y} ${path.x},${path.y + path.height} ${path.x + path.width},${path.y + path.height}`;
      return (
        <polygon
          key={path.id}
          points={pts}
          stroke={path.color}
          strokeWidth={path.strokeWidth}
          fill={path.fillColor ?? 'none'}
        />
      );
    }
    case 'text': {
      if (path.x == null || path.y == null || !path.text) return null;
      const fontSize = path.fontSize ?? 24;
      return (
        <foreignObject
          key={path.id}
          x={path.x}
          y={path.y}
          width={path.width ?? 400}
          height={path.height ?? Math.max(fontSize * 1.6, 48)}
        >
          <div
            style={{
              color: path.color,
              fontSize,
              lineHeight: 1.3,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              pointerEvents: 'none',
            }}
          >
            {path.text}
          </div>
        </foreignObject>
      );
    }
    case 'latex': {
      // Wave 1.6：monospace fallback，Wave 2 再接 KaTeX
      if (path.x == null || path.y == null || !path.text) return null;
      const fontSize = path.fontSize ?? 28;
      return (
        <foreignObject
          key={path.id}
          x={path.x}
          y={path.y}
          width={path.width ?? 500}
          height={path.height ?? Math.max(fontSize * 1.8, 56)}
        >
          <div
            style={{
              color: path.color,
              fontSize,
              fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              pointerEvents: 'none',
            }}
          >
            {path.text}
          </div>
        </foreignObject>
      );
    }
    default:
      return null;
  }
}
