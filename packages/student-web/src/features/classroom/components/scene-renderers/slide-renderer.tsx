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
 *
 * Spotlight：
 *   - 每个元素根节点带 id=`screen-element-{id}` + className `screen-element`，
 *     内容节点带 className `element-content`，供 SpotlightOverlay 通过
 *     getBoundingClientRect 进行 DOM 测量（与 OpenMAIC ScreenElement 对齐）。
 *   - SpotlightOverlay 挂在 host 容器内、scale 容器外，覆盖整个 SlideRenderer 区，
 *     由 store.currentSpotlightId / spotlightOptions 驱动，自身不依赖 prop。
 */
import type { CSSProperties, FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

import { useClassroomStore } from '../../stores/classroom-store';

import { SpotlightOverlay } from './spotlight-overlay';

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
  /**
   * @deprecated 留作 prop 兼容；spotlight 现已通过 SpotlightOverlay + store 全局驱动，
   * 不再由父组件单独传入。下次清理调用方时可移除。
   */
  spotlightId?: string | null;
}

const CANVAS_W = 960;
const CANVAS_H = 540;

export const SlideRenderer: FC<SlideRendererProps> = ({
  content,
  sceneTitle,
  sceneOrder,
}) => {
  const { t } = useAppTranslation();
  const elements = content?.elements ?? [];
  const bgColor = content?.background?.color ?? '#ffffff';
  const highlightedId = useClassroomStore((s) => s.highlightedElementId);

  // 按实际元素 bbox 计算 scale：
  // 后端生成的 elements 并不总是铺满 960×540，常见情况是 minX≈180 左侧留白。
  // 如果沿用 CANVAS_W / CANVAS_H 作为 scale 基准，同时 transformOrigin: center，
  // 视觉上会出现左侧大块空白、右侧内容被裁的症状（用户反馈）。
  //
  // 做法：bbox = 真实内容外接框；scale = 容器 / bbox；渲染时把元素整体左上对齐到 (0,0)。
  const bbox = useMemo(() => {
    if (elements.length === 0) {
      return { minX: 0, minY: 0, width: CANVAS_W, height: CANVAS_H };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const el of elements) {
      minX = Math.min(minX, el.left);
      minY = Math.min(minY, el.top);
      maxX = Math.max(maxX, el.left + el.width);
      maxY = Math.max(maxY, el.top + el.height);
    }
    // 对边距做些兜底：bbox 至少占 canvas 的一半，避免零散小元素被放大到过大
    const width = Math.max(maxX - minX, CANVAS_W / 2);
    const height = Math.max(maxY - minY, CANVAS_H / 2);
    return { minX, minY, width, height };
  }, [elements]);

  const [scale, setScale] = useState(1);

  const recomputeScale = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const sx = rect.width / bbox.width;
      const sy = rect.height / bbox.height;
      const next = Math.min(sx, sy);
      setScale((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
    },
    [bbox.width, bbox.height],
  );

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
    // ResizeObserver：场景切换或布局重排会改变 host 容器尺寸，
    // 仅靠 window.resize 不足以捕获（容器尺寸变但窗口没变），
    // 导致首帧用旧 scale 渲染，内容瞬时溢出，视觉像 canvas 窄了一下。
    const el = hostRef.current;
    const observer = el && 'ResizeObserver' in window ? new ResizeObserver(handler) : null;
    if (observer && el) observer.observe(el);
    return () => {
      window.removeEventListener('resize', handler);
      observer?.disconnect();
    };
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
        <p className="text-sm text-black/50">{t('classroom.sceneRenderer.slideNoElements')}</p>
      </div>
    );
  }

  return (
    <div
      ref={setHostRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* 外层 "frame"：占 layout 空间 = 真实 scale 后的视觉尺寸，
          由父 flex items-center justify-center 负责精确居中。
          内层 "canvas"：bbox 原始尺寸，transform: scale + origin left top 填满 frame。 */}
      <div
        style={{
          width: bbox.width * scale,
          height: bbox.height * scale,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: bgColor,
        }}
      >
        <div
          style={{
            width: bbox.width,
            height: bbox.height,
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'left top',
          }}
        >
          {/* 场景编号徽标：锚在 bbox 右上角 */}
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
              offsetX={bbox.minX}
              offsetY={bbox.minY}
              highlighted={highlightedId === el.id}
            />
          ))}
        </div>
      </div>

      {/* Spotlight 层：与 scale 容器同级，覆盖整个 host，DOM 测量自动消除 scale */}
      <SpotlightOverlay />
    </div>
  );
};

const SlideElementView: FC<{
  element: SlideElement;
  offsetX: number;
  offsetY: number;
  highlighted?: boolean;
}> = ({ element, offsetX, offsetY, highlighted = false }) => {
  const wrapperStyle: CSSProperties = {
    position: 'absolute',
    left: element.left - offsetX,
    top: element.top - offsetY,
    width: element.width,
    height: element.height,
    boxSizing: 'border-box',
    // Phase 4：Companion `[elem:xxx]` 点击高亮 —— 叠加 outline，不影响布局
    outline: highlighted ? '2px solid var(--primary, #f5c547)' : undefined,
    outlineOffset: highlighted ? 4 : undefined,
    transition: 'outline-color 200ms ease',
  };

  if (element.type === 'text') {
    const html = element.content ?? '';
    return (
      <div
        id={`screen-element-${element.id}`}
        className="screen-element"
        style={wrapperStyle}
      >
        <div
          className="element-content"
          style={{ width: '100%', height: '100%', color: '#1f1f1f', lineHeight: 1.4 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
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
          id={`screen-element-${element.id}`}
          className="screen-element"
          style={wrapperStyle}
        >
          <div
            className="element-content"
            style={{
              width: '100%',
              height: '100%',
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
        </div>
      );
    }
    return (
      <div
        id={`screen-element-${element.id}`}
        className="screen-element"
        style={wrapperStyle}
      >
        <img
          src={src}
          alt=""
          className="element-content"
          style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }}
        />
      </div>
    );
  }

  if (element.type === 'latex') {
    const latex =
      (element.content as string | null) ||
      ((element.extra?.latex as string | undefined) ?? '');
    return (
      <div
        id={`screen-element-${element.id}`}
        className="screen-element"
        style={wrapperStyle}
      >
        <div
          className="element-content"
          style={{
            width: '100%',
            height: '100%',
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
      id={`screen-element-${element.id}`}
      className="screen-element"
      style={wrapperStyle}
    >
      <div
        className="element-content"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: fill,
          border: `${strokeWidth}px solid ${stroke}`,
          borderRadius: radius,
        }}
      />
    </div>
  );
};
