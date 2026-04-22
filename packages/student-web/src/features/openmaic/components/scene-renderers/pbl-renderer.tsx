/**
 * 项目制学习（PBL）场景渲染器。
 */
import type { FC } from 'react';

import type { PBLContent } from '../../types/scene';

interface PBLRendererProps {
  content: PBLContent;
  sceneTitle: string;
  sceneOrder: number;
}

export const PBLRenderer: FC<PBLRendererProps> = ({ content, sceneTitle, sceneOrder }) => {
  const config = content.projectConfig;
  const description = config?.description as string | undefined;
  const tasks = (config?.tasks as string[]) ?? [];
  const resources = (config?.resources as string[]) ?? [];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* 头部 */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-3 shrink-0">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          SCENE {String(sceneOrder).padStart(2, '0')} · PROJECT
        </span>
      </div>

      <div className="flex-1 space-y-5 px-5 py-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{sceneTitle}</h2>
          {description && (
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>

        {tasks.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold text-foreground">项目任务</h3>
            <ol className="space-y-2">
              {tasks.map((task, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  {task}
                </li>
              ))}
            </ol>
          </div>
        )}

        {resources.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold text-foreground">参考资源</h3>
            <ul className="space-y-1">
              {resources.map((res, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  · {res}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
