/**
 * 幻灯片场景渲染器。
 * 将 SlideContent 数据渲染为可视化幻灯片。
 */
import type { FC } from 'react';

import type { SlideContent } from '../../types/scene';

interface SlideRendererProps {
  content: SlideContent;
  sceneTitle: string;
  sceneOrder: number;
}

export const SlideRenderer: FC<SlideRendererProps> = ({ content, sceneTitle, sceneOrder }) => {
  const canvas = content.canvas as Record<string, unknown> | undefined;
  const elements = (canvas?.elements as unknown[]) ?? [];
  const background = canvas?.background as Record<string, unknown> | undefined;
  const theme = canvas?.theme as Record<string, unknown> | undefined;

  const bgColor = (background?.color as string) ?? (theme?.backgroundColor as string) ?? '#ffffff';

  // 如果没有元素数据，渲染占位内容
  if (elements.length === 0) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg p-8"
        style={{ backgroundColor: bgColor }}
      >
        <div className="text-center space-y-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            SCENE {String(sceneOrder).padStart(2, '0')}
          </span>
          <h2 className="text-xl font-bold text-foreground">{sceneTitle}</h2>
          <p className="text-sm text-muted-foreground">幻灯片内容加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-lg"
      style={{ backgroundColor: bgColor }}
    >
      {/* 场景标头 */}
      <div className="flex items-center gap-2 border-b border-black/10 px-5 py-3">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          SCENE {String(sceneOrder).padStart(2, '0')}
        </span>
      </div>

      {/* 简单元素渲染 */}
      <div className="flex-1 px-6 py-4">
        <h2 className="mb-4 text-xl font-bold text-foreground md:text-2xl">{sceneTitle}</h2>
        {elements.slice(0, 5).map((el, i) => {
          const element = el as Record<string, unknown>;
          if (element.type === 'text') {
            const content = element.content as string;
            // 剥离 HTML 标签做简单文本显示
            const text = content.replace(/<[^>]+>/g, '');
            return (
              <p key={i} className="mb-2 text-sm leading-relaxed text-foreground/80">
                {text}
              </p>
            );
          }
          if (element.type === 'image') {
            return (
              <img
                key={i}
                src={element.src as string}
                alt=""
                className="mb-2 max-h-48 rounded-md object-contain"
              />
            );
          }
          if (element.type === 'latex') {
            return (
              <div key={i} className="mb-2 rounded-md bg-muted px-3 py-2 font-mono text-sm">
                {element.latex as string}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};
