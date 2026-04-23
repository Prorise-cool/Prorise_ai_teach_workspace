/**
 * 幻灯片场景渲染器（对齐 OpenMAIC 参考项目）。
 *
 * 后端 scene.content 形状：
 *   {
 *     background: { type: "solid", color: "#ffffff" },
 *     elements: [
 *       { id, type: "text"|"shape"|"image", left, top, width, height,
 *         content: "<p>...</p>" | null, extra: {} },
 *       ...
 *     ]
 *   }
 *
 * 元素位置使用绝对坐标（内部画布 960×540），通过 CSS transform scale 自适应容器。
 */
import type { CSSProperties, FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface SlideElement {
  id: string;
  type: 'text' | 'shape' | 'image' | 'latex';
  left: number;
  top: number;
  width: number;
  height: number;
  content: string | null;
  extra?: Record<string, unknown>;
}

interface SlideContent {
  background?: { type?: string; color?: string };
  elements?: SlideElement[];
}

interface SlideRendererProps {
  content: SlideContent;
  sceneTitle: string;
  sceneOrder: number;
  spotlightId?: string | null;
}

const CANVAS_W = 960;
const CANVAS_H = 540;

export const SlideRenderer: FC<SlideRendererProps> = ({
  content,
  sceneTitle,
  sceneOrder,
  spotlightId,
}) => {
  const elements = content?.elements ?? [];
  const bgColor = content?.background?.color ?? '#ffffff';

  const [scale, setScale] = useState(1);

  const recomputeScale = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const sx = rect.width / CANVAS_W;
    const sy = rect.height / CANVAS_H;
    const next = Math.min(sx, sy);
    setScale((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
  }, []);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const setHostRef = useCallback(
    (el: HTMLDivElement | null) => {
      hostRef.current = el;
      recomputeScale(el);
    },
    [recomputeScale],
  );

  useEffect(() => {
    const handler = () => recomputeScale(hostRef.current);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [recomputeScale]);

  if (elements.length === 0) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg p-8"
        style={{ backgroundColor: bgColor }}
      >
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">
          SCENE {String(sceneOrder).padStart(2, '0')}
        </span>
        <h2 className="text-xl font-bold text-black/80">{sceneTitle}</h2>
        <p className="text-sm text-black/50">幻灯片没有渲染元素</p>
      </div>
    );
  }

  return (
    <div
      ref={setHostRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* 固定 960×540 画布，靠 transform: scale() 自适应容器 */}
      <div
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          position: 'relative',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          backgroundColor: bgColor,
        }}
      >
        {/* 场景编号徽标 */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 18,
            fontFamily: 'monospace',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            color: 'rgba(0,0,0,0.35)',
          }}
        >
          SCENE {String(sceneOrder).padStart(2, '0')}
        </div>

        {elements.map((el) => (
          <SlideElementView
            key={el.id}
            element={el}
            highlighted={spotlightId === el.id}
          />
        ))}
      </div>
    </div>
  );
};

const SlideElementView: FC<{ element: SlideElement; highlighted: boolean }> = ({
  element,
  highlighted,
}) => {
  const baseStyle: CSSProperties = {
    position: 'absolute',
    left: element.left,
    top: element.top,
    width: element.width,
    height: element.height,
    boxSizing: 'border-box',
    transition: 'box-shadow 240ms ease-out, transform 240ms ease-out',
    ...(highlighted
      ? {
          boxShadow: '0 0 0 3px rgba(245, 197, 71, 0.7), 0 8px 24px rgba(245, 197, 71, 0.25)',
          transform: 'scale(1.02)',
          zIndex: 10,
        }
      : null),
  };

  if (element.type === 'text') {
    const html = element.content ?? '';
    return (
      <div
        style={{ ...baseStyle, color: '#1f1f1f', lineHeight: 1.4 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (element.type === 'image') {
    const src =
      (element.extra && (element.extra.src as string)) ||
      (element.content as string | null) ||
      '';
    if (!src) {
      return (
        <div
          style={{
            ...baseStyle,
            backgroundColor: 'rgba(0,0,0,0.05)',
            border: '1px dashed rgba(0,0,0,0.15)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            color: 'rgba(0,0,0,0.4)',
          }}
        >
          图片占位
        </div>
      );
    }
    return (
      <img
        src={src}
        alt=""
        style={{ ...baseStyle, objectFit: 'contain', borderRadius: 8 }}
      />
    );
  }

  if (element.type === 'latex') {
    const latex =
      (element.content as string | null) ||
      ((element.extra?.latex as string | undefined) ?? '');
    return (
      <div
        style={{
          ...baseStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'KaTeX_Main, serif',
          fontSize: 20,
          backgroundColor: 'rgba(245, 197, 71, 0.08)',
          border: '1px solid rgba(245, 197, 71, 0.25)',
          borderRadius: 8,
          padding: '6px 12px',
        }}
      >
        {latex}
      </div>
    );
  }

  // shape: background rectangle (支持 extra.fill / extra.stroke)
  const extra = element.extra ?? {};
  const fill = (extra.fill as string) ?? 'rgba(245, 197, 71, 0.1)';
  const stroke = (extra.stroke as string) ?? 'rgba(245, 197, 71, 0.35)';
  const strokeWidth = (extra.strokeWidth as number) ?? 1;
  const radius = (extra.radius as number) ?? 8;
  return (
    <div
      style={{
        ...baseStyle,
        backgroundColor: fill,
        border: `${strokeWidth}px solid ${stroke}`,
        borderRadius: radius,
      }}
    />
  );
};

