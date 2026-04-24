/**
 * Spotlight overlay — 1:1 移植自 OpenMAIC
 * `components/slide-renderer/Editor/SpotlightOverlay.tsx`。
 *
 * 实现要点（严格遵循参考项目）：
 *   - 通过 DOM 测量（getBoundingClientRect）计算目标元素在 SVG viewBox 0-100 中的位置
 *   - 用 SVG <mask> + 黑色矩形挖洞：白色背景 = 显示压暗层，黑色矩形区域 = 镂空目标
 *   - motion.rect 动画从"大范围虚掩"收拢到"目标精确贴合"，同时白色描边框淡入
 *   - 不用 backdrop-filter，避免 Tailwind 4 某些浏览器 mask 合成异常
 *
 * 本项目差异：
 *   - store 接入换成 useClassroomStore（字段 currentSpotlightId / spotlightOptions）
 *   - 去掉 OpenMAIC 的 useSceneSelector 依赖：由挂载者通过 key={scene.id} 控制 remount
 *   - 目标元素 DOM id 约定：`screen-element-${element.id}`（由 SlideRenderer 写入）
 */
import type { CSSProperties } from 'react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { useClassroomStore } from '../../stores/classroom-store';

interface SpotlightRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function SpotlightOverlay() {
  const spotlightElementId = useClassroomStore((s) => s.currentSpotlightId);
  const spotlightOptions = useClassroomStore((s) => s.spotlightOptions);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  const measure = useCallback(() => {
    if (!spotlightElementId || !containerRef.current) {
      setRect(null);
      return;
    }

    const domElement = document.getElementById(`screen-element-${spotlightElementId}`);
    if (!domElement) {
      setRect(null);
      return;
    }

    // 优先测量 .element-content（实际渲染区，支持 auto-height）
    const contentEl = domElement.querySelector('.element-content');
    const targetEl = contentEl ?? domElement;

    const containerRect = containerRef.current.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    if (containerRect.width === 0 || containerRect.height === 0) {
      setRect(null);
      return;
    }

    setRect({
      x: ((targetRect.left - containerRect.left) / containerRect.width) * 100,
      y: ((targetRect.top - containerRect.top) / containerRect.height) * 100,
      w: (targetRect.width / containerRect.width) * 100,
      h: (targetRect.height / containerRect.height) * 100,
    });
  }, [spotlightElementId]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  // 容器尺寸变化时重测（对齐 window resize → OpenMAIC 靠 useSceneSelector 触发 re-run；
  // 我们用 ResizeObserver 精确监听）
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

  const active = !!spotlightElementId && !!spotlightOptions && !!rect;
  const dimness = spotlightOptions?.dimness ?? 0.7;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[100] pointer-events-none overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {active && rect && (
          <motion.div
            key={`spotlight-${spotlightElementId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0"
            >
              <defs>
                <mask id={`mask-${spotlightElementId}`}>
                  <rect x="0" y="0" width="100" height="100" fill="white" />
                  <motion.rect
                    fill="black"
                    initial={{
                      x: rect.x - 8,
                      y: rect.y - 8,
                      width: rect.w + 16,
                      height: rect.h + 16,
                      rx: 4,
                    }}
                    animate={{
                      x: rect.x - 0.4,
                      y: rect.y - 0.6,
                      width: rect.w + 0.8,
                      height: rect.h + 1.2,
                      rx: 1,
                    }}
                    transition={{
                      duration: 0.6,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                </mask>
              </defs>

              <rect
                width="100"
                height="100"
                fill={`rgba(0,0,0,${dimness})`}
                mask={`url(#mask-${spotlightElementId})`}
              />

              <motion.rect
                initial={{
                  x: rect.x - 4,
                  y: rect.y - 4,
                  width: rect.w + 8,
                  height: rect.h + 8,
                  opacity: 0,
                  rx: 2,
                }}
                animate={{
                  x: rect.x - 0.4,
                  y: rect.y - 0.6,
                  width: rect.w + 0.8,
                  height: rect.h + 1.2,
                  opacity: 1,
                  rx: 1,
                }}
                fill="none"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="1.2"
                style={{ vectorEffect: 'non-scaling-stroke' } as CSSProperties}
                transition={{
                  duration: 0.5,
                  delay: 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
