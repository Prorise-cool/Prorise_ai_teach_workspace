/**
 * 文件说明：视频生成等待页占位组件。
 * 真实实现由 Story 3.5 负责，此处提供最小可跳转目标以支撑 Story 3.2 创建后的路由闭环。
 */
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * 视频生成等待页占位。
 * 展示任务 ID 和加载状态，等待 Story 3.5 实现完整等待页。
 *
 * @returns 等待页占位节点。
 */
export function VideoGeneratingPlaceholder() {
  const { id } = useParams<{ id: string }>();

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center gap-4',
        'bg-background text-foreground',
      )}
    >
      <Loader2 className={cn('h-8 w-8 animate-spin text-primary')} />
      <h1 className={cn('text-lg font-semibold')}>视频生成中...</h1>
      <p className={cn('text-sm text-muted-foreground')}>
        任务 ID: {id ?? '未知'}
      </p>
      <p className={cn('text-xs text-muted-foreground')}>
        此页面为占位组件，完整等待页由 Story 3.5 实现
      </p>
    </div>
  );
}
