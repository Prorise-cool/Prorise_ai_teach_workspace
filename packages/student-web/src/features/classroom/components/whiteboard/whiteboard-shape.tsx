/**
 * 白板元素 SVG 渲染器 —— 纯函数，按 WhiteboardPath.type 分派到对应节点。
 * 从 whiteboard.tsx 抽出，保持主组件 ≤ 500 行。
 */
import type { ReactNode } from 'react';

import type { WhiteboardPath } from './whiteboard';

export function renderPath(path: WhiteboardPath): ReactNode {
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
