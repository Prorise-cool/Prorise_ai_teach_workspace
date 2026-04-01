/**
 * 文件说明：首页的非阻塞推荐提示区。
 */
import { Compass, Sparkles } from 'lucide-react';

type RecommendationHintProps = {
  variant: 'classroom' | 'video' | 'fallback';
};

function resolveCopy(variant: RecommendationHintProps['variant']) {
  if (variant === 'classroom') {
    return {
      title: '推荐从主题课堂开始',
      description: '当你还在梳理知识框架、课程目标或整章内容时，课堂模式更容易形成完整理解。'
    };
  }

  if (variant === 'video') {
    return {
      title: '推荐先走单题视频',
      description: '如果你手里已经有题目、截图或明确难点，单题视频能更快进入解释主线。'
    };
  }

  return {
    title: '暂未拿到推荐上下文',
    description: '即使推荐逻辑暂时不可用，你仍可直接选择任一入口继续。'
  };
}

export function RecommendationHint({
  variant
}: RecommendationHintProps) {
  const copy = resolveCopy(variant);

  return (
    <aside className="rounded-[var(--xm-radius-xl)] border border-border bg-card/85 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-primary">
          {variant === 'fallback' ? (
            <Compass className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">{copy.title}</div>
          <p className="text-sm leading-6 text-muted-foreground">
            {copy.description}
          </p>
        </div>
      </div>
    </aside>
  );
}
