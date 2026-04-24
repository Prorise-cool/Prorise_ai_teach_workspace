/**
 * 交互式场景渲染器。
 *
 * Phase 5：优先渲染后端 Widget HTML 生成器产出的 ``widgetHtml`` 字段
 * （自包含 HTML，内嵌 postMessage 监听器、控件、canvas）。历史数据里
 * 的 ``html`` / ``url`` 字段作为兼容分支保留。
 *
 * **安全约束**：iframe ``sandbox`` **仅** ``allow-scripts``。禁止
 * ``allow-same-origin``（会让 iframe 访问父页 cookies / localStorage）、
 * ``allow-top-navigation``（iframe 劫持顶层导航）、``allow-popups``
 * （弹窗广告）、``allow-forms``（伪造表单）。postMessage 不需要
 * same-origin，跨 origin 也能工作。
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
  // Phase 5 优先字段 > legacy html > 外链 url
  const srcDoc = content.widgetHtml ?? content.html ?? null;
  const src = !srcDoc ? content.url ?? null : null;

  if (!srcDoc && !src) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          SCENE {String(sceneOrder).padStart(2, '0')} · INTERACTIVE
        </span>
        <h2 className="text-xl font-bold text-foreground">{sceneTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {t('classroom.sceneRenderer.interactiveNotLoaded')}
        </p>
      </div>
    );
  }

  const widgetTypeLabel = content.widgetType
    ? t(`classroom.interactive.widget_${content.widgetType}`, {
        defaultValue: content.widgetType,
      })
    : t('classroom.interactive.widget_default', { defaultValue: '沙箱模式' });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-3 shrink-0">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          SCENE {String(sceneOrder).padStart(2, '0')} · INTERACTIVE
        </span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          {widgetTypeLabel}
        </span>
      </div>

      {/* 沙箱 iframe —— sandbox 只给 allow-scripts */}
      <div className="flex-1 overflow-hidden">
        {srcDoc ? (
          <iframe
            title={sceneTitle}
            srcDoc={srcDoc}
            sandbox="allow-scripts"
            loading="lazy"
            className="h-full w-full border-0"
          />
        ) : (
          <iframe
            title={sceneTitle}
            src={src ?? undefined}
            sandbox="allow-scripts"
            loading="lazy"
            className="h-full w-full border-0"
          />
        )}
      </div>
    </div>
  );
};
