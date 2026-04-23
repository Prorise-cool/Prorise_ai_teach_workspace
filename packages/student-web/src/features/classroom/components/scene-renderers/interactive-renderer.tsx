/**
 * 交互式场景渲染器。
 * 在沙箱 iframe 中展示生成的 HTML 内容。
 * TODO: Deep Interactive Mode 3D 特性（P2）
 */
import type { FC } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

import type { InteractiveContent } from '../../types/scene';

interface InteractiveRendererProps {
  content: InteractiveContent;
  sceneTitle: string;
  sceneOrder: number;
}

export const InteractiveRenderer: FC<InteractiveRendererProps> = ({
  content,
  sceneTitle,
  sceneOrder,
}) => {
  const { t } = useAppTranslation();
  // 优先用内嵌 HTML，其次 URL
  const hasHtml = !!content.html;
  const hasUrl = !!content.url;

  if (!hasHtml && !hasUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          SCENE {String(sceneOrder).padStart(2, '0')} · INTERACTIVE
        </span>
        <h2 className="text-xl font-bold text-foreground">{sceneTitle}</h2>
        <p className="text-sm text-muted-foreground">{t('classroom.sceneRenderer.interactiveNotLoaded')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-3 shrink-0">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          SCENE {String(sceneOrder).padStart(2, '0')} · INTERACTIVE
        </span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          沙箱模式
        </span>
      </div>

      {/* 沙箱 iframe */}
      <div className="flex-1 overflow-hidden">
        {hasHtml ? (
          <iframe
            title={sceneTitle}
            srcDoc={content.html}
            sandbox="allow-scripts allow-forms allow-same-origin"
            className="h-full w-full border-0"
          />
        ) : (
          <iframe
            title={sceneTitle}
            src={content.url}
            sandbox="allow-scripts allow-forms allow-same-origin"
            className="h-full w-full border-0"
          />
        )}
      </div>
    </div>
  );
};
