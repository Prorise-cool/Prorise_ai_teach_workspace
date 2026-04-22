/**
 * SVG 白板组件。
 * 支持自由绘制、直线、文字元素。
 * 智能体动作（wb_draw_*）通过 props 驱动。
 */
import { useCallback, useRef, useState } from 'react';
import type { FC } from 'react';

import { DrawingTools } from './drawing-tools';
import type { DrawingTool } from './drawing-tools';

interface Point {
  x: number;
  y: number;
}

interface WhiteboardPath {
  id: string;
  type: 'pen' | 'line' | 'text';
  points?: Point[];
  start?: Point;
  end?: Point;
  text?: string;
  color: string;
  strokeWidth: number;
}

interface WhiteboardProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const Whiteboard: FC<WhiteboardProps> = ({ isOpen, onClose, className = '' }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>('pen');
  const [paths, setPaths] = useState<WhiteboardPath[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<WhiteboardPath | null>(null);
  const [color] = useState('#333333');
  const [strokeWidth] = useState(2);

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
      }
      setIsDrawing(true);
    },
    [activeTool, color, strokeWidth, getSvgPoint],
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
    setPaths((prev) => [...prev, currentPath]);
    setCurrentPath(null);
    setIsDrawing(false);
  }, [isDrawing, currentPath]);

  const handleClear = useCallback(() => {
    setPaths([]);
    setCurrentPath(null);
  }, []);

  const renderPath = (path: WhiteboardPath) => {
    if (path.type === 'pen' && path.points && path.points.length > 1) {
      const d = path.points
        .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
        .join(' ');
      return (
        <path
          key={path.id}
          d={d}
          stroke={path.color}
          strokeWidth={path.strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }
    if (path.type === 'line' && path.start && path.end) {
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
        />
      );
    }
    return null;
  };

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
          关闭
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
        {/* 已完成路径 */}
        {paths.map(renderPath)}
        {/* 当前绘制中路径 */}
        {currentPath && renderPath(currentPath)}
      </svg>
    </div>
  );
};
